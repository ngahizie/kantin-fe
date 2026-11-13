import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Search,
  X,
  ShoppingCart,
  Layers,
  Wallet,
  AlertTriangle,
  History,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/stores/useCartStore'
import { useAuthStore } from '@/stores/auth-store'
import { usePengaturanStore } from '@/stores/usePengaturanStore'
import { formatRupiah } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/validation-error'
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
import { matchesMenuSearchQuery } from '@/features/katalog/menu-utils'
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
  ReceiptData,
  ReceiptLineItem,
} from './types'
import CartSidebar from './components/CartSidebar'
import ManualRfidModal from './components/ManualRfidModal'
import CekSaldoModal from './components/CekSaldoModal'
import MenuGrid from './components/MenuGrid'
import StudentFeedbackModal from './components/StudentFeedbackModal'
import ReceiptDialog from './components/ReceiptDialog'
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
  const {
    pengaturan,
    fetchPengaturan,
    fetchTitikKasir,
    activeTitikKasirId,
    getActiveTitikKasir,
  } = usePengaturanStore()

  // Online Status & Sesi Kasir Harian
  const isOnline = useOnlineStatus()
  const [sesi, setSesi] = useState<SesiKasirData | null>(null)
  const [sessionClosedOverride, setSessionClosedOverride] = useState(false)
  const [rekapSesi, setRekapSesi] = useState<RekapSesiData | null>(null)
  const [transactions, setTransactions] = useState<TransaksiSesiItem[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [closeSessionModalOpen, setCloseSessionModalOpen] = useState(false)

  const isSessionClosed =
    sesi?.status === 'DITUTUP' || sessionClosedOverride

  // Modals & Transaksi state
  const [manualRfidOpen, setManualRfidOpen] = useState(false)
  const [cekSaldoOpen, setCekSaldoOpen] = useState(false)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [confirmManualOpen, setConfirmManualOpen] = useState(false)
  const [pendingScannedUid, setPendingScannedUid] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<TapTransaksiData | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [errorInfo, setErrorInfo] = useState<TransactionErrorInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const tapCompletedRef = useRef(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const { items, addItem, getItemQty, totalItems, totalHarga, clearCart, setCartOwner } =
    useCartStore()
  const { auth } = useAuthStore()
  const { playSuccess, playError } = useBeepAudio()

  // Muat data sesi kasir harian & transaksi sesi
  const loadSesiData = useCallback(async () => {
    try {
      setIsHistoryLoading(true)
      let currentSesi = await kasirApi.getSesiAktif(
        activeTitikKasirId ?? undefined
      )
      if (!currentSesi) {
        try {
          currentSesi = await kasirApi.bukaSesi(
            activeTitikKasirId ?? undefined
          )
        } catch (openErr: unknown) {
          const openMsg = getErrorMessage(openErr, '').toLowerCase()
          if (openMsg.includes('sudah ditutup')) {
            setSessionClosedOverride(true)
            setSesi((prev) =>
              prev ? { ...prev, status: 'DITUTUP' } : prev
            )
            return
          }
          throw openErr
        }
      }

      setSesi(currentSesi)
      setSessionClosedOverride(currentSesi?.status === 'DITUTUP')

      if (currentSesi?.id) {
        // Validasi dan set pemilik keranjang kasir (issue #143)
        setCartOwner({
          kasirId: auth.user?.userId,
          sesiKasirId: currentSesi.id,
          titikKasirId: activeTitikKasirId ?? undefined,
        })
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
  }, [activeTitikKasirId, auth.user, setCartOwner])

  const handleSessionClosed = useCallback(
    (closedSesi?: SesiKasirData) => {
      // Kosongkan keranjang saat sesi kasir ditutup
      clearCart()
      setSessionClosedOverride(true)
      if (closedSesi) {
        setSesi((prev) => ({
          ...prev,
          ...closedSesi,
          status: 'DITUTUP',
        }))
      } else {
        setSesi((prev) => (prev ? { ...prev, status: 'DITUTUP' } : prev))
      }
      void loadSesiData()
    },
    [clearCart, loadSesiData]
  )

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

  // Auto-refresh katalog menu setiap 10 detik secara otomatis di latar belakang
  useEffect(() => {
    const timer = setInterval(async () => {
      if (
        isProcessing ||
        studentModalOpen ||
        receiptModalOpen ||
        confirmManualOpen ||
        closeSessionModalOpen ||
        historyModalOpen ||
        cekSaldoOpen
      ) {
        return
      }

      try {
        const latestMenus = await katalogApi.getMenuList(undefined, true)
        setMenus(latestMenus)
      } catch {
        // Abaikan kegagalan background polling agar tidak mengganggu antarmuka kasir
      }
    }, 10000)

    return () => clearInterval(timer)
  }, [
    isProcessing,
    studentModalOpen,
    receiptModalOpen,
    confirmManualOpen,
    closeSessionModalOpen,
    historyModalOpen,
    cekSaldoOpen,
  ])

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
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
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
        return matchesMenuSearchQuery(item, searchQuery)
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

        const snapshotItems: ReceiptLineItem[] = items.map((it) => ({
          menuId: it.menu.id,
          namaMenu: it.menu.nama,
          qty: it.qty,
          hargaSatuan: it.menu.hargaJual,
          subtotal: it.subtotal,
        }))
        const buyer = result.pembeli
        const rawResult = result as TapTransaksiData & {
          nama?: string
          kelas?: string | null
          nis?: string | null
          fotoUrl?: string | null
          saldoSisa?: number
          nomorReferensi?: string | null
        }
        const activeTitik = getActiveTitikKasir()

        const nextReceipt: ReceiptData = {
          transaksiId: Number(result.transaksiId || result.transaksi_id || 0),
          nomorStruk: result.nomorStruk || rawResult.nomorReferensi || null,
          waktu: result.waktu || new Date().toISOString(),
          namaKantin: pengaturan.namaKantin || 'Kantin Sehat SKOOLIA',
          titikKasir:
            result.titikKasir ||
            activeTitik?.nama ||
            sesi?.titikKasirNama ||
            null,
          pembeliNama: buyer?.nama || rawResult.nama || 'Pembeli',
          pembeliKelas: buyer?.kelas ?? rawResult.kelas ?? null,
          pembeliNis: buyer?.nis ?? rawResult.nis ?? null,
          pembeliFotoUrl:
            buyer?.fotoUrl || buyer?.foto_url || rawResult.fotoUrl || null,
          items: snapshotItems,
          namaItemFallback: result.namaItem,
          total: Number(result.total ?? 0),
          saldoSisa: Number(
            buyer?.sisa_saldo ?? buyer?.saldoSisa ?? rawResult.saldoSisa ?? 0
          ),
        }

        // Transaksi Sukses
        playSuccess()
        tapCompletedRef.current = false
        setReceiptModalOpen(false)
        setReceiptData(nextReceipt)
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
    [
      items,
      isProcessing,
      activeTitikKasirId,
      getActiveTitikKasir,
      pengaturan.namaKantin,
      sesi,
      playSuccess,
      playError,
    ]
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

      // Langkah konfirmasi manual sesuai pengaturan operasional kantin
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

  // Bersihkan UID yang ikut tertulis bila scan terjadi saat kursor berada di input cari menu
  const handleHardwareRfidScan = useCallback(
    (scannedUid: string) => {
      if (document.activeElement === searchInputRef.current) {
        setSearchQuery((prev) => {
          if (!prev) return prev
          const lowerUid = scannedUid.toLowerCase()
          return prev.toLowerCase().endsWith(lowerUid)
            ? prev.slice(0, prev.length - scannedUid.length)
            : prev
        })
        searchInputRef.current?.blur()
      }
      void handleProcessTap(scannedUid)
    },
    [handleProcessTap]
  )

  // Integrasi USB RFID Reader Hook
  useRfidScanner({
    onScan: handleHardwareRfidScan,
    enabled:
      isOnline &&
      !isSessionClosed &&
      !studentModalOpen &&
      !receiptModalOpen &&
      !isProcessing &&
      !confirmManualOpen &&
      !historyModalOpen &&
      !closeSessionModalOpen &&
      !manualRfidOpen &&
      !cekSaldoOpen,
  })

  // Selesai transaksi (hitung mundur selesai, tombol selesai, atau dialog ditutup): bersihkan & buka dialog Cetak Struk
  const handleTransactionComplete = useCallback(() => {
    if (tapCompletedRef.current) return
    tapCompletedRef.current = true
    setStudentModalOpen(false)
    setSuccessData(null)
    clearCart()
    loadKatalogData()
    loadSesiData()
    setReceiptModalOpen(true)
  }, [clearCart, loadKatalogData, loadSesiData])

  const handleStudentModalOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        handleTransactionComplete()
        return
      }
      setStudentModalOpen(true)
    },
    [handleTransactionComplete]
  )

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedKategoriId !== null
  )

  return (
    <div className='flex h-full w-full flex-col overflow-hidden bg-background text-foreground'>
      {/* Banner Peringatan Offline */}
      {!isOnline && <OfflineBanner className='border-none' />}

      {/* Banner Sesi Kasir Ditutup */}
      {isSessionClosed && (
        <div className='flex flex-wrap items-center justify-between gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive'>
          <div className='flex items-center gap-2'>
            <Lock className='h-4 w-4 shrink-0' />
            <span>Sesi kasir hari ini telah ditutup. Transaksi baru dikunci dan tidak dapat diproses.</span>
          </div>
          {sesi?.uangFisik != null && (
            <span className='font-semibold tabular-nums'>
              Kas Fisik: {formatRupiah(sesi.uangFisik)}
              {sesi.selisih != null &&
                ` (Selisih: ${sesi.selisih > 0 ? '+' : ''}${formatRupiah(sesi.selisih)})`}
            </span>
          )}
        </div>
      )}

      <div className='flex flex-1 overflow-hidden'>
        {/* Sisi Kiri: Katalog POS (Pencarian, Filter Kategori, Grid Menu) */}
        <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
          {/* Top Control Bar: Search & Status */}
          <div className='flex flex-col gap-2.5 border-b border-border bg-card p-3 sm:p-4'>
            <div className='flex items-center gap-2'>
              {/* Input Pencarian dengan Shortcut '/' */}
              <div className='relative flex-1'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Cari nama menu atau scan barcode...'
                  className='h-9 pr-10 pl-9 text-sm'
                />
                {searchQuery && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => setSearchQuery('')}
                    className='absolute top-1/2 right-1.5 h-7 w-7 -translate-y-1/2 rounded-md text-muted-foreground hover:text-foreground'
                  >
                    <X className='h-3.5 w-3.5' />
                  </Button>
                )}
              </div>

              {/* Tombol Cek Saldo */}
              <Button
                type='button'
                variant='outline'
                onClick={() => setCekSaldoOpen(true)}
                className='h-9 gap-1.5 px-3 text-xs font-semibold'
                title='Cek saldo siswa'
              >
                <Wallet className='h-4 w-4 text-primary' />
                <span className='hidden md:inline'>Cek Saldo</span>
              </Button>

              {/* Tombol Riwayat Sesi */}
              <Button
                type='button'
                variant='outline'
                onClick={() => setHistoryModalOpen(true)}
                className='h-9 gap-1.5 px-3 text-xs font-semibold'
                title='Lihat riwayat transaksi sesi hari ini'
              >
                <History className='h-4 w-4 text-primary' />
                <span className='hidden sm:inline'>Riwayat Sesi</span>
                {transactions.length > 0 && (
                  <Badge variant='secondary' className='ml-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary'>
                    {transactions.length}
                  </Badge>
                )}
              </Button>

              {/* Tombol Tutup Kasir */}
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  if (!isSessionClosed) setCloseSessionModalOpen(true)
                }}
                disabled={isSessionClosed}
                className={`h-9 gap-1.5 px-3 text-xs font-semibold ${
                  isSessionClosed
                    ? 'cursor-not-allowed opacity-60'
                    : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive'
                }`}
                title='Tutup sesi kasir harian'
              >
                <Lock className='h-4 w-4' />
                <span className='hidden md:inline'>
                  {isSessionClosed ? 'Sesi Ditutup' : 'Tutup Kasir'}
                </span>
              </Button>
            </div>

          {/* Banner Peringatan Tutup Otomatis */}
          {isPastClosingTime && (
            <div className='flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300'>
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
              variant={selectedKategoriId === null ? 'default' : 'outline'}
              onClick={() => setSelectedKategoriId(null)}
              className='h-8 shrink-0 touch-manipulation rounded-full px-3.5 text-xs font-semibold'
            >
              <Layers className='mr-1.5 h-3.5 w-3.5' />
              Semua Menu
              <Badge
                variant='secondary'
                className={`ml-1.5 h-4 rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                  selectedKategoriId === null
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
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
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => setSelectedKategoriId(kat.id)}
                  className='h-8 shrink-0 touch-manipulation rounded-full px-3.5 text-xs font-semibold'
                >
                  {kat.nama}
                  <Badge
                    variant='secondary'
                    className={`ml-1.5 h-4 rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
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
        <div className='min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] bg-background'>
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
        <div className='flex shrink-0 border-t border-border bg-card p-3 lg:hidden'>
          <Button
            type='button'
            className='h-11 w-full justify-between rounded-xl font-bold'
            onClick={() => setMobileCartOpen(true)}
          >
            <div className='flex items-center gap-2'>
              <ShoppingCart className='h-4 w-4' />
              <span className='tabular-nums'>Keranjang ({totalItems()} item)</span>
            </div>
            <span className='font-bold tabular-nums'>{formatRupiah(totalHarga())}</span>
          </Button>
        </div>
      </div>

      {/* Sisi Kanan: Panel Keranjang Belanja Desktop/Tablet Besar (>= lg) */}
      <div className='hidden h-full shrink-0 border-l border-border lg:flex'>
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
          className='flex w-full flex-col gap-0 border-l border-border bg-card p-0 text-card-foreground sm:max-w-md'
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

      {/* Modal Cek Saldo Siswa */}
      <CekSaldoModal
        open={cekSaldoOpen}
        onOpenChange={setCekSaldoOpen}
      />

      {/* Modal Input UID Manual / Pengujian */}
      <ManualRfidModal
        open={manualRfidOpen}
        onOpenChange={setManualRfidOpen}
        onScan={handleProcessTap}
        isProcessing={isProcessing}
      />

      {/* Modal Feedback Siswa (Foto Sesuai Pengaturan Durasi) */}
      <StudentFeedbackModal
        key={
          successData?.transaksi_id ||
          successData?.transaksiId ||
          'student-modal'
        }
        open={studentModalOpen}
        onOpenChange={handleStudentModalOpenChange}
        data={successData}
        onComplete={handleTransactionComplete}
        durasiDetik={
          pengaturan.durasiFotoDetik && pengaturan.durasiFotoDetik !== 3
            ? pengaturan.durasiFotoDetik
            : 15
        }
      />

      {/* Dialog Cetak Struk (muncul otomatis setelah dialog transaksi berhasil selesai) */}
      <ReceiptDialog
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        receipt={receiptData}
      />

      {/* Dialog Konfirmasi Manual Transaksi (Fitur Pengaturan Operasional) */}
      <AlertDialog
        open={confirmManualOpen}
        onOpenChange={setConfirmManualOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pembayaran Kasir</AlertDialogTitle>
            <AlertDialogDescription>
              Mode konfirmasi manual aktif. Harap verifikasi kembali sebelum memproses transaksi tap kartu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='space-y-2 rounded-xl border border-border bg-muted/40 p-3.5 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>UID Kartu:</span>
              <span className='font-semibold tracking-wider text-foreground'>{pendingScannedUid}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Total Item:</span>
              <span className='font-medium tabular-nums text-foreground'>{totalItems()} item</span>
            </div>
            <div className='flex justify-between border-t border-border pt-2 text-base font-bold'>
              <span className='text-foreground'>Total Tagihan:</span>
              <span className='tabular-nums text-primary'>{formatRupiah(totalHarga())}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmManualOpen(false)
                setPendingScannedUid(null)
              }}
            >
              Batalkan
            </AlertDialogCancel>
            <AlertDialogAction
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

      {/* Modal Riwayat Transaksi Sesi Hari Ini (termasuk aksi Refund BE #292) */}
      <SessionHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        transactions={transactions}
        isLoading={isHistoryLoading}
        isSessionClosed={isSessionClosed}
        isOffline={!isOnline}
        onTransactionRefunded={() => {
          loadKatalogData()
          loadSesiData()
        }}
      />

      {/* Modal Tutup Kasir Harian */}
      <CloseSessionModal
        open={closeSessionModalOpen}
        onOpenChange={setCloseSessionModalOpen}
        sesi={sesi}
        rekap={rekapSesi}
        onSuccess={handleSessionClosed}
      />
    </div>
  )
}

export default KasirPosPage
