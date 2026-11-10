import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/laporan/laba-kotor/')({
  beforeLoad: () => {
    // Halaman Analisis Laba Kotor telah disatukan ke Laporan Penjualan & Laba Kotor
    throw redirect({
      to: '/laporan/penjualan',
    })
  },
  component: () => null,
})
