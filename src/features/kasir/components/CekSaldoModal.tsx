import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Wallet, Search, AlertCircle, RefreshCw } from 'lucide-react'
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
      <DialogContent className='max-w-md select-none has-border !border !border-slate-200 dark:!border-slate-800 shadow-none rounded-2xl bg-white dark:bg-[#0a0a0a] text-slate-800 dark:text-white'>
        <DialogHeader>
          <div className='flex items-center gap-2 text-blue-600 dark:text-blue-400'>
            <Wallet className='h-5 w-5' />
            <DialogTitle className='text-base font-bold text-slate-800 dark:text-white'>
              Cek Saldo Siswa
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs text-slate-500 dark:text-slate-400'>
            Tap kartu RFID atau masukkan nomor UID kartu untuk memeriksa saldo dan status kartu terkini.
          </DialogDescription>
        </DialogHeader>

        {/* Form Pencarian */}
        <form onSubmit={handleSearch} className='space-y-4 pt-1'>
          <div className='space-y-1.5'>
            <div className='flex gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500' />
                <Input
                  ref={inputRef}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder='Tap kartu atau ketik UID kartu RFID...'
                  disabled={loading}
                  autoFocus
                  className='text-sm font-semibold tracking-wider uppercase has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-800 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 pl-9 shadow-none focus-visible:ring-0 rounded-xl'
                />
              </div>
              <Button
                type='submit'
                disabled={!searchInput.trim() || loading}
                className='shrink-0 font-semibold !bg-blue-600 hover:!bg-blue-500 !text-white rounded-xl shadow-none'
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
          <div className='flex items-center gap-2 rounded-xl has-border !border !border-rose-200 dark:!border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in-50'>
            <AlertCircle className='h-4 w-4 shrink-0' />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hasil Informasi Saldo */}
        {result && (
          <div className='space-y-3 rounded-2xl has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 animate-in zoom-in-95 duration-150'>
            <div className='flex items-start gap-3'>
              {/* Foto Profil / Avatar */}
              <Avatar className='h-14 w-14 shrink-0 rounded-xl has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] text-slate-500 dark:text-slate-400'>
                {result.fotoUrl && (
                  <AvatarImage
                    src={result.fotoUrl}
                    alt={result.nama}
                    className='h-full w-full object-cover'
                  />
                )}
                <AvatarFallback className='rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200'>
                  {getInitials(result.nama)}
                </AvatarFallback>
              </Avatar>

              {/* Data Identitas */}
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-1.5'>
                  <h4 className='truncate text-sm font-bold text-slate-800 dark:text-white'>
                    {result.nama}
                  </h4>
                  <Badge
                    variant='secondary'
                    className='bg-blue-100/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0 text-[10px] font-semibold uppercase tracking-wider rounded-full shadow-none'
                  >
                    Siswa
                  </Badge>
                  {result.status === 'BLOCKED' && (
                    <Badge
                      variant='destructive'
                      className='px-2 py-0 text-[10px] font-semibold uppercase tracking-wider rounded-full shadow-none'
                    >
                      Diblokir
                    </Badge>
                  )}
                </div>

                <div className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                  <span>
                    {result.nis ? (
                      <>
                        NIS: <strong className='text-slate-800 dark:text-white'>{result.nis}</strong> •{' '}
                      </>
                    ) : null}
                    Kelas: <strong className='text-slate-800 dark:text-white'>{result.kelas || '-'}</strong>
                  </span>
                </div>

                {result.uid && (
                  <div className='mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400'>
                    UID: {result.uid}
                  </div>
                )}
              </div>
            </div>

            {/* Sisa Saldo Display */}
            <div className='mt-2 rounded-xl has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] p-3'>
              <div className='flex items-baseline justify-between'>
                <span className='text-xs font-medium text-slate-500 dark:text-slate-400'>
                  Sisa Saldo Terkini:
                </span>
                <span className='text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums'>
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
                className='h-8 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
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

