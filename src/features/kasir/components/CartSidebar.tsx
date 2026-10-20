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
      className={`flex h-full w-full flex-col border-none bg-muted/40 dark:bg-muted/10 select-none shadow-none sm:w-[350px] lg:w-[380px] xl:w-[420px] ${className}`}
    >
      {/* Header Keranjang */}
      <div className='flex h-14 shrink-0 items-center justify-between border-none bg-muted/50 dark:bg-muted/20 px-4 shadow-none'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <ShoppingCart className='h-4 w-4' />
          </div>
          <div className='flex flex-col justify-center'>
            <h3 className='text-sm font-bold leading-none tracking-tight text-foreground'>
              Keranjang Belanja
            </h3>
            <span className='mt-0.5 text-[11px] leading-none text-muted-foreground'>
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
          className='h-8 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 rounded-xl'
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
            <div className='mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/60'>
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
                className='flex flex-col gap-2 rounded-2xl border-none bg-card dark:bg-card/90 p-3.5 shadow-none'
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
                      <span className='text-xs text-muted-foreground'>
                        {formatRupiah(item.menu.hargaJual)} /
                        {item.menu.satuan || 'porsi'}
                      </span>
                      {isMaxReached && (
                        <Badge
                          variant='secondary'
                          className='rounded-full border-none bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0 text-[10px] uppercase tracking-wide shadow-none'
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
                    className='h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl'
                    title={`Hapus ${item.menu.nama}`}
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>

                {/* Baris Bawah: Pengatur Qty & Subtotal */}
                <div className='flex items-center justify-between gap-2 pt-1'>
                  {/* Stepper Kuantitas */}
                  <div className='flex items-center gap-1 rounded-xl border-none bg-muted/70 dark:bg-muted/40 p-0.5 shadow-none'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => decrementQty(item.menu.id)}
                      className='h-7 w-7 rounded-lg text-foreground hover:bg-background/80'
                      title='Kurangi jumlah'
                    >
                      <Minus className='h-3.5 w-3.5' />
                    </Button>

                    <span className='min-w-[2rem] text-center text-xs font-bold text-foreground tabular-nums'>
                      {item.qty}
                    </span>

                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      disabled={isMaxReached}
                      onClick={() => incrementQty(item.menu.id)}
                      className='h-7 w-7 rounded-lg text-foreground hover:bg-background disabled:opacity-30'
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
                    <span className='text-sm font-bold text-foreground tabular-nums'>
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
      <div className='shrink-0 space-y-3 border-none bg-muted/50 dark:bg-muted/20 p-4 shadow-none'>
        {/* Ringkasan Biaya */}
        <div className='space-y-1.5 text-xs'>
          <div className='flex justify-between text-muted-foreground'>
            <span>Total Kuantitas</span>
            <span className='font-semibold text-foreground tabular-nums'>{totalCount} Item</span>
          </div>
          <div className='flex items-baseline justify-between border-none pt-1.5'>
            <span className='text-sm font-bold text-foreground'>
              Total Belanja
            </span>
            <span className='text-lg font-bold tracking-tight text-primary tabular-nums sm:text-xl'>
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
            className='h-12 w-full touch-manipulation gap-2 rounded-xl border-none text-sm font-bold shadow-none sm:text-base'
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
        <AlertDialogContent className='border-none rounded-2xl shadow-none'>
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
            <AlertDialogCancel className='border-none bg-muted/80 text-foreground hover:bg-muted rounded-xl shadow-none'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearConfirmed}
              className='border-none shadow-none rounded-xl text-destructive-foreground bg-destructive hover:bg-destructive/90'
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
