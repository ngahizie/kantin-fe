import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { PengelolaDashboard } from '../components/pengelola-dashboard'
import { TuDashboard } from '../components/tu-dashboard'
import { BendaharaDashboard } from '../components/bendahara-dashboard'
import { AdminDashboard } from '../components/admin-dashboard'
import { KepsekDashboard } from '../components/kepsek-dashboard'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children?: React.ReactNode; to?: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: mockClient,
  default: mockClient,
}))

vi.mock('@/features/laporan/api/laporan-api', () => ({
  laporanApi: {
    getPenjualan: vi.fn().mockResolvedValue({
      penjualanBersih: 1750000,
      penjualanBruto: 1800000,
      jumlahTransaksi: 32,
    }),
    getRekonsiliasi: vi.fn().mockResolvedValue({
      seimbang: true,
      selisih: 0,
      saldoMengendap: 450000,
      penjualanBersih: 1750000,
    }),
    getPenjualanPerKategori: vi.fn().mockResolvedValue([
      { kategori: 'Makanan Berat', totalQty: 40, totalNominal: 400000 },
      { kategori: 'Minuman', totalQty: 60, totalNominal: 300000 },
    ]),
    getRiwayatTransaksiKeseluruhan: vi.fn().mockResolvedValue([
      {
        id: 'TRX-101',
        waktu: '2026-11-17T10:00:00+07:00',
        jenis: 'BELANJA',
        arah: 'DEBIT',
        nominal: 15000,
        titikKasir: 'Kasir Kantin Utama',
        items: [{ nama: 'Nasi Kuning Komplit', qty: 1, harga: 15000, subtotal: 15000 }],
        siswaNama: 'Ahmad Siswa',
      },
    ]),
    getSaldoMengendap: vi.fn().mockResolvedValue({
      totalSaldo: 450000,
      jumlahSiswa: 18,
    }),
    getPembatalan: vi.fn().mockResolvedValue([
      {
        transaksiId: 'TRX-CANCEL-01',
        waktu: '2026-11-17T09:30:00+07:00',
        nominal: 10000,
        alasan: 'Salah pilih item',
        kasirNama: 'Budi Kasir',
        siswaNama: 'Citra',
      },
    ]),
  },
}))

vi.mock('@/features/katalog/api/katalog-api', () => ({
  katalogApi: {
    getMenuList: vi.fn().mockResolvedValue([
      { id: 1, nama: 'Roti Bakar Cokelat', stokBerjalan: 2, stokMinimum: 5, aktif: true, hargaJual: 8000 },
      { id: 2, nama: 'Susu UHT Segar', stokBerjalan: 15, stokMinimum: 5, aktif: true, hargaJual: 6000 },
    ]),
    getKategoriList: vi.fn().mockResolvedValue([
      { id: 1, nama: 'Makanan Berat' },
      { id: 2, nama: 'Minuman' },
    ]),
  },
}))

vi.mock('@/features/pengaturan/api/pengaturan-api', () => ({
  pengaturanApi: {
    getTitikKasirList: vi.fn().mockResolvedValue([
      { id: 1, nama: 'Kasir Kantin Utama', kode: 'POS-01', aktif: true },
      { id: 2, nama: 'Kasir Kantin Cabang', kode: 'POS-02', aktif: false },
    ]),
  },
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

describe('Role Dashboards Component Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders PengelolaDashboard correctly with catalog & stock alerts', async () => {
    const screen = await render(<PengelolaDashboard />)
    await expect.element(screen.getByText('Dashboard Pengelola Kantin')).toBeInTheDocument()
    await expect.element(screen.getByText('Peringatan Stok Barang')).toBeInTheDocument()
    await expect.element(screen.getByText('Roti Bakar Cokelat')).toBeInTheDocument()
  })

  it('renders TuDashboard correctly with deposit & student balance', async () => {
    const screen = await render(<TuDashboard />)
    await expect.element(screen.getByText('Dashboard Layanan TU')).toBeInTheDocument()
    await expect.element(screen.getByText('Top-Up Tunai Hari Ini', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('Status Setoran Kas TU').first()).toBeInTheDocument()

    const statGrid = screen.container.querySelector('.lg\\:grid-cols-4')
    const statCards = statGrid?.querySelectorAll('[data-slot="card"]')
    expect(statCards?.length).toBe(4)
    statCards?.forEach((card) => {
      expect(card.className).toContain('h-full')
    })
  })

  it('renders BendaharaDashboard correctly with cash audit reconciliation', async () => {
    const screen = await render(<BendaharaDashboard />)
    await expect.element(screen.getByText('Dashboard Bendahara Sekolah')).toBeInTheDocument()
    await expect.element(screen.getByText('Status Kecocokan Uang')).toBeInTheDocument()
    await expect.element(screen.getByText('Ringkasan Cek Selisih')).toBeInTheDocument()
  })

  it('renders AdminDashboard correctly with POS registers and cancellation reports', async () => {
    const screen = await render(<AdminDashboard />)
    await expect.element(screen.getByText('Dashboard Admin Sekolah')).toBeInTheDocument()
    await expect.element(screen.getByText('Titik Kasir Aktif')).toBeInTheDocument()
    await expect.element(screen.getByText('Aktivitas Pembatalan Kasir (Refund) Terkini')).toBeInTheDocument()
    await expect.element(screen.getByText(/Void/i)).not.toBeInTheDocument()
  })

  it('renders KepsekDashboard correctly with executive financial breakdown & margin', async () => {
    const screen = await render(<KepsekDashboard />)
    await expect.element(screen.getByText('Dashboard Kepala Sekolah')).toBeInTheDocument()
    await expect.element(screen.getByText('Keuntungan Penjualan', { exact: true }).first()).toBeInTheDocument()
    await expect.element(screen.getByText('Ringkasan Keuangan')).toBeInTheDocument()
  })
})
