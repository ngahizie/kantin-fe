import React, { useState } from 'react'
import { Wallet, Search, User, CreditCard, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatRupiah } from '@/lib/formatters'
import { kasirApi, type InfoSaldoData } from '../api/kasir-api'

export interface CekSaldoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CekSaldoModal: React.FC<CekSaldoModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<InfoSaldoData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const query = searchInput.trim()
    if (!query) return

    setLoading(true)
    setErrorMessage(null)
    setResult(null)

    try {
      const data = await kasirApi.cekSaldo(query)
      setResult(data)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setErrorMessage(
        errObj.message || 'Gagal mengecek saldo. Kartu atau siswa tidak ditemukan.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSearchInput('')
    setResult(null)
    setErrorMessage(null)
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      handleReset()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md select-none border-none shadow-none rounded-2xl bg-card'>
        <DialogHeader>
          <div className='flex items-center gap-2 text-primary'>
            <Wallet className='h-5 w-5' />
            <DialogTitle className='text-base font-bold'>
              Cek Saldo Siswa & Kartu Tamu
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs'>
            Masukkan nomor UID kartu, NIS, atau nama siswa untuk memeriksa sisa saldo terkini.
          </DialogDescription>
        </DialogHeader>

        {/* Form Pencarian */}
        <form onSubmit={handleSearch} className='space-y-4 pt-1'>
          <div className='space-y-1.5'>
            <div className='flex gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder='Tap kartu atau ketik UID / NIS...'
                  disabled={loading}
                  autoFocus
                  className='text-sm font-semibold tracking-wider uppercase border-none bg-muted/60 pl-9 shadow-none focus-visible:bg-muted focus-visible:ring-0 rounded-xl'
                />
              </div>
              <Button
                type='submit'
                disabled={!searchInput.trim() || loading}
                className='shrink-0 font-semibold border-none rounded-xl shadow-none'
              >
                {loading ? (
                  <RefreshCw className='h-4 w-4 animate-spin' />
                ) : (
                  'Periksa'
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Pesan Kesalahan */}
        {errorMessage && (
          <div className='flex items-center gap-2 rounded-xl border-none bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50'>
            <AlertCircle className='h-4 w-4 shrink-0' />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hasil Informasi Saldo */}
        {result && (
          <div className='space-y-3 rounded-2xl border-none bg-muted/50 dark:bg-muted/20 p-4 animate-in zoom-in-95 duration-150'>
            <div className='flex items-start gap-3'>
              {/* Foto Profil / Avatar */}
              <div className='relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/80 text-muted-foreground'>
                {result.fotoUrl ? (
                  <img
                    src={result.fotoUrl}
                    alt={result.nama}
                    className='h-full w-full object-cover'
                  />
                ) : result.tipe === 'KARTU_TAMU' ? (
                  <CreditCard className='h-7 w-7 text-primary/70' />
                ) : (
                  <User className='h-7 w-7 text-muted-foreground/70' />
                )}
              </div>

              {/* Data Identitas */}
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-1.5'>
                  <h4 className='truncate text-sm font-bold text-foreground'>
                    {result.nama}
                  </h4>
                  <Badge
                    variant='secondary'
                    className='border-none px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider rounded-md'
                  >
                    {result.tipe === 'KARTU_TAMU' ? 'Kartu Tamu' : 'Siswa'}
                  </Badge>
                </div>

                <div className='mt-1 text-xs text-muted-foreground'>
                  {result.tipe === 'KARTU_TAMU' ? (
                    <span>No. Kartu: <strong className='text-foreground'>{result.nomorKartu || '-'}</strong></span>
                  ) : (
                    <span>
                      NIS: <strong className='text-foreground'>{result.nis || '-'}</strong> • Kelas:{' '}
                      <strong className='text-foreground'>{result.kelas || '-'}</strong>
                    </span>
                  )}
                </div>

                {result.uid && (
                  <div className='mt-0.5 text-[11px] font-mono text-muted-foreground/80'>
                    UID: {result.uid}
                  </div>
                )}
              </div>
            </div>

            {/* Sisa Saldo Display */}
            <div className='mt-2 rounded-xl border-none bg-background/80 dark:bg-background/40 p-3'>
              <div className='flex items-baseline justify-between'>
                <span className='text-xs font-medium text-muted-foreground'>
                  Sisa Saldo Terkini:
                </span>
                <span className='text-xl font-bold tracking-tight text-primary tabular-nums'>
                  {formatRupiah(result.saldo)}
                </span>
              </div>
            </div>

            {/* Tombol Aksi Tambahan */}
            <div className='flex justify-end pt-1'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleReset}
                className='h-8 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground'
              >
                Cek Kartu Lain
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CekSaldoModal

