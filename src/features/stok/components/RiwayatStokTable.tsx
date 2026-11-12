import { TableToolbar } from '@/components/data-table'
import { useState, useMemo } from 'react'
import {
  Loader2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react'
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RiwayatStokItem, JenisMutasiStok } from '../types'
import { BarangMasukPembalikModal } from './BarangMasukPembalikModal'

interface RiwayatStokTableProps {
  items: RiwayatStokItem[]
  loading: boolean
  onRefresh: () => void
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  selectedJenis: string
  onJenisChange: (jenis: string) => void
}

export function RiwayatStokTable({
  items,
  loading,
  onRefresh,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  selectedJenis,
  onJenisChange,
}: RiwayatStokTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMutasiForPembalik, setSelectedMutasiForPembalik] =
    useState<RiwayatStokItem | null>(null)
  const [isPembalikModalOpen, setIsPembalikModalOpen] = useState(false)

  // Filter client-side untuk pencarian cepat
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter(
      (item) =>
        (item.menuNama && item.menuNama.toLowerCase().includes(q)) ||
        (item.referensiId && item.referensiId.toLowerCase().includes(q)) ||
        (item.alasan && item.alasan.toLowerCase().includes(q))
    )
  }, [items, searchQuery])

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const handleOpenPembalik = (item: RiwayatStokItem) => {
    setSelectedMutasiForPembalik(item)
    setIsPembalikModalOpen(true)
  }

  const renderJenisBadge = (jenis: JenisMutasiStok) => {
    switch (jenis) {
      case 'BARANG_MASUK':
        return (
          <Badge variant='outline' className='rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'>
            Barang Masuk
          </Badge>
        )
      case 'BARANG_MASUK_PEMBALIK':
        return (
          <Badge variant='outline' className='rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'>
            Pembalik Masuk
          </Badge>
        )
      case 'PENJUALAN':
        return (
          <Badge variant='outline' className='rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'>
            Penjualan
          </Badge>
        )
      case 'PENJUALAN_VOID':
        return (
          <Badge variant='outline' className='rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'>
            Refund / Void
          </Badge>
        )
      case 'OPNAME_MASUK':
        return (
          <Badge variant='outline' className='rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'>
            Opname Masuk
          </Badge>
        )
      case 'OPNAME_KELUAR':
        return (
          <Badge variant='outline' className='rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'>
            Opname Keluar
          </Badge>
        )
      case 'BARANG_RUSAK':
        return (
          <Badge variant='outline' className='rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'>
            Barang Rusak
          </Badge>
        )
      default:
        return (
          <Badge variant='outline' className='rounded-full border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground'>
            {String(jenis).replace(/_/g, ' ')}
          </Badge>
        )
    }
  }

  return (
    <div className='space-y-4'>
      {/* Filter & Toolbar */}
      <TableToolbar
        searchPlaceholder='Cari nama menu atau no. bukti...'
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            title: 'Jenis Mutasi',
            options: [
              { label: 'Hanya Barang Masuk', value: 'BARANG_MASUK' },
              { label: 'Hanya Pembalik Masuk', value: 'BARANG_MASUK_PEMBALIK' },
              { label: 'Penjualan Kasir', value: 'PENJUALAN' },
            ],
            selectedValues: selectedJenis !== 'all' ? [selectedJenis] : [],
            onSelect: (vals) => onJenisChange(vals[0] || 'all'),
            isSingleSelect: true,
          },
        ]}
        isFiltered={Boolean(searchQuery || selectedJenis !== 'all')}
        onReset={() => {
          setSearchQuery('')
          onJenisChange('all')
        }}
      />

      {/* Tabel Mutasi */}
      <div className='overflow-hidden rounded-xl border border-border bg-card shadow-xs'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50 hover:bg-muted/50 border-b border-border'>
                <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                <TableHead className='w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Waktu & Tanggal</TableHead>
                <TableHead className='w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  No. Bukti / Faktur
                </TableHead>
                <TableHead className='min-w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Menu</TableHead>
                <TableHead className='w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Jenis Mutasi</TableHead>
                <TableHead className='w-24 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Qty</TableHead>
                <TableHead className='w-32 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Harga Satuan
                </TableHead>
                <TableHead className='w-32 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Total Nilai
                </TableHead>
                <TableHead className='w-28 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Stok Sisa
                </TableHead>
                <TableHead className='w-36 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Aksi / Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className='hover:bg-transparent border-b-0'>
                  <TableCell
                    colSpan={10}
                    className='h-32 text-center text-xs text-muted-foreground'
                  >
                    <Loader2 className='mx-auto mb-2 size-6 animate-spin text-muted-foreground' />
                    Memuat data riwayat mutasi...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow className='hover:bg-transparent border-b-0'>
                  <TableCell
                    colSpan={10}
                    className='h-32 text-center text-xs text-muted-foreground'
                  >
                    <Layers className='mx-auto mb-2 h-6 w-6 opacity-40' />
                    Belum ada riwayat mutasi stok yang tercatat
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, idx) => {
                  const isMasuk = item.arah === 'MASUK'
                  return (
                    <TableRow
                      key={item.id}
                      className='text-xs border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors'
                    >
                      <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                        {idx + 1}
                      </TableCell>
                      {/* Waktu */}
                      <TableCell className='font-mono whitespace-nowrap text-muted-foreground tabular-nums'>
                        {formatDateTime(item.waktu)}
                      </TableCell>

                      {/* No Bukti */}
                      <TableCell>
                        <span className='font-mono font-medium text-foreground'>
                          {item.referensiId}
                        </span>
                        {item.alasan && (
                          <p className='max-w-[140px] truncate text-[10px] text-muted-foreground italic'>
                            "{item.alasan}"
                          </p>
                        )}
                      </TableCell>

                      {/* Nama Menu */}
                      <TableCell>
                        <span className='font-semibold text-foreground'>
                          {item.menuNama || `Menu #${item.menuId}`}
                        </span>
                      </TableCell>

                      {/* Jenis Mutasi Badge */}
                      <TableCell>{renderJenisBadge(item.jenis)}</TableCell>

                      {/* Qty */}
                      <TableCell className='text-right font-semibold tabular-nums'>
                        <span
                          className={
                            isMasuk
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-foreground'
                          }
                        >
                          {isMasuk
                            ? `+${formatNumber(item.qty)}`
                            : `-${formatNumber(item.qty)}`}
                        </span>
                      </TableCell>

                      {/* Harga Satuan */}
                      <TableCell className='text-right text-muted-foreground tabular-nums'>
                        {item.hargaBeliSatuan != null
                          ? formatRupiah(item.hargaBeliSatuan)
                          : '-'}
                      </TableCell>

                      {/* Total Nilai */}
                      <TableCell className='text-right font-medium tabular-nums'>
                        {item.totalNilai != null
                          ? formatRupiah(item.totalNilai)
                          : '-'}
                      </TableCell>

                      {/* Stok Sesudah */}
                      <TableCell className='text-right text-muted-foreground tabular-nums'>
                        {formatNumber(item.stokSetelah)} unit
                      </TableCell>

                      {/* Aksi Koreksi / Batalkan */}
                      <TableCell className='text-center'>
                        {item.jenis === 'BARANG_MASUK' ? (
                          item.dapatDibalik ? (
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleOpenPembalik(item)}
                              className='h-7 gap-1 bg-rose-50 px-2.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60'
                            >
                              <RotateCcw className='h-3 w-3' />
                              Koreksi / Balik
                            </Button>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant='outline'
                                    className='cursor-help rounded-full border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-normal text-muted-foreground'
                                  >
                                    Sudah Dibalik
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className='text-xs'>
                                  Barang masuk ini sudah sepenuhnya dibatalkan
                                  lewat mutasi pembalik.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        ) : item.jenis === 'BARANG_MASUK_PEMBALIK' ? (
                          <Badge
                            variant='outline'
                            className='rounded-full border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-normal text-muted-foreground'
                          >
                            Entri Pembalik
                          </Badge>
                        ) : (
                          <span className='text-[11px] text-muted-foreground'>
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className='flex items-center justify-between border-t border-border bg-muted/30 p-3 text-xs'>
            <span className='text-muted-foreground tabular-nums'>
              Menampilkan {filteredItems.length} dari {totalCount} riwayat
            </span>

            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 0 || loading}
                className='h-8 px-2 text-xs'
              >
                <ChevronLeft className='mr-1 h-3.5 w-3.5' />
                Sebelumnya
              </Button>
              <span className='text-xs font-medium tabular-nums'>
                Halaman {currentPage + 1} dari {totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage + 1 >= totalPages || loading}
                className='h-8 px-2 text-xs'
              >
                Selanjutnya
                <ChevronRight className='ml-1 h-3.5 w-3.5' />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Koreksi Pembalik */}
      <BarangMasukPembalikModal
        open={isPembalikModalOpen}
        onOpenChange={setIsPembalikModalOpen}
        mutasi={selectedMutasiForPembalik}
        onSuccess={onRefresh}
      />
    </div>
  )
}
