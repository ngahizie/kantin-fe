import { useMemo } from 'react'
import {
  Trash2,
  Calendar,
  PackageX,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RiwayatOpnameTable } from './components/RiwayatOpnameTable'
import type { RiwayatStokItem } from './types'

interface BarangRusakPageProps {
  riwayatList: RiwayatStokItem[]
  isLoading?: boolean
  onRefresh: () => void
}

export function BarangRusakPage({
  riwayatList,
  isLoading = false,
  onRefresh,
}: BarangRusakPageProps) {

  // Metrics specifically for BARANG_RUSAK
  const stats = useMemo(() => {
    const listRusak = riwayatList.filter((r) => r.jenis === 'BARANG_RUSAK')
    const totalUnit = listRusak.reduce((sum, r) => sum + r.qty, 0)
    const totalKerugian = listRusak.reduce((sum, r) => sum + (r.totalNilai || 0), 0)

    return {
      totalKejadian: listRusak.length,
      totalUnit,
      totalKerugian,
    }
  }, [riwayatList])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center gap-2">
        <Trash2 className="h-5 w-5 text-destructive" />
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Pencatatan Barang Rusak & Basi Harian
        </h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground min-w-0 truncate">
              Frekuensi Kejadian Rusak
            </CardTitle>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <Trash2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.totalKejadian} kali
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total catatan mutasi BARANG_RUSAK
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground min-w-0 truncate">
              Total Fisik Dibuang / Rusak
            </CardTitle>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300">
              <PackageX className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.totalUnit} unit
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Akumulasi qty terbuang
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground min-w-0 truncate">
              Total Beban Kerugian Finansial
            </CardTitle>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-destructive font-mono tabular-nums">
              Rp {stats.totalKerugian.toLocaleString('id-ID')}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Beban kerugian HPP makanan rusak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Riwayat Log Kerugian Barang Rusak & Basi
          </h3>
        </div>

        <RiwayatOpnameTable
          riwayatList={riwayatList}
          isLoading={isLoading}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  )
}
