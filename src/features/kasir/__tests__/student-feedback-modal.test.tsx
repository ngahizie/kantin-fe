import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { StudentFeedbackModal } from '../components/StudentFeedbackModal'

describe('StudentFeedbackModal', () => {
  it('dapat merender modal transaksi tanpa error meskipun data.pembeli bernilai undefined (flat backend response)', async () => {
    // Simulasi respons langsung dari backend TapResponse (flat tanpa objek pembeli)
    const backendData = {
      transaksiId: 9988,
      subjekTipe: 'SISWA' as const,
      nama: 'Budi Handoko',
      kelas: 'VIII-B',
      fotoUrl: 'https://example.com/foto.jpg',
      total: 25000,
      saldoSisa: 75000,
    } as any

    const onComplete = vi.fn()
    const onVoid = vi.fn()

    const screen = await render(
      <StudentFeedbackModal
        open={true}
        onOpenChange={vi.fn()}
        data={backendData}
        onComplete={onComplete}
        onVoid={onVoid}
      />
    )

    await expect.element(screen.getByText('Transaksi Berhasil')).toBeInTheDocument()
    await expect.element(screen.getByText('Budi Handoko')).toBeInTheDocument()
    await expect.element(screen.getByText('VIII-B')).toBeInTheDocument()
    await expect.element(screen.getByText('Rp 25.000')).toBeInTheDocument()
    await expect.element(screen.getByText('Rp 75.000')).toBeInTheDocument()
  })

  it('dapat merender modal transaksi dari struktur dengan objek pembeli bersarang (mock style)', async () => {
    const mockData = {
      transaksi_id: 1122,
      total: 10000,
      waktu: new Date().toISOString(),
      pembeli: {
        tipe: 'SISWA' as const,
        subjekTipe: 'SISWA' as const,
        nama: 'Siti Rahma',
        kelas: 'IX-A',
        nis: '12345',
        foto_url: null,
        sisa_saldo: 40000,
      },
    }

    const screen = await render(
      <StudentFeedbackModal
        open={true}
        onOpenChange={vi.fn()}
        data={mockData}
        onComplete={vi.fn()}
        onVoid={vi.fn()}
      />
    )

    await expect.element(screen.getByText('Siti Rahma')).toBeInTheDocument()
    await expect.element(screen.getByText('IX-A')).toBeInTheDocument()
    await expect.element(screen.getByText('NIS: 12345')).toBeInTheDocument()
  })

  it('menggunakan default hitung mundur 15 detik untuk menutup otomatis', async () => {
    const mockData = {
      transaksi_id: 3344,
      total: 10000,
      waktu: new Date().toISOString(),
      pembeli: {
        tipe: 'SISWA' as const,
        subjekTipe: 'SISWA' as const,
        nama: 'Ahmad Faiz',
        kelas: 'VII-C',
        nis: '9876',
        foto_url: null,
        sisa_saldo: 40000,
      },
    }

    const screen = await render(
      <StudentFeedbackModal
        open={true}
        onOpenChange={vi.fn()}
        data={mockData}
        onComplete={vi.fn()}
        onVoid={vi.fn()}
      />
    )

    await expect.element(screen.getByText('15', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText(/Menutup otomatis dalam/i)).toBeInTheDocument()
  })

  it('dapat menerima durasiDetik kustom dalam hitungan detik', async () => {
    const mockData = {
      transaksi_id: 3345,
      total: 10000,
      waktu: new Date().toISOString(),
      pembeli: {
        tipe: 'SISWA' as const,
        subjekTipe: 'SISWA' as const,
        nama: 'Ahmad Faiz',
        kelas: 'VII-C',
        nis: '9876',
        foto_url: null,
        sisa_saldo: 40000,
      },
    }

    const screen = await render(
      <StudentFeedbackModal
        open={true}
        onOpenChange={vi.fn()}
        data={mockData}
        onComplete={vi.fn()}
        onVoid={vi.fn()}
        durasiDetik={42}
      />
    )

    await expect.element(screen.getByText('42', { exact: true })).toBeInTheDocument()
  })
})
