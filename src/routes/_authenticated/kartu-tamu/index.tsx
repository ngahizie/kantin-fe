import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/kartu-tamu/')({
  beforeLoad: () => {
    // Kartu tamu ditiadakan (tamu menggunakan pembayaran tunai langsung di kasir)
    throw redirect({
      to: '/tu/topup',
    })
  },
  component: () => null,
})
