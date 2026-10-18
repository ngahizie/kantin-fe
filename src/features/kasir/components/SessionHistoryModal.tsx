import React, { useState, useMemo } from 'react'
import {
  History,
  Search,
  RotateCcw,
  Receipt,
  User,
  Clock,
  RefreshCw,
  ShoppingBag,
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
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
import VoidDialog from './VoidDialog'
import type { TransaksiSesiItem } from '../api/kasir-api'

export interface SessionHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: TransaksiSesiItem[]
  isLoading?: boolean
  isSessionClosed?: boolean
  onRefresh?: () => void
  onTransactionVoided?: () => void
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({
  open,
  onOpenChange,
  transactions,
  isLoading = false,
  isSessionClosed = false,
  onRefresh,
  onTransactionVoided,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUKSES' | 'VOID'>('ALL')
  const [selectedTrxForVoid, setSelectedTrxForVoid] = useState<TransaksiSesiItem | null>(null)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)

  // Filter transaksi berdasarkan pencarian dan status
  const filteredTransactions = useMemo(() => {
    return transactions.filter((trx) => {
      // Filter status
      if (filterStatus !== 'ALL' && trx.status !== filterStatus) {
        return false
      }

      // Filter query pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchRef = (trx.nomorReferensi || '').toLowerCase().includes(q)
        const matchNama = (trx.pembeliNama || '').toLowerCase().includes(q)
        const matchNis = (trx.pembeliNis || '').toLowerCase().includes(q)
        const matchItem = trx.items.some((it) =>
          it.namaMenu.toLowerCase().includes(q)
        )
        if (!matchRef && !matchNama && !matchNis && !matchItem) {
          return false
        }
      }

      return true
    })
  }, [transactions, filterStatus, searchQuery])

  // Ringkasan metrik dari transaksi yang ada
  const metrics = useMemo(() => {
    let countSukses = 0
    let countVoid = 0
    let totalBruto = 0
    let totalVoid = 0

    transactions.forEach((t) => {
      if (t.status === 'SUKSES') {
        countSukses++
        totalBruto += t.total
      } else if (t.status === 'VOID') {
        countVoid++
        totalVoid += t.total
      }
    })

    const totalBersih = totalBruto
    return {
      totalTransaksi: transactions.length,
      countSukses,
      countVoid,
      totalBersih,
      totalVoid,
    }
  }, [transactions])

  const handleOpenVoidDialog = (trx: TransaksiSesiItem) => {
    setSelectedTrxForVoid(trx)
    setVoidDialogOpen(true)
  }

  const handleVoidSuccess = () => {
    onTransactionVoided?.()
    onRefresh?.()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side='right'
          className='flex h-full w-full flex-col p-0 sm:max-w-xl md:max-w-2xl select-none border-none shadow-none'
        >
          {/* Tombol Segarkan (icon saja di samping kiri tombol X) */}
          {onRefresh && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={onRefresh}
              disabled={isLoading}
              className='absolute inset-e-11 top-2.5 z-10 h-7 w-7 rounded-lg border-none text-muted-foreground hover:bg-muted hover:text-foreground'
              title='Segarkan riwayat transaksi'
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span className='sr-only'>Segarkan</span>
            </Button>
          )}

          {/* Header Drawer */}
          <SheetHeader className='border-none bg-card px-5 py-4 text-left shadow-none pr-20'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <History className='h-5 w-5' />
              </div>
              <div>
                <SheetTitle className='text-base font-bold'>
                  Riwayat Transaksi Sesi Kasir
                </SheetTitle>
                <SheetDescription className='text-xs text-muted-foreground'>
                  Daftar seluruh transaksi yang diproses pada shift aktif hari ini.
                </SheetDescription>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className='grid grid-cols-3 gap-2 pt-2'>
              <div className='rounded-2xl border-none bg-muted/70 dark:bg-muted/30 p-2 text-center shadow-none'>
                <span className='text-[10px] text-muted-foreground block'>
                  Total Transaksi
                </span>
                <span className='text-sm font-bold text-foreground tabular-nums'>
                  {formatNumber(metrics.totalTransaksi)}
                </span>
              </div>

              <div className='rounded-2xl border-none bg-muted/70 dark:bg-muted/30 p-2 text-center shadow-none'>
                <span className='text-[10px] text-muted-foreground block'>
                  Sukses (Net)
                </span>
                <span className='text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums'>
                  {formatRupiah(metrics.totalBersih)}
                </span>
              </div>

              <div className='rounded-2xl border-none bg-muted/70 dark:bg-muted/30 p-2 text-center shadow-none'>
                <span className='text-[10px] text-muted-foreground block'>
                  Total Void
                </span>
                <span className='text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums'>
                  {metrics.countVoid > 0 ? formatRupiah(metrics.totalVoid) : '0'}
                </span>
              </div>
            </div>
          </SheetHeader>

          {/* Filter Bar */}
          <div className='flex items-center gap-2 border-none bg-muted/30 px-5 py-3'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                placeholder='Cari nomor referensi, nama pembeli, atau item...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-8 pl-8 text-xs border-none bg-muted/60 dark:bg-muted/40 shadow-none rounded-xl focus-visible:bg-muted focus-visible:ring-0'
              />
            </div>

            <div className='w-32 shrink-0'>
              <Select
                value={filterStatus}
                onValueChange={(val) =>
                  setFilterStatus(val as 'ALL' | 'SUKSES' | 'VOID')
                }
              >
                <SelectTrigger className='h-8 text-xs border-none bg-muted/60 dark:bg-muted/40 shadow-none rounded-xl focus:ring-0'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent className='border-none shadow-none rounded-xl'>
                  <SelectItem value='ALL'>Semua Status</SelectItem>
                  <SelectItem value='SUKSES'>Hanya Sukses</SelectItem>
                  <SelectItem value='VOID'>Hanya Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Daftar Transaksi */}
          <div className='flex-1 space-y-3 overflow-y-auto p-5 bg-muted/40'>
            {isLoading ? (
              <div className='flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground'>
                <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                <span className='text-xs'>Memuat riwayat transaksi...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className='flex h-64 flex-col items-center justify-center p-6 text-center text-muted-foreground'>
                <div className='mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/50'>
                  <Receipt className='h-6 w-6' />
                </div>
                <h4 className='text-sm font-semibold text-foreground'>
                  Tidak Ada Transaksi Ditemukan
                </h4>
                <p className='text-xs max-w-xs mt-1'>
                  {searchQuery || filterStatus !== 'ALL'
                    ? 'Tidak ada transaksi yang cocok dengan filter pencarian.'
                    : 'Belum ada transaksi yang diproses pada sesi ini.'}
                </p>
              </div>
            ) : (
              filteredTransactions.map((trx) => {
                const isSukses = trx.status === 'SUKSES'
                const canVoid = isSukses && !isSessionClosed

                return (
                  <Card
                    key={trx.id}
                    className={`border-none rounded-2xl shadow-none ${
                      isSukses
                        ? 'bg-card'
                        : 'bg-rose-500/[0.04]'
                    }`}
                  >
                    <CardContent className='p-3.5 space-y-2.5'>
                      {/* Baris Atas: Info Waktu, Ref, & Status Badge */}
                      <div className='flex items-center justify-between gap-2 border-none pb-1 text-xs'>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold text-foreground'>
                            {trx.nomorReferensi || `#${trx.id}`}
                          </span>
                          <span className='text-muted-foreground text-[11px] flex items-center gap-1 tabular-nums'>
                            <Clock className='h-3 w-3' />
                            {formatDateTime(trx.waktu)}
                          </span>
                        </div>

                        <Badge
                          variant={isSukses ? 'secondary' : 'destructive'}
                          className={`rounded-full text-[10px] font-semibold px-2.5 py-0.5 border-none uppercase tracking-wide shadow-none ${
                            isSukses
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-destructive/15 text-destructive'
                          }`}
                        >
                          {isSukses ? 'SUKSES' : 'VOID'}
                        </Badge>
                      </div>

                      {/* Baris Tengah: Data Pembeli & Total */}
                      <div className='flex items-start justify-between gap-2 text-xs'>
                        <div className='space-y-0.5'>
                          <div className='flex items-center gap-1.5'>
                            <User className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                            <strong className='text-foreground text-sm'>
                              {trx.pembeliNama}
                            </strong>
                            <Badge
                              variant='secondary'
                              className='rounded-full text-[9px] py-0 px-2 font-normal border-none bg-muted/80 shadow-none'
                            >
                              {trx.pembeliTipe === 'SISWA' ? 'Siswa' : 'Tamu'}
                            </Badge>
                          </div>
                          {trx.pembeliKelas && (
                            <span className='text-[11px] text-muted-foreground block pl-5'>
                              Kelas: {trx.pembeliKelas}{' '}
                              {trx.pembeliNis ? `• NIS: ${trx.pembeliNis}` : ''}
                            </span>
                          )}
                        </div>

                        <div className='text-right'>
                          <span className='text-[10px] text-muted-foreground block'>
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
                      <div className='rounded-xl bg-muted/50 dark:bg-muted/30 p-2.5 text-[11px] text-muted-foreground'>
                        <div className='font-medium text-foreground flex items-center gap-1 mb-1'>
                          <ShoppingBag className='h-3 w-3' />
                          <span>Rincian Barang ({trx.items.length} macam):</span>
                        </div>
                        <ul className='space-y-0.5 pl-4 list-disc'>
                          {trx.items.map((it, idx) => (
                            <li key={idx}>
                              <span className='text-foreground font-medium'>
                                {it.qty}x {it.namaMenu}
                              </span>{' '}
                              <span className='text-muted-foreground'>
                                (@ {formatRupiah(it.hargaSatuan)})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Catatan Alasan jika transaksi berstatus VOID */}
                      {!isSukses && trx.voidAlasan && (
                        <div className='rounded-xl border-none bg-rose-500/10 p-2 text-[11px] text-rose-700 dark:text-rose-300 shadow-none'>
                          <strong>Alasan Void:</strong> &ldquo;{trx.voidAlasan}&rdquo;
                          {trx.voidAt && (
                            <span className='block text-[10px] text-muted-foreground mt-0.5'>
                              Dibatalkan pada: {formatDateTime(trx.voidAt)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tombol Aksi Void (jika status SUKSES) */}
                      {isSukses && (
                        <div className='flex items-center justify-end pt-1'>
                          <Button
                            type='button'
                            variant='secondary'
                            size='sm'
                            disabled={!canVoid}
                            onClick={() => handleOpenVoidDialog(trx)}
                            className='h-7 gap-1 px-2.5 text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 border-none bg-rose-500/10 rounded-xl shadow-none'
                            title={
                              isSessionClosed
                                ? 'Sesi kasir sudah ditutup, transaksi tidak dapat di-void'
                                : 'Batalkan (void) transaksi ini'
                            }
                          >
                            <RotateCcw className='h-3 w-3' />
                            <span>Void Transaksi</span>
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

      {/* Dialog Konfirmasi Void Terpilih */}
      <VoidDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        transaction={selectedTrxForVoid}
        onSuccess={handleVoidSuccess}
      />
    </>
  )
}

export default SessionHistoryModal
