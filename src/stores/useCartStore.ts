import { create } from 'zustand'
import type { MenuItem } from '@/features/katalog/types'

export interface CartItem {
  menu: MenuItem
  qty: number
  subtotal: number // Integer Rupiah
  jualMelebihiCatatan?: boolean
}

export interface AddCartItemOptions {
  jualMelebihiCatatan?: boolean
}

export interface CartStoreState {
  items: CartItem[]
  addItem: (
    menu: MenuItem,
    qty?: number,
    options?: AddCartItemOptions
  ) => { success: boolean; reason?: string }
  removeItem: (menuId: number) => void
  updateQty: (menuId: number, qty: number) => void
  incrementQty: (menuId: number, options?: { allowExceedStock?: boolean }) => void
  decrementQty: (menuId: number) => void
  markItemJualMelebihiCatatan: (menuId: number, marked?: boolean) => void
  clearCart: () => void

  kasirId: string | number | null
  sesiKasirId: number | null
  titikKasirId: number | null
  setCartOwner: (owner: {
    kasirId?: string | number | null
    sesiKasirId?: number | null
    titikKasirId?: number | null
  }) => void

  totalItems: () => number
  totalHarga: () => number
  getItemQty: (menuId: number) => number
}

export const useCartStore = create<CartStoreState>((set, get) => ({
  items: [],
  kasirId: null,
  sesiKasirId: null,
  titikKasirId: null,

  addItem: (menu: MenuItem, qty = 1, options?: AddCartItemOptions) => {
    // Validasi menu aktif dan stok awal (kecuali ditandai jualMelebihiCatatan / C.1)
    const availableStock = menu.stokBerjalan ?? 0
    const allowOverride = Boolean(options?.jualMelebihiCatatan)

    if (!menu.aktif || (availableStock <= 0 && !allowOverride)) {
      return {
        success: false,
        reason: 'Stok menu telah habis atau menu tidak aktif',
      }
    }

    const safeQty = Math.max(1, qty)
    const currentItems = get().items
    const existingIndex = currentItems.findIndex(
      (item) => item.menu.id === menu.id
    )

    if (existingIndex > -1) {
      const existingItem = currentItems[existingIndex]
      const isMarked = allowOverride || Boolean(existingItem.jualMelebihiCatatan)
      const newQty = existingItem.qty + safeQty

      if (!isMarked && newQty > availableStock) {
        // Jika sudah mencapai batas stok maksimum
        if (existingItem.qty >= availableStock) {
          return {
            success: false,
            reason: `Jumlah maksimal tercapai (${availableStock} ${menu.satuan})`,
          }
        }
        // Pasang di batas stok
        const updatedItems = [...currentItems]
        updatedItems[existingIndex] = {
          ...existingItem,
          qty: availableStock,
          subtotal: Math.round(availableStock * menu.hargaJual),
        }
        set({ items: updatedItems })
        return { success: true }
      }

      const updatedItems = [...currentItems]
      updatedItems[existingIndex] = {
        ...existingItem,
        qty: newQty,
        subtotal: Math.round(newQty * menu.hargaJual),
        ...(isMarked ? { jualMelebihiCatatan: true } : {}),
      }
      set({ items: updatedItems })
      return { success: true }
    } else {
      const initialQty = allowOverride ? safeQty : Math.min(safeQty, availableStock)
      const newItem: CartItem = {
        menu,
        qty: initialQty,
        subtotal: Math.round(initialQty * menu.hargaJual),
        ...(allowOverride ? { jualMelebihiCatatan: true } : {}),
      }
      set({ items: [...currentItems, newItem] })
      return { success: true }
    }
  },

  removeItem: (menuId: number) => {
    set((state) => ({
      items: state.items.filter((item) => item.menu.id !== menuId),
    }))
  },

  updateQty: (menuId: number, qty: number) => {
    if (qty <= 0) {
      get().removeItem(menuId)
      return
    }

    set((state) => {
      const updated = state.items.map((item) => {
        if (item.menu.id === menuId) {
          const maxStock = item.menu.stokBerjalan ?? 0
          const finalQty = item.jualMelebihiCatatan
            ? Math.max(1, qty)
            : Math.min(Math.max(1, qty), maxStock)
          const stillExceeds = maxStock <= 0 || finalQty > maxStock
          return {
            ...item,
            qty: finalQty,
            subtotal: Math.round(finalQty * item.menu.hargaJual),
            jualMelebihiCatatan: item.jualMelebihiCatatan ? stillExceeds : false,
          }
        }
        return item
      })
      return { items: updated }
    })
  },

  incrementQty: (menuId: number, options?: { allowExceedStock?: boolean }) => {
    const currentItem = get().items.find((item) => item.menu.id === menuId)
    if (!currentItem) return

    const maxStock = currentItem.menu.stokBerjalan ?? 0
    const nextQty = currentItem.qty + 1
    if (nextQty > maxStock && !currentItem.jualMelebihiCatatan) {
      if (!options?.allowExceedStock) {
        return
      }
      set((state) => ({
        items: state.items.map((item) =>
          item.menu.id === menuId
            ? {
                ...item,
                qty: nextQty,
                subtotal: Math.round(nextQty * item.menu.hargaJual),
                jualMelebihiCatatan: true,
              }
            : item
        ),
      }))
      return
    }

    get().updateQty(menuId, nextQty)
  },

  decrementQty: (menuId: number) => {
    const currentItem = get().items.find((item) => item.menu.id === menuId)
    if (!currentItem) return

    if (currentItem.qty <= 1) {
      get().removeItem(menuId)
    } else {
      get().updateQty(menuId, currentItem.qty - 1)
    }
  },

  markItemJualMelebihiCatatan: (menuId: number, marked = true) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.menu.id === menuId
          ? { ...item, jualMelebihiCatatan: marked }
          : item
      ),
    }))
  },

  clearCart: () => {
    set({
      items: [],
      kasirId: null,
      sesiKasirId: null,
      titikKasirId: null,
    })
  },

  setCartOwner: (owner) => {
    const { kasirId, sesiKasirId, titikKasirId } = get()
    const isNewKasir =
      owner.kasirId !== undefined &&
      kasirId !== null &&
      String(owner.kasirId) !== String(kasirId)
    const isNewSesi =
      owner.sesiKasirId !== undefined &&
      sesiKasirId !== null &&
      owner.sesiKasirId !== sesiKasirId

    if (isNewKasir || isNewSesi) {
      set({
        items: [],
        kasirId: owner.kasirId ?? null,
        sesiKasirId: owner.sesiKasirId ?? null,
        titikKasirId: owner.titikKasirId ?? null,
      })
      return
    }

    set({
      kasirId: owner.kasirId !== undefined ? owner.kasirId : kasirId,
      sesiKasirId:
        owner.sesiKasirId !== undefined ? owner.sesiKasirId : sesiKasirId,
      titikKasirId:
        owner.titikKasirId !== undefined ? owner.titikKasirId : titikKasirId,
    })
  },

  totalItems: () => {
    return get().items.reduce((sum, item) => sum + item.qty, 0)
  },

  totalHarga: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0)
  },

  getItemQty: (menuId: number) => {
    const item = get().items.find((it) => it.menu.id === menuId)
    return item ? item.qty : 0
  },
}))
