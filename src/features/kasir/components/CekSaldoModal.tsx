import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Wallet, Search, AlertCircle, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { formatRupiah, getInitials } from '@/lib/formatters'
import { kasirApi, type InfoSaldoData } from '../api/kasir-api'
import { useRfidScanner } from '@/hooks/useRfidScanner'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const lastSearchedRef = useRef<string>('')
  const isSearchingRef = useRef<boolean>(false)

  const executeSearch = useCallback(async (queryToSearch: string) => {
    const query = queryToSearch.trim()
    if (!query) return
    if (isSearchingRef.current && lastSearchedRef.current === query) return

    lastSearchedRef.current = query
    isSearchingRef.current = true
    setLoading(true)
    setErrorMessage(null)
    setResult(null)

    try {
      const data = await kasirApi.cekSaldo(query)
      setResult(data)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setErrorMessage(
        errObj.message || 'Gagal mengecek saldo. Kartu tidak dikenali.'
      )
    } finally {
      isSearchingRef.current = false
      setLoading(false)
      setTimeout(() => {
        inputRef.current?.select()
      }, 50)
    }
  }, [])

  // Integrasi listener RFID scanner global saat modal sedang terbuka
  useRfidScanner({
    onScan: (scannedUid) => {
      setSearchInput(scannedUid)
      executeSearch(scannedUid)
    },
    enabled: open,
  })

  // Deteksi otomatis saat kartu di-scan (UID 8-16 digit desimal/hex)
  useEffect(() => {
    const trimmed = searchInput.trim()
    if (!trimmed) return

    // Jika data hasil saat ini sudah sesuai dengan UID ini, jangan cek ulang
    if (result && result.uid?.toLowerCase() === trimmed.toLowerCase()) {
      return
    }

    if (lastSearchedRef.current.toLowerCase() === trimmed.toLowerCase() && (result || errorMessage)) {
      return
    }

    // Pola kartu RFID: 8-16 digit desimal (Mifare desimal) atau 8-16 hex chars
    const isCompletedUid =
      /^\d{8,16}$/.test(trimmed) || /^[0-9a-fA-F]{8,16}$/.test(trimmed)

    // Hanya auto-eksekusi saat pola UID lengkap terbaca dari scanner/input
    if (!isCompletedUid) return

    const timer = setTimeout(() => {
      executeSearch(trimmed)
    }, 60)

    return () => clearTimeout(timer)
  }, [searchInput, result, errorMessage, executeSearch])

  // Auto focus & select input saat modal terbuka
  useEffect(() => {
    if (open) {
      lastSearchedRef.current = ''
      const t = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    executeSearch(searchInput)
  }

  const handleReset = () => {
    setSearchInput('')
    lastSearchedRef.current = ''
    setResult(null)
    setErrorMessage(null)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      handleReset()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md select-none'>
        <DialogHeader>
          <div className='flex items-center gap-2 text-primary'>
            <Wallet className='h-5 w-5' />
            <DialogTitle className='text-base font-bold text-foreground'>
              Cek Saldo Siswa
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs text-muted-foreground'>
            Tap kartu RFID atau masukkan nomor UID kartu untuk memeriksa saldo dan status kartu terkini.
          </DialogDescription>
        </DialogHeader>

        {/* Form Pencarian */}
        <form onSubmit={handleSearch} className='space-y-4 pt-1'>
          <div className='space-y-1.5'>
            <div className='flex gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  ref={inputRef}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder='Tap kartu atau ketik UID kartu RFID...'
                  disabled={loading}
                  autoFocus
                  className='h-9 pl-9 text-sm font-semibold tracking-wider uppercase'
                />
              </div>
              <Button
                type='submit'
                disabled={!searchInput.trim() || loading}
                className='h-9 shrink-0 font-semibold'
              >
                {loading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  'Periksa'
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Pesan Kesalahan */}
        {errorMessage && (
          <div className='flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50'>
            <AlertCircle className='h-4 w-4 shrink-0' />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hasil Informasi Saldo */}
        {result && (
          <div className='space-y-3 rounded-xl border border-border bg-muted/40 p-4 animate-in zoom-in-95 duration-150'>
            <div className='flex items-start gap-3'>
              {/* Foto Profil / Avatar */}
              <Avatar className='h-14 w-14 shrink-0 rounded-xl border border-border bg-card text-muted-foreground'>
                {result.fotoUrl && (
                  <AvatarImage
                    src={result.fotoUrl}
                    alt={result.nama}
                    className='h-full w-full object-cover'
                  />
                )}
                <AvatarFallback className='rounded-xl bg-muted text-sm font-bold text-foreground'>
                  {getInitials(result.nama)}
                </AvatarFallback>
              </Avatar>

              {/* Data Identitas */}
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-1.5'>
                  <h4 className='truncate text-sm font-bold text-foreground'>
                    {result.nama}
                  </h4>
                  <Badge
                    variant='outline'
                    className='rounded-full border border-blue-500/20 bg-blue-500/15 px-2 py-0 text-[10px] font-semibold tracking-wider uppercase text-blue-700 dark:text-blue-300'
                  >
                    Siswa
                  </Badge>
                  {result.status === 'BLOCKED' && (
                    <Badge
                      variant='destructive'
                      className='rounded-full px-2 py-0 text-[10px] font-semibold tracking-wider uppercase'
                    >
                      Diblokir
                    </Badge>
                  )}
                </div>

                <div className='mt-1 text-xs text-muted-foreground'>
                  <span>
                    {result.nis ? (
                      <>
                        NIS: <strong className='tabular-nums text-foreground'>{result.nis}</strong> •{' '}
                      </>
                    ) : null}
                    Kelas: <strong className='text-foreground'>{result.kelas || '-'}</strong>
                  </span>
                </div>

                {result.uid && (
                  <div className='mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground'>
                    UID: {result.uid}
                  </div>
                )}
              </div>
            </div>

            {/* Sisa Saldo Display */}
            <div className='mt-2 rounded-xl border border-border bg-card p-3'>
              <div className='flex items-baseline justify-between'>
                <span className='text-xs font-medium text-muted-foreground'>
                  Sisa Saldo Terkini:
                </span>
                <span className='text-xl font-bold tracking-tight tabular-nums text-primary'>
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
                className='h-8 text-xs font-semibold text-muted-foreground hover:text-foreground'
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

