import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { KontrolSiswaPage } from '../KontrolSiswaPage'
import { SidebarProvider } from '@/components/ui/sidebar'
import apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

describe('KontrolSiswaPage Backend Integration', () => {
  it('memuat daftar siswa dari backend endpoint /api/siswa dan /api/kontrol-kartu', async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url === '/api/siswa') {
        return Promise.resolve({
          data: {
            data: [
              {
                siswaId: 101,
                nis: '2024001',
                nama: 'Budi Santoso',
                kelas: '7A',
                saldo: 50000,
              },
              {
                siswaId: 102,
                nis: '2026002',
                nama: 'Siti Rahmawati',
                kelas: 'XI IPS 2',
                saldo: 150000,
              },
            ],
          },
        })
      }
      if (typeof url === 'string' && url.startsWith('/api/kontrol-kartu/SISWA/')) {
        return Promise.resolve({
          data: {
            data: {
              subjekTipe: 'SISWA',
              subjekId: 101,
              diblokir: false,
              limitHarian: 30000,
              adaLimit: true,
              menuDiblokir: [],
              kategoriDiblokir: [],
            },
          },
        })
      }
      return Promise.reject(new Error('not found'))
    })

    const { getByText } = await render(
      <SidebarProvider>
        <KontrolSiswaPage />
      </SidebarProvider>
    )

    // Memastikan pemanggilan ke /api/siswa
    expect(apiClient.get).toHaveBeenCalledWith('/api/siswa', expect.anything())

    // Memastikan nama siswa hasil backend tampil di tabel
    await expect.element(getByText('Budi Santoso')).toBeInTheDocument()
    await expect.element(getByText('Siti Rahmawati')).toBeInTheDocument()
  })
})
