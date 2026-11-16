import { create } from 'zustand'
import {
  DEFAULT_PENGATURAN_KANTIN,
  type PengaturanKantin,
  type TitikKasir,
  type PengaturanKantinFormValues,
} from '@/features/pengaturan/types'
import { pengaturanApi } from '@/features/pengaturan/api/pengaturan-api'
import { emitSyncSignal } from '@/lib/katalog-sync'

const ACTIVE_TITIK_KASIR_STORAGE_KEY = 'skoolia_active_titik_kasir_id'

const DEFAULT_PENGATURAN: PengaturanKantin = {
  ...DEFAULT_PENGATURAN_KANTIN,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Sistem Bawaan',
}

export interface PengaturanStoreState {
  pengaturan: PengaturanKantin
  titikKasirList: TitikKasir[]
  activeTitikKasirId: number | null
  loadingPengaturan: boolean
  loadingTitikKasir: boolean

  setPengaturan: (data: PengaturanKantin) => void
  resetPengaturanToDefault: () => void
  fetchPengaturan: () => Promise<PengaturanKantin>
  updatePengaturan: (
    data: PengaturanKantinFormValues
  ) => Promise<PengaturanKantin>
  fetchTitikKasir: (hanyaAktif?: boolean) => Promise<TitikKasir[]>
  setActiveTitikKasirId: (id: number | null) => void
  getActiveTitikKasir: () => TitikKasir | undefined
}

export const usePengaturanStore = create<PengaturanStoreState>((set, get) => {
  const savedTitikId =
    typeof window !== 'undefined'
      ? Number(localStorage.getItem(ACTIVE_TITIK_KASIR_STORAGE_KEY)) || 1
      : 1

  return {
    pengaturan: DEFAULT_PENGATURAN,
    titikKasirList: [],
    activeTitikKasirId: savedTitikId,
    loadingPengaturan: false,
    loadingTitikKasir: false,

    setPengaturan: (data: PengaturanKantin) => {
      set({ pengaturan: data })
    },

    resetPengaturanToDefault: () => {
      set({ pengaturan: DEFAULT_PENGATURAN })
    },

    fetchPengaturan: async () => {
      try {
        set({ loadingPengaturan: true })
        const data = await pengaturanApi.getPengaturan()
        set({ pengaturan: data })
        return data
      } catch {
        return get().pengaturan
      } finally {
        set({ loadingPengaturan: false })
      }
    },

    updatePengaturan: async (data: PengaturanKantinFormValues) => {
      set({ loadingPengaturan: true })
      try {
        const updated = await pengaturanApi.updatePengaturan(data)
        set({ pengaturan: updated })
        emitSyncSignal('kasir')
        return updated
      } finally {
        set({ loadingPengaturan: false })
      }
    },

    fetchTitikKasir: async (hanyaAktif = false) => {
      try {
        set({ loadingTitikKasir: true })
        const data = await pengaturanApi.getTitikKasirList(hanyaAktif)
        set({ titikKasirList: data })

        const currentActiveId = get().activeTitikKasirId
        const exists = data.some((t) => t.id === currentActiveId && t.aktif)
        if (!exists && data.length > 0) {
          const firstActive = data.find((t) => t.aktif) || data[0]
          get().setActiveTitikKasirId(firstActive.id)
        }

        return data
      } catch {
        return get().titikKasirList
      } finally {
        set({ loadingTitikKasir: false })
      }
    },

    setActiveTitikKasirId: (id: number | null) => {
      set({ activeTitikKasirId: id })
      if (typeof window !== 'undefined') {
        if (id !== null) {
          localStorage.setItem(ACTIVE_TITIK_KASIR_STORAGE_KEY, String(id))
        } else {
          localStorage.removeItem(ACTIVE_TITIK_KASIR_STORAGE_KEY)
        }
      }
    },

    getActiveTitikKasir: () => {
      const { titikKasirList, activeTitikKasirId } = get()
      return (
        titikKasirList.find((t) => t.id === activeTitikKasirId) ||
        titikKasirList[0]
      )
    },
  }
})
