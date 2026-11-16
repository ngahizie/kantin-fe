import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import apiClient from '@/lib/api-client'
import { TitikKasirPage } from '../TitikKasirPage'

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div>Profile</div>,
}))

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div>Theme</div>,
}))

describe('TitikKasirPage Admin UI', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tidak menampilkan tombol Buka POS / Pilih untuk POS / ID Tenant, dan memakai kolom No. berurut', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/pengaturan-kantin/titik-kasir') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: [
              {
                id: 15,
                sekolahId: 1,
                nama: 'Kasir Kantin Utama',
                kode: 'KSR-01',
                aktif: true,
                createdAt: '2026-11-10T08:00:00Z',
                updatedAt: '2026-11-10T08:00:00Z',
              },
              {
                id: 22,
                sekolahId: 1,
                nama: 'Kasir Koperasi',
                kode: 'KSR-02',
                aktif: false,
                createdAt: '2026-11-10T08:00:00Z',
                updatedAt: '2026-11-10T08:00:00Z',
              },
            ],
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const screen = await render(<TitikKasirPage />)

    await expect.element(screen.getByText('Kasir Kantin Utama')).toBeInTheDocument()
    await expect.element(screen.getByText('Kasir Koperasi')).toBeInTheDocument()
    await expect.element(screen.getByText('No.', { exact: true })).toBeInTheDocument()

    // Pastikan tombol/kartu POS & label teknis sudah dihapus
    await expect.element(screen.getByText('Buka POS')).not.toBeInTheDocument()
    await expect.element(screen.getByText('Pilih untuk POS')).not.toBeInTheDocument()
    await expect.element(screen.getByText('Kasir POS Aktif')).not.toBeInTheDocument()
    await expect.element(screen.getByText(/ID Tenant/i)).not.toBeInTheDocument()
    await expect.element(screen.getByText('#15')).not.toBeInTheDocument()
  })
})
