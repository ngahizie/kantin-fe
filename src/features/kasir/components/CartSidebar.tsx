import React, { useState } from 'react'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
} from 'lucide-react'
import { useCartStore } from '@/stores/useCartStore'
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

export interface CartSidebarProps {
  onCheckout?: () => void
  onManualRfidOpen?: () => void
  isProcessing?: boolean
  isOffline?: boolean
  isSessionClosed?: boolean
  className?: string
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  onCheckout,
  onManualRfidOpen: _onManualRfidOpen,
  isProcessing = false,
  isOffline = false,
  isSessionClosed = false,
  className = '',
}) => {
  const {
    items,
    incrementQty,
    decrementQty,
    removeItem,
    clearCart,
    totalItems,
    totalHarga,
  } = useCartStore()

  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  const totalCount = totalItems()
  const totalNominal = totalHarga()
  const isCartEmpty = items.length === 0

  const handleClearConfirmed = () => {
    clearCart()
    setClearDialogOpen(false)
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
            const isMaxReached = item.qty >= maxStock

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
                    <div className='mt-0.5 flex items-center gap-2'>
                      <span className='text-xs text-muted-foreground tabular-nums'>
                        {formatRupiah(item.menu.hargaJual)} /
                        {item.menu.satuan || 'porsi'}
                      </span>
                      {isMaxReached && (
                        <Badge
                          variant='outline'
                          className='rounded-full border border-amber-500/20 bg-amber-500/15 px-2 py-0 text-[10px] font-semibold tracking-wide uppercase text-amber-700 dark:text-amber-300'
                        >
                          Maksimal stok
                        </Badge>
                      )}
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

                    <span className='min-w-[2rem] text-center text-xs font-bold tabular-nums text-foreground'>
                      {item.qty}
                    </span>

                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      disabled={isMaxReached}
                      onClick={() => incrementQty(item.menu.id)}
                      className='h-7 w-7 rounded-md text-foreground hover:bg-muted disabled:opacity-30'
                      title={
                        isMaxReached
                          ? 'Maksimal stok tercapai'
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
        {/* Ringkasan Biaya */}
        <div className='space-y-1.5 text-xs'>
          <div className='flex justify-between text-muted-foreground'>
            <span>Total Kuantitas</span>
            <span className='font-semibold tabular-nums text-foreground'>{totalCount} Item</span>
          </div>
          <div className='flex items-baseline justify-between pt-1.5'>
            <span className='text-sm font-bold text-foreground'>
              Total Belanja
            </span>
            <span className='text-lg font-bold tracking-tight tabular-nums text-primary sm:text-xl'>
              {formatRupiah(totalNominal)}
            </span>
          </div>
        </div>

        {/* Tombol Lanjut ke Bayar / Tap RFID */}
        <div className='flex flex-col gap-2'>
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

export default CartSidebar
