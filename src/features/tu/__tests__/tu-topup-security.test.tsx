import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Route } from '@/routes/_authenticated/tu/topup/index'
import { useAuthStore } from '@/stores/auth-store'
import { TopupTunaiPage } from '../TopupTunaiPage'
import {
  generateTopupReferenceId,
  parseSafeTopupNominal,
  sanitizePenyetorName,
  MAX_PENYETOR_LENGTH,
} from '../topup-utils'
import { sanitizeTopupErrorMessage } from '../topup-error'
import apiClient from '@/lib/api-client'

describe('SEC-TOPUP-01: Route Guard /tu/topup/ Security', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/siswa') {
        return {
          data: {
            data: [
              {
                siswaId: 101,
                nis: '24250101',
                nama: 'Ahmad Siswa',
                kelas: '7A',
                saldo: 50000,
                isBlocked: false,
              },
            ],
          },
        }
      }
      if (url === '/api/saldo' || url.includes('/rfid')) {
        return { data: { data: { saldo: 50000, rfidUid: 'UID-A101' } } }
      }
      if (url.includes('/api/pengaturan')) {
        return {
          data: {
            data: {
              minTopup: 5000,
              maksTopup: 500000,
              batasSaldoSiswa: 1000000,
            },
          },
        }
      }
      return { data: { data: null } }
    })
  })

  it('mengalihkan user yang belum terautentikasi ke /sign-in beserta return redirect URL', () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => false,
        hasRole: () => false,
        user: null,
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    const mockLocation = { href: '/tu/topup?filter=active' } as Location

    try {
      // @ts-expect-error - testing TanStack beforeLoad hook directly
      Route.options.beforeLoad?.({ location: mockLocation })
      expect.fail('Seharusnya redirect ke /sign-in')
    } catch (redirectError: unknown) {
      expect(redirectError).toBeDefined()
      const redirectStr = JSON.stringify(redirectError)
      expect(redirectStr).toContain('/sign-in')
      expect(redirectStr).toContain('/tu/topup?filter=active')
    }
  })

  it('mengalihkan user yang login tanpa role tu ke /403', () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => true,
        hasRole: (roles: string[]) => roles.includes('siswa'),
        user: { userId: 123, nama: 'Siswa Non-TU', role: 'siswa' },
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    const mockLocation = { href: '/tu/topup' } as Location

    try {
      // @ts-expect-error - testing TanStack beforeLoad hook directly
      Route.options.beforeLoad?.({ location: mockLocation })
      expect.fail('Seharusnya redirect ke /403')
    } catch (redirectError: unknown) {
      expect(redirectError).toBeDefined()
      const redirectStr = JSON.stringify(redirectError)
      expect(redirectStr).toContain('/403')
    }
  })

  it('mengizinkan akses bagi pengguna dengan role tu', () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => true,
        hasRole: (roles: string[]) => roles.includes('tu'),
        user: { userId: 2, nama: 'Petugas TU', role: 'tu' },
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    const mockLocation = { href: '/tu/topup' } as Location

    expect(() => {
      // @ts-expect-error - testing TanStack beforeLoad hook directly
      Route.options.beforeLoad?.({ location: mockLocation })
    }).not.toThrow()
  })

  describe('SEC-TOPUP-02: Collision-Resistant Reference ID Generator', () => {
    it('menghasilkan nomor referensi unik dengan panjang maksimal 60 karakter', () => {
      const ref = generateTopupReferenceId()
      expect(ref).toBeDefined()
      expect(ref.startsWith('TU-TOPUP-')).toBe(true)
      expect(ref.length).toBeLessThanOrEqual(60)
    })

    it('menghasilkan nilai unik tanpa tabrakan pada pemanggilan berulang (1.000 iterasi)', () => {
      const set = new Set<string>()
      const count = 1000
      for (let i = 0; i < count; i++) {
        const ref = generateTopupReferenceId()
        set.add(ref)
      }
      expect(set.size).toBe(count)
    })

    it('memiliki format tanggal ISO yang konsisten pada prefix referensi', () => {
      const testDate = new Date('2026-11-19T10:30:00Z')
      const ref = generateTopupReferenceId(testDate)
      expect(ref).toContain('TU-TOPUP-20261119-')
    })
  })

  describe('SEC-TOPUP-03: Concurrency Guard / Anti-Double Submit', () => {
    it('mencegah pengiriman ganda (double-click submit) selama proses transaksi berlangsung', async () => {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        auth: {
          isAuthenticated: () => true,
          hasRole: (roles: string[]) => roles.includes('tu'),
          user: { userId: 2, nama: 'Petugas TU Sri', role: 'tu' },
        },
      } as unknown as ReturnType<typeof useAuthStore.getState>)

      let postResolve: (val: unknown) => void = () => {}
      const postPromise = new Promise((resolve) => {
        postResolve = resolve
      })
      const postSpy = vi.spyOn(apiClient, 'post').mockReturnValue(postPromise as never)

      const screen = await render(
        <SidebarProvider>
          <TopupTunaiPage />
        </SidebarProvider>
      )

      // Cari dan pilih siswa
      const comboboxBtn = screen.getByRole('combobox')
      await userEvent.click(comboboxBtn)

      const studentItem = screen.getByText('Ahmad Siswa')
      await userEvent.click(studentItem)

      // Pilih preset nominal Rp 50.000
      const presetBtn = screen.getByRole('button', { name: /50\.000/ })
      await userEvent.click(presetBtn)

      // Dapatkan tombol submit awal
      const submitBtn = screen.getByRole('button', {
        name: /Simpan & Cetak Bukti Penerimaan/i,
      })

      // Klik submit pertama
      await userEvent.click(submitBtn)

      // Verifikasi tombol berubah ke status loading dan dinonaktifkan
      const loadingBtn = screen.getByRole('button', {
        name: /Menyimpan Transaksi/i,
      })
      expect(loadingBtn.element().hasAttribute('disabled')).toBe(true)

      // Dispatch event submit ganda pada form saat transaksi masih pending
      const formEl = screen.container.querySelector('form')
      formEl?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

      // Pastikan post hanya dipanggil 1 kali (tidak ada double execution)
      expect(postSpy).toHaveBeenCalledTimes(1)

      // Selesaikan request pertama
      postResolve({
        data: {
          code: 200,
          data: {
            saldoSebelum: 50000,
            saldoSetelah: 100000,
            waktu: new Date().toISOString(),
          },
        },
      })
    })
  })

  describe('SEC-TOPUP-04: Input Validation & Sanitization (Nominal & Penyetor)', () => {
    it('memvalidasi nominal ke bilangan bulat positif non-desimal', () => {
      expect(parseSafeTopupNominal(50000)).toBe(50000)
      expect(parseSafeTopupNominal('75000')).toBe(75000)
      expect(parseSafeTopupNominal('100.000')).toBe(100000)
      expect(parseSafeTopupNominal(25000.85)).toBe(25000)
      expect(parseSafeTopupNominal(-50000)).toBe(0)
      expect(parseSafeTopupNominal('invalid-str')).toBe(0)
      expect(parseSafeTopupNominal(NaN)).toBe(0)
      expect(parseSafeTopupNominal(Infinity)).toBe(0)
      expect(parseSafeTopupNominal(null)).toBe(0)
      expect(parseSafeTopupNominal(undefined)).toBe(0)
    })

    it('membersihkan dan membatasi panjang nama penyetor maksimal 120 karakter', () => {
      const normal = sanitizePenyetorName('Bpk. Hendra Wijaya')
      expect(normal).toBe('Bpk. Hendra Wijaya')

      const trimmed = sanitizePenyetorName('   Ibu Ratna Dewi   ')
      expect(trimmed).toBe('Ibu Ratna Dewi')

      const withControl = sanitizePenyetorName('\u0000Penyetor Asli\u001F')
      expect(withControl).toBe('Penyetor Asli')

      const longText = 'A'.repeat(MAX_PENYETOR_LENGTH + 50)
      const sanitized = sanitizePenyetorName(longText)
      expect(sanitized.length).toBe(MAX_PENYETOR_LENGTH)
      expect(sanitized).toBe('A'.repeat(MAX_PENYETOR_LENGTH))
    })

    it('mengembalikan string kosong jika tipe penyetor bukan string', () => {
      expect(sanitizePenyetorName(null)).toBe('')
      expect(sanitizePenyetorName(undefined)).toBe('')
      expect(sanitizePenyetorName(12345)).toBe('')
    })
  })

  describe('SEC-TOPUP-05: Error Message Sanitization', () => {
    it('mengembalikan pesan aman saat sesi 401 kedaluwarsa', () => {
      const err = { response: { status: 401 } }
      expect(sanitizeTopupErrorMessage(err)).toBe('Sesi Anda telah kedaluwarsa. Silakan masuk kembali.')
    })

    it('mengembalikan pesan aman saat akses 403 ditolak', () => {
      const err = { response: { status: 403 } }
      expect(sanitizeTopupErrorMessage(err)).toBe(
        'Akses ditolak. Anda tidak memiliki izin untuk melakukan pengisian saldo tunai.'
      )
    })

    it('mengembalikan pesan aman saat data siswa 404 tidak ditemukan', () => {
      const err = { response: { status: 404 } }
      expect(sanitizeTopupErrorMessage(err)).toBe('Data siswa tidak ditemukan di sistem.')
    })

    it('mengembalikan pesan aman saat nomor referensi 409 terdeteksi duplikat', () => {
      const err = { response: { status: 409 } }
      expect(sanitizeTopupErrorMessage(err)).toBe(
        'Transaksi pengisian saldo dengan nomor bukti ini sudah pernah diproses.'
      )
    })

    it('menyembunyikan detail sensitif query SQL, Hibernate, dan stack trace internal', () => {
      const sqlErr = {
        response: {
          status: 500,
          data: {
            message: 'org.hibernate.exception.ConstraintViolationException: duplicate key value violates unique constraint',
          },
        },
      }
      expect(sanitizeTopupErrorMessage(sqlErr)).toBe(
        'Gagal mengisi saldo tunai. Silakan coba beberapa saat lagi.'
      )

      const stackErr = 'java.lang.NullPointerException at com.asqi.scholia_kantin_be.service.saldo.SaldoTopUpService'
      expect(sanitizeTopupErrorMessage(stackErr)).toBe(
        'Gagal mengisi saldo tunai. Silakan coba beberapa saat lagi.'
      )
    })

    it('mempertahankan pesan bisnis valid yang aman dan membersihkan tag kode internal', () => {
      const validErr = {
        response: {
          data: {
            message: 'Nominal top-up melebihi batas saldo maksimal siswa (PRD 8.2)',
          },
        },
      }
      expect(sanitizeTopupErrorMessage(validErr)).toBe(
        'Nominal top-up melebihi batas saldo maksimal siswa'
      )
    })
  })

  describe('SEC-TOPUP-06: Fail-Closed Attribution & Removal of Hardcoded Petugas ID', () => {
    it('menolak proses top-up jika ID petugas tidak valid (fail-closed)', async () => {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        auth: {
          isAuthenticated: () => true,
          hasRole: (roles: string[]) => roles.includes('tu'),
          user: { nama: 'Petugas Tanpa ID' }, // userId sengaja undefined
        },
      } as unknown as ReturnType<typeof useAuthStore.getState>)

      const postSpy = vi.spyOn(apiClient, 'post')

      const screen = await render(
        <SidebarProvider>
          <TopupTunaiPage />
        </SidebarProvider>
      )

      // Cari dan pilih siswa
      const comboboxBtn = screen.getByRole('combobox')
      await userEvent.click(comboboxBtn)

      const studentItem = screen.getByText('Ahmad Siswa')
      await userEvent.click(studentItem)

      // Pilih preset nominal Rp 50.000
      const presetBtn = screen.getByRole('button', { name: /50\.000/ })
      await userEvent.click(presetBtn)

      // Klik submit
      const submitBtn = screen.getByRole('button', {
        name: /Simpan & Cetak Bukti Penerimaan/i,
      })
      await userEvent.click(submitBtn)

      // Tidak boleh memanggil API jika sesi petugas tidak memiliki userId
      expect(postSpy).not.toHaveBeenCalled()
    })
  })
})
