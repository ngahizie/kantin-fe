import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Search,
  X,
  ShoppingCart,
  Layers,
  RefreshCw,
  Keyboard,
  AlertTriangle,
  History,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/stores/useCartStore'
import { usePengaturanStore } from '@/stores/usePengaturanStore'
import { formatRupiah } from '@/lib/formatters'
import { useBeepAudio } from '@/hooks/useBeepAudio'
import { useRfidScanner } from '@/hooks/useRfidScanner'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import type { MenuItem, KategoriItem } from '@/features/katalog/types'
import {
  kasirApi,
  generateIdempotencyKey,
  type TapTransaksiData,
} from './api/kasir-api'
import type {
  SesiKasirData,
  RekapSesiData,
  TransaksiSesiItem,
} from './types'
import CartSidebar from './components/CartSidebar'
import ManualRfidModal from './components/ManualRfidModal'
import MenuGrid from './components/MenuGrid'
import StudentFeedbackModal from './components/StudentFeedbackModal'
import TransactionErrorModal, {
  type TransactionErrorInfo,
} from './components/TransactionErrorModal'
import SessionHistoryModal from './components/SessionHistoryModal'
import CloseSessionModal from './components/CloseSessionModal'

export const KasirPosPage: React.FC = () => {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [kategoris, setKategoris] = useState<KategoriItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategoriId, setSelectedKategoriId] = useState<number | null>(
    null
  )
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // Pengaturan operasional & Titik Kasir store
  const { pengaturan, fetchPengaturan, fetchTitikKasir, activeTitikKasirId } =
    usePengaturanStore()

  // Online Status & Sesi Kasir Harian
  const isOnline = useOnlineStatus()
  const [sesi, setSesi] = useState<SesiKasirData | null>(null)
  const [rekapSesi, setRekapSesi] = useState<RekapSesiData | null>(null)
  const [transactions, setTransactions] = useState<TransaksiSesiItem[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [closeSessionModalOpen, setCloseSessionModalOpen] = useState(false)

  const isSessionClosed = sesi?.status === 'DITUTUP'

  // Modals & Transaksi state
  const [manualRfidOpen, setManualRfidOpen] = useState(false)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [confirmManualOpen, setConfirmManualOpen] = useState(false)
  const [pendingScannedUid, setPendingScannedUid] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<TapTransaksiData | null>(null)
  const [errorInfo, setErrorInfo] = useState<TransactionErrorInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isVoiding, setIsVoiding] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const { items, addItem, getItemQty, totalItems, totalHarga, clearCart } =
    useCartStore()
  const { playSuccess, playError, playVoid } = useBeepAudio()

  // Muat data sesi kasir harian & transaksi sesi
  const loadSesiData = useCallback(async () => {
    try {
      setIsHistoryLoading(true)
      let currentSesi = await kasirApi.getSesiAktif(
        activeTitikKasirId ?? undefined
      )
      if (!currentSesi) {
        currentSesi = await kasirApi.bukaSesi(activeTitikKasirId ?? undefined)
      }
      setSesi(currentSesi)

      if (currentSesi?.id) {
        const [rekap, trxList] = await Promise.all([
          kasirApi.getRekapSesi(currentSesi.id),
          kasirApi.getRiwayatTransaksiSesi(currentSesi.id),
        ])
        setRekapSesi(rekap)
        setTransactions(trxList)
      }
    } catch {
      // Gagal memuat sesi kasir
    } finally {
      setIsHistoryLoading(false)
    }
  }, [activeTitikKasirId])

  // Muat data katalog menu & kategori serta pengaturan operasional
  const loadKatalogData = useCallback(async () => {
    try {
      setLoading(true)
      const [menuData, kategoriData] = await Promise.all([
        katalogApi.getMenuList(undefined, true),
        katalogApi.getKategoriList(true),
        fetchPengaturan(),
        fetchTitikKasir(true),
      ])
      setMenus(menuData)
      setKategoris(kategoriData)
    } catch {
      toast.error('Gagal memuat katalog menu atau pengaturan POS')
    } finally {
      setLoading(false)
    }
  }, [fetchPengaturan, fetchTitikKasir])

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [menuData, kategoriData] = await Promise.all([
          katalogApi.getMenuList(undefined, true),
          katalogApi.getKategoriList(true),
          fetchPengaturan(),
          fetchTitikKasir(true),
        ])
        if (isMounted) {
          setMenus(menuData)
          setKategoris(kategoriData)
          setLoading(false)
        }
        await loadSesiData()
      } catch {
        if (isMounted) {
          toast.error('Gagal memuat katalog menu atau pengaturan POS')
          setLoading(false)
        }
      }
    }

    init()
    return () => {
      isMounted = false
    }
  }, [fetchPengaturan, fetchTitikKasir, loadSesiData])

  // Cek apakah waktu saat ini telah melewati batas jam tutup kasir otomatis
  const isPastClosingTime = useMemo(() => {
    const jamTutup = pengaturan.jamTutupOtomatis || '23:59'
    const [targetH, targetM] = jamTutup.split(':').map(Number)
    if (isNaN(targetH) || isNaN(targetM)) return false
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const targetMinutes = targetH * 60 + targetM
    return currentMinutes >= targetMinutes
  }, [pengaturan.jamTutupOtomatis])

  // Shortcut keyboard: tombol '/' untuk fokus input search, 'Escape' untuk bersihkan / blur
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (
        e.key === 'Escape' &&
        document.activeElement === searchInputRef.current
      ) {
        if (searchQuery) {
          setSearchQuery('')
        } else {
          searchInputRef.current?.blur()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  // Filter menu berdasarkan kategori & pencarian
  const filteredMenus = useMemo(() => {
    return menus.filter((item) => {
      if (!item.aktif) return false

      if (
        selectedKategoriId !== null &&
        item.kategoriId !== selectedKategoriId
      ) {
        return false
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchNama = item.nama.toLowerCase().includes(query)
        return matchNama
      }

      return true
    })
  }, [menus, selectedKategoriId, searchQuery])

  // Hitung jumlah item per kategori
  const kategoriCounts = useMemo(() => {
    const map = new Map<number, number>()
    menus.forEach((m) => {
      if (m.aktif && m.kategoriId) {
        map.set(m.kategoriId, (map.get(m.kategoriId) || 0) + 1)
      }
    })
    return map
  }, [menus])

  // Handler tambah menu ke keranjang
  const handleAddToCart = (menu: MenuItem) => {
    const res = addItem(menu)
    if (!res.success) {
      toast.warning(res.reason || 'Tidak dapat menambahkan menu')
    }
  }

  // Handler reset semua filter
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedKategoriId(null)
  }

  // Eksekusi transaksi tap RFID ke backend
  const executeTapTransaction = useCallback(
    async (scannedUid: string) => {
      if (!scannedUid || isProcessing) return

      const idempotencyKey = generateIdempotencyKey()
      setIsProcessing(true)

      try {
        const result = await kasirApi.prosesTap({
          rfidUid: scannedUid,
          items: items.map((it) => ({
            menuId: it.menu.id,
            qty: it.qty,
          })),
          idempotencyKey,
          titikKasirId: activeTitikKasirId ?? undefined,
        })

        // Transaksi Sukses
        playSuccess()
        setSuccessData(result)
        setStudentModalOpen(true)
        setMobileCartOpen(false)
        setManualRfidOpen(false)
      } catch (err: unknown) {
        // Transaksi Gagal (Validasi 6 Tahap)
        playError()
        const axiosErr = err as {
          response?: {
            status?: number
            data?: { message?: string; kekurangan?: number }
          }
        }
        const message =
          axiosErr.response?.data?.message ||
          'Terjadi kesalahan saat memproses transaksi tap'
        const kekurangan = axiosErr.response?.data?.kekurangan

        setErrorInfo({
          message,
          kekurangan,
          uid: scannedUid,
        })
        setErrorModalOpen(true)
      } finally {
        setIsProcessing(false)
      }
    },
    [items, isProcessing, activeTitikKasirId, playSuccess, playError]
  )

  // Handler proses tap RFID: konfirmasi manual (jika aktif) atau eksekusi langsung
  const handleProcessTap = useCallback(
    async (scannedUid: string) => {
      if (!isOnline) {
        playError()
        toast.error('Offline - transaksi tidak tersedia saat koneksi terputus')
        return
      }

      if (isSessionClosed) {
        playError()
        toast.error('Sesi kasir hari ini telah ditutup. Transaksi baru tidak diizinkan.')
        return
      }

      if (!scannedUid || isProcessing) return

      if (items.length === 0) {
        playError()
        toast.warning(
          'Keranjang belanja kosong! Pilih menu makanan atau minuman terlebih dahulu.'
        )
        return
      }

      // Langkah konfirmasi manual sesuai pengaturan operasional kantin (PRD §6.2)
      if (pengaturan.konfirmasiManual) {
        setPendingScannedUid(scannedUid)
        setConfirmManualOpen(true)
        return
      }

      await executeTapTransaction(scannedUid)
    },
    [
      isOnline,
      isSessionClosed,
      items,
      isProcessing,
      pengaturan.konfirmasiManual,
      executeTapTransaction,
      playError,
    ]
  )

  // Integrasi USB RFID Reader Hook
  useRfidScanner({
    onScan: handleProcessTap,
    enabled:
      isOnline &&
      !isSessionClosed &&
      !studentModalOpen &&
      !isProcessing &&
      !confirmManualOpen &&
      !historyModalOpen &&
      !closeSessionModalOpen &&
      !manualRfidOpen,
  })

  // Selesai transaksi (hitung mundur selesai atau tombol selesai ditekan)
  const handleTransactionComplete = useCallback(() => {
    setStudentModalOpen(false)
    setSuccessData(null)
    clearCart()
    loadKatalogData()
    loadSesiData()
  }, [clearCart, loadKatalogData, loadSesiData])

  // Void transaksi darurat jika wajah tidak cocok
  const handleTransactionVoid = useCallback(
    async (transaksiId: number) => {
      try {
        setIsVoiding(true)
        await kasirApi.voidTransaksi(
          transaksiId,
          'Wajah pembeli tidak cocok dengan foto kartu'
        )
        playVoid()
        toast.warning(
          'Transaksi berhasil dibatalkan (void). Saldo dan stok telah dikembalikan.'
        )
        setStudentModalOpen(false)
        setSuccessData(null)
        loadKatalogData()
        loadSesiData()
      } catch {
        toast.error('Gagal membatalkan transaksi')
      } finally {
        setIsVoiding(false)
      }
    },
    [playVoid, loadKatalogData, loadSesiData]
  )

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedKategoriId !== null
  )

  return (
    <div className='flex h-full w-full flex-col overflow-hidden bg-background'>
      {/* Banner Peringatan Offline */}
      {!isOnline && <OfflineBanner className='border-none' />}

      {/* Banner Sesi Kasir Ditutup */}
      {isSessionClosed && (
        <div className='flex items-center justify-between gap-2 border-none bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive'>
          <div className='flex items-center gap-2'>
            <Lock className='h-4 w-4 shrink-0' />
            <span>Sesi kasir hari ini telah ditutup. Transaksi baru dikunci dan tidak dapat diproses.</span>
          </div>
          <Button
            type='button'
            size='sm'
            variant='secondary'
            className='h-7 border-none bg-destructive/20 text-xs text-destructive hover:bg-destructive/30'
            onClick={() => setHistoryModalOpen(true)}
          >
            Lihat Riwayat Sesi
          </Button>
        </div>
      )}

      <div className='flex flex-1 overflow-hidden'>
        {/* Sisi Kiri: Katalog POS (Pencarian, Filter Kategori, Grid Menu) */}
        <div className='flex flex-1 flex-col overflow-hidden'>
          {/* Top Control Bar: Search & Status */}
          <div className='flex flex-col gap-2.5 border-none bg-card p-3 shadow-xs sm:p-4'>
            <div className='flex items-center gap-2'>
              {/* Input Pencarian dengan Shortcut '/' */}
              <div className='relative flex-1'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Cari menu makanan atau minuman...'
                  className='h-10 border-none bg-muted/60 pr-16 pl-9 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:bg-muted focus-visible:ring-0'
                />
                {searchQuery ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => setSearchQuery('')}
                    className='absolute top-1/2 right-2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                  >
                    <X className='h-3.5 w-3.5' />
                  </Button>
                ) : (
                  <kbd className='pointer-events-none absolute top-1/2 right-2.5 hidden h-5 -translate-y-1/2 items-center gap-1 rounded border-none bg-background/90 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-xs select-none sm:flex'>
                    /
                  </kbd>
                )}
              </div>

              {/* Tombol Input Manual UID */}
              <Button
                type='button'
                variant='secondary'
                onClick={() => setManualRfidOpen(true)}
                disabled={!isOnline || isSessionClosed}
                className='h-10 gap-1.5 border-none bg-muted/70 px-3 text-xs font-semibold text-foreground hover:bg-muted'
                title='Input manual UID atau kartu pengujian'
              >
                <Keyboard className='h-4 w-4' />
                <span className='hidden md:inline'>Manual UID</span>
              </Button>

              {/* Tombol Riwayat Sesi */}
              <Button
                type='button'
                variant='secondary'
                onClick={() => setHistoryModalOpen(true)}
                className='h-10 gap-1.5 border-none bg-muted/70 px-3 text-xs font-semibold text-foreground hover:bg-muted'
                title='Lihat riwayat transaksi sesi hari ini'
              >
                <History className='h-4 w-4' />
                <span className='hidden sm:inline'>Riwayat Sesi</span>
                {transactions.length > 0 && (
                  <Badge variant='secondary' className='ml-0.5 border-none bg-background/80 px-1.5 py-0 text-[10px] text-foreground shadow-xs'>
                    {transactions.length}
                  </Badge>
                )}
              </Button>

              {/* Tombol Tutup Kasir */}
              <Button
                type='button'
                variant='secondary'
                onClick={() => setCloseSessionModalOpen(true)}
                disabled={isSessionClosed}
                className={`h-10 gap-1.5 border-none px-3 text-xs font-semibold ${
                  isSessionClosed
                    ? 'cursor-not-allowed opacity-60'
                    : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                }`}
                title='Tutup sesi kasir harian'
              >
                <Lock className='h-4 w-4' />
                <span className='hidden md:inline'>
                  {isSessionClosed ? 'Sesi Ditutup' : 'Tutup Kasir'}
                </span>
              </Button>

            {/* Tombol Refresh Katalog */}
            <Button
              type='button'
              variant='secondary'
              size='icon'
              onClick={loadKatalogData}
              disabled={loading}
              className='h-10 w-10 shrink-0 border-none bg-muted/70 text-foreground hover:bg-muted'
              title='Muat Ulang Menu'
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          {/* Banner Peringatan Tutup Otomatis */}
          {isPastClosingTime && (
            <div className='flex items-center gap-2 rounded-md border-none bg-amber-500/15 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300'>
              <AlertTriangle className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400' />
              <span>
                <strong>Perhatian:</strong> Melewati jam operasional tutup ({pengaturan.jamTutupOtomatis || '23:59'}).
              </span>
            </div>
          )}

          {/* Filter Pills Kategori */}
          <div className='scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-1'>
            <Button
              type='button'
              size='sm'
              variant={selectedKategoriId === null ? 'default' : 'secondary'}
              onClick={() => setSelectedKategoriId(null)}
              className={`h-8 shrink-0 touch-manipulation rounded-full border-none px-3 text-xs font-semibold shadow-xs ${
                selectedKategoriId === null
                  ? ''
                  : 'bg-muted/70 text-foreground hover:bg-muted'
              }`}
            >
              <Layers className='mr-1.5 h-3.5 w-3.5' />
              Semua Menu
              <Badge
                variant='secondary'
                className={`ml-1.5 h-4 border-none px-1 text-[10px] ${
                  selectedKategoriId === null
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-background/80 text-muted-foreground shadow-xs'
                }`}
              >
                {menus.filter((m) => m.aktif).length}
              </Badge>
            </Button>

            {kategoris.map((kat) => {
              const count = kategoriCounts.get(kat.id) || 0
              const isSelected = selectedKategoriId === kat.id

              return (
                <Button
                  key={kat.id}
                  type='button'
                  size='sm'
                  variant={isSelected ? 'default' : 'secondary'}
                  onClick={() => setSelectedKategoriId(kat.id)}
                  className={`h-8 shrink-0 touch-manipulation rounded-full border-none px-3 text-xs font-semibold shadow-xs ${
                    isSelected
                      ? ''
                      : 'bg-muted/70 text-foreground hover:bg-muted'
                  }`}
                >
                  {kat.nama}
                  <Badge
                    variant='secondary'
                    className={`ml-1.5 h-4 border-none px-1 text-[10px] ${
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-background/80 text-muted-foreground shadow-xs'
                    }`}
                  >
                    {count}
                  </Badge>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Area Scrollable Katalog Menu */}
        <div className='flex-1 overflow-y-auto'>
          <MenuGrid
            menus={filteredMenus}
            loading={loading}
            getCartQty={getItemQty}
            onAddToCart={handleAddToCart}
            onResetFilters={handleResetFilters}
            hasFilters={hasActiveFilters}
          />
        </div>

        {/* Floating Cart Trigger untuk Layar Mobile / Tablet Kecil (< lg) */}
        <div className='flex shrink-0 border-none bg-card p-3 shadow-lg lg:hidden'>
          <Button
            type='button'
            className='h-11 w-full justify-between font-bold border-none shadow-xs'
            onClick={() => setMobileCartOpen(true)}
          >
            <div className='flex items-center gap-2'>
              <ShoppingCart className='h-4 w-4' />
              <span>Keranjang ({totalItems()} item)</span>
            </div>
            <span className='font-mono'>{formatRupiah(totalHarga())}</span>
          </Button>
        </div>
      </div>

      {/* Sisi Kanan: Panel Keranjang Belanja Desktop/Tablet Besar (>= lg) */}
      <div className='hidden h-full shrink-0 lg:flex'>
        <CartSidebar
          onCheckout={() => setManualRfidOpen(true)}
          onManualRfidOpen={() => setManualRfidOpen(true)}
          isProcessing={isProcessing}
          isOffline={!isOnline}
          isSessionClosed={isSessionClosed}
        />
      </div>
    </div>

      {/* Mobile / Tablet Small Sheet Keranjang */}
      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent
          side='right'
          className='flex w-full flex-col p-0 sm:max-w-md border-none shadow-2xl'
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>Keranjang Belanja Kasir</SheetTitle>
          </SheetHeader>
          <CartSidebar
            onCheckout={() => setManualRfidOpen(true)}
            onManualRfidOpen={() => setManualRfidOpen(true)}
            isProcessing={isProcessing}
            isOffline={!isOnline}
            isSessionClosed={isSessionClosed}
            className='border-none'
          />
        </SheetContent>
      </Sheet>

      {/* Modal Input UID Manual / Pengujian */}
      <ManualRfidModal
        open={manualRfidOpen}
        onOpenChange={setManualRfidOpen}
        onScan={handleProcessTap}
        isProcessing={isProcessing}
      />

      {/* Modal Feedback Siswa (Foto Sesuai Pengaturan Durasi + Tombol Batalkan / Void) */}
      <StudentFeedbackModal
        key={
          successData?.transaksi_id ||
          successData?.transaksiId ||
          'student-modal'
        }
        open={studentModalOpen}
        onOpenChange={setStudentModalOpen}
        data={successData}
        onComplete={handleTransactionComplete}
        onVoid={handleTransactionVoid}
        isVoiding={isVoiding}
        durasiDetik={pengaturan.durasiFotoDetik}
      />

      {/* Dialog Konfirmasi Manual Transaksi (Fitur Pengaturan Operasional) */}
      <AlertDialog
        open={confirmManualOpen}
        onOpenChange={setConfirmManualOpen}
      >
        <AlertDialogContent className='border-none shadow-2xl'>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pembayaran Kasir</AlertDialogTitle>
            <AlertDialogDescription>
              Mode konfirmasi manual aktif. Harap verifikasi kembali sebelum memproses transaksi tap kartu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='space-y-2 rounded-xl border-none bg-muted/60 p-3 text-sm shadow-xs'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>UID Kartu:</span>
              <span className='font-mono font-semibold'>{pendingScannedUid}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Total Item:</span>
              <span className='font-medium'>{totalItems()} item</span>
            </div>
            <div className='flex justify-between border-none pt-2 text-base font-bold'>
              <span>Total Tagihan:</span>
              <span className='text-primary'>{formatRupiah(totalHarga())}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='border-none bg-muted/80 text-foreground hover:bg-muted'
              onClick={() => {
                setConfirmManualOpen(false)
                setPendingScannedUid(null)
              }}
            >
              Batalkan
            </AlertDialogCancel>
            <AlertDialogAction
              className='border-none shadow-sm'
              onClick={async () => {
                if (pendingScannedUid) {
                  const uid = pendingScannedUid
                  setConfirmManualOpen(false)
                  setPendingScannedUid(null)
                  await executeTapTransaction(uid)
                }
              }}
            >
              Ya, Proses Transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Error Transaksi Ditolak (Kekurangan Saldo & Validasi 6 Tahap) */}
      <TransactionErrorModal
        open={errorModalOpen}
        onOpenChange={setErrorModalOpen}
        errorInfo={errorInfo}
      />

      {/* Modal Riwayat Transaksi Sesi Hari Ini */}
      <SessionHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        transactions={transactions}
        isLoading={isHistoryLoading}
        isSessionClosed={isSessionClosed}
        onRefresh={loadSesiData}
        onTransactionVoided={loadSesiData}
      />

      {/* Modal Tutup Kasir Harian */}
      <CloseSessionModal
        open={closeSessionModalOpen}
        onOpenChange={setCloseSessionModalOpen}
        sesi={sesi}
        rekap={rekapSesi}
        onSuccess={loadSesiData}
      />
    </div>
  )
}

export default KasirPosPage
