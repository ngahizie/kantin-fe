import React, { useId, useMemo, useRef, useState } from 'react'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  CreditCard,
  Banknote,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import { useCartStore } from '@/stores/use-cart-store'
import { formatRupiah } from '@/lib/formatters'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  evaluateCashPayment,
  getQuickCashNominals,
  parseCashInput,
} from '../cash-payment'
import type { MetodeBayarKasir } from '../types'

interface CartQtyInputProps {
  qty: number
  menuName: string
  disabled?: boolean
  onChangeQty: (nextQty: number) => void
}

function CartQtyInput({
  qty,
  menuName,
  disabled = false,
  onChangeQty,
}: CartQtyInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      type='text'
      inputMode='numeric'
      maxLength={4}
      disabled={disabled}
      aria-label={`Jumlah ${menuName}`}
      title='Ketik langsung jumlah pesanan'
      value={draft ?? String(qty)}
      onFocus={(e) => {
        setDraft(String(qty))
        e.currentTarget.select()
      }}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '')
        setDraft(digits)
        if (digits !== '') {
          const parsed = parseInt(digits, 10)
          if (parsed >= 1) {
            onChangeQty(parsed)
          }
        }
      }}
      onBlur={() => {
        if (draft !== null) {
          const parsed = parseInt(draft, 10)
          if (Number.isFinite(parsed) && parsed >= 1) {
            onChangeQty(parsed)
          }
          setDraft(null)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
      className='h-7 w-12 rounded-md bg-transparent text-center font-mono text-xs font-bold tabular-nums text-foreground outline-none transition-colors hover:bg-muted/50 focus:bg-muted/60 focus:ring-1 focus:ring-primary/50 disabled:opacity-50'
    />
  )
}

interface CartSidebarProps {
  onCheckout?: () => void
  onCashCheckout?: (uangDiterima: number) => void
  onManualRfidOpen?: () => void
  metodeBayar?: MetodeBayarKasir
  onMetodeBayarChange?: (metode: MetodeBayarKasir) => void
  isProcessing?: boolean
  isOffline?: boolean
  isSessionClosed?: boolean
  className?: string
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  onCheckout,
  onCashCheckout,
  onManualRfidOpen: _onManualRfidOpen,
  metodeBayar: controlledMetode,
  onMetodeBayarChange,
  isProcessing = false,
  isOffline = false,
  isSessionClosed = false,
  className = '',
}) => {
  const {
    items,
    updateQty,
    incrementQty,
    decrementQty,
    removeItem,
    clearCart,
    totalItems,
    totalHarga,
  } = useCartStore()

  const cashInputId = useId()
  const cashInputRef = useRef<HTMLInputElement>(null)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [internalMetode, setInternalMetode] = useState<MetodeBayarKasir>('SALDO')
  const [cashInputRaw, setCashInputRaw] = useState('')
  const [cashSubmittedError, setCashSubmittedError] = useState(false)

  const metodeBayar = controlledMetode ?? internalMetode
  const setMetodeBayar = (next: MetodeBayarKasir) => {
    setInternalMetode(next)
    onMetodeBayarChange?.(next)
    setCashSubmittedError(false)
  }

  const totalCount = totalItems()
  const totalNominal = totalHarga()
  const isCartEmpty = items.length === 0

  // Reset input tunai bila keranjang dikosongkan
  const [prevTotalNominal, setPrevTotalNominal] = useState(totalNominal)
  if (totalNominal !== prevTotalNominal) {
    setPrevTotalNominal(totalNominal)
    if (totalNominal === 0) {
      setCashInputRaw('')
      setCashSubmittedError(false)
    }
  }

  const uangDiterima = useMemo(() => parseCashInput(cashInputRaw), [cashInputRaw])
  const cashEval = useMemo(
    () => evaluateCashPayment(totalNominal, uangDiterima),
    [totalNominal, uangDiterima]
  )
  const quickNominals = useMemo(
    () => getQuickCashNominals(totalNominal),
    [totalNominal]
  )

  const handleClearConfirmed = () => {
    clearCart()
    setCashInputRaw('')
    setCashSubmittedError(false)
    setClearDialogOpen(false)
  }

  const handleCashSubmit = () => {
    if (isCartEmpty || isProcessing || isOffline || isSessionClosed) return
    if (!cashInputRaw.trim()) {
      setCashSubmittedError(true)
      cashInputRef.current?.focus()
      return
    }
    if (!cashEval.isValid) {
      setCashSubmittedError(true)
    } else {
      setCashSubmittedError(false)
    }
    // Tetap teruskan ke handler checkout agar validasi server (HTTP 409) dapat ditampilkan konsisten
    onCashCheckout?.(cashEval.uangDiterima)
  }

  return (
    <aside
      className={`flex h-full w-full flex-col bg-card text-card-foreground select-none sm:w-[350px] lg:w-[380px] xl:w-[420px] ${className}`}
    >
      {/* Header Keranjang */}
      <div className='flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary'>
            <ShoppingCart className='h-4 w-4' />
          </div>
          <div className='flex flex-col justify-center'>
            <h3 className='text-sm font-bold leading-none tracking-tight text-foreground'>
              Keranjang Belanja
            </h3>
            <span className='mt-0.5 text-[11px] leading-none text-muted-foreground tabular-nums'>
              {totalCount} item dipilih
            </span>
          </div>
        </div>

        {/* Tombol Kosongkan Keranjang */}
        <Button
          type='button'
          variant='ghost'
          size='sm'
          disabled={isCartEmpty}
          onClick={() => setClearDialogOpen(true)}
          className='h-8 gap-1 rounded-lg px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-40'
          title='Kosongkan seluruh isi keranjang'
        >
          <Trash2 className='h-3.5 w-3.5' />
          <span className='hidden sm:inline'>Kosongkan</span>
        </Button>
      </div>

      {/* Daftar Item Keranjang */}
      <div className='flex-1 space-y-3 overflow-y-auto p-4'>
        {isCartEmpty ? (
          <div className='flex h-full min-h-[240px] flex-col items-center justify-center p-6 text-center text-muted-foreground'>
            <div className='mb-3 flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground'>
              <ShoppingBag className='h-8 w-8 stroke-[1.5]' />
            </div>
            <h4 className='text-sm font-semibold text-foreground'>
              Keranjang Masih Kosong
            </h4>
            <p className='mt-1 max-w-[220px] text-xs text-muted-foreground'>
              Pilih item dari katalog menu untuk menambahkan pesanan ke antrean
              kasir.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const maxStock = item.menu.stokBerjalan ?? 0
            const isMarkedMinus = Boolean(item.jualMelebihiCatatan)
            const isMaxReached = !isMarkedMinus && item.qty >= maxStock

            return (
              <div
                key={item.menu.id}
                className='flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3.5'
              >
                {/* Baris Atas: Info Item & Tombol Hapus */}
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <h5
                      className='truncate text-sm font-semibold text-foreground'
                      title={item.menu.nama}
                    >
                      {item.menu.nama}
                    </h5>
                    <div className='mt-0.5 flex flex-wrap items-center gap-1.5'>
                      <span className='text-xs text-muted-foreground tabular-nums'>
                        {formatRupiah(item.menu.hargaJual)} /
                        {item.menu.satuan || 'porsi'}
                      </span>
                      {isMarkedMinus ? (
                        <Badge
                          variant='outline'
                          className='rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0 text-[10px] font-semibold tracking-wide uppercase text-rose-700 dark:text-rose-300'
                        >
                          Lewat catatan
                        </Badge>
                      ) : isMaxReached ? (
                        <Badge
                          variant='outline'
                          className='rounded-full border border-amber-500/20 bg-amber-500/15 px-2 py-0 text-[10px] font-semibold tracking-wide uppercase text-amber-700 dark:text-amber-300'
                        >
                          Maksimal stok
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {/* Tombol Hapus Single Item */}
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => removeItem(item.menu.id)}
                    className='h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                    title={`Hapus ${item.menu.nama}`}
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>

                {/* Baris Bawah: Pengatur Qty & Subtotal */}
                <div className='flex items-center justify-between gap-2 pt-1'>
                  {/* Stepper Kuantitas */}
                  <div className='flex items-center gap-1 rounded-lg border border-border bg-background p-0.5'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => decrementQty(item.menu.id)}
                      className='h-7 w-7 rounded-md text-foreground hover:bg-muted'
                      title='Kurangi jumlah'
                    >
                      <Minus className='h-3.5 w-3.5' />
                    </Button>

                    <CartQtyInput
                      qty={item.qty}
                      menuName={item.menu.nama}
                      disabled={isProcessing}
                      onChangeQty={(nextQty) =>
                        updateQty(item.menu.id, nextQty, {
                          allowExceedStock: true,
                        })
                      }
                    />

                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() =>
                        incrementQty(item.menu.id, { allowExceedStock: true })
                      }
                      className='h-7 w-7 rounded-md text-foreground hover:bg-muted'
                      title={
                        isMaxReached
                          ? 'Tambah jumlah (melewati catatan stok / gudang)'
                          : 'Tambah jumlah'
                      }
                    >
                      <Plus className='h-3.5 w-3.5' />
                    </Button>
                  </div>

                  {/* Subtotal Item (Integer Rupiah) */}
                  <div className='text-right'>
                    <span className='text-sm font-bold tabular-nums text-foreground'>
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer / Panel Pembayaran */}
      <div className='shrink-0 space-y-3 border-t border-border bg-muted/40 p-4'>
        {/* Pilihan Metode Bayar: Saldo (Kartu Siswa) vs Tunai (Tamu/Tanpa Kartu) */}
        <div className='space-y-1.5'>
          <span className='block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Metode Pembayaran
          </span>
          <div
            role='radiogroup'
            aria-label='Metode Pembayaran Kasir'
            className='grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-background p-1'
          >
            <button
              type='button'
              role='radio'
              aria-checked={metodeBayar === 'SALDO'}
              disabled={isProcessing}
              onClick={() => setMetodeBayar('SALDO')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all ${
                metodeBayar === 'SALDO'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <CreditCard className='h-3.5 w-3.5 shrink-0' />
              <span>Saldo (Kartu)</span>
            </button>
            <button
              type='button'
              role='radio'
              aria-checked={metodeBayar === 'TUNAI'}
              disabled={isProcessing}
              onClick={() => setMetodeBayar('TUNAI')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all ${
                metodeBayar === 'TUNAI'
                  ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-600'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <Banknote className='h-3.5 w-3.5 shrink-0' />
              <span>Tunai (Tamu)</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Biaya */}
        <div className='space-y-1.5 text-xs'>
          <div className='flex justify-between text-muted-foreground'>
            <span>Total Kuantitas</span>
            <span className='font-semibold tabular-nums text-foreground'>{totalCount} Item</span>
          </div>
          <div className='flex items-baseline justify-between pt-1'>
            <span className='text-sm font-bold text-foreground'>
              Total Belanja
            </span>
            <span className='text-lg font-bold tracking-tight tabular-nums text-primary sm:text-xl'>
              {formatRupiah(totalNominal)}
            </span>
          </div>
        </div>

        {/* Panel Input Uang Diterima & Kembalian Otomatis (Khusus Metode Tunai) */}
        {metodeBayar === 'TUNAI' && (
          <div className='space-y-2 rounded-xl border border-border bg-background p-3'>
            <div className='space-y-1'>
              <label
                htmlFor={cashInputId}
                className='flex items-center justify-between text-[11px] font-semibold text-foreground'
              >
                <span>Uang Diterima (Rp)</span>
                <span className='font-normal text-muted-foreground'>
                  Tanpa potong saldo
                </span>
              </label>
              <div className='relative'>
                <span className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-semibold text-muted-foreground'>
                  Rp
                </span>
                <Input
                  ref={cashInputRef}
                  id={cashInputId}
                  type='text'
                  inputMode='numeric'
                  autoComplete='off'
                  disabled={isCartEmpty || isProcessing || isOffline || isSessionClosed}
                  value={cashInputRaw}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setCashInputRaw(digits)
                    if (cashSubmittedError) setCashSubmittedError(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCashSubmit()
                    }
                  }}
                  placeholder={totalNominal > 0 ? String(totalNominal) : '0'}
                  aria-invalid={
                    Boolean(
                      !isCartEmpty &&
                        !cashEval.isValid &&
                        (cashInputRaw.length > 0 || cashSubmittedError)
                    )
                  }
                  className='h-9 pl-9 font-mono text-sm font-bold tabular-nums'
                />
              </div>
            </div>

            {/* Pilihan Nominal Cepat */}
            {quickNominals.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {quickNominals.map((nominal, idx) => (
                  <button
                    key={nominal}
                    type='button'
                    disabled={isProcessing || isOffline || isSessionClosed}
                    onClick={() => {
                      setCashInputRaw(String(nominal))
                      setCashSubmittedError(false)
                    }}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold tabular-nums transition-colors ${
                      uangDiterima === nominal
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                    }`}
                  >
                    {idx === 0 ? 'Uang Pas' : formatRupiah(nominal)}
                  </button>
                ))}
              </div>
            )}

            {/* Status Validasi Kurang / Kembalian Otomatis */}
            {!isCartEmpty &&
              !cashEval.isValid &&
              (cashInputRaw.length > 0 || cashSubmittedError) && (
                <div
                  role='alert'
                  className='flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive'
                >
                  <AlertCircle className='h-3.5 w-3.5 shrink-0' />
                  <span className='tabular-nums'>{cashEval.errorMessage}</span>
                </div>
              )}

            {!isCartEmpty && cashEval.isValid && (
              <div className='flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-xs'>
                <span className='font-semibold text-emerald-700 dark:text-emerald-300'>
                  Kembalian
                </span>
                <span className='font-mono text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300'>
                  {formatRupiah(cashEval.kembalian)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tombol Lanjut ke Bayar */}
        <div className='flex flex-col gap-2'>
          {metodeBayar === 'SALDO' ? (
            <Button
              type='button'
              size='lg'
              disabled={isCartEmpty || isProcessing || isOffline || isSessionClosed}
              onClick={onCheckout}
              className='h-11 w-full touch-manipulation gap-2 rounded-xl text-sm font-bold sm:text-base disabled:opacity-50'
            >
              <CreditCard className='h-5 w-5' />
              <span>
                {isOffline
                  ? 'Offline - Transaksi Tidak Tersedia'
                  : isSessionClosed
                  ? 'Sesi Kasir Telah Ditutup'
                  : isProcessing
                  ? 'Memproses Transaksi...'
                  : 'Bayar / Tap Kartu'}
              </span>
            </Button>
          ) : (
            <Button
              type='button'
              size='lg'
              disabled={isCartEmpty || isProcessing || isOffline || isSessionClosed}
              onClick={handleCashSubmit}
              className='h-11 w-full touch-manipulation gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 sm:text-base disabled:opacity-50'
            >
              <Banknote className='h-5 w-5' />
              <span>
                {isOffline
                  ? 'Offline - Transaksi Tidak Tersedia'
                  : isSessionClosed
                  ? 'Sesi Kasir Telah Ditutup'
                  : isProcessing
                  ? 'Memproses Transaksi...'
                  : 'Bayar Tunai'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Dialog Konfirmasi Kosongkan Keranjang */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5 text-amber-500' />
              Kosongkan Keranjang Belanja?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh ({totalCount}) item pesanan yang telah dipilih akan
              dihapus dari antrean saat ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearConfirmed}
              className='bg-destructive text-white hover:bg-destructive/90'
            >
              Kosongkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
