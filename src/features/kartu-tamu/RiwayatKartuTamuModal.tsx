import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ShoppingBag,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  AlertCircle,
  CreditCard,
  User,
} from 'lucide-react'
import apiClient from '@/lib/api-client'
import { formatRupiah, formatDateTime } from '@/lib/formatters'
import type { KartuTamuMock } from '@/mocks/mock-data'
import type { RiwayatKartuTamuData } from './types'

interface RiwayatKartuTamuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kartu: KartuTamuMock | null
}

export function RiwayatKartuTamuModal({
  open,
  onOpenChange,
  kartu,
}: RiwayatKartuTamuModalProps) {
  const [activeTab, setActiveTab] = useState<'transaksi' | 'mutasi'>('transaksi')
  const [data, setData] = useState<RiwayatKartuTamuData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRiwayat = async (kartuId: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get(`/api/kartu-tamu/${kartuId}/riwayat`)
      setData(res.data?.data ?? null)
    } catch {
      setError('Gagal memuat riwayat transaksi kartu.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    if (!open || !kartu?.id) return

    const kartuId = kartu.id
    const load = async () => {
      try {
        const res = await apiClient.get(`/api/kartu-tamu/${kartuId}/riwayat`)
        if (isMounted) {
          setData(res.data?.data ?? null)
          setError(null)
        }
      } catch {
        if (isMounted) {
          setError('Gagal memuat riwayat transaksi kartu.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [open, kartu?.id])

  if (!kartu) return null

  const transaksiList = data?.transaksi?.items ?? []
  const mutasiList = data?.mutasi ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[85vh] flex flex-col p-6 sm:rounded-2xl border-0 shadow-2xl'>
        <DialogHeader className='space-y-1'>
          <DialogTitle className='text-lg font-bold text-foreground flex items-center gap-2'>
            <Receipt className='h-5 w-5 text-primary' />
            Riwayat Transaksi & Mutasi Saldo
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            Detail aktivitas transaksi belanja dan mutasi saldo pada Kartu Tamu ini
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan Kartu Info */}
        <div className='flex flex-wrap items-center justify-between gap-3 p-3.5 bg-muted/60 dark:bg-muted/30 rounded-xl border-0 mt-2'>
          <div className='space-y-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <span className='font-mono font-bold text-base text-foreground'>
                {kartu.nomor_kartu}
              </span>
              <Badge
                variant='secondary'
                className={`border-0 text-xs font-medium ${
                  kartu.status === 'ACTIVE'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : kartu.status === 'BLOCKED'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {kartu.status}
              </Badge>
            </div>
            <div className='flex items-center gap-3 text-xs text-muted-foreground'>
              <span className='flex items-center gap-1 truncate'>
                <User className='h-3 w-3 shrink-0' />
                {kartu.label_pemegang || '(Tanpa label pemegang)'}
              </span>
              <span className='flex items-center gap-1 font-mono'>
                <CreditCard className='h-3 w-3 shrink-0' />
                UID: {kartu.uid || '-'}
              </span>
            </div>
          </div>

          <div className='text-right'>
            <p className='text-xs text-muted-foreground'>Saldo Saat Ini</p>
            <p className='text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400'>
              {formatRupiah(data?.saldo ?? kartu.saldo)}
            </p>
          </div>
        </div>

        {/* Tabs Pilihan */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'transaksi' | 'mutasi')}
          className='flex-1 flex flex-col min-h-0 mt-2'
        >
          <div className='flex items-center justify-between gap-2 pb-1'>
            <TabsList className='bg-muted/70 p-1 border-0'>
              <TabsTrigger value='transaksi' className='gap-2 text-xs'>
                <ShoppingBag className='h-3.5 w-3.5' />
                Transaksi Belanja
                {transaksiList.length > 0 && (
                  <Badge variant='secondary' className='ml-1 text-[10px] px-1.5 py-0 h-4 border-0'>
                    {transaksiList.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='mutasi' className='gap-2 text-xs'>
                <Clock className='h-3.5 w-3.5' />
                Mutasi Saldo
                {mutasiList.length > 0 && (
                  <Badge variant='secondary' className='ml-1 text-[10px] px-1.5 py-0 h-4 border-0'>
                    {mutasiList.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <Button
              size='sm'
              variant='ghost'
              onClick={() => void fetchRiwayat(kartu.id)}
              disabled={isLoading}
              className='h-8 text-xs text-muted-foreground hover:bg-muted'
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className='flex-1 flex flex-col items-center justify-center py-12 space-y-2'>
              <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
              <p className='text-xs text-muted-foreground'>Memuat riwayat...</p>
            </div>
          ) : error ? (
            <div className='flex-1 flex flex-col items-center justify-center py-10 space-y-3'>
              <div className='flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-xl border-0 text-xs'>
                <AlertCircle className='h-4 w-4' />
                <span>{error}</span>
              </div>
              <Button
                size='sm'
                variant='secondary'
                onClick={() => void fetchRiwayat(kartu.id)}
                className='text-xs border-0 bg-muted/80'
              >
                Coba Lagi
              </Button>
            </div>
          ) : (
            <>
              {/* Tab Transaksi Belanja */}
              <TabsContent value='transaksi' className='flex-1 min-h-0 m-0 pt-2'>
                <ScrollArea className='h-[320px] pr-3'>
                  {transaksiList.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-14 text-center space-y-2'>
                      <div className='h-12 w-12 rounded-full bg-muted/70 flex items-center justify-center text-muted-foreground'>
                        <ShoppingBag className='h-6 w-6 opacity-60' />
                      </div>
                      <p className='text-sm font-semibold text-foreground'>
                        Belum ada transaksi belanja
                      </p>
                      <p className='text-xs text-muted-foreground max-w-xs'>
                        Kartu ini belum pernah dipakai bertransaksi di kasir kantin.
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-2.5'>
                      {transaksiList.map((trx) => (
                        <div
                          key={trx.transaksiId}
                          className='p-3.5 bg-muted/40 hover:bg-muted/70 dark:bg-muted/20 dark:hover:bg-muted/40 rounded-xl border-0 transition-colors space-y-2'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <span className='font-mono font-bold text-xs text-foreground'>
                                #TRX-{trx.transaksiId}
                              </span>
                              <Badge
                                variant='secondary'
                                className={`border-0 text-[10px] px-1.5 py-0 ${
                                  trx.status === 'BERHASIL'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-destructive/15 text-destructive'
                                }`}
                              >
                                {trx.status}
                              </Badge>
                            </div>
                            <span className='font-mono font-bold text-sm text-foreground'>
                              {formatRupiah(trx.total)}
                            </span>
                          </div>

                          {/* List Items */}
                          {trx.items && trx.items.length > 0 && (
                            <div className='space-y-1 pt-1 border-t border-border/40'>
                              {trx.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className='flex items-center justify-between text-xs text-muted-foreground'
                                >
                                  <span>
                                    {item.qty}x {item.namaMenu}
                                  </span>
                                  <span className='font-mono text-[11px]'>
                                    {formatRupiah(item.subtotal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className='flex items-center justify-between text-[11px] text-muted-foreground pt-1'>
                            <span>{formatDateTime(trx.waktu)}</span>
                            {trx.alasanVoid && (
                              <span className='text-destructive text-[11px]'>
                                Void: {trx.alasanVoid}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Tab Mutasi Saldo */}
              <TabsContent value='mutasi' className='flex-1 min-h-0 m-0 pt-2'>
                <ScrollArea className='h-[320px] pr-3'>
                  {mutasiList.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-14 text-center space-y-2'>
                      <div className='h-12 w-12 rounded-full bg-muted/70 flex items-center justify-center text-muted-foreground'>
                        <Clock className='h-6 w-6 opacity-60' />
                      </div>
                      <p className='text-sm font-semibold text-foreground'>
                        Belum ada mutasi saldo
                      </p>
                      <p className='text-xs text-muted-foreground max-w-xs'>
                        Belum ada riwayat top-up, belanja, refund, atau pindah saldo pada kartu ini.
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      {mutasiList.map((m) => {
                        const isMasuk = m.arah === 'MASUK' || m.nominal > 0
                        return (
                          <div
                            key={m.id}
                            className='flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/70 dark:bg-muted/20 dark:hover:bg-muted/40 rounded-xl border-0 transition-colors'
                          >
                            <div className='flex items-center gap-3 min-w-0'>
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                  isMasuk
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isMasuk ? (
                                  <ArrowDownLeft className='h-4 w-4' />
                                ) : (
                                  <ArrowUpRight className='h-4 w-4' />
                                )}
                              </div>
                              <div className='min-w-0'>
                                <p className='text-xs font-semibold text-foreground truncate'>
                                  {m.keterangan || m.jenis}
                                </p>
                                <p className='text-[11px] text-muted-foreground'>
                                  {formatDateTime(m.waktu)}
                                </p>
                              </div>
                            </div>

                            <div className='text-right shrink-0'>
                              <p
                                className={`text-xs font-mono font-bold ${
                                  isMasuk
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isMasuk ? '+' : '-'} {formatRupiah(Math.abs(m.nominal))}
                              </p>
                              <p className='text-[10px] text-muted-foreground font-mono'>
                                Sisa: {formatRupiah(m.saldoSetelah)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </>
          )}
        </Tabs>

        <DialogFooter className='mt-2'>
          <Button
            type='button'
            variant='secondary'
            onClick={() => onOpenChange(false)}
            className='w-full sm:w-auto border-0 bg-muted/80 hover:bg-muted text-foreground shadow-none'
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
