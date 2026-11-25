import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import apiClient from '@/lib/api-client'
import { PengaturanKantinPage } from '../pengaturan-kantin-page'

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div>Profile</div>,
}))

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div>Theme</div>,
}))

describe('PengaturanKantinPage UI Validation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('memiliki noValidate pada form dan atribut step/min yang selaras untuk nominal top-up dan saldo', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/pengaturan-kantin') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: {
              sekolahId: 1,
              namaKantin: 'Kantin Sehat SKOOLIA',
              jamTutupOtomatis: '23:59:00',
              konfirmasiManual: false,
              durasiFotoDetik: 3,
              minTopup: 5000,
              maksTopup: 500000,
              batasSaldoSiswa: 1000000,
              kebijakanSaldoMengendap: 'REFUND',
              ambangHari: 90,
            },
          },
        }
      }
      return { data: { code: 200, data: [] } }
    })

    const screen = await render(<PengaturanKantinPage />)

    // 1. Verifikasi form memiliki atribut noValidate
    const form = document.querySelector('form')
    expect(form).not.toBeNull()
    expect(form?.noValidate).toBe(true)

    // 2. Verifikasi input maksTopup memiliki step dan min yang selaras dengan nilai default 500.000
    const maksTopupInput = screen.getByLabelText(/Batas Maksimum Sekali Top-Up/i).element() as HTMLInputElement
    expect(maksTopupInput).toBeDefined()
    const stepMaks = Number(maksTopupInput.step)
    const minMaks = Number(maksTopupInput.min)
    expect((500000 - minMaks) % stepMaks).toBe(0)
    expect(maksTopupInput.checkValidity()).toBe(true)

    // 3. Verifikasi input batasSaldoSiswa memiliki step dan min yang selaras dengan nilai default 1.000.000
    const batasSaldoInput = screen.getByLabelText(/Batas Saldo Maksimum Siswa/i).element() as HTMLInputElement
    expect(batasSaldoInput).toBeDefined()
    const stepSaldo = Number(batasSaldoInput.step)
    const minSaldo = Number(batasSaldoInput.min)
    expect((1000000 - minSaldo) % stepSaldo).toBe(0)
    expect(batasSaldoInput.checkValidity()).toBe(true)
  })
})
