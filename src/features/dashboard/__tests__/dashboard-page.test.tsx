import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { DashboardPage, getStatusBadgeClass } from '../DashboardPage'
import { laporanApi } from '@/features/laporan/api/laporan-api'

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
  },
}))

vi.mock('@/features/katalog/api/katalog-api', () => ({
  katalogApi: {
    getMenuList: vi.fn().mockResolvedValue([]),
    getKategoriList: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
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

  it('tidak memanggil getRekonsiliasi dan menampilkan Akses Terbatas untuk peran pengelola', async () => {
    mockRole = 'pengelola'
    const screen = await render(<DashboardPage />)

    // Pastikan getPenjualan terpanggil
    expect(laporanApi.getPenjualan).toHaveBeenCalled()
    // Pastikan getRekonsiliasi TIDAK terpanggil untuk peran pengelola
    expect(laporanApi.getRekonsiliasi).not.toHaveBeenCalled()

    // Memverifikasi card rekonsiliasi menampilkan status akses terbatas
    await expect.element(screen.getByText('Akses Terbatas')).toBeInTheDocument()
    await expect.element(screen.getByText('• Dikelola TU & Bendahara')).toBeInTheDocument()
  })

  it('memanggil getRekonsiliasi dan menampilkan status rekonsiliasi untuk peran bendahara', async () => {
    mockRole = 'bendahara'
    const screen = await render(<DashboardPage />)

    // Pastikan getRekonsiliasi terpanggil untuk peran bendahara
    expect(laporanApi.getRekonsiliasi).toHaveBeenCalled()

    // Memverifikasi card rekonsiliasi menampilkan status seimbang
    await expect.element(screen.getByText('Seimbang')).toBeInTheDocument()
  })
})

describe('getStatusBadgeClass color semantics', () => {
  it('memberikan warna hijau untuk status positif', () => {
    expect(getStatusBadgeClass('SUKSES')).toContain('text-emerald-600')
    expect(getStatusBadgeClass('BERHASIL')).toContain('text-emerald-600')
    expect(getStatusBadgeClass('SELESAI')).toContain('text-emerald-600')
  })

  it('memberikan warna merah untuk status negatif', () => {
    expect(getStatusBadgeClass('VOID')).toContain('text-destructive')
    expect(getStatusBadgeClass('GAGAL')).toContain('text-destructive')
    expect(getStatusBadgeClass('DIBATALKAN')).toContain('text-destructive')
  })

  it('memberikan warna amber untuk status pending/menunggu', () => {
    expect(getStatusBadgeClass('PENDING')).toContain('text-amber-700')
    expect(getStatusBadgeClass('MENUNGGU')).toContain('text-amber-700')
  })
})
