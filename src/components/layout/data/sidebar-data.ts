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
      roles: ['admin', 'pengelola', 'kasir', 'tu', 'bendahara'],
      items: [
        {
          title: 'Dashboard Ringkasan',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Kasir POS',
          url: '/kasir',
          icon: ShoppingCart,
          roles: ['admin', 'kasir', 'pengelola'],
        },
      ],
    },
    {
      title: 'Katalog & Inventaris',
      roles: ['admin', 'pengelola'],
      items: [
        {
          title: 'Katalog Menu',
          url: '/menu',
          icon: UtensilsCrossed,
        },
        {
          title: 'Kategori Menu',
          url: '/kategori',
          icon: Tag,
        },
        {
          title: 'Manajemen Stok',
          icon: Boxes,
          items: [
            {
              title: 'Barang Masuk',
              url: '/stok/masuk',
            },
            {
              title: 'Stok Opname & Rusak',
              url: '/stok/opname',
            },
            {
              title: 'Kartu Stok Mutasi',
              url: '/stok/kartu',
            },
            {
              title: 'Laporan Inventaris',
              url: '/stok/inventaris',
            },
          ],
        },
      ],
    },
    {
      title: 'Layanan TU & Kartu',
      roles: ['admin', 'tu', 'bendahara'],
      items: [
        {
          title: 'Top-up Tunai Siswa',
          url: '/tu/topup',
          icon: Banknote,
          roles: ['admin', 'tu'],
        },
        {
          title: 'Setoran Kas TU Harian',
          url: '/tu/setoran',
          icon: Receipt,
        },
        {
          title: 'Manajemen Kartu Tamu',
          url: '/kartu-tamu',
          icon: CreditCard,
        },
      ],
    },
    {
      title: 'Saldo & Pengawasan',
      roles: ['admin', 'bendahara'],
      items: [
        {
          title: 'Mutasi Koreksi Bendahara',
          url: '/saldo/koreksi',
          icon: ReceiptText,
        },
        {
          title: 'Refund Saldo Siswa',
          url: '/saldo/refund',
          icon: ArrowLeftRight,
        },
        {
          title: 'Kontrol Siswa',
          url: '/kontrol-siswa',
          icon: ShieldCheck,
        },
      ],
    },
    {
      title: 'Laporan & Pengaturan',
      roles: ['admin', 'bendahara', 'pengelola'],
      items: [
        {
          title: 'Laporan Keuangan',
          icon: FileSpreadsheet,
          roles: ['admin', 'bendahara', 'pengelola', 'tu'],
          items: [
            {
              title: 'Rekonsiliasi Harian',
              url: '/laporan/rekonsiliasi',
            },
            {
              title: 'Penjualan & Laba Kotor',
              url: '/laporan/penjualan',
            },
            {
              title: 'Analisis Laba Kotor',
              url: '/laporan/laba-kotor',
            },
            {
              title: 'Saldo Mengendap',
              url: '/laporan/saldo-mengendap',
            },
            {
              title: 'Riwayat Belanja Siswa',
              url: '/laporan/riwayat-siswa',
            },
            {
              title: 'Laporan Kerugian Stok',
              url: '/laporan/kerugian-stok',
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
            },
            {
              title: 'Manajemen Titik Kasir',
              url: '/pengaturan/titik-kasir',
            },
          ],
        },
      ],
    },
  ],
}
