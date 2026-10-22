import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Tag,
  Boxes,
  Banknote,
  Receipt,
  ReceiptText,
  CreditCard,
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
              title: 'Barang Masuk',
              url: '/stok/masuk',
              roles: ['pengelola'],
            },
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
      title: 'Layanan TU & Kartu',
      roles: ['tu', 'bendahara'],
      items: [
        {
          title: 'Top-up Tunai Siswa',
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
        {
          title: 'Manajemen Kartu Tamu',
          url: '/kartu-tamu',
          icon: CreditCard,
          roles: ['tu', 'bendahara'],
        },
      ],
    },
    {
      title: 'Saldo & Pengawasan',
      roles: ['admin', 'bendahara', 'kepsek'],
      items: [
        {
          title: 'Mutasi Koreksi Bendahara',
          url: '/saldo/koreksi',
          icon: ReceiptText,
          roles: ['bendahara', 'kepsek'],
        },
        {
          title: 'Refund Saldo Siswa',
          url: '/saldo/refund',
          icon: ArrowLeftRight,
          roles: ['bendahara', 'kepsek'],
        },
        {
          title: 'Kontrol Siswa',
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
              title: 'Rekonsiliasi Harian',
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
              title: 'Saldo Mengendap',
              url: '/laporan/saldo-mengendap',
              roles: ['admin', 'bendahara', 'tu', 'kepsek'],
            },
            {
              title: 'Riwayat Belanja Siswa',
              url: '/laporan/riwayat-siswa',
              roles: ['admin', 'bendahara', 'tu'],
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
