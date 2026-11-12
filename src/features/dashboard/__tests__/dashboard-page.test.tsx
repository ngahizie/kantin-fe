import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { DashboardPage, getStatusBadgeClass } from '../DashboardPage'
import { laporanApi } from '@/features/laporan/api/laporan-api'
import { katalogApi } from '@/features/katalog/api/katalog-api'

let mockRole = 'pengelola'

vi.mock('@/stores/useRoleStore', () => ({
  useRoleStore: () => ({
    currentRole: mockRole,
    schoolName: 'SMP Test',
    canteenName: 'Kantin Test',
  }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      user: {
        userId: '1',
        nama: 'User Test',
        email: 'user@test.com',
        currentRole: mockRole,
        roles: ['PETUGAS'],
      },
    },
  }),
}))

vi.mock('@/components/layout/backoffice-header', () => ({
  BackofficeHeader: () => <div data-testid='backoffice-header'>Header</div>,
}))

vi.mock('@/features/laporan/api/laporan-api', () => ({
  laporanApi: {
    getPenjualan: vi.fn().mockResolvedValue({
      penjualanBersih: 1500000,
      penjualanBruto: 1500000,
      jumlahTransaksi: 25,
    }),
    getRekonsiliasi: vi.fn().mockResolvedValue({
      seimbang: true,
      selisih: 0,
      saldoMengendap: 500000,
      penjualanBersih: 1500000,
    }),
    getPenjualanPerKategori: vi.fn().mockResolvedValue([]),
    getRiwayatTransaksiKeseluruhan: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/features/katalog/api/katalog-api', () => ({
  katalogApi: {
    getMenuList: vi.fn().mockResolvedValue([]),
    getKategoriList: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid='responsive-container'>{children}</div>
  ),
  BarChart: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid='bar-chart'>{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

describe('DashboardPage Role-Based Data Fetching & UI Proteksi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tidak memanggil getRekonsiliasi dan tidak menampilkan card rekonsiliasi kas untuk peran pengelola', async () => {
    mockRole = 'pengelola'
    const screen = await render(<DashboardPage />)

    // Pastikan getPenjualan terpanggil
    expect(laporanApi.getPenjualan).toHaveBeenCalled()
    // Pastikan getRekonsiliasi TIDAK terpanggil untuk peran pengelola
    expect(laporanApi.getRekonsiliasi).not.toHaveBeenCalled()

    // Memverifikasi card rekonsiliasi kas tidak ditampilkan untuk pengelola
    await expect.element(screen.getByText('Status Rekonsiliasi Kas')).not.toBeInTheDocument()
    await expect.element(screen.getByText('Akses Terbatas')).not.toBeInTheDocument()
  })

  it('memanggil getRekonsiliasi dan menampilkan saldo mengendap serta status seimbang untuk peran bendahara', async () => {
    mockRole = 'bendahara'
    const screen = await render(<DashboardPage />)

    // Pastikan getRekonsiliasi terpanggil untuk peran bendahara
    expect(laporanApi.getRekonsiliasi).toHaveBeenCalled()

    // Memverifikasi card rekonsiliasi menampilkan nominal saldo mengendap dan status seimbang
    await expect.element(screen.getByText(/Rp\s*500\.000/)).toBeInTheDocument()
    await expect.element(screen.getByText('Seimbang')).toBeInTheDocument()
  })

  it('tidak menampilkan Rp 0 atau Seimbang palsu saat getRekonsiliasi gagal dimuat', async () => {
    mockRole = 'bendahara'
    vi.mocked(laporanApi.getRekonsiliasi).mockRejectedValueOnce(new Error('Network error'))
    const screen = await render(<DashboardPage />)

    await expect.element(screen.getByText('Belum dimuat')).toBeInTheDocument()
    await expect.element(screen.getByText('Seimbang')).not.toBeInTheDocument()
  })

  it('menampilkan item menu riil dan pembeda siswa dari transaksi-keseluruhan tanpa kategori dummy untuk kepsek', async () => {
    mockRole = 'kepsek'
    const screen = await render(<DashboardPage />)

    await expect.element(screen.getByText('Makanan')).not.toBeInTheDocument()

    mockRole = 'pengelola'
    vi.mocked(laporanApi.getRiwayatTransaksiKeseluruhan).mockResolvedValueOnce([
      {
        id: '990008',
        waktu: '2026-11-10T13:44:00+07:00',
        jenis: 'BELANJA',
        arah: 'DEBIT',
        nominal: 28000,
        saldoSetelah: 464000,
        titikKasir: 'Kasir Kantin Utama',
        petugas: '-',
        referensiId: '960008',
        keterangan: '',
        items: [{ nama: 'Nasi Goreng', qty: 2, harga: 12000, subtotal: 24000 }],
        siswaId: 204,
        siswaNama: 'Siswa #204',
        siswaNis: '204',
        siswaKelas: '-',
      },
    ])
    const pengelolaScreen = await render(<DashboardPage />)
    await expect.element(pengelolaScreen.getByText('2x Nasi Goreng')).toBeInTheDocument()
    await expect.element(pengelolaScreen.getByText('Siswa #204')).toBeInTheDocument()
  })

  it('menghapus efek hover pada baris tabel stok menipis dan aktivitas transaksi kasir terakhir', async () => {
    mockRole = 'pengelola'
    vi.mocked(katalogApi.getMenuList).mockResolvedValueOnce([
      {
        id: 11,
        kategoriId: 1,
        nama: 'Teh Botol Dingin',
        hargaJual: 5000,
        satuan: 'BOTOL',
        stokMinimum: 5,
        stokBerjalan: 2,
        aktif: true,
      },
    ])
    vi.mocked(laporanApi.getRiwayatTransaksiKeseluruhan).mockResolvedValueOnce([
      {
        id: '990009',
        waktu: '2026-11-10T13:45:00+07:00',
        jenis: 'BELANJA',
        arah: 'DEBIT',
        nominal: 15000,
        saldoSetelah: 85000,
        titikKasir: 'Kasir Kantin Utama',
        petugas: '-',
        referensiId: '960009',
        keterangan: '',
        items: [{ nama: 'Mie Goreng Spesial', qty: 1, harga: 15000, subtotal: 15000 }],
        siswaId: 205,
        siswaNama: 'Siswa #205',
        siswaNis: '205',
        siswaKelas: '-',
      },
    ])

    const screen = await render(<DashboardPage />)
    await expect.element(screen.getByText('Teh Botol Dingin')).toBeInTheDocument()
    await expect.element(screen.getByText('Mie Goreng Spesial')).toBeInTheDocument()

    const tables = screen.container.querySelectorAll('table')
    expect(tables).toHaveLength(2)

    tables.forEach((table) => {
      const headerRow = table.querySelector('thead tr')
      const bodyRow = table.querySelector('tbody tr')

      expect(headerRow?.className).toContain('hover:bg-muted/40')
      expect(headerRow?.className).not.toContain('hover:bg-muted/50')
      expect(bodyRow?.className).toContain('hover:bg-transparent')
      expect(bodyRow?.className).not.toContain('hover:bg-muted/30')
      expect(bodyRow?.className).not.toContain('hover:bg-muted/50')
    })

    const emptyScreen = await render(<DashboardPage />)
    await expect
      .element(emptyScreen.getByText('Semua stok menu dalam kondisi aman di atas batas minimum.'))
      .toBeInTheDocument()
    await expect
      .element(emptyScreen.getByText('Belum ada aktivitas transaksi kasir hari ini.'))
      .toBeInTheDocument()

    const emptyTables = emptyScreen.container.querySelectorAll('table')
    expect(emptyTables).toHaveLength(2)
    emptyTables.forEach((table) => {
      const emptyRow = table.querySelector('tbody tr')
      expect(emptyRow?.className).toContain('hover:bg-transparent')
      expect(emptyRow?.className).not.toContain('hover:bg-muted/50')
    })
  })

  it('menampilkan status REFUND (bukan VOID) untuk transaksi kasir yang dibatalkan', async () => {
    mockRole = 'pengelola'
    vi.mocked(laporanApi.getRiwayatTransaksiKeseluruhan).mockResolvedValueOnce([
      {
        id: '990010',
        waktu: '2026-11-10T13:50:00+07:00',
        jenis: 'VOID',
        arah: 'KREDIT',
        nominal: 12000,
        saldoSetelah: 97000,
        titikKasir: 'Kasir Kantin Utama',
        petugas: '-',
        referensiId: '960010',
        keterangan: '',
        items: [{ nama: 'Es Teh Manis', qty: 2, harga: 6000, subtotal: 12000 }],
        siswaId: 206,
        siswaNama: 'Siswa #206',
        siswaNis: '206',
        siswaKelas: '-',
      },
    ])

    const screen = await render(<DashboardPage />)
    const refundBadge = screen.getByText('REFUND', { exact: true })
    await expect.element(refundBadge).toBeInTheDocument()
    await expect.element(refundBadge).toHaveClass('text-rose-700')
    await expect.element(screen.getByText('VOID', { exact: true })).not.toBeInTheDocument()
  })
})

describe('getStatusBadgeClass color semantics', () => {
  it('memberikan warna hijau untuk status positif', () => {
    expect(getStatusBadgeClass('SUKSES')).toContain('text-emerald-700')
    expect(getStatusBadgeClass('BERHASIL')).toContain('text-emerald-700')
    expect(getStatusBadgeClass('SELESAI')).toContain('text-emerald-700')
  })

  it('memberikan warna merah untuk status negatif', () => {
    expect(getStatusBadgeClass('REFUND')).toContain('text-rose-700')
    expect(getStatusBadgeClass('VOID')).toContain('text-rose-700')
    expect(getStatusBadgeClass('GAGAL')).toContain('text-rose-700')
    expect(getStatusBadgeClass('DIBATALKAN')).toContain('text-rose-700')
  })

  it('memberikan warna amber untuk status pending/menunggu', () => {
    expect(getStatusBadgeClass('PENDING')).toContain('text-amber-700')
    expect(getStatusBadgeClass('MENUNGGU')).toContain('text-amber-700')
  })
})
