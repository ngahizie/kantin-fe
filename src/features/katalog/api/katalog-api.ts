import apiClient from '@/lib/api-client'
import type {
  KategoriItem,
  MenuItem,
  KategoriFormValues,
  MenuFormValues,
  UploadResponseData,
} from '../types'

interface ApiResponse<T> {
  responseCode?: number
  code?: number
  message?: string
  data: T
}

export const katalogApi = {
  // --- KATEGORI ---
  async getKategoriList(hanyaAktif = false): Promise<KategoriItem[]> {
    const res = await apiClient.get<ApiResponse<KategoriItem[]>>('/api/katalog/kategori', {
      params: { hanyaAktif },
    })
    return res.data.data || []
  },

  async createKategori(data: KategoriFormValues): Promise<KategoriItem> {
    const res = await apiClient.post<ApiResponse<KategoriItem>>('/api/katalog/kategori', {
      nama: data.nama,
      urutan: data.urutan ?? 0,
    })
    return res.data.data
  },

  async updateKategori(id: number, data: KategoriFormValues): Promise<KategoriItem> {
    const res = await apiClient.put<ApiResponse<KategoriItem>>(`/api/katalog/kategori/${id}`, {
      nama: data.nama,
      urutan: data.urutan ?? 0,
      aktif: data.aktif,
    })
    return res.data.data
  },

  async deleteKategori(id: number): Promise<void> {
    await apiClient.delete(`/api/katalog/kategori/${id}`)
  },

  // --- MENU ---
  async getMenuList(kategoriId?: number, hanyaAktif = false): Promise<MenuItem[]> {
    const res = await apiClient.get<ApiResponse<MenuItem[]>>('/api/katalog/menu', {
      params: {
        kategoriId: kategoriId || undefined,
        hanyaAktif,
      },
    })
    return res.data.data || []
  },

  async getMenuDetail(id: number): Promise<MenuItem> {
    const res = await apiClient.get<ApiResponse<MenuItem>>(`/api/katalog/menu/${id}`)
    return res.data.data
  },

  async createMenu(data: MenuFormValues): Promise<MenuItem> {
    const res = await apiClient.post<ApiResponse<MenuItem>>('/api/katalog/menu', {
      nama: data.nama,
      kategoriId: data.kategoriId,
      hargaJual: data.hargaJual,
      satuan: data.satuan,
      fotoUrl: data.fotoUrl || null,
      stokMinimum: data.stokMinimum,
    })
    return res.data.data
  },

  async updateMenu(id: number, data: MenuFormValues): Promise<MenuItem> {
    const res = await apiClient.put<ApiResponse<MenuItem>>(`/api/katalog/menu/${id}`, {
      nama: data.nama,
      kategoriId: data.kategoriId,
      hargaJual: data.hargaJual,
      satuan: data.satuan,
      fotoUrl: data.fotoUrl || null,
      stokMinimum: data.stokMinimum,
      aktif: data.aktif,
    })
    return res.data.data
  },

  async deleteMenu(id: number): Promise<void> {
    await apiClient.delete(`/api/katalog/menu/${id}`)
  },

  // --- STORAGE / UPLOAD ---
  async uploadFoto(file: File, folder = 'menu'): Promise<UploadResponseData> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const res = await apiClient.post<ApiResponse<UploadResponseData>>('/api/storage/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data.data
  },

  /** Helper untuk resolusi URL gambar (jika path relatif, arahkan ke file storage endpoint) */
  getImageUrl(pathOrUrl?: string | null): string {
    if (!pathOrUrl) return ''
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl
    }
    const baseURL = apiClient.defaults.baseURL || ''
    return `${baseURL}/api/storage/file?path=${encodeURIComponent(pathOrUrl)}`
  },
}
