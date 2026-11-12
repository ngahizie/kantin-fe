import apiClient from '@/lib/api-client'
import type {
  KebijakanSaldoMengendap,
  PengaturanKantin,
  PengaturanKantinFormValues,
  TitikKasir,
  TitikKasirFormValues,
} from '../types'

interface ApiResponse<T> {
  responseCode?: number
  code?: number
  message?: string
  data: T
}

interface PengaturanBackendDto {
  sekolahId?: number
  namaKantin: string
  jamTutupOtomatis: string
  konfirmasiManual: boolean
  durasiFotoDetik: number
  minTopup?: number
  maksTopup?: number
  batasSaldoSiswa?: number
  kebijakanSaldoMengendap?: string
  ambangHari?: number
  disimpan?: boolean
  updatedAt?: string
  updatedBy?: string
}

interface TitikKasirBackendDto {
  id: number
  sekolahId?: number
  sekolah_id?: number
  nama: string
  kode: string
  aktif?: boolean
  is_active?: boolean
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

function normalizeKebijakan(val?: string): KebijakanSaldoMengendap {
  const upper = val?.trim().toUpperCase()
  if (upper === 'PINDAH_SAUDARA' || upper === 'TETAP_MENGENDAP' || upper === 'REFUND') {
    return upper
  }
  return 'REFUND'
}

function mapPengaturanFromBackend(dto: PengaturanBackendDto): PengaturanKantin {
  return {
    sekolahId: dto.sekolahId ?? 1,
    namaKantin: dto.namaKantin || 'Kantin Sehat SKOOLIA',
    jamTutupOtomatis: dto.jamTutupOtomatis || '23:59:00',
    konfirmasiManual: Boolean(dto.konfirmasiManual),
    durasiFotoDetik: dto.durasiFotoDetik ?? 3,
    minTopup: dto.minTopup ?? 5000,
    maksTopup: dto.maksTopup ?? 500000,
    batasSaldoSiswa: dto.batasSaldoSiswa ?? 1000000,
    kebijakanSaldoMengendap: normalizeKebijakan(dto.kebijakanSaldoMengendap),
    ambangHari: dto.ambangHari ?? 90,
    disimpan: dto.disimpan ?? true,
    updatedAt: dto.updatedAt,
    updatedBy: dto.updatedBy,
  }
}

function mapTitikKasirFromBackend(dto: TitikKasirBackendDto): TitikKasir {
  return {
    id: dto.id,
    sekolahId: dto.sekolahId ?? dto.sekolah_id ?? 1,
    nama: dto.nama,
    kode: dto.kode,
    aktif: dto.aktif !== undefined ? Boolean(dto.aktif) : Boolean(dto.is_active),
    createdAt: dto.createdAt || dto.created_at || new Date().toISOString(),
    updatedAt: dto.updatedAt || dto.updated_at || new Date().toISOString(),
  }
}

export const pengaturanApi = {
  // --- PENGATURAN OPERASIONAL KANTIN (PRD §9.1) ---
  async getPengaturan(): Promise<PengaturanKantin> {
    const res = await apiClient.get<ApiResponse<PengaturanBackendDto>>(
      '/api/pengaturan-kantin'
    )
    return mapPengaturanFromBackend(res.data.data)
  },

  async updatePengaturan(
    data: PengaturanKantinFormValues
  ): Promise<PengaturanKantin> {
    const jamFormatted =
      data.jamTutupOtomatis.length === 5
        ? `${data.jamTutupOtomatis}:00`
        : data.jamTutupOtomatis

    const payload = {
      namaKantin: data.namaKantin,
      jamTutupOtomatis: jamFormatted,
      konfirmasiManual: data.konfirmasiManual,
      durasiFotoDetik: data.durasiFotoDetik,
      minTopup: data.minTopup,
      maksTopup: data.maksTopup,
      batasSaldoSiswa: data.batasSaldoSiswa,
      kebijakanSaldoMengendap: data.kebijakanSaldoMengendap,
      ambangHari: data.ambangHari,
    }

    const res = await apiClient.put<ApiResponse<PengaturanBackendDto>>(
      '/api/pengaturan-kantin',
      payload
    )
    return mapPengaturanFromBackend(res.data.data)
  },

  // --- TITIK KASIR CRUD (PRD §6.6 & §9.1) ---
  async getTitikKasirList(hanyaAktif = false): Promise<TitikKasir[]> {
    const res = await apiClient.get<ApiResponse<TitikKasirBackendDto[]>>(
      '/api/pengaturan-kantin/titik-kasir',
      {
        params: { hanyaAktif },
      }
    )
    const list = res.data.data || []
    return list.map(mapTitikKasirFromBackend)
  },

  async getTitikKasirDetail(id: number): Promise<TitikKasir> {
    const res = await apiClient.get<ApiResponse<TitikKasirBackendDto>>(
      `/api/pengaturan-kantin/titik-kasir/${id}`
    )
    return mapTitikKasirFromBackend(res.data.data)
  },

  async createTitikKasir(data: TitikKasirFormValues): Promise<TitikKasir> {
    const payload = {
      nama: data.nama,
      kode: data.kode.toUpperCase(),
      aktif: data.aktif,
    }
    const res = await apiClient.post<ApiResponse<TitikKasirBackendDto>>(
      '/api/pengaturan-kantin/titik-kasir',
      payload
    )
    return mapTitikKasirFromBackend(res.data.data)
  },

  async updateTitikKasir(
    id: number,
    data: TitikKasirFormValues
  ): Promise<TitikKasir> {
    const payload = {
      nama: data.nama,
      kode: data.kode.toUpperCase(),
      aktif: data.aktif,
    }
    const res = await apiClient.put<ApiResponse<TitikKasirBackendDto>>(
      `/api/pengaturan-kantin/titik-kasir/${id}`,
      payload
    )
    return mapTitikKasirFromBackend(res.data.data)
  },

  async toggleTitikKasirAktif(id: number, aktif?: boolean): Promise<TitikKasir> {
    const payload = aktif !== undefined ? { aktif } : {}
    const res = await apiClient.patch<ApiResponse<TitikKasirBackendDto>>(
      `/api/pengaturan-kantin/titik-kasir/${id}/toggle`,
      payload
    )
    return mapTitikKasirFromBackend(res.data.data)
  },

  async deleteTitikKasir(id: number): Promise<void> {
    await apiClient.delete(`/api/pengaturan-kantin/titik-kasir/${id}`)
  },
}
