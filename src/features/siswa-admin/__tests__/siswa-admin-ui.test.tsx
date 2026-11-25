import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { Route } from '@/routes/_authenticated/siswa/index'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import { useAuthStore } from '@/stores/auth-store'
import { siswaAdminApi } from '../api/siswa-admin-api'
import { SiswaAdminPage } from '../siswa-admin-page'
import type { SiswaManajemenItem } from '../types'

let capturedScanHandler: ((uid: string) => void) | null = null

vi.mock('@/hooks/use-rfid-scanner', () => ({
  useRfidScanner: (options: { onScan: (uid: string) => void; enabled?: boolean }) => {
    if (options.enabled) {
      capturedScanHandler = options.onScan
    } else {
      capturedScanHandler = null
    }
    return { clearBuffer: vi.fn() }
  },
}))

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/header-actions', () => ({
  HeaderBreadcrumb: ({ title }: { title: string }) => <div>{title}</div>,
  HeaderActions: () => <div>Actions</div>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

const INITIAL_STUDENTS: SiswaManajemenItem[] = [
  {
    siswaId: 101,
    nis: '2026001',
    nisn: '0088123456',
    nama: 'Budi Santoso',
    kelas: 'X IPA 1',
    fotoUrl: null,
    aktif: true,
    saldo: 45000,
    rfidUid: '04A1B2C3D4',
    nomorKartu: 'K-2026001',
    namaOrangTua: 'Bambang Santoso',
    teleponOrangTua: '081290011001',
    hubunganOrangTua: 'AYAH',
    updatedAt: '2026-11-24T08:00:00Z',
  },
]

describe('SiswaAdminPage & RBAC /siswa', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    capturedScanHandler = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mengalihkan role selain admin ke /403 dan mengizinkan role admin', () => {
    for (const role of ['kasir', 'tu', 'bendahara', 'pengelola', 'kepsek'] as const) {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        auth: {
          hasRole: (allowed: string[]) => allowed.includes(role),
        },
      } as unknown as ReturnType<typeof useAuthStore.getState>)

      expect(() => Route.options.beforeLoad?.({} as never)).toThrow()
    }

    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        hasRole: (allowed: string[]) => allowed.includes('admin'),
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    expect(() => Route.options.beforeLoad?.({} as never)).not.toThrow()
  })

  it('menempatkan item sidebar Data Siswa & Kartu khusus role admin', () => {
    const pengawasanGroup = sidebarData.navGroups.find((g) => g.title === 'Saldo & Pengawasan')
    const item = pengawasanGroup?.items.find((i) => i.url === '/siswa')
    expect(item).toBeDefined()
    expect(item?.title).toBe('Data Siswa & Kartu')
    expect(item?.roles).toEqual(['admin'])
  })

  it('mendukung tambah siswa + scanner fill tanpa auto-submit, dan menolak duplikat NIS 409', async () => {
    vi.spyOn(siswaAdminApi, 'list').mockResolvedValue(INITIAL_STUDENTS)
    const createSpy = vi
      .spyOn(siswaAdminApi, 'create')
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 409, data: { message: 'NIS sudah terdaftar pada sekolah ini' } },
      })
      .mockResolvedValueOnce({
        siswaId: 102,
        nis: '2026099',
        nama: 'Siti Aminah',
        kelas: 'X IPS 2',
        aktif: true,
        saldo: 0,
        rfidUid: 'DEADBEEF99',
        nomorKartu: 'K-099',
        namaOrangTua: 'Hasan',
        teleponOrangTua: '08123456789',
        hubunganOrangTua: 'AYAH',
      })

    const screen = await render(<SiswaAdminPage />)
    await expect.element(screen.getByText('Budi Santoso')).toBeInTheDocument()

    await screen.getByRole('button', { name: /Tambah Siswa/i }).click()
    await expect.element(screen.getByText('Tambah Siswa & Kartu RFID Baru')).toBeInTheDocument()

    await screen.getByPlaceholder('Contoh: 2026001').fill('2026099')
    await screen.getByPlaceholder('Nama lengkap siswa').fill('Siti Aminah')
    await screen.getByPlaceholder('Mis. X IPA 1').fill('X IPS 2')
    await screen.getByPlaceholder('Mis. Ahmad Santoso').fill('Hasan')
    await screen.getByPlaceholder('0812xxxxxxxx').fill('08123456789')

    // Ketik manual UID RFID tidak boleh memicu submit otomatis
    const uidInput = screen.getByPlaceholder('Tap kartu di USB reader atau ketik UID')
    await uidInput.fill('manualuid1')
    expect(createSpy).not.toHaveBeenCalled()

    // Tap USB scanner mengisi kolom UID tanpa auto-submit
    expect(capturedScanHandler).not.toBeNull()
    capturedScanHandler!('deadbeef99')
    expect(createSpy).not.toHaveBeenCalled()
    await expect.element(uidInput).toHaveValue('deadbeef99')

    await screen.getByPlaceholder('Mis. K-2026-001').fill('K-099')

    // Submit pertama -> 409 duplikat NIS (dialog tetap terbuka)
    await screen.getByRole('button', { name: /Simpan Siswa/i }).click()
    expect(createSpy).toHaveBeenCalledTimes(1)
    await expect.element(screen.getByText('Tambah Siswa & Kartu RFID Baru')).toBeInTheDocument()

    // Submit kedua -> berhasil dengan saldo awal Rp 0
    await screen.getByRole('button', { name: /Simpan Siswa/i }).click()
    expect(createSpy).toHaveBeenCalledTimes(2)
    expect(createSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nis: '2026099',
        nama: 'Siti Aminah',
        rfidUid: 'DEADBEEF99',
      })
    )
    await expect.element(screen.getByText('Siti Aminah')).toBeInTheDocument()
  })

  it('mendukung ganti/lepas kartu RFID dan konfirmasi nonaktifkan siswa', async () => {
    vi.spyOn(siswaAdminApi, 'list').mockResolvedValue(INITIAL_STUDENTS)
    const aturKartuSpy = vi.spyOn(siswaAdminApi, 'aturKartu').mockResolvedValue({
      ...INITIAL_STUDENTS[0],
      rfidUid: 'NEWUID7788',
    })
    const statusSpy = vi.spyOn(siswaAdminApi, 'ubahStatus').mockResolvedValue({
      ...INITIAL_STUDENTS[0],
      rfidUid: 'NEWUID7788',
      aktif: false,
    })

    const screen = await render(<SiswaAdminPage />)
    await expect.element(screen.getByText('Budi Santoso')).toBeInTheDocument()

    // Buka modal Kelola Kartu RFID
    await screen.getByRole('button', { name: /^Kartu$/i }).click()
    await expect.element(screen.getByText('Kelola Kartu RFID Siswa')).toBeInTheDocument()

    expect(capturedScanHandler).not.toBeNull()
    capturedScanHandler!('NEWUID7788')
    expect(aturKartuSpy).not.toHaveBeenCalled()

    await screen.getByRole('button', { name: /Simpan Kartu/i }).click()
    expect(aturKartuSpy).toHaveBeenCalledWith(101, {
      rfidUid: 'NEWUID7788',
      nomorKartu: 'K-2026001',
      nonaktifkanKartu: false,
    })
    await expect.element(screen.getByText('NEWUID7788')).toBeInTheDocument()

    // Konfirmasi nonaktifkan siswa
    await screen.getByRole('button', { name: /^Nonaktifkan$/i }).click()
    await expect.element(screen.getByText('Nonaktifkan Siswa?')).toBeInTheDocument()
    await screen.getByRole('button', { name: /Ya, Nonaktifkan/i }).click()

    expect(statusSpy).toHaveBeenCalledWith(101, false)
    await expect.element(screen.getByText('Nonaktif', { exact: true })).toBeInTheDocument()
  })
})
