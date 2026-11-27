import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import apiClient from '@/lib/api-client'
import { useRoleStore } from '@/stores/use-role-store'
import { useAuthStore } from '@/stores/auth-store'
import { laporanApi } from '../api/laporan-api'
import { LaporanPenjualanPage } from '../laporan-penjualan-page'
import { LaporanRiwayatSiswaPage } from '../laporan-riwayat-siswa-page'
import { SetoranKasPage } from '@/features/tu/setoran-kas-page'
import { PengaturanKantinPage } from '@/features/pengaturan/pengaturan-kantin-page'
import { usePengaturanStore } from '@/stores/use-pengaturan-store'
import { DEFAULT_PENGATURAN_KANTIN } from '@/features/pengaturan/types'

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

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

describe('Issue #222 — Sinkronisasi Ekspor & Daftar Laporan BE <-> FE', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useRoleStore.setState({ currentRole: 'bendahara' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('laporanApi.eksporExcel memanggil GET /api/laporan/ekspor blob dan membaca Content-Disposition', async () => {
    const mockBlob = new Blob(['xlsx-bytes'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockBlob,
      headers: {
        'content-disposition': 'attachment; filename="Laporan_PENJUALAN_TITIK.xlsx"',
      },
    })
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const filename = await laporanApi.eksporExcel({
      jenis: 'PENJUALAN_TITIK',
      tanggal: '2026-11-26',
    })

    expect(filename).toBe('Laporan_PENJUALAN_TITIK.xlsx')
    expect(getSpy).toHaveBeenCalledWith('/api/laporan/ekspor', {
      params: { jenis: 'PENJUALAN_TITIK', tanggal: '2026-11-26' },
      responseType: 'blob',
      timeout: 45000,
      skipToast: true,
    })
    expect(createUrlSpy).toHaveBeenCalledTimes(1)
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('laporanApi.eksporExcel mengekstrak pesan JSON 503 dari Blob dan menerjemahkan error timeout', async () => {
    const busyBlob = new Blob(
      [JSON.stringify({ code: 503, message: 'Server sedang sibuk: antrean ekspor penuh. Silakan ulangi.' })],
      { type: 'application/json' }
    )
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce({
      response: { status: 503, data: busyBlob },
    })

    await expect(
      laporanApi.eksporExcel({ jenis: 'PENJUALAN', tanggal: '2026-11-26' })
    ).rejects.toThrow('Server sedang sibuk: antrean ekspor penuh. Silakan ulangi.')

    vi.spyOn(apiClient, 'get').mockRejectedValueOnce({
      code: 'ECONNABORTED',
      message: 'timeout of 45000ms exceeded',
    })

    await expect(
      laporanApi.eksporExcel({ jenis: 'PENJUALAN', tanggal: '2026-11-26' })
    ).rejects.toThrow('Ekspor laporan melebihi batas waktu')
  })

  it('LaporanPenjualanPage menampilkan tab Per Titik Kasir & Per Petugas serta mengekspor jenis sesuai tab', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/laporan/penjualan') {
        return {
          data: {
            code: 200,
            data: {
              jumlahTransaksi: 10,
              penjualanBruto: 100000,
              jumlahRefund: 0,
              nilaiRefund: 0,
              penjualanBersih: 100000,
              totalModal: 60000,
              laba: 40000,
              marginPersen: 40,
            },
          },
        }
      }
      if (url === '/api/laporan/penjualan/item') {
        return { data: { code: 200, data: [] } }
      }
      if (url === '/api/laporan/penjualan/kategori') {
        return { data: { code: 200, data: [] } }
      }
      if (url === '/api/laporan/penjualan/titik') {
        return {
          data: {
            code: 200,
            data: [
              {
                kunciId: 1,
                nama: 'Loket Kantin A',
                jumlahTransaksi: 6,
                nilai: 60000,
                hpp: 36000,
                labaKotor: 24000,
              },
            ],
          },
        }
      }
      if (url === '/api/laporan/penjualan/petugas') {
        return {
          data: {
            code: 200,
            data: [
              {
                kunciId: 7,
                nama: 'Nurul Kasir',
                jumlahTransaksi: 4,
                nilai: 40000,
                hpp: 24000,
                labaKotor: 16000,
              },
            ],
          },
        }
      }
      if (url === '/api/laporan/penjualan/kasir') {
        return { data: { code: 200, data: [] } }
      }
      if (url.startsWith('/api/katalog/')) {
        return { data: { code: 200, data: [] } }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const eksporSpy = vi
      .spyOn(laporanApi, 'eksporExcel')
      .mockResolvedValue('Laporan_PENJUALAN_PETUGAS.xlsx')

    const screen = await render(<LaporanPenjualanPage />)

    await expect.element(screen.getByRole('tab', { name: /Per Titik Kasir \(1\)/i })).toBeInTheDocument()
    await expect.element(screen.getByRole('tab', { name: /Per Petugas \(1\)/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /Per Titik Kasir \(1\)/i }))
    await expect.element(screen.getByText('Loket Kantin A')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /Per Petugas \(1\)/i }))
    await expect.element(screen.getByText('Nurul Kasir')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Ekspor$/i }))
    await userEvent.click(screen.getByTestId('btn-export-excel-option'))

    expect(eksporSpy).toHaveBeenCalledWith(
      expect.objectContaining({ jenis: 'PENJUALAN_PETUGAS' })
    )
  })

  it('LaporanRiwayatSiswaPage memuat ringkasan /api/laporan/per-siswa dan menyembunyikan HPP untuk admin', async () => {
    useRoleStore.setState({ currentRole: 'admin' })
    window.history.replaceState({}, '', '/laporan/riwayat-siswa?siswaId=101')

    vi.spyOn(laporanApi, 'getSiswaSaldoList').mockResolvedValue([
      {
        siswaId: 101,
        nis: '2026001',
        nama: 'Budi Santoso',
        kelas: 'X IPA 1',
        saldo: 45000,
        limitHarian: 30000,
        belanjaHariIni: 10000,
        isBlocked: false,
        parentName: 'Bambang',
        parentPhone: '0812',
      },
    ])
    vi.spyOn(laporanApi, 'getRiwayatBelanjaSiswa').mockResolvedValue({
      profil: {
        siswaId: 101,
        nis: '2026001',
        nama: 'Budi Santoso',
        kelas: 'X IPA 1',
        saldo: 45000,
        limitHarian: 30000,
        belanjaHariIni: 10000,
        isBlocked: false,
        parentName: 'Bambang',
        parentPhone: '0812',
      },
      riwayat: [],
    })
    const perSiswaSpy = vi.spyOn(laporanApi, 'getPerSiswa').mockResolvedValue({
      subjekTipe: 'SISWA',
      siswaId: 101,
      saldo: 45000,
      periode: '2026-11-26 s/d 2026-11-26',
      ringkasan: {
        jumlahTransaksiSukses: 3,
        nilaiBelanjaSukses: 35000,
        jumlahTransaksiVoid: 0,
        nilaiVoid: 0,
        totalTopup: 50000,
        totalHpp: null,
      },
      transaksi: [],
      mutasiSaldo: [],
    })

    const screen = await render(<LaporanRiwayatSiswaPage />)

    await expect.element(screen.getByTestId('ringkasan-per-siswa')).toBeInTheDocument()
    await expect.element(screen.getByText(/Belanja Sukses \(3x\)/i)).toBeInTheDocument()
    await expect.element(screen.getByText(/Total Modal \(HPP\)/i)).not.toBeInTheDocument()
    expect(perSiswaSpy).toHaveBeenCalledWith(101)

    window.history.replaceState({}, '', '/laporan/riwayat-siswa')
  })

  it('SetoranKasPage memanggil /api/laporan/setoran-tu dan mengekspor SETORAN_TU via server untuk bendahara', async () => {
    useAuthStore.getState().auth.setUser({
      userId: 5,
      nama: 'Bendahara Sekolah',
      email: 'bendahara@kantin.id',
      sekolahId: 1,
      sekolahNama: 'SMA 1',
      roles: ['bendahara'],
      currentRole: 'bendahara',
    })

    const setoranSpy = vi.spyOn(laporanApi, 'getSetoranTu').mockResolvedValue([
      {
        petugasId: 3,
        tanggal: '2026-11-26',
        totalTopup: 150000,
        jumlahDisetor: 150000,
        selisih: 0,
        referensiId: 'SETOR-001',
      },
    ])
    const eksporSpy = vi
      .spyOn(laporanApi, 'eksporExcel')
      .mockResolvedValue('Laporan_SETORAN_TU.xlsx')

    const screen = await render(<SetoranKasPage />)

    await vi.waitFor(() => {
      expect(setoranSpy).toHaveBeenCalledTimes(1)
    })

    await userEvent.click(screen.getByTestId('btn-setoran-kas-export'))
    await userEvent.click(screen.getByTestId('btn-export-excel-option'))

    expect(eksporSpy).toHaveBeenCalledWith(
      expect.objectContaining({ jenis: 'SETORAN_TU' })
    )
  })

  it('PengaturanKantinPage menampilkan status aktivasi modul dari /api/pengaturan-kantin/aktivasi-modul', async () => {
    usePengaturanStore.setState({
      fetchPengaturan: vi.fn().mockResolvedValue(DEFAULT_PENGATURAN_KANTIN),
      pengaturan: DEFAULT_PENGATURAN_KANTIN,
      loadingPengaturan: false,
    })

    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/pengaturan-kantin/aktivasi-modul') {
        return {
          data: {
            code: 200,
            data: {
              sekolahId: 1,
              aktif: true,
              diketahui: true,
              catatan: 'Modul Kantin aktif via internal-be',
              feeTopup: 0,
            },
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const screen = await render(<PengaturanKantinPage />)

    await expect.element(screen.getByTestId('banner-aktivasi-modul')).toBeInTheDocument()
    await expect.element(screen.getByText(/Modul Kantin aktif via internal-be/i)).toBeInTheDocument()
  })
})
