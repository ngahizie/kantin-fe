import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { CekSaldoModal } from '../components/CekSaldoModal'
import { kasirApi } from '../api/kasir-api'

let capturedOnScan: ((uid: string) => void) | null = null

vi.mock('@/hooks/useRfidScanner', () => ({
  useRfidScanner: (options: { onScan: (uid: string) => void; enabled?: boolean }) => {
    if (options.enabled) {
      capturedOnScan = options.onScan
    } else {
      capturedOnScan = null
    }
  },
}))

describe('CekSaldoModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    capturedOnScan = null
  })

  it('tidak langsung memeriksa saat UID diketik manual dan hanya memeriksa saat tombol Periksa diklik', async () => {
    const cekSaldoSpy = vi.spyOn(kasirApi, 'cekSaldo').mockResolvedValue({
      id: 101,
      uid: '04A1B2C3D4',
      nama: 'Ahmad Faiz',
      kelas: 'VII-A',
      nis: '2026001',
      fotoUrl: null,
      saldo: 45000,
      status: 'ACTIVE',
      limitHarian: 50000,
      sisaLimit: 30000,
      bisaBelanja: true,
    })

    const screen = await render(
      <CekSaldoModal open={true} onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByText('Cek Saldo Siswa')).toBeInTheDocument()

    const input = screen.getByPlaceholder(/Tap kartu atau ketik UID kartu RFID/i)
    const periksaButton = screen.getByRole('button', { name: /Periksa/i })

    // Ketik UID manual secara lengkap
    await input.fill('04A1B2C3D4')

    // Verifikasi tidak langsung diperiksa otomatis saat pengetikan manual
    await new Promise((r) => setTimeout(r, 200))
    expect(cekSaldoSpy).not.toHaveBeenCalled()
    await expect.element(screen.getByText('Ahmad Faiz')).not.toBeInTheDocument()

    // Pemeriksaan baru berjalan saat tombol Periksa diklik
    await periksaButton.click()

    expect(cekSaldoSpy).toHaveBeenCalledTimes(1)
    expect(cekSaldoSpy).toHaveBeenCalledWith('04A1B2C3D4')
    await expect.element(screen.getByText('Ahmad Faiz')).toBeInTheDocument()
    await expect.element(screen.getByText('Rp 45.000')).toBeInTheDocument()
  })

  it('tetap otomatis langsung memeriksa saat kartu di-tap lewat RFID scanner', async () => {
    const cekSaldoSpy = vi.spyOn(kasirApi, 'cekSaldo').mockResolvedValue({
      id: 102,
      uid: '04FFEE1122',
      nama: 'Siti Rahmawati',
      kelas: 'VIII-B',
      nis: '2026002',
      fotoUrl: null,
      saldo: 75000,
      status: 'ACTIVE',
      limitHarian: 50000,
      sisaLimit: 50000,
      bisaBelanja: true,
    })

    const screen = await render(
      <CekSaldoModal open={true} onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByText('Cek Saldo Siswa')).toBeInTheDocument()

    // Simulasi tap RFID reader hardware
    expect(capturedOnScan).not.toBeNull()
    capturedOnScan!('04FFEE1122')

    // Harus langsung memanggil API cek saldo tanpa perlu klik tombol Periksa
    await new Promise((r) => setTimeout(r, 100))
    expect(cekSaldoSpy).toHaveBeenCalledTimes(1)
    expect(cekSaldoSpy).toHaveBeenCalledWith('04FFEE1122')

    // Informasi saldo siswa langsung muncul
    await expect.element(screen.getByText('Siti Rahmawati')).toBeInTheDocument()
    await expect.element(screen.getByText('Rp 75.000')).toBeInTheDocument()
  })

  it('menampilkan pesan error saat kartu tidak ditemukan', async () => {
    vi.spyOn(kasirApi, 'cekSaldo').mockRejectedValue(
      new Error('Kartu tidak dikenali atau belum terdaftar')
    )

    const screen = await render(
      <CekSaldoModal open={true} onOpenChange={vi.fn()} />
    )

    const input = screen.getByPlaceholder(/Tap kartu atau ketik UID kartu RFID/i)
    const periksaButton = screen.getByRole('button', { name: /Periksa/i })

    await input.fill('9999999999')
    await periksaButton.click()

    await expect
      .element(screen.getByText('Kartu tidak dikenali atau belum terdaftar'))
      .toBeInTheDocument()
  })
})
