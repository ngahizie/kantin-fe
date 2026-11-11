import React, { useId, useMemo, useState } from 'react'
import {
  History,
  Receipt,
  RotateCcw,
  Search,
  User,
  Clock,
  ShoppingBag,
  Loader2,
  X,
} from 'lucide-react'
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
import { formatRupiah, formatDateTime } from '@/lib/formatters'
import RefundDialog from './RefundDialog'
import type { TransaksiSesiItem } from '../api/kasir-api'

const FILTER_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'SUKSES', label: 'Hanya Sukses' },
  { value: 'VOID', label: 'Hanya Void' },
] as const

const FILTER_SELECT_ITEM_CLASS =
  'rounded-lg py-1.5 ps-2 pe-8 text-xs font-medium cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800/80 focus:text-slate-800 dark:focus:text-white'

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
        const matchTipe = (
          trx.pembeliTipe === 'SISWA' ? 'siswa' : 'kartu tamu'
        ).includes(query)
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
          className='flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl select-none has-border !border-l !border-slate-200 dark:!border-slate-800 bg-[#FDFCF8] dark:bg-[#050510] text-slate-800 dark:text-white shadow-none'
        >
          {/* Header Drawer */}
          <SheetHeader className='has-border !border-b !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] px-5 py-4 text-left shadow-none'>
            <div className='flex items-center gap-2.5 pr-10'>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'>
                <History className='h-5 w-5' />
              </div>
              <div>
                <SheetTitle className='text-base font-bold text-slate-800 dark:text-white'>
                  Riwayat Transaksi Sesi Kasir
                </SheetTitle>
                <SheetDescription className='text-xs text-slate-500 dark:text-slate-400'>
                  Daftar seluruh transaksi yang diproses pada shift aktif hari ini.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Bar Pencarian & Filter Status */}
          <search
            aria-label='Pencarian dan filter riwayat transaksi'
            className='flex flex-col gap-2 has-border !border-b !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] px-5 py-3 shadow-none sm:flex-row sm:items-center'
          >
            <div className='relative flex-1'>
              <label htmlFor={searchInputId} className='sr-only'>
                Cari nama pembeli, kelas, NIS, atau item menu
              </label>
              <Search
                className='pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500'
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
                className='h-9 has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 pr-8 pl-8 text-xs text-slate-800 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 focus-visible:ring-0 rounded-xl shadow-none [&::-webkit-search-cancel-button]:appearance-none'
              />
              {searchQuery && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label='Bersihkan pencarian'
                  onClick={() => setSearchQuery('')}
                  className='absolute top-1/2 right-1 min-h-7 min-w-7 h-7 w-7 -translate-y-1/2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
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
                  className='h-9 w-full has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl shadow-none focus:ring-0'
                >
                  <span id={filterValueId}>
                    <SelectValue placeholder='Semua Status' />
                  </span>
                </SelectTrigger>
                <SelectContent className='has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] text-slate-800 dark:text-white rounded-xl shadow-none'>
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
          <div className='flex-1 space-y-3 overflow-y-auto p-5 bg-[#FDFCF8] dark:bg-[#050510]'>
            {isLoading ? (
              <div className='flex h-64 flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400'>
                <Loader2 className='h-6 w-6 animate-spin text-blue-600 dark:text-blue-400' />
                <span className='text-xs'>Memuat riwayat transaksi...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className='flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400'>
                <div className='mb-2 flex h-12 w-12 items-center justify-center rounded-2xl has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] text-slate-400 dark:text-slate-500'>
                  <Receipt className='h-6 w-6' />
                </div>
                <h4 className='text-sm font-semibold text-slate-800 dark:text-white'>
                  Tidak Ada Transaksi Ditemukan
                </h4>
                <p className='text-xs max-w-xs mt-1 text-slate-500 dark:text-slate-400'>
                  {hasActiveFilter
                    ? 'Tidak ada transaksi yang cocok dengan pencarian atau filter status.'
                    : 'Belum ada transaksi yang diproses pada sesi ini.'}
                </p>
                {hasActiveFilter && (
                  <Button
                    type='button'
                    variant='secondary'
                    size='sm'
                    onClick={() => {
                      setSearchQuery('')
                      setFilterStatus('ALL')
                    }}
                    className='mt-3 h-8 px-3 text-xs font-semibold has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-none'
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
                    className={`rounded-2xl shadow-none ${
                      isSukses
                        ? 'has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a]'
                        : 'has-border !border !border-rose-200 dark:!border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20'
                    }`}
                  >
                    <CardContent className='p-3.5 space-y-2.5'>
                      {/* Baris Atas: Info Waktu & Status Badge */}
                      <div className='flex items-center justify-between gap-2 pb-1 text-xs'>
                        <span className='text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1 tabular-nums'>
                          <Clock className='h-3 w-3' />
                          {formatDateTime(trx.waktu)}
                        </span>

                        <Badge
                          variant={isSukses ? 'secondary' : 'destructive'}
                          className={`rounded-full text-[10px] font-semibold px-2.5 py-0.5 uppercase tracking-wide shadow-none ${
                            isSukses
                              ? 'has-border !border !border-emerald-200 dark:!border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                              : 'has-border !border !border-rose-200 dark:!border-rose-900/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isSukses ? 'SUKSES' : 'VOID'}
                        </Badge>
                      </div>

                      {/* Baris Tengah: Data Pembeli & Total */}
                      <div className='flex items-start justify-between gap-2 text-xs'>
                        <div className='space-y-0.5'>
                          <div className='flex items-center gap-1.5'>
                            <User className='h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0' />
                            <strong className='text-slate-800 dark:text-white text-sm'>
                              {trx.pembeliNama}
                            </strong>
                            <Badge
                              variant='secondary'
                              className='rounded-full text-[9px] py-0 px-2 font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-none'
                            >
                              {trx.pembeliTipe === 'SISWA' ? 'Siswa' : 'Tamu'}
                            </Badge>
                          </div>
                          {trx.pembeliKelas && (
                            <span className='text-[11px] text-slate-500 dark:text-slate-400 block pl-5'>
                              Kelas: {trx.pembeliKelas}{' '}
                              {trx.pembeliNis ? `• NIS: ${trx.pembeliNis}` : ''}
                            </span>
                          )}
                        </div>

                        <div className='text-right'>
                          <span className='text-[10px] text-slate-500 dark:text-slate-400 block'>
                            Total Tagihan
                          </span>
                          <span
                            className={`text-base font-bold tabular-nums ${
                              isSukses
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-400 dark:text-slate-500 line-through'
                            }`}
                          >
                            {formatRupiah(trx.total)}
                          </span>
                        </div>
                      </div>

                      {/* Baris Bawah: Rincian Item Belanja */}
                      <div className='rounded-xl has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-2.5 text-[11px] text-slate-500 dark:text-slate-400'>
                        <div className='font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 mb-1'>
                          <ShoppingBag className='h-3 w-3' />
                          <span>Rincian Barang ({trx.items.length} macam):</span>
                        </div>
                        <ul className='space-y-0.5 pl-4 list-disc'>
                          {trx.items.map((it, idx) => (
                            <li key={idx}>
                              <span className='text-slate-800 dark:text-slate-200 font-medium'>
                                {it.qty}x {it.namaMenu}
                              </span>{' '}
                              <span className='text-slate-500 dark:text-slate-400'>
                                (@ {formatRupiah(it.hargaSatuan)})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Catatan Alasan jika transaksi berstatus VOID */}
                      {!isSukses && trx.voidAlasan && (
                        <div className='rounded-xl has-border !border !border-rose-200 dark:!border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-2 text-[11px] text-rose-700 dark:text-rose-300 shadow-none'>
                          <strong>Alasan Refund:</strong> &ldquo;{trx.voidAlasan}&rdquo;
                          {trx.voidAt && (
                            <span className='block text-[10px] text-rose-600/80 dark:text-rose-300/70 mt-0.5'>
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
                            variant='secondary'
                            size='sm'
                            disabled={!canRefund}
                            onClick={() => handleOpenRefundDialog(trx)}
                            className='h-8 gap-1.5 px-3 text-xs font-semibold rounded-xl shadow-none has-border !border !border-rose-200 dark:!border-rose-900/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-50'
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
