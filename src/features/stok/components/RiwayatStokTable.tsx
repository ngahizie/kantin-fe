import { TableToolbar } from '@/components/data-table'
import { useState, useMemo } from 'react'
import {
  RefreshCw,
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
          <Badge className='border-0 bg-emerald-500/15 text-[11px] font-medium text-emerald-700 dark:text-emerald-400'>
            Barang Masuk
          </Badge>
        )
      case 'BARANG_MASUK_PEMBALIK':
        return (
          <Badge className='border-0 bg-destructive/15 text-[11px] font-medium text-destructive'>
            Pembalik Masuk
          </Badge>
        )
      case 'PENJUALAN':
        return (
          <Badge className='border-0 bg-blue-500/15 text-[11px] font-medium text-blue-700 dark:text-blue-400'>
            Penjualan
          </Badge>
        )
      case 'PENJUALAN_VOID':
        return (
          <Badge className='border-0 bg-amber-500/15 text-[11px] font-medium text-amber-700 dark:text-amber-400'>
            Penjualan Void
          </Badge>
        )
      case 'OPNAME_MASUK':
        return (
          <Badge className='border-0 bg-emerald-500/15 text-[11px] font-medium text-emerald-700 dark:text-emerald-400'>
            Opname Masuk
          </Badge>
        )
      case 'OPNAME_KELUAR':
        return (
          <Badge className='border-0 bg-purple-500/15 text-[11px] font-medium text-purple-700 dark:text-purple-400'>
            Opname Keluar
          </Badge>
        )
      case 'BARANG_RUSAK':
        return (
          <Badge className='border-0 bg-rose-500/15 text-[11px] font-medium text-rose-700 dark:text-rose-400'>
            Barang Rusak
          </Badge>
        )
      default:
        return (
          <Badge className='border-0 bg-muted/80 text-[11px] font-medium text-muted-foreground'>
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
      <div className='overflow-hidden rounded-xl border-0 bg-muted/60 dark:bg-muted/25 shadow-sm'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/90'>
                <TableHead className='w-36 text-xs'>Waktu & Tanggal</TableHead>
                <TableHead className='w-36 text-xs'>
                  No. Bukti / Faktur
                </TableHead>
                <TableHead className='min-w-[180px] text-xs'>Menu</TableHead>
                <TableHead className='w-36 text-xs'>Jenis Mutasi</TableHead>
                <TableHead className='w-24 text-right text-xs'>Qty</TableHead>
                <TableHead className='w-32 text-right text-xs'>
                  Harga Satuan
                </TableHead>
                <TableHead className='w-32 text-right text-xs'>
                  Total Nilai
                </TableHead>
                <TableHead className='w-28 text-right text-xs'>
                  Stok Sisa
                </TableHead>
                <TableHead className='w-36 text-center text-xs'>
                  Aksi / Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className='h-32 text-center text-xs text-muted-foreground'
                  >
                    <RefreshCw className='mx-auto mb-2 h-5 w-5 animate-spin text-primary' />
                    Memuat data riwayat mutasi...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className='h-32 text-center text-xs text-muted-foreground'
                  >
                    <Layers className='mx-auto mb-2 h-6 w-6 opacity-40' />
                    Belum ada riwayat mutasi stok yang tercatat
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const isMasuk = item.arah === 'MASUK'
                  return (
                    <TableRow
                      key={item.id}
                      className='text-xs hover:bg-muted/20'
                    >
                      {/* Waktu */}
                      <TableCell className='font-mono whitespace-nowrap text-muted-foreground'>
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
                      <TableCell className='text-right font-semibold'>
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
                      <TableCell className='text-right text-muted-foreground'>
                        {item.hargaBeliSatuan != null
                          ? formatRupiah(item.hargaBeliSatuan)
                          : '-'}
                      </TableCell>

                      {/* Total Nilai */}
                      <TableCell className='text-right font-medium'>
                        {item.totalNilai != null
                          ? formatRupiah(item.totalNilai)
                          : '-'}
                      </TableCell>

                      {/* Stok Sesudah */}
                      <TableCell className='text-right text-muted-foreground'>
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
                              className='h-7 gap-1 border-0 bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive hover:bg-destructive/20 hover:text-destructive'
                            >
                              <RotateCcw className='h-3 w-3' />
                              Koreksi / Balik
                            </Button>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    className='cursor-help border-0 bg-muted/80 text-[10px] font-normal text-muted-foreground'
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
                            className='border-0 bg-muted/80 text-[10px] font-normal text-muted-foreground'
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
          <div className='flex items-center justify-between border-t border-border/40 bg-muted/40 p-3 text-xs'>
            <span className='text-muted-foreground'>
              Menampilkan {filteredItems.length} dari {totalCount} riwayat
            </span>

            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 0 || loading}
                className='h-8 px-2 text-xs bg-background'
              >
                <ChevronLeft className='mr-1 h-3.5 w-3.5' />
                Sebelumnya
              </Button>
              <span className='text-xs font-medium'>
                Halaman {currentPage + 1} dari {totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage + 1 >= totalPages || loading}
                className='h-8 px-2 text-xs bg-background'
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
