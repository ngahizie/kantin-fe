import React, { useId, useMemo, useState } from 'react'
import {
  History,
  Receipt,
  RotateCcw,
  Search,
  Clock,
  ShoppingBag,
  Loader2,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
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
import { formatRupiah, formatDateTime, getInitials } from '@/lib/formatters'
import RefundDialog from './RefundDialog'
import type { TransaksiSesiItem } from '../api/kasir-api'

const FILTER_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'SUKSES', label: 'Hanya Sukses' },
  { value: 'VOID', label: 'Hanya Refund' },
] as const

const FILTER_SELECT_ITEM_CLASS =
  'rounded-lg py-1.5 ps-2 pe-8 text-xs font-medium cursor-pointer'

export interface SessionHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: TransaksiSesiItem[]
  isLoading?: boolean
  isSessionClosed?: boolean
  isOffline?: boolean
  onTransactionRefunded?: () => void
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({
  open,
  onOpenChange,
  transactions,
  isLoading = false,
  isSessionClosed = false,
  isOffline = false,
  onTransactionRefunded,
}) => {
  const searchInputId = useId()
  const filterLabelId = useId()
  const filterValueId = useId()
  const filterSelectId = useId()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUKSES' | 'VOID'>(
    'ALL'
  )
  const [selectedTrxForRefund, setSelectedTrxForRefund] =
    useState<TransaksiSesiItem | null>(null)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setSearchQuery('')
      setFilterStatus('ALL')
    }
  }

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return transactions.filter((trx) => {
      if (filterStatus !== 'ALL' && trx.status !== filterStatus) {
        return false
      }

      if (query) {
        const matchNama = (trx.pembeliNama || '').toLowerCase().includes(query)
        const matchKelas = (trx.pembeliKelas || '')
          .toLowerCase()
          .includes(query)
        const matchNis = (trx.pembeliNis || '').toLowerCase().includes(query)
        const matchTipe = 'siswa'.includes(query)
        const matchItem = trx.items.some((it) =>
          it.namaMenu.toLowerCase().includes(query)
        )
        if (
          !matchNama &&
          !matchKelas &&
          !matchNis &&
          !matchTipe &&
          !matchItem
        ) {
          return false
        }
      }

      return true
    })
  }, [transactions, filterStatus, searchQuery])

  const hasActiveFilter = Boolean(
    searchQuery.trim() || filterStatus !== 'ALL'
  )

  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setRefundDialogOpen(false)
    } else {
      setSelectedTrxForRefund(null)
    }
    onOpenChange(nextOpen)
  }

  const handleOpenRefundDialog = (trx: TransaksiSesiItem) => {
    setSelectedTrxForRefund(trx)
    setRefundDialogOpen(true)
  }

  const canRefund = !isSessionClosed && !isOffline

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side='right'
          className='flex h-full w-full flex-col gap-0 border-l border-border bg-background p-0 text-foreground sm:max-w-xl md:max-w-2xl select-none'
        >
          {/* Header Drawer */}
          <SheetHeader className='border-b border-border bg-card px-5 py-4 text-left'>
            <div className='flex items-center gap-2.5 pr-10'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary'>
                <History className='h-5 w-5' />
              </div>
              <div>
                <SheetTitle className='text-base font-bold text-foreground'>
                  Riwayat Transaksi Sesi Kasir
                </SheetTitle>
                <SheetDescription className='text-xs text-muted-foreground'>
                  Daftar seluruh transaksi yang diproses pada shift aktif hari ini.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Bar Pencarian & Filter Status */}
          <search
            aria-label='Pencarian dan filter riwayat transaksi'
            className='flex flex-col gap-2 border-b border-border bg-card px-5 py-3 sm:flex-row sm:items-center'
          >
            <div className='relative flex-1'>
              <label htmlFor={searchInputId} className='sr-only'>
                Cari nama pembeli, kelas, NIS, atau item menu
              </label>
              <Search
                className='pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground'
                aria-hidden='true'
              />
              <Input
                id={searchInputId}
                name='searchQuery'
                type='search'
                autoComplete='off'
                autoCorrect='off'
                autoCapitalize='none'
                spellCheck={false}
                placeholder='Cari nama pembeli, NIS, kelas, atau item...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-9 pr-8 pl-8 text-xs [&::-webkit-search-cancel-button]:appearance-none'
              />
              {searchQuery && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label='Bersihkan pencarian'
                  onClick={() => setSearchQuery('')}
                  className='absolute top-1/2 right-1 h-7 min-h-7 w-7 min-w-7 -translate-y-1/2 rounded-md text-muted-foreground hover:text-foreground'
                >
                  <X className='h-3.5 w-3.5' aria-hidden='true' />
                </Button>
              )}
            </div>

            <div className='w-full shrink-0 sm:w-36'>
              <span id={filterLabelId} className='sr-only'>
                Filter status transaksi:
              </span>
              <Select
                value={filterStatus}
                onValueChange={(val) =>
                  setFilterStatus(val as 'ALL' | 'SUKSES' | 'VOID')
                }
              >
                <SelectTrigger
                  id={filterSelectId}
                  aria-labelledby={`${filterLabelId} ${filterValueId}`}
                  className='h-9 w-full text-xs font-medium'
                >
                  <span id={filterValueId}>
                    <SelectValue placeholder='Semua Status' />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {FILTER_STATUS_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className={FILTER_SELECT_ITEM_CLASS}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </search>

          {/* Daftar Transaksi */}
          <div className='flex-1 space-y-3 overflow-y-auto bg-background p-5'>
            {isLoading ? (
              <div className='flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground'>
                <Loader2 className='size-6 animate-spin text-muted-foreground' />
                <span className='text-xs'>Memuat riwayat transaksi...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className='flex h-64 flex-col items-center justify-center p-6 text-center text-muted-foreground'>
                <div className='mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs'>
                  <Receipt className='h-6 w-6' />
                </div>
                <h4 className='text-sm font-semibold text-foreground'>
                  Tidak Ada Transaksi Ditemukan
                </h4>
                <p className='mt-1 max-w-xs text-xs text-muted-foreground'>
                  {hasActiveFilter
                    ? 'Tidak ada transaksi yang cocok dengan pencarian atau filter status.'
                    : 'Belum ada transaksi yang diproses pada sesi ini.'}
                </p>
                {hasActiveFilter && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setSearchQuery('')
                      setFilterStatus('ALL')
                    }}
                    className='mt-3 h-8 px-3 text-xs font-semibold'
                  >
                    Reset Filter
                  </Button>
                )}
              </div>
            ) : (
              filteredTransactions.map((trx) => {
                const isSukses = trx.status === 'SUKSES'

                return (
                  <Card
                    key={trx.id}
                    className={`gap-0 py-0 ${
                      isSukses
                        ? ''
                        : 'border-destructive/30 bg-destructive/5'
                    }`}
                  >
                    <CardContent className='space-y-2.5 p-3.5'>
                      {/* Baris Atas: Info Waktu & Status Badge */}
                      <div className='flex items-center justify-between gap-2 pb-1 text-xs'>
                        <span className='flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground'>
                          <Clock className='h-3 w-3' />
                          {formatDateTime(trx.waktu)}
                        </span>

                        <Badge
                          variant='outline'
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                            isSukses
                              ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'border-rose-500/20 bg-rose-500/15 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isSukses ? 'SUKSES' : 'REFUND'}
                        </Badge>
                      </div>

                      {/* Baris Tengah: Data Pembeli & Total */}
                      <div className='flex items-start justify-between gap-2 text-xs'>
                        <div className='flex min-w-0 items-center gap-2.5'>
                          <Avatar className='h-8 w-8 shrink-0 rounded-full border border-border bg-muted'>
                            {trx.pembeliFotoUrl && (
                              <AvatarImage
                                src={trx.pembeliFotoUrl}
                                alt={trx.pembeliNama}
                                className='object-cover'
                              />
                            )}
                            <AvatarFallback className='text-[11px] font-semibold text-foreground'>
                              {getInitials(trx.pembeliNama)}
                            </AvatarFallback>
                          </Avatar>
                          <div className='min-w-0 space-y-0.5'>
                            <div className='flex items-center gap-1.5'>
                              <strong className='truncate text-sm text-foreground'>
                                {trx.pembeliNama}
                              </strong>
                              <Badge
                                variant='outline'
                                className='rounded-full border border-border bg-muted/60 px-2 py-0 text-[9px] font-medium text-muted-foreground'
                              >
                                Siswa
                              </Badge>
                            </div>
                            <span className='block text-[11px] tabular-nums text-muted-foreground'>
                              {trx.pembeliKelas ? `Kelas: ${trx.pembeliKelas} • ` : ''}
                              NIS: {trx.pembeliNis || '-'}
                            </span>
                          </div>
                        </div>

                        <div className='text-right'>
                          <span className='block text-[10px] text-muted-foreground'>
                            Total Tagihan
                          </span>
                          <span
                            className={`text-base font-bold tabular-nums ${
                              isSukses
                                ? 'text-primary'
                                : 'text-muted-foreground line-through'
                            }`}
                          >
                            {formatRupiah(trx.total)}
                          </span>
                        </div>
                      </div>

                      {/* Baris Bawah: Rincian Item Belanja */}
                      <div className='rounded-xl border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground'>
                        <div className='mb-1 flex items-center gap-1 font-medium text-foreground'>
                          <ShoppingBag className='h-3 w-3' />
                          <span className='tabular-nums'>Rincian Barang ({trx.items.length} macam):</span>
                        </div>
                        <ul className='list-disc space-y-0.5 pl-4'>
                          {trx.items.map((it, idx) => (
                            <li key={idx}>
                              <span className='font-medium tabular-nums text-foreground'>
                                {it.qty}x {it.namaMenu}
                              </span>{' '}
                              <span className='tabular-nums text-muted-foreground'>
                                (@ {formatRupiah(it.hargaSatuan)})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Catatan Alasan jika transaksi berstatus VOID */}
                      {!isSukses && trx.voidAlasan && (
                        <div className='rounded-xl border border-destructive/20 bg-destructive/10 p-2 text-[11px] text-destructive'>
                          <strong>Alasan Refund:</strong> &ldquo;{trx.voidAlasan}&rdquo;
                          {trx.voidAt && (
                            <span className='mt-0.5 block text-[10px] tabular-nums opacity-80'>
                              Di-refund pada: {formatDateTime(trx.voidAt)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tombol Aksi Refund untuk Transaksi SUKSES */}
                      {isSukses && (
                        <div className='flex items-center justify-end pt-1'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={!canRefund}
                            onClick={() => handleOpenRefundDialog(trx)}
                            className='h-8 gap-1.5 border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50'
                            title={
                              isOffline
                                ? 'Offline - refund tidak tersedia saat koneksi terputus'
                                : isSessionClosed
                                ? 'Sesi kasir sudah ditutup, transaksi tidak dapat di-refund'
                                : 'Refund transaksi ini dengan kode struk dan alasan'
                            }
                          >
                            <RotateCcw className='h-3.5 w-3.5' />
                            <span>Refund Transaksi</span>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog Refund Transaksi Terpilih (BE #292) */}
      <RefundDialog
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        transaction={selectedTrxForRefund}
        onSuccess={onTransactionRefunded}
      />
    </>
  )
}

export default SessionHistoryModal
