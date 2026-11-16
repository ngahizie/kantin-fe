import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import apiClient from '@/lib/api-client'
import { LaporanPembatalanPage } from '../LaporanPembatalanPage'

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

describe('LaporanPembatalanPage UI', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('memuat daftar pembatalan kasir, memperkaya nama siswa & titik kasir, serta mendukung pencarian', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/laporan/pembatalan') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: [
              {
                transaksiId: 901,
                subjekTipe: 'SISWA',
                siswaId: 101,
                kartuUid: 'UID-101',
                total: 15000,
                alasanVoid: 'Kartu dipakai bukan pemiliknya',
                voidAt: '2026-11-16T08:30:00+07:00',
                titikKasirId: 1,
                waktu: '2026-11-16T08:25:00+07:00',
              },
              {
                transaksiId: 902,
                subjekTipe: 'SISWA',
                siswaId: 102,
                kartuUid: 'UID-102',
                total: 10000,
                alasanVoid: 'Salah input item pesanan',
                voidAt: '2026-11-16T09:00:00+07:00',
                titikKasirId: 2,
                waktu: '2026-11-16T08:55:00+07:00',
              },
            ],
          },
        }
      }
      if (url === '/api/siswa') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: [
              { id: 101, nama: 'Raka Aditya Pratama', nis: '24250101', kelas: '7A' },
              { id: 102, nama: 'Nadia Safitri', nis: '24250102', kelas: '7A' },
            ],
          },
        }
      }
      if (url === '/api/pengaturan-kantin/titik-kasir') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: [
              { id: 1, nama: 'Kasir Kantin Utama' },
              { id: 2, nama: 'Kasir Lantai 2' },
            ],
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const screen = await render(<LaporanPembatalanPage />)

    await expect.element(screen.getByText('Raka Aditya Pratama')).toBeInTheDocument()
    await expect.element(screen.getByText('Nadia Safitri')).toBeInTheDocument()
    await expect.element(screen.getByText('Kasir Kantin Utama')).toBeInTheDocument()
    await expect.element(screen.getByRole('cell', { name: 'Kartu dipakai bukan pemiliknya' })).toBeInTheDocument()
    await expect.element(screen.getByText(/25\.000/).first()).toBeInTheDocument()

    const search = screen.getByPlaceholder(
      'Cari nama siswa, NIS, titik kasir, atau alasan pembatalan...'
    )
    await userEvent.fill(search, 'Nadia')

    await expect.element(screen.getByText('Nadia Safitri')).toBeInTheDocument()
    await expect.element(screen.getByText('Raka Aditya Pratama')).not.toBeInTheDocument()
  })
})
