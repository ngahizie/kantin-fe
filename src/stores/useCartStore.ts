import { create } from 'zustand'
import type { MenuItem } from '@/features/katalog/types'

export interface CartItem {
  menu: MenuItem
  qty: number
  subtotal: number // Integer Rupiah
}

export interface CartStoreState {
  items: CartItem[]
  addItem: (
    menu: MenuItem,
    qty?: number
  ) => { success: boolean; reason?: string }
  removeItem: (menuId: number) => void
  updateQty: (menuId: number, qty: number) => void
  incrementQty: (menuId: number) => void
  decrementQty: (menuId: number) => void
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

  addItem: (menu: MenuItem, qty = 1) => {
    // Validasi stok awal
    const availableStock = menu.stokBerjalan ?? 0
    if (availableStock <= 0 || !menu.aktif) {
      return {
        success: false,
        reason: 'Stok menu telah habis atau menu tidak aktif',
      }
    }

    const currentItems = get().items
    const existingIndex = currentItems.findIndex(
      (item) => item.menu.id === menu.id
    )

    if (existingIndex > -1) {
      const existingItem = currentItems[existingIndex]
      const newQty = existingItem.qty + qty

      if (newQty > availableStock) {
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
      }
      set({ items: updatedItems })
      return { success: true }
    } else {
      const initialQty = Math.min(qty, availableStock)
      const newItem: CartItem = {
        menu,
        qty: initialQty,
        subtotal: Math.round(initialQty * menu.hargaJual),
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
          const finalQty = Math.min(Math.max(1, qty), maxStock)
          return {
            ...item,
            qty: finalQty,
            subtotal: Math.round(finalQty * item.menu.hargaJual),
          }
        }
        return item
      })
      return { items: updated }
    })
  },

  incrementQty: (menuId: number) => {
    const currentItem = get().items.find((item) => item.menu.id === menuId)
    if (!currentItem) return

    const maxStock = currentItem.menu.stokBerjalan ?? 0
    if (currentItem.qty >= maxStock) {
      return
    }

    get().updateQty(menuId, currentItem.qty + 1)
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
