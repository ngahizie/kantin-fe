import apiClient from '@/lib/api-client'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import type {
  DaftarSiswaAdminParams,
  PasangKartuPayload,
  SimpanSiswaAdminPayload,
  SiswaManajemenItem,
} from '../types'

interface ApiEnvelope<T> {
  code?: number
  status?: string
  message?: string
  data: T
}

export const siswaAdminApi = {
  async list(params?: DaftarSiswaAdminParams): Promise<SiswaManajemenItem[]> {
    const res = await apiClient.get<ApiEnvelope<SiswaManajemenItem[]>>('/api/admin/siswa', {
      params,
    })
    return Array.isArray(res.data?.data) ? res.data.data : []
  },

  async detail(siswaId: number): Promise<SiswaManajemenItem> {
    const res = await apiClient.get<ApiEnvelope<SiswaManajemenItem>>(`/api/admin/siswa/${siswaId}`)
    return res.data.data
  },

  async create(payload: SimpanSiswaAdminPayload): Promise<SiswaManajemenItem> {
    const res = await apiClient.post<ApiEnvelope<SiswaManajemenItem>>('/api/admin/siswa', payload)
    return res.data.data
  },

  async update(siswaId: number, payload: SimpanSiswaAdminPayload): Promise<SiswaManajemenItem> {
    const res = await apiClient.put<ApiEnvelope<SiswaManajemenItem>>(
      `/api/admin/siswa/${siswaId}`,
      payload
    )
    return res.data.data
  },

  async aturKartu(siswaId: number, payload: PasangKartuPayload): Promise<SiswaManajemenItem> {
    const res = await apiClient.put<ApiEnvelope<SiswaManajemenItem>>(
      `/api/admin/siswa/${siswaId}/kartu`,
      payload
    )
    return res.data.data
  },

  async ubahStatus(siswaId: number, aktif: boolean): Promise<SiswaManajemenItem> {
    const res = await apiClient.patch<ApiEnvelope<SiswaManajemenItem>>(
      `/api/admin/siswa/${siswaId}/status`,
      { aktif }
    )
    return res.data.data
  },

  async uploadFotoSiswa(file: File): Promise<{ url: string; path?: string }> {
    return katalogApi.uploadFoto(file, 'siswa')
  },

  getFotoUrl(pathOrUrl?: string | null): string {
    return katalogApi.getImageUrl(pathOrUrl)
  },
}
