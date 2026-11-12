import apiClient from '@/lib/api-client'
import { notifyKatalogChanged } from '@/lib/katalog-sync'
import type {
  RiwayatStokItem,
  HalamanResponse,
  StokResponse,
  HasilMutasiStok,
  BarangMasukSingleRequest,
  BarangMasukPembalikRequest,
  JenisMutasiStok,
  OpnameRequest,
  OpnameBatchRequest,
  OpnameBatchResponse,
  InventarisItem,
} from '../types'

interface ApiResponse<T> {
  responseCode?: number
  code?: number
  message?: string
  data: T
}

export interface RiwayatFilterParams {
  menuId?: number
  jenis?: JenisMutasiStok
  dari?: string
  sampai?: string
  halaman?: number
  ukuran?: number
}

async function submitBarangMasuk(
  payload: BarangMasukSingleRequest
): Promise<HasilMutasiStok> {
  const res = await apiClient.post<ApiResponse<HasilMutasiStok>>(
    '/api/stok/barang-masuk',
    payload
  )
  return res.data.data
}

export const stokApi = {
  /**
   * Catat barang masuk / restock (PRD §7.2)
   */
  async catatBarangMasuk(
    payload: BarangMasukSingleRequest
  ): Promise<HasilMutasiStok> {
    const res = await submitBarangMasuk(payload)
    notifyKatalogChanged('stok')
    return res
  },

  /**
   * Catat batch barang masuk multi-item dari satu faktur/nota
   */
  async catatBarangMasukBatch(
    items: { menuId: number; qty: number; hargaBeliPerUnit: number }[],
    baseReferensiId: string
  ): Promise<HasilMutasiStok[]> {
    const results: HasilMutasiStok[] = []
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const refId =
          items.length === 1 ? baseReferensiId : `${baseReferensiId}-${i + 1}`
        const res = await submitBarangMasuk({
          menuId: item.menuId,
          qty: item.qty,
          hargaBeliPerUnit: item.hargaBeliPerUnit,
          referensiId: refId,
        })
        results.push(res)
      }
      return results
    } finally {
      if (results.length > 0) {
        notifyKatalogChanged('stok')
      }
    }
  },

  /**
   * Koreksi barang masuk pembalik (PRD §7.2)
   */
  async catatBarangMasukPembalik(
    payload: BarangMasukPembalikRequest
  ): Promise<HasilMutasiStok> {
    const res = await apiClient.post<ApiResponse<HasilMutasiStok>>(
      '/api/stok/barang-masuk-pembalik',
      payload
    )
    notifyKatalogChanged('stok')
    return res.data.data
  },

  /**
   * Riwayat mutasi stok berhalaman (PRD §9.5)
   */
  async getRiwayatStok(
    params: RiwayatFilterParams = {}
  ): Promise<HalamanResponse<RiwayatStokItem>> {
    const res = await apiClient.get<
      ApiResponse<HalamanResponse<RiwayatStokItem>>
    >('/api/stok/riwayat', {
      params: {
        menuId: params.menuId || undefined,
        jenis: params.jenis || undefined,
        dari: params.dari || undefined,
        sampai: params.sampai || undefined,
        halaman: params.halaman ?? 0,
        ukuran: params.ukuran ?? 20,
      },
    })
    return res.data.data
  },

  /**
   * Ambil data stok & HPP berjalan satu menu (PRD §7.4)
   */
  async getStokMenu(menuId: number): Promise<StokResponse> {
    const res = await apiClient.get<ApiResponse<StokResponse>>(
      `/api/stok/${menuId}`
    )
    return res.data.data
  },

  /**
   * Ambil daftar menu dengan stok menipis (PRD §7.5)
   */
  async getStokMenipis(): Promise<StokResponse[]> {
    const res =
      await apiClient.get<ApiResponse<StokResponse[]>>('/api/stok/menipis')
    return res.data.data || []
  },

  /**
   * Rekonsiliasi hitung ulang dari ledger
   */
  async rekonsiliasi(menuId: number): Promise<number> {
    const res = await apiClient.get<ApiResponse<number>>(
      `/api/stok/${menuId}/rekonsiliasi`
    )
    return res.data.data
  },

  /**
   * Upload foto nota/faktur pembelian ke storage
   */
  async uploadNota(file: File): Promise<{ path: string; url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'nota')

    const res = await apiClient.post<
      ApiResponse<{ path: string; url: string }>
    >('/api/storage/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  /**
   * Penyesuaian stok opname fisik per item (PRD §7.3)
   */
  async sesuaikanOpname(payload: OpnameRequest): Promise<HasilMutasiStok> {
    const res = await apiClient.post<ApiResponse<HasilMutasiStok>>(
      '/api/stok/opname',
      payload
    )
    notifyKatalogChanged('stok')
    return res.data.data
  },

  /**
   * Penyesuaian stok opname batch multi-item (PRD §7.3) — transaksi atomik
   */
  async sesuaikanOpnameBatch(
    payload: OpnameBatchRequest
  ): Promise<OpnameBatchResponse> {
    const res = await apiClient.post<ApiResponse<OpnameBatchResponse>>(
      '/api/stok/opname-batch',
      payload
    )
    notifyKatalogChanged('stok')
    return res.data.data
  },

  /**
   * Catat barang rusak harian non-opname (mengurangi stok sistem langsung)
   */
  async catatBarangRusak(params: {
    menuId: number
    qtyRusak: number
    stokSistem: number
    alasan: string
    referensiId: string
  }): Promise<OpnameBatchResponse> {
    const qtyFisik = Math.max(0, params.stokSistem - params.qtyRusak)
    return this.sesuaikanOpnameBatch({
      referensiId: params.referensiId,
      items: [
        {
          menuId: params.menuId,
          qtyFisik,
          alasan: params.alasan,
          rusak: true,
        },
      ],
    })
  },

  /**
   * Laporan stok & nilai persediaan seluruh menu (PRD §9.5, Issue #10)
   */
  async getInventaris(hanyaMenipis = false): Promise<InventarisItem[]> {
    const res = await apiClient.get<ApiResponse<InventarisItem[]>>(
      '/api/laporan/stok',
      {
        params: { hanyaMenipis },
      }
    )
    return res.data.data || []
  },
}
