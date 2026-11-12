import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import '@/styles/index.css'
import { Alert, AlertDescription, AlertTitle } from './alert'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './alert-dialog'
import { Card, CardContent } from './card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './dialog'
import { KategoriPage } from '@/features/katalog/KategoriPage'
import { katalogApi } from '@/features/katalog/api/katalog-api'

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: React.ReactNode }) => (
    <header>{children}</header>
  ),
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/layout/header-actions', () => ({
  HeaderActions: () => <div data-testid='header-actions' />,
  HeaderBreadcrumb: () => <div data-testid='header-breadcrumb' />,
}))

describe('Konsistensi border-radius kartu dan kontainer dialog/alert', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('memastikan Card, Alert, DialogContent, dan AlertDialogContent memakai rounded-xl (14px)', async () => {
    await render(
      <div>
        <Card data-testid='base-card'>
          <CardContent>Isi Kartu</CardContent>
        </Card>
        <Alert data-testid='base-alert'>
          <AlertTitle>Info</AlertTitle>
          <AlertDescription>Pesan</AlertDescription>
        </Alert>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Dialog Uji</DialogTitle>
            <DialogDescription>Deskripsi</DialogDescription>
          </DialogContent>
        </Dialog>
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Konfirmasi Uji</AlertDialogTitle>
            <AlertDialogDescription>Deskripsi</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )

    const card = document.querySelector('[data-testid="base-card"]') as HTMLElement
    const alert = document.querySelector('[data-testid="base-alert"]') as HTMLElement
    const dialog = document.querySelector('[data-slot="dialog-content"]') as HTMLElement
    const alertDialog = document.querySelector('[data-slot="alert-dialog-content"]') as HTMLElement

    expect(card).not.toBeNull()
    expect(alert).not.toBeNull()
    expect(dialog).not.toBeNull()
    expect(alertDialog).not.toBeNull()

    expect(getComputedStyle(card).borderRadius).toBe('14px')
    expect(getComputedStyle(alert).borderRadius).toBe('14px')
    expect(getComputedStyle(dialog).borderRadius).toBe('14px')
    expect(getComputedStyle(alertDialog).borderRadius).toBe('14px')
  })

  it('memastikan seluruh kartu ringkasan dan kartu tabel di KategoriPage memiliki border-radius identik (14px)', async () => {
    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue([
      { id: 1, nama: 'Makanan', urutan: 1, aktif: true },
    ])
    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue([])

    const screen = await render(<KategoriPage />)
    await expect.element(screen.getByText('Makanan', { exact: true })).toBeInTheDocument()

    const cards = Array.from(
      document.querySelectorAll('[data-slot="card"]')
    ) as HTMLElement[]
    expect(cards.length).toBe(4)

    const radii = cards.map((el) => getComputedStyle(el).borderRadius)
    for (const radius of radii) {
      expect(radius).toBe('14px')
    }
  })
})
