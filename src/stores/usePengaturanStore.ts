import { create } from 'zustand'
import {
  DEFAULT_PENGATURAN_KANTIN,
  type PengaturanKantin,
  type TitikKasir,
  type PengaturanKantinFormValues,
} from '@/features/pengaturan/types'
import {
  cleanupDeletedTitikKasirIds,
  getDeletedTitikKasirIds,
} from '@/features/pengaturan/deleted-titik-kasir'
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
      ? (() => {
          const stored = localStorage.getItem(ACTIVE_TITIK_KASIR_STORAGE_KEY)
          const parsed = Number(stored)
          return stored && Number.isInteger(parsed) && parsed > 0 ? parsed : null
        })()
      : null

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
        const activeIds = data.filter((item) => item.aktif).map((item) => item.id)
        cleanupDeletedTitikKasirIds(activeIds)
        const deletedIds = getDeletedTitikKasirIds()
        const validData = data.filter((t) => !deletedIds.includes(t.id))
        set({ titikKasirList: validData })

        const currentActiveId = get().activeTitikKasirId
        const exists = validData.some((t) => t.id === currentActiveId && t.aktif)
        if (!exists && validData.length > 0) {
          const firstActive = validData.find((t) => t.aktif) || validData[0]
          get().setActiveTitikKasirId(firstActive.id)
        } else if (validData.length === 0) {
          get().setActiveTitikKasirId(null)
        }

        return validData
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
      if (!activeTitikKasirId) return undefined
      return (
        titikKasirList.find((t) => t.id === activeTitikKasirId) ||
        titikKasirList.find((t) => t.aktif)
      )
    },
  }
})
