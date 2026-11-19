import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { KartuSiswaMock } from '@/types/kantin'
import { LimitBlokirForm } from '../LimitBlokirForm'

const SAMPLE_STUDENT: KartuSiswaMock = {
  uid: 'UID-101',
  siswa_id: 101,
  nis: '24250101',
  nama: 'Raka Aditya Pratama',
  kelas: '7A',
  foto_url: '',
  saldo: 150000,
  limit_harian: 0,
  limit_harian_enabled: false,
  belanja_hari_ini: 0,
  is_blocked: false,
  alasan_blokir: null,
  blocked_items: [],
  blocked_categories: [],
  parent_app_registered: false,
}

describe('LimitBlokirForm Blokir Kartu Siswa', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('menyediakan fitur Blokir Kartu RFID Siswa beserta alasan dan mengirim POST /api/kontrol-kartu/blokir tanpa field catatan fiktif', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/katalog/kategori' || url === '/api/katalog/menu') {
        return { data: { code: 200, status: 'SUCCESS', data: [] } }
      }
      if (url === '/api/kontrol-kartu/101') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: {
              siswaId: 101,
              diblokir: false,
              alasanBlokir: null,
              adaLimit: false,
              limitHarian: null,
              menuDiblokir: [],
              kategoriDiblokir: [],
            },
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { code: 200 } })
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { code: 200 } })
    const onSaveSuccess = vi.fn()

    const screen = await render(
      <LimitBlokirForm
        open={true}
        onOpenChange={vi.fn()}
        student={SAMPLE_STUDENT}
        onSaveSuccess={onSaveSuccess}
      />
    )

    await expect.element(screen.getByText('Blokir Kartu RFID Siswa')).toBeInTheDocument()
    await expect
      .element(screen.getByText('Catatan / Dasar Permintaan Orang Tua'))
      .not.toBeInTheDocument()

    // Aktifkan switch blokir kartu
    const blokirSwitch = screen.getByRole('switch', { name: 'Blokir Kartu RFID Siswa' })
    await userEvent.click(blokirSwitch)

    const alasanInput = screen.getByLabelText('Alasan Pemblokiran Kartu')
    await expect.element(alasanInput).toBeInTheDocument()
    await userEvent.fill(alasanInput, 'Kartu hilang di sekolah')

    const submitBtn = screen.getByRole('button', { name: 'Simpan Pengaturan Kontrol' })
    await userEvent.click(submitBtn)

    await vi.waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/api/kontrol-kartu/blokir', {
        subjekTipe: 'SISWA',
        siswaId: 101,
        diblokir: true,
        alasan: 'Kartu hilang di sekolah',
      })
      expect(putSpy).toHaveBeenCalledWith('/api/kontrol-kartu/limit-harian', {
        subjekTipe: 'SISWA',
        siswaId: 101,
        nominal: null,
      })
      expect(onSaveSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          siswa_id: 101,
          is_blocked: true,
          alasan_blokir: 'Kartu hilang di sekolah',
        })
      )
    })
  })

  it('menampilkan warning terstruktur jika terjadi partial failure pada salah satu mutasi kontrol', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/katalog/kategori' || url === '/api/katalog/menu') {
        return { data: { code: 200, status: 'SUCCESS', data: [] } }
      }
      if (url === '/api/kontrol-kartu/101') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: {
              siswaId: 101,
              diblokir: false,
              alasanBlokir: null,
              adaLimit: false,
              limitHarian: null,
              menuDiblokir: [],
              kategoriDiblokir: [],
            },
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    // Blokir kartu berhasil, tetapi set limit harian gagal (partial failure)
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { code: 200 } })
    vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Gagal simpan limit'))
    const toastWarnSpy = vi.spyOn(toast, 'warning').mockImplementation(() => '' as unknown as string | number)
    const onSaveSuccess = vi.fn()

    const screen = await render(
      <LimitBlokirForm
        open={true}
        onOpenChange={vi.fn()}
        student={SAMPLE_STUDENT}
        onSaveSuccess={onSaveSuccess}
      />
    )

    const blokirSwitch = screen.getByRole('switch', { name: 'Blokir Kartu RFID Siswa' })
    await userEvent.click(blokirSwitch)

    const alasanInput = screen.getByLabelText('Alasan Pemblokiran Kartu')
    await userEvent.fill(alasanInput, 'Kartu rusak fisik')

    const submitBtn = screen.getByRole('button', { name: 'Simpan Pengaturan Kontrol' })
    await userEvent.click(submitBtn)

    await vi.waitFor(() => {
      expect(toastWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sebagian pengaturan berhasil disimpan')
      )
      expect(onSaveSuccess).not.toHaveBeenCalled()
    })
  })

  it('menampilkan error jika seluruh mutasi kontrol gagal ditolak backend', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/katalog/kategori' || url === '/api/katalog/menu') {
        return { data: { code: 200, status: 'SUCCESS', data: [] } }
      }
      if (url === '/api/kontrol-kartu/101') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: {
              siswaId: 101,
              diblokir: false,
              alasanBlokir: null,
              adaLimit: false,
              limitHarian: null,
              menuDiblokir: [],
              kategoriDiblokir: [],
            },
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    vi.spyOn(apiClient, 'put').mockRejectedValue({
      response: { data: { message: 'Akses ditolak atau sesi kedaluwarsa' } },
    })
    const toastErrorSpy = vi.spyOn(toast, 'error').mockImplementation(() => '' as unknown as string | number)
    const onSaveSuccess = vi.fn()

    const screen = await render(
      <LimitBlokirForm
        open={true}
        onOpenChange={vi.fn()}
        student={SAMPLE_STUDENT}
        onSaveSuccess={onSaveSuccess}
      />
    )

    const submitBtn = screen.getByRole('button', { name: 'Simpan Pengaturan Kontrol' })
    await userEvent.click(submitBtn)

    await vi.waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('Akses ditolak atau sesi kedaluwarsa')
      expect(onSaveSuccess).not.toHaveBeenCalled()
    })
  })
})
