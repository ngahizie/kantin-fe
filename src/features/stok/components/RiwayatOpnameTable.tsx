import { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RiwayatStokItem, JenisMutasiStok } from '../types'

interface RiwayatOpnameTableProps {
  riwayatList: RiwayatStokItem[]
  isLoading?: boolean
  onRefresh?: () => void
}

export function RiwayatOpnameTable({
  riwayatList,
}: RiwayatOpnameTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterJenis, setFilterJenis] = useState<string>('ALL_OPNAME')

  // Filter only opname & damaged goods records
  const filteredData = useMemo(() => {
    return riwayatList.filter((item) => {
      // Must be opname or damaged
      const isOpnameType =
        item.jenis === 'OPNAME_KELUAR' ||
        item.jenis === 'OPNAME_MASUK' ||
        item.jenis === 'BARANG_RUSAK'

      if (!isOpnameType) return false

      // Filter jenis
      if (filterJenis !== 'ALL_OPNAME' && item.jenis !== filterJenis) {
        return false
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const menuName = (item.menuNama || '').toLowerCase()
        const refId = (item.referensiId || '').toLowerCase()
        const alasan = (item.alasan || '').toLowerCase()
        if (
          !menuName.includes(q) &&
          !refId.includes(q) &&
          !alasan.includes(q)
        ) {
          return false
        }
      }

      return true
    })
  }, [riwayatList, filterJenis, searchQuery])

  const renderBadgeJenis = (jenis: JenisMutasiStok) => {
    switch (jenis) {
      case 'BARANG_RUSAK':
        return (
          <Badge
            className="gap-1 border-0 bg-rose-500/15 text-[11px] font-medium text-rose-700 dark:text-rose-400 py-0.5"
          >
            <AlertOctagon className="h-3 w-3 text-rose-500" />
            Barang Rusak / Basi
          </Badge>
        )
      case 'OPNAME_KELUAR':
        return (
          <Badge
            className="gap-1 border-0 bg-purple-500/15 text-[11px] font-medium text-purple-700 dark:text-purple-400 py-0.5"
          >
            <TrendingDown className="h-3 w-3 text-purple-500" />
            Opname Keluar (Kurang)
          </Badge>
        )
      case 'OPNAME_MASUK':
        return (
          <Badge
            className="gap-1 border-0 bg-emerald-500/15 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 py-0.5"
          >
            <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Opname Masuk (Lebih)
          </Badge>
        )
      default:
        return (
          <Badge className="border-0 bg-muted/80 text-[11px] font-medium text-muted-foreground py-0.5">
            {String(jenis).replace(/_/g, ' ')}
          </Badge>
        )
    }
  }

  const formatTanggal = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoStr
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="border-0 bg-muted/60 dark:bg-muted/25">
        <CardContent className="p-4 flex items-center justify-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari menu, no. referensi, alasan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-background w-full"
              />
            </div>

            <Select value={filterJenis} onValueChange={setFilterJenis}>
              <SelectTrigger className="h-9 w-full sm:w-[200px] text-xs bg-background">
                <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Semua Tipe Opname" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_OPNAME">Semua Opname & Rusak</SelectItem>
                <SelectItem value="BARANG_RUSAK">Barang Rusak / Basi</SelectItem>
                <SelectItem value="OPNAME_KELUAR">Opname Keluar (Kurang)</SelectItem>
                <SelectItem value="OPNAME_MASUK">Opname Masuk (Lebih)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 bg-muted/60 dark:bg-muted/25 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/90 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Waktu & Bukti</th>
                <th className="py-3 px-3">Nama Menu</th>
                <th className="py-3 px-3">Tipe Mutasi</th>
                <th className="py-3 px-3 text-center">Qty Mutasi</th>
                <th className="py-3 px-3 text-right">Nilai Selisih</th>
                <th className="py-3 px-3 text-center">Stok Akhir</th>
                <th className="py-3 px-4">Alasan & Kronologi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground text-sm"
                  >
                    Belum ada riwayat audit opname atau barang rusak yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    {/* Waktu & Referensi */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground text-xs">
                        {formatTanggal(item.waktu)}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                        {item.referensiId || '—'}
                      </div>
                    </td>

                    {/* Menu */}
                    <td className="py-3 px-3 font-semibold text-foreground">
                      {item.menuNama || `Menu #${item.menuId}`}
                    </td>

                    {/* Tipe Mutasi */}
                    <td className="py-3 px-3">{renderBadgeJenis(item.jenis)}</td>

                    {/* Qty */}
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {item.arah === 'KELUAR' ? (
                        <span className="text-destructive">-{item.qty}</span>
                      ) : (
                        <span className="text-emerald-500">+{item.qty}</span>
                      )}
                    </td>

                    {/* Nilai Selisih */}
                    <td className="py-3 px-3 text-right font-mono text-xs font-semibold">
                      {item.totalNilai ? (
                        <span
                          className={
                            item.arah === 'KELUAR'
                              ? 'text-destructive'
                              : 'text-emerald-500'
                          }
                        >
                          {item.arah === 'KELUAR' ? '-' : '+'} Rp{' '}
                          {item.totalNilai.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Rp 0</span>
                      )}
                    </td>

                    {/* Stok Setelah */}
                    <td className="py-3 px-3 text-center font-mono text-xs">
                      {item.stokSetelah}
                    </td>

                    {/* Alasan */}
                    <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                      {item.alasan || (
                        <span className="italic text-muted-foreground/60">
                          Tanpa keterangan
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
