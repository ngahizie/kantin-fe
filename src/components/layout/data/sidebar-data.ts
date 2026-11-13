import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Tag,
  Boxes,
  Banknote,
  Receipt,
  ReceiptText,
  ArrowLeftRight,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Staf Kantin',
    email: 'staf@skoolia.id',
    avatar: '/avatars/shadcn.jpg',
    role: 'Admin Sekolah',
    schoolName: 'PAUD SKOOLIA',
  },
  teams: [
    {
      name: 'Kantin SKOOLIA',
      logo: '/logo.png',
      plan: 'PAUD SKOOLIA',
    },
  ],
  navGroups: [
    {
      title: 'Kasir & Ringkasan',
      roles: ['admin', 'pengelola', 'kasir', 'tu', 'bendahara', 'kepsek'],
      items: [
        {
          title: 'Dashboard Ringkasan',
          url: '/',
          icon: LayoutDashboard,
          roles: ['admin', 'pengelola', 'tu', 'bendahara', 'kepsek'],
        },
        {
          title: 'Kasir POS',
          url: '/kasir',
          icon: ShoppingCart,
          roles: ['kasir'],
        },
      ],
    },
    {
      title: 'Katalog & Inventaris',
      roles: ['pengelola', 'bendahara'],
      items: [
        {
          title: 'Katalog Menu',
          url: '/menu',
          icon: UtensilsCrossed,
          roles: ['pengelola'],
        },
        {
          title: 'Kategori Menu',
          url: '/kategori',
          icon: Tag,
          roles: ['pengelola'],
        },
        {
          title: 'Manajemen Stok',
          icon: Boxes,
          roles: ['pengelola', 'bendahara'],
          items: [
            {
              title: 'Stok Opname & Rusak',
              url: '/stok/opname',
              roles: ['pengelola'],
            },
            {
              title: 'Kartu Stok Mutasi',
              url: '/stok/kartu',
              roles: ['pengelola', 'bendahara'],
            },
            {
              title: 'Laporan Inventaris',
              url: '/stok/inventaris',
              roles: ['pengelola', 'bendahara'],
            },
          ],
        },
      ],
    },
    {
      title: 'Layanan TU',
      roles: ['tu', 'bendahara'],
      items: [
        {
          title: 'Isi Saldo Tunai Siswa',
          url: '/tu/topup',
          icon: Banknote,
          roles: ['tu'],
        },
        {
          title: 'Setoran Kas TU Harian',
          url: '/tu/setoran',
          icon: Receipt,
          roles: ['tu', 'bendahara'],
        },
      ],
    },
    {
      title: 'Saldo & Pengawasan',
      roles: ['admin', 'bendahara', 'kepsek'],
      items: [
        {
          title: 'Penyesuaian Saldo Bendahara',
          url: '/saldo/koreksi',
          icon: ReceiptText,
          roles: ['bendahara', 'kepsek'],
        },
        {
          title: 'Pengembalian Saldo Siswa',
          url: '/saldo/refund',
          icon: ArrowLeftRight,
          roles: ['bendahara', 'kepsek'],
        },
        {
          title: 'Batasan Jajan Siswa',
          url: '/kontrol-siswa',
          icon: ShieldCheck,
          roles: ['admin'],
        },
      ],
    },
    {
      title: 'Laporan & Pengaturan',
      roles: ['admin', 'bendahara', 'pengelola', 'tu', 'kepsek'],
      items: [
        {
          title: 'Laporan Keuangan',
          icon: FileSpreadsheet,
          roles: ['admin', 'bendahara', 'pengelola', 'tu', 'kepsek'],
          items: [
            {
              title: 'Cek Selisih Uang',
              url: '/laporan/rekonsiliasi',
              roles: ['admin', 'bendahara', 'tu', 'kepsek'],
            },
            {
              title: 'Penjualan & Laba Kotor',
              url: '/laporan/penjualan',
              roles: ['admin', 'pengelola', 'bendahara', 'kepsek'],
            },
            {
              title: 'Analisis Laba Kotor',
              url: '/laporan/laba-kotor',
              roles: ['admin', 'pengelola', 'bendahara', 'kepsek'],
            },
            {
              title: 'Total Saldo Siswa',
              url: '/laporan/saldo-mengendap',
              roles: ['admin', 'bendahara', 'tu', 'kepsek'],
            },
            {
              title: 'Riwayat Transaksi',
              url: '/laporan/riwayat-keseluruhan',
              roles: ['admin', 'bendahara', 'tu', 'kepsek'],
            },
            {
              title: 'Laporan Kerugian Stok',
              url: '/laporan/kerugian-stok',
              roles: ['pengelola', 'bendahara', 'kepsek'],
            },
          ],
        },
        {
          title: 'Pengaturan Kantin',
          icon: Settings,
          roles: ['admin'],
          items: [
            {
              title: 'Operasional Kantin',
              url: '/pengaturan',
              roles: ['admin'],
            },
            {
              title: 'Manajemen Titik Kasir',
              url: '/pengaturan/titik-kasir',
              roles: ['admin'],
            },
          ],
        },
      ],
    },
  ],
}
