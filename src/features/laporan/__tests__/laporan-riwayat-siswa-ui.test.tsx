import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import { LaporanRiwayatSiswaPage } from '../LaporanRiwayatSiswaPage'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/layout/header-actions', () => ({
  HeaderBreadcrumb: ({ section, title }: { section?: string; title: string }) => (
    <div>{section} &gt; {title}</div>
  ),
  HeaderActions: () => <div>Actions</div>,
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div>Profile</div>,
}))

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div>Theme</div>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('LaporanRiwayatSiswaPage Security & Hardening UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/laporan/riwayat-siswa')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    const frame = document.getElementById('receipt-print-iframe')
    if (frame) {
      frame.remove()
    }
  })

  const mockSiswaList = [
    {
      siswaId: 101,
      nis: '2024001',
      nisn: '0012345678',
      nama: 'Ahmad Dahlan',
      kelas: '7A',
      saldo: 150000,
      belanjaHariIni: 25000,
      limitHarian: 50000,
      isBlocked: false,
      parentName: 'Bapak Ahmad',
      parentPhone: '081234567890',
      fotoUrl: 'https://example.com/foto-ahmad.jpg',
    },
    {
      siswaId: 102,
      nis: '',
      nama: '',
      kelas: '',
      saldo: 0,
      belanjaHariIni: 0,
      limitHarian: 0,
      isBlocked: false,
      parentName: '-',
      parentPhone: '-',
      fotoUrl: 'javascript:alert(1)',
    },
  ]

  const mockRiwayatDetail = {
    profil: {
      siswaId: 101,
      nis: '2024001',
      nama: 'Ahmad Dahlan',
      kelas: '7A',
      fotoUrl: 'https://example.com/foto-ahmad.jpg',
      saldo: 150000,
      belanjaHariIni: 25000,
      limitHarian: 50000,
      isBlocked: false,
      parentName: 'Bapak Ahmad',
      parentPhone: '081234567890',
    },
    riwayat: [
      {
        id: '1',
        waktu: '2026-11-20T10:00:00Z',
        jenis: 'BELANJA',
        arah: 'DEBIT',
        nominal: 25000,
        saldoSetelah: 150000,
        titikKasir: 'Kantin Utama',
        petugas: 'Kasir 1',
        referensiId: 'TRX-101-<script>alert("xss")</script>',
        keterangan: 'Makan siang <b>pedas</b>',
        items: [
          {
            menuId: 1,
            nama: 'Nasi Goreng <img src=x onerror=alert(1)>',
            qty: 1,
            harga: 25000,
            subtotal: 25000,
          },
        ],
      },
    ],
  }

  it('menolak parameter siswaId yang tidak terdaftar di sekolah dan tidak membuat phantom profile (SEC-03)', async () => {
    window.history.replaceState({}, '', '/laporan/riwayat-siswa?siswaId=999')

    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/api/laporan/saldo-mengendap/siswa')) {
        return Promise.resolve({ data: { success: true, data: mockSiswaList } })
      }
      return Promise.reject(new Error('404 Not Found'))
    })

    const screen = await render(<LaporanRiwayatSiswaPage />)

    await expect.element(screen.getByText('Pilih Siswa Terlebih Dahulu')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Siswa Tidak Ditemukan', expect.anything())
    expect(window.location.search).not.toContain('siswaId=999')
  })

  it('aman dari crash saat melakukan pencarian pada data siswa yang memiliki properti kosong/null (SEC-05)', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { success: true, data: mockSiswaList },
    })

    const screen = await render(<LaporanRiwayatSiswaPage />)
    await expect.element(screen.getByText('Pilih Siswa Terlebih Dahulu')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholder(/Cari & pilih siswa/i)
    await userEvent.fill(searchInput, 'ahmad')

    await expect.element(screen.getByText('Ahmad Dahlan')).toBeInTheDocument()
  })

  it('meng-escape konten HTML pada pencetakan struk digital untuk mencegah DOM XSS (SEC-01)', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/api/laporan/saldo-mengendap/siswa')) {
        return Promise.resolve({ data: { success: true, data: mockSiswaList } })
      }
      if (url.includes('/api/laporan/siswa/101/riwayat')) {
        return Promise.resolve({ data: { success: true, data: mockRiwayatDetail } })
      }
      return Promise.reject(new Error('Not found'))
    })

    const screen = await render(<LaporanRiwayatSiswaPage />)
    const searchInput = screen.getByPlaceholder(/Cari & pilih siswa/i)
    await userEvent.fill(searchInput, 'Ahmad')

    const studentItem = screen.getByText('Ahmad Dahlan')
    await userEvent.click(studentItem)

    // Tunggu data selesai dimuat dan baris tabel transaksi muncul
    await expect.element(screen.getByText(/Nasi Goreng/i)).toBeInTheDocument()

    const btn = document.querySelector('button[title="Lihat Bukti Struk"]') as HTMLButtonElement
    btn?.click()

    await expect.element(page.getByRole('heading', { name: 'Struk Transaksi Digital' })).toBeInTheDocument()

    const cetakStrukButton = page.getByRole('button', { name: 'Cetak Struk' })
    await userEvent.click(cetakStrukButton)

    const iframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement | null
    expect(iframe).not.toBeNull()

    const iframeHtml = iframe?.contentDocument?.documentElement.innerHTML || ''
    expect(iframeHtml).not.toContain('<script>alert("xss")</script>')
    expect(iframeHtml).toContain('&lt;script&gt;alert("xss")&lt;/script&gt;')
    expect(iframeHtml).not.toContain('<img src=x onerror=alert(1)>')
    expect(iframeHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')

    // Pastikan tidak ada tag script atau img[onerror] yang terefleksi di DOM iframe
    expect(iframe?.contentDocument?.querySelectorAll('script').length).toBe(0)
    expect(iframe?.contentDocument?.querySelectorAll('img[onerror]').length).toBe(0)
  })

  it('tidak merender fotoUrl dengan skema URI berbahaya seperti javascript: (SEC-06)', async () => {
    const maliciousStudentData = {
      profil: {
        ...mockRiwayatDetail.profil,
        siswaId: 102,
        nama: 'Siswa Malicious',
        fotoUrl: 'javascript:alert("exploit")',
      },
      riwayat: [],
    }

    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/api/laporan/saldo-mengendap/siswa')) {
        return Promise.resolve({ data: { success: true, data: mockSiswaList } })
      }
      if (url.includes('/api/laporan/siswa/102/riwayat')) {
        return Promise.resolve({ data: { success: true, data: maliciousStudentData } })
      }
      return Promise.reject(new Error('Not found'))
    })

    const screen = await render(<LaporanRiwayatSiswaPage />)
    const searchInput = screen.getByPlaceholder(/Cari & pilih siswa/i)
    await userEvent.click(searchInput)

    // Pilih siswa kedua yang memiliki fotoUrl javascript:
    const secondStudentItem = screen.getByText('NIS: - •')
    await userEvent.click(secondStudentItem)

    await expect.element(screen.getByText('Siswa Malicious')).toBeInTheDocument()

    // AvatarImage dengan skema javascript: tidak boleh dirender
    const imgElement = document.querySelector('img[src^="javascript:"]')
    expect(imgElement).toBeNull()
  })
})
