import { Link, useRouterState } from '@tanstack/react-router'
import { Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  'menu': 'Katalog Menu',
  'kategori': 'Kategori Menu',
  'stok': 'Manajemen Stok',
  'masuk': 'Barang Masuk',
  'opname': 'Stok Opname',
  'kartu': 'Kartu Stok',
  'inventaris': 'Laporan Inventaris',
  'tu': 'Layanan TU',
  'topup': 'Top-up Tunai Siswa',
  'setoran': 'Setoran Kas TU',
  'kartu-tamu': 'Kartu Tamu',
  'saldo': 'Saldo Siswa',
  'koreksi': 'Koreksi Mutasi',
  'refund': 'Refund Siswa Keluar',
  'kontrol-siswa': 'Kontrol Siswa',
  'laporan': 'Pusat Laporan',
  'rekonsiliasi': 'Rekonsiliasi Harian',
  'penjualan': 'Penjualan & Laba',
  'laba-kotor': 'Analisis Laba Kotor',
  'saldo-mengendap': 'Saldo Mengendap',
  'riwayat-siswa': 'Riwayat Belanja Siswa',
  'kerugian-stok': 'Laporan Kerugian Stok',
  'pengaturan': 'Pengaturan Kantin',
  'titik-kasir': 'Manajemen Titik Kasir',
  'kasir': 'Kasir POS',
}

const VALID_NAV_PATHS = new Set([
  '/',
  '/kasir',
  '/menu',
  '/kategori',
  '/stok/masuk',
  '/stok/opname',
  '/stok/kartu',
  '/stok/inventaris',
  '/tu/topup',
  '/tu/setoran',
  '/kartu-tamu',
  '/saldo/koreksi',
  '/saldo/refund',
  '/kontrol-siswa',
  '/laporan/rekonsiliasi',
  '/laporan/penjualan',
  '/laporan/laba-kotor',
  '/laporan/saldo-mengendap',
  '/laporan/riwayat-siswa',
  '/laporan/kerugian-stok',
  '/pengaturan',
  '/pengaturan/titik-kasir',
])

export function BreadcrumbNav() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  // Pisahkan path menjadi segmen bersih
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  return (
    <Breadcrumb className='hidden md:flex'>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to='/' className='flex items-center gap-1 text-muted-foreground hover:text-foreground'>
              <Home className='size-3.5' />
              <span className='sr-only md:not-sr-only'>Dashboard</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {segments.map((segment, index) => {
          const currentPath = `/${segments.slice(0, index + 1).join('/')}`
          const isLast = index === segments.length - 1
          const label = ROUTE_LABELS[segment] || decodeURIComponent(segment)
          const isValidLink = !isLast && VALID_NAV_PATHS.has(currentPath)

          return (
            <span key={currentPath} className='inline-flex items-center gap-1.5'>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className='font-semibold text-foreground capitalize'>
                    {label}
                  </BreadcrumbPage>
                ) : isValidLink ? (
                  <BreadcrumbLink asChild>
                    <Link
                      to={currentPath as string as never}
                      className='text-muted-foreground hover:text-foreground capitalize'
                    >
                      {label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <span className='text-muted-foreground capitalize select-none cursor-default'>
                    {label}
                  </span>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
