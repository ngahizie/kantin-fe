import { useMemo } from 'react'
import {
  Trash2,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
        <Card className="border-0 bg-muted/70 dark:bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              Frekuensi Kejadian Rusak
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {stats.totalKejadian} kali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total catatan mutasi BARANG_RUSAK
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-muted/70 dark:bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              Total Fisik Dibuang / Rusak
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {stats.totalUnit} unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Akumulasi qty terbuang
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-muted/70 dark:bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              Total Beban Kerugian Finansial
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive font-mono">
              Rp {stats.totalKerugian.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
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
