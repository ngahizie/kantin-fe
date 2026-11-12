import { TableToolbar } from '@/components/data-table'
import { useState, useMemo } from 'react'
import {
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { RiwayatStokItem, JenisMutasiStok } from '../types'

interface RiwayatOpnameTableProps {
  riwayatList: RiwayatStokItem[]
  isLoading?: boolean
  onRefresh?: () => void
}

export function RiwayatOpnameTable({
  riwayatList,
  isLoading = false,
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
            variant="outline"
            className="gap-1 rounded-full border border-rose-500/20 bg-rose-500/15 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-400"
          >
            <AlertOctagon className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            Barang Rusak / Basi
          </Badge>
        )
      case 'OPNAME_KELUAR':
        return (
          <Badge
            variant="outline"
            className="gap-1 rounded-full border border-amber-500/20 bg-amber-500/15 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"
          >
            <TrendingDown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            Opname Keluar (Kurang)
          </Badge>
        )
      case 'OPNAME_MASUK':
        return (
          <Badge
            variant="outline"
            className="gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/15 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
          >
            <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Opname Masuk (Lebih)
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="rounded-full border border-border bg-muted/60 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
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
      <TableToolbar
        searchPlaceholder='Cari menu, no. referensi, alasan...'
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            title: 'Tipe Mutasi',
            options: [
              { label: 'Barang Rusak / Basi', value: 'BARANG_RUSAK' },
              { label: 'Opname Keluar (Kurang)', value: 'OPNAME_KELUAR' },
              { label: 'Opname Masuk (Lebih)', value: 'OPNAME_MASUK' },
            ],
            selectedValues: filterJenis !== 'ALL_OPNAME' ? [filterJenis] : [],
            onSelect: (vals) => setFilterJenis(vals[0] || 'ALL_OPNAME'),
            isSingleSelect: true,
          },
        ]}
        isFiltered={Boolean(searchQuery || filterJenis !== 'ALL_OPNAME')}
        onReset={() => {
          setSearchQuery('')
          setFilterJenis('ALL_OPNAME')
        }}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-b border-border hover:bg-muted/50">
              <TableHead className="px-4 py-3">Waktu & Bukti</TableHead>
              <TableHead className="px-3 py-3">Nama Menu</TableHead>
              <TableHead className="px-3 py-3">Tipe Mutasi</TableHead>
              <TableHead className="px-3 py-3 text-center">Qty Mutasi</TableHead>
              <TableHead className="px-3 py-3 text-right">Nilai Selisih</TableHead>
              <TableHead className="px-3 py-3 text-center">Stok Akhir</TableHead>
              <TableHead className="px-4 py-3">Alasan & Kronologi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <span className="text-sm">Memuat riwayat opname...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  Belum ada riwayat audit opname atau barang rusak yang tercatat.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow
                  key={item.id}
                  className="border-b border-border transition-colors hover:bg-muted/30"
                >
                  {/* Waktu & Referensi */}
                  <TableCell className="px-4 py-3">
                    <div className="text-xs font-medium text-foreground tabular-nums">
                      {formatTanggal(item.waktu)}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {item.referensiId || '—'}
                    </div>
                  </TableCell>

                  {/* Menu */}
                  <TableCell className="px-3 py-3 font-semibold text-foreground">
                    {item.menuNama || `Menu #${item.menuId}`}
                  </TableCell>

                  {/* Tipe Mutasi */}
                  <TableCell className="px-3 py-3">{renderBadgeJenis(item.jenis)}</TableCell>

                  {/* Qty */}
                  <TableCell className="px-3 py-3 text-center font-mono font-bold tabular-nums">
                    {item.arah === 'KELUAR' ? (
                      <span className="text-destructive">-{item.qty}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">+{item.qty}</span>
                    )}
                  </TableCell>

                  {/* Nilai Selisih */}
                  <TableCell className="px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                    {item.totalNilai ? (
                      <span
                        className={
                          item.arah === 'KELUAR'
                            ? 'text-destructive'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {item.arah === 'KELUAR' ? '-' : '+'} Rp{' '}
                        {item.totalNilai.toLocaleString('id-ID')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Rp 0</span>
                    )}
                  </TableCell>

                  {/* Stok Setelah */}
                  <TableCell className="px-3 py-3 text-center font-mono text-xs tabular-nums">
                    {item.stokSetelah}
                  </TableCell>

                  {/* Alasan */}
                  <TableCell className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">
                    {item.alasan || (
                      <span className="italic text-muted-foreground/60">
                        Tanpa keterangan
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
