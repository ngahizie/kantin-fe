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
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore, type AddCartItemOptions } from '@/stores/use-cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { usePengaturanStore } from '@/stores/use-pengaturan-store'
import { formatRupiah } from '@/lib/formatters'
import {
  getErrorMessage,
  getHttpStatus,
  isTimeoutError,
  SERVICE_UNAVAILABLE_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
} from '@/lib/validation-error'
import { subscribeKatalogChanges } from '@/lib/katalog-sync'
import { useBeepAudio } from '@/hooks/use-beep-audio'
import { useRfidScanner } from '@/hooks/use-rfid-scanner'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { OfflineBanner } from '@/components/shared/offline-banner'
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
import { matchesMenuSearchQuery, sortCategoriesNewestFirst } from '@/features/katalog/menu-utils'
import type { MenuItem, KategoriItem } from '@/features/katalog/types'
import {
  kasirApi,
  generateIdempotencyKey,
  type TapTransaksiData,
} from './api/kasir-api'
import { sanitizeKasirErrorMessage } from './kasir-error'
import { logKasirAuditEvent } from './api/kasir-audit'
import type {
  SesiKasirData,
  RekapSesiData,
  TransaksiSesiItem,
  ReceiptData,
  ReceiptLineItem,
  MetodeBayarKasir,
} from './types'
import { evaluateCashPayment } from './cash-payment'
import { CartSidebar } from './components/cart-sidebar'
import { ManualRfidModal } from './components/manual-rfid-modal'
import { CekSaldoModal } from './components/cek-saldo-modal'
import { MenuGrid } from './components/menu-grid'
import { StudentFeedbackModal } from './components/student-feedback-modal'
import { ReceiptDialog } from './components/receipt-dialog'
import {
  TransactionErrorModal,
  type TransactionErrorInfo,
} from './components/transaction-error-modal'
import { SessionHistoryModal } from './components/session-history-modal'
import { CloseSessionModal } from './components/close-session-modal'
import { StokMinusConfirmDialog } from './components/stok-minus-confirm-dialog'
import { PendingTapDialog } from './components/pending-tap-dialog'

type PendingRetryTransaction =
  | {
      type: 'SALDO'
      uid: string
      alasanStokMinus?: string
      idempotencyKey: string
    }
  | {
      type: 'TUNAI'
      uangDiterima: number
      alasanStokMinus?: string
      idempotencyKey: string
    }

function extractKasirTransactionError(
  err: unknown,
  defaultFallback: string,
  uid?: string
): TransactionErrorInfo {
  const axiosErr = err as {
    response?: {
      status?: number
      data?: { message?: string; kekurangan?: number }
    }
  }
  const status = getHttpStatus(err)
  const isTimeout = isTimeoutError(err)
  const isTransient = status === 503 || isTimeout
  const rawMsg = isTimeout
    ? TIMEOUT_ERROR_MESSAGE
    : status === 503
      ? axiosErr.response?.data?.message || SERVICE_UNAVAILABLE_MESSAGE
      : axiosErr.response?.data?.message ||
        (err instanceof Error ? err.message : '') ||
        defaultFallback
  const message = sanitizeKasirErrorMessage(
    rawMsg,
    isTransient ? SERVICE_UNAVAILABLE_MESSAGE : defaultFallback
  )
  return {
    message,
    kekurangan: axiosErr.response?.data?.kekurangan,
    status,
    isTransient,
    ...(uid ? { uid } : {}),
  }
}

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
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayarKasir>('SALDO')
  const [manualRfidOpen, setManualRfidOpen] = useState(false)
  const [cekSaldoOpen, setCekSaldoOpen] = useState(false)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [confirmManualOpen, setConfirmManualOpen] = useState(false)
  const [stokMinusConfirmOpen, setStokMinusConfirmOpen] = useState(false)
  const [confirmedAlasanStokMinus, setConfirmedAlasanStokMinus] = useState<string | null>(null)
  const [pendingScannedUid, setPendingScannedUid] = useState<string | null>(null)
  const [pendingCashAmount, setPendingCashAmount] = useState<number | null>(null)
  const [successData, setSuccessData] = useState<TapTransaksiData | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [errorInfo, setErrorInfo] = useState<TransactionErrorInfo | null>(null)
  const [pendingRetry, setPendingRetry] = useState<PendingRetryTransaction | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const tapCompletedRef = useRef(false)

  // Pending Tap Confirmation (Mode Konfirmasi Manual BE, Issue #220)
  const [pendingTaps, setPendingTaps] = useState<TapTransaksiData[]>([])
  const [pendingTapDialogOpen, setPendingTapDialogOpen] = useState(false)
  const [isPendingActionProcessing, setIsPendingActionProcessing] = useState(false)
  const [pendingTapError, setPendingTapError] = useState<string | null>(null)
  const [pendingCartSnapshots, setPendingCartSnapshots] = useState<
    Record<number, ReceiptLineItem[]>
  >({})
  const pendingActionLockRef = useRef(false)
  const hasAutoOpenedPendingRef = useRef(false)

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
      setKategoris(sortCategoriesNewestFirst(kategoriData))
    } catch {
      toast.error('Gagal memuat katalog menu atau pengaturan POS')
    } finally {
      setLoading(false)
    }
  }, [fetchPengaturan, fetchTitikKasir])

  // Muat daftar tap yang masih menunggu konfirmasi petugas (Issue #220)
  const loadPendingTaps = useCallback(async (autoOpenIfPresent = false) => {
    try {
      const list = await kasirApi.getTapMenunggu()
      setPendingTaps(list)
      if (
        autoOpenIfPresent &&
        list.length > 0 &&
        !hasAutoOpenedPendingRef.current
      ) {
        hasAutoOpenedPendingRef.current = true
        setPendingTapError(null)
        setPendingTapDialogOpen(true)
      }
    } catch {
      // Abaikan bila endpoint belum siap / offline
    }
  }, [])

  // Bangun payload struk dari hasil tap/konfirmasi yang sudah final
  const buildReceiptData = useCallback(
    (
      result: TapTransaksiData,
      snapshotItems: ReceiptLineItem[],
      fallbackMetode: MetodeBayarKasir = 'SALDO'
    ): ReceiptData => {
      const buyer = result.pembeli
      const rawResult = result as TapTransaksiData & {
        nama?: string
        kelas?: string | null
        nis?: string | null
        fotoUrl?: string | null
        saldoSisa?: number | null
        nomorReferensi?: string | null
      }
      const activeTitik = getActiveTitikKasir()
      const metode = result.metodeBayar ?? fallbackMetode

      return {
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
        metodeBayar: metode,
        uangDiterima: result.uangDiterima ?? null,
        kembalian: result.kembalian ?? null,
        items: snapshotItems,
        namaItemFallback: result.namaItem,
        total: Number(result.total ?? 0),
        saldoSisa:
          metode === 'TUNAI'
            ? null
            : Number(
                buyer?.sisa_saldo ??
                  buyer?.saldoSisa ??
                  rawResult.saldoSisa ??
                  0
              ),
      }
    },
    [getActiveTitikKasir, pengaturan.namaKantin, sesi?.titikKasirNama]
  )

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
          setKategoris(sortCategoriesNewestFirst(kategoriData))
          setLoading(false)
        }
        await Promise.all([loadSesiData(), loadPendingTaps(true)])
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
  }, [fetchPengaturan, fetchTitikKasir, loadSesiData, loadPendingTaps])

  // Auto-refresh katalog menu & pengaturan operasional setiap 10 detik di latar belakang
  useEffect(() => {
    const timer = setInterval(async () => {
      if (
        isProcessing ||
        isPendingActionProcessing ||
        pendingTapDialogOpen ||
        studentModalOpen ||
        receiptModalOpen ||
        confirmManualOpen ||
        stokMinusConfirmOpen ||
        closeSessionModalOpen ||
        historyModalOpen ||
        cekSaldoOpen
      ) {
        return
      }

      try {
        const [latestMenus] = await Promise.all([
          katalogApi.getMenuList(undefined, true),
          fetchPengaturan(),
        ])
        setMenus(latestMenus)
      } catch {
        // Abaikan kegagalan background polling agar tidak mengganggu antarmuka kasir
      }
    }, 10000)

    return () => clearInterval(timer)
  }, [
    isProcessing,
    isPendingActionProcessing,
    pendingTapDialogOpen,
    studentModalOpen,
    receiptModalOpen,
    confirmManualOpen,
    stokMinusConfirmOpen,
    closeSessionModalOpen,
    historyModalOpen,
    cekSaldoOpen,
    fetchPengaturan,
  ])

  // Sinkronisasi otomatis saat ada pembaruan pengaturan kantin dari tab lain
  useEffect(() => {
    const unsubscribe = subscribeKatalogChanges((evt) => {
      if (evt.reason === 'kasir') {
        void fetchPengaturan()
      }
    })
    return () => unsubscribe()
  }, [fetchPengaturan])

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

  // Daftar item bertanda jual melebihi catatan stok (C.1)
  const minusItemsInCart = useMemo(
    () => items.filter((it) => Boolean(it.jualMelebihiCatatan)),
    [items]
  )

  // Handler tambah menu ke keranjang (mendukung penambahan melewati catatan stok saat barang ada di gudang)
  const handleAddToCart = (menu: MenuItem, options?: AddCartItemOptions) => {
    const availableStock = menu.stokBerjalan ?? 0
    const currentQty = getItemQty(menu.id)
    const shouldAllowExceed =
      Boolean(options?.jualMelebihiCatatan) || currentQty >= availableStock
    const res = addItem(
      menu,
      1,
      shouldAllowExceed ? { jualMelebihiCatatan: true } : options
    )
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
    async (
      scannedUid: string,
      alasanStokMinusOverride?: string,
      reuseIdempotencyKey?: string
    ) => {
      const cleanUid = scannedUid.trim().toUpperCase()
      if (!cleanUid || isProcessing) return

      const targetTitikKasirId = activeTitikKasirId ?? sesi?.titikKasirId
      if (!targetTitikKasirId || targetTitikKasirId <= 0) {
        toast.warning('Titik kasir belum dipilih. Silakan pilih titik kasir terlebih dahulu.')
        return
      }

      const idempotencyKey = reuseIdempotencyKey ?? generateIdempotencyKey()
      const hasMarkedMinus = items.some((it) => Boolean(it.jualMelebihiCatatan))
      const alasanStokMinus = hasMarkedMinus
        ? (alasanStokMinusOverride ?? confirmedAlasanStokMinus ?? undefined)
        : undefined
      setPendingRetry(null)
      setIsProcessing(true)

      try {
        const result = await kasirApi.prosesTap({
          rfidUid: cleanUid,
          metodeBayar: 'SALDO',
          items: items.map((it) => ({
            menuId: it.menu.id,
            qty: it.qty,
          })),
          idempotencyKey,
          titikKasirId: targetTitikKasirId,
          ...(hasMarkedMinus
            ? {
                izinkanStokMinus: true,
                ...(alasanStokMinus ? { alasanStokMinus } : {}),
              }
            : {}),
        })

        const snapshotItems: ReceiptLineItem[] = items.map((it) => ({
          menuId: it.menu.id,
          namaMenu: it.menu.nama,
          qty: it.qty,
          hargaSatuan: it.menu.hargaJual,
          subtotal: it.subtotal,
        }))

        // Mode Konfirmasi Manual (Issue #220): backend menyimpan tap sebagai pending & belum memotong saldo/stok
        if (result.menungguKonfirmasi && result.pendingId) {
          const pId = result.pendingId
          setPendingCartSnapshots((prev) => ({ ...prev, [pId]: snapshotItems }))
          setPendingTaps((prev) => {
            const filtered = prev.filter((item) => item.pendingId !== pId)
            return [result, ...filtered]
          })
          setPendingTapError(null)
          setManualRfidOpen(false)
          setMobileCartOpen(false)
          setPendingTapDialogOpen(true)
          toast.info('Tap menunggu konfirmasi petugas. Saldo dan stok belum dipotong.')
          return
        }

        const nextReceipt = buildReceiptData(result, snapshotItems, 'SALDO')

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
        // Transaksi Gagal (Validasi 6 Tahap atau HTTP 503/timeout BE #449)
        playError()
        const info = extractKasirTransactionError(
          err,
          'Terjadi kesalahan saat memproses transaksi tap',
          cleanUid
        )

        if (info.isTransient) {
          setPendingRetry({
            type: 'SALDO',
            uid: cleanUid,
            alasanStokMinus,
            idempotencyKey,
          })
        }
        setErrorInfo(info)
        setErrorModalOpen(true)

        void logKasirAuditEvent({
          action: 'TRANSAKSI_GAGAL',
          titikKasirId: targetTitikKasirId,
          sesiId: sesi?.id,
          detail: {
            alasan: info.message,
            kekurangan: info.kekurangan,
            metodeBayar: 'SALDO',
          },
        })
      } finally {
        setIsProcessing(false)
        setConfirmedAlasanStokMinus(null)
      }
    },
    [
      items,
      isProcessing,
      activeTitikKasirId,
      sesi,
      confirmedAlasanStokMinus,
      buildReceiptData,
      playSuccess,
      playError,
    ]
  )

  // Handler konfirmasi tap pending (Mode Konfirmasi Manual, Issue #220)
  const handleConfirmPendingTap = useCallback(
    async (pendingId: number) => {
      if (pendingActionLockRef.current || isPendingActionProcessing) return
      pendingActionLockRef.current = true
      setIsPendingActionProcessing(true)
      setPendingTapError(null)

      try {
        const confirmed = await kasirApi.konfirmasiTap(pendingId)
        const snapshotItems =
          pendingCartSnapshots[pendingId] ??
          items.map((it) => ({
            menuId: it.menu.id,
            namaMenu: it.menu.nama,
            qty: it.qty,
            hargaSatuan: it.menu.hargaJual,
            subtotal: it.subtotal,
          }))

        setPendingTaps((prev) => prev.filter((item) => item.pendingId !== pendingId))
        setPendingCartSnapshots((prev) => {
          const next = { ...prev }
          delete next[pendingId]
          return next
        })
        setPendingTapDialogOpen(false)

        const nextReceipt = buildReceiptData(confirmed, snapshotItems, 'SALDO')
        playSuccess()
        tapCompletedRef.current = false
        setReceiptModalOpen(false)
        setReceiptData(nextReceipt)
        setSuccessData(confirmed)
        setStudentModalOpen(true)
        toast.success('Transaksi berhasil dikonfirmasi')
      } catch (err: unknown) {
        playError()
        const axiosErr = err as {
          response?: {
            status?: number
            data?: { message?: string }
          }
        }
        const status = axiosErr.response?.status
        const rawMsg =
          axiosErr.response?.data?.message ||
          (err instanceof Error ? err.message : '') ||
          'Gagal mengonfirmasi transaksi'
        const lowerMsg = rawMsg.toLowerCase()
        const isStaleOrCancelled =
          status === 404 ||
          lowerMsg.includes('tidak ditemukan') ||
          lowerMsg.includes('sudah dibatalkan') ||
          lowerMsg.includes('kedaluwarsa')

        const friendlyMsg = isStaleOrCancelled
          ? 'Permintaan konfirmasi sudah dibatalkan, kedaluwarsa, atau tidak ditemukan.'
          : sanitizeKasirErrorMessage(rawMsg, 'Gagal mengonfirmasi transaksi')

        if (isStaleOrCancelled) {
          setPendingTaps((prev) => prev.filter((item) => item.pendingId !== pendingId))
          setPendingCartSnapshots((prev) => {
            const next = { ...prev }
            delete next[pendingId]
            return next
          })
          setPendingTapDialogOpen(false)
          toast.error(friendlyMsg)
          void loadPendingTaps(false)
        } else {
          setPendingTapError(friendlyMsg)
          toast.error(friendlyMsg)
        }
      } finally {
        pendingActionLockRef.current = false
        setIsPendingActionProcessing(false)
      }
    },
    [
      isPendingActionProcessing,
      pendingCartSnapshots,
      items,
      buildReceiptData,
      playSuccess,
      playError,
      loadPendingTaps,
    ]
  )

  // Handler batalkan tap pending (Mode Konfirmasi Manual, Issue #220)
  const handleCancelPendingTap = useCallback(
    async (pendingId: number) => {
      if (pendingActionLockRef.current || isPendingActionProcessing) return
      pendingActionLockRef.current = true
      setIsPendingActionProcessing(true)
      setPendingTapError(null)

      try {
        await kasirApi.batalTap(pendingId)
        setPendingTaps((prev) => {
          const remaining = prev.filter((item) => item.pendingId !== pendingId)
          if (remaining.length === 0) {
            setPendingTapDialogOpen(false)
          }
          return remaining
        })
        setPendingCartSnapshots((prev) => {
          const next = { ...prev }
          delete next[pendingId]
          return next
        })
        toast.info('Permintaan konfirmasi dibatalkan. Saldo siswa tetap utuh.')
      } catch (err: unknown) {
        playError()
        const axiosErr = err as {
          response?: {
            status?: number
            data?: { message?: string }
          }
        }
        const status = axiosErr.response?.status
        const rawMsg =
          axiosErr.response?.data?.message ||
          (err instanceof Error ? err.message : '') ||
          'Gagal membatalkan permintaan konfirmasi'
        const lowerMsg = rawMsg.toLowerCase()
        const isStale =
          status === 404 ||
          status === 409 ||
          lowerMsg.includes('tidak ditemukan') ||
          lowerMsg.includes('sudah dikonfirmasi') ||
          lowerMsg.includes('sudah dibatalkan')

        const friendlyMsg = isStale
          ? 'Permintaan konfirmasi sudah diproses, dibatalkan, atau kedaluwarsa.'
          : sanitizeKasirErrorMessage(
              rawMsg,
              'Gagal membatalkan permintaan konfirmasi'
            )

        if (isStale) {
          setPendingTaps((prev) => prev.filter((item) => item.pendingId !== pendingId))
          setPendingCartSnapshots((prev) => {
            const next = { ...prev }
            delete next[pendingId]
            return next
          })
          setPendingTapDialogOpen(false)
          toast.error(friendlyMsg)
          void loadPendingTaps(false)
        } else {
          setPendingTapError(friendlyMsg)
          toast.error(friendlyMsg)
        }
      } finally {
        pendingActionLockRef.current = false
        setIsPendingActionProcessing(false)
      }
    },
    [isPendingActionProcessing, playError, loadPendingTaps]
  )

  // Handler proses tap RFID: cek konfirmasi stok minus, lalu kirim ke backend (konfirmasi manual ditangani via pendingId BE)
  const handleProcessTap = useCallback(
    async (scannedUid: string) => {
      const cleanUid = scannedUid.trim().toUpperCase()
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

      if (!cleanUid || isProcessing) return

      if (items.length === 0) {
        playError()
        toast.warning(
          'Keranjang belanja kosong! Pilih menu makanan atau minuman terlebih dahulu.'
        )
        return
      }

      const hasMarkedMinus = items.some((it) => Boolean(it.jualMelebihiCatatan))
      if (hasMarkedMinus && !confirmedAlasanStokMinus) {
        setPendingCashAmount(null)
        setPendingScannedUid(cleanUid)
        setStokMinusConfirmOpen(true)
        return
      }

      await executeTapTransaction(cleanUid, confirmedAlasanStokMinus ?? undefined)
    },
    [
      isOnline,
      isSessionClosed,
      items,
      isProcessing,
      confirmedAlasanStokMinus,
      executeTapTransaction,
      playError,
    ]
  )

  // Eksekusi transaksi TUNAI (Kartu Tamu / tanpa kartu, tanpa potong saldo)
  const executeCashTransaction = useCallback(
    async (
      uangDiterima: number,
      alasanStokMinusOverride?: string,
      reuseIdempotencyKey?: string
    ) => {
      if (isProcessing) return

      const targetTitikKasirId = activeTitikKasirId ?? sesi?.titikKasirId
      if (!targetTitikKasirId || targetTitikKasirId <= 0) {
        toast.warning('Titik kasir belum dipilih. Silakan pilih titik kasir terlebih dahulu.')
        return
      }

      const currentTotal = totalHarga()
      const idempotencyKey = reuseIdempotencyKey ?? generateIdempotencyKey()
      const hasMarkedMinus = items.some((it) => Boolean(it.jualMelebihiCatatan))
      const alasanStokMinus = hasMarkedMinus
        ? (alasanStokMinusOverride ?? confirmedAlasanStokMinus ?? undefined)
        : undefined
      setPendingRetry(null)
      setIsProcessing(true)

      try {
        const result = await kasirApi.prosesTap({
          metodeBayar: 'TUNAI',
          uangDiterima,
          items: items.map((it) => ({
            menuId: it.menu.id,
            qty: it.qty,
          })),
          idempotencyKey,
          titikKasirId: targetTitikKasirId,
          ...(hasMarkedMinus
            ? {
                izinkanStokMinus: true,
                ...(alasanStokMinus ? { alasanStokMinus } : {}),
              }
            : {}),
        })

        const snapshotItems: ReceiptLineItem[] = items.map((it) => ({
          menuId: it.menu.id,
          namaMenu: it.menu.nama,
          qty: it.qty,
          hargaSatuan: it.menu.hargaJual,
          subtotal: it.subtotal,
        }))
        const activeTitik = getActiveTitikKasir()
        const finalTotal = Number(result.total ?? currentTotal)
        // Gunakan uangDiterima & kembalian apa adanya dari respons BE (Issue #170 / C.2e)
        const finalUangDiterima =
          result.uangDiterima !== undefined ? result.uangDiterima : null
        const finalKembalian =
          result.kembalian !== undefined ? result.kembalian : null

        const nextReceipt: ReceiptData = {
          transaksiId: Number(result.transaksiId || result.transaksi_id || 0),
          nomorStruk: result.nomorStruk || null,
          waktu: result.waktu || new Date().toISOString(),
          namaKantin: pengaturan.namaKantin || 'Kantin Sehat SKOOLIA',
          titikKasir:
            result.titikKasir ||
            activeTitik?.nama ||
            sesi?.titikKasirNama ||
            null,
          pembeliNama: result.pembeli?.nama || 'Tamu (tunai)',
          pembeliKelas: null,
          pembeliNis: null,
          pembeliFotoUrl: null,
          metodeBayar: result.metodeBayar ?? 'TUNAI',
          uangDiterima: finalUangDiterima,
          kembalian: finalKembalian,
          items: snapshotItems,
          namaItemFallback: result.namaItem,
          total: finalTotal,
          saldoSisa: null,
        }

        // Transaksi Tunai Sukses: langsung bersihkan keranjang & buka struk (tanpa modal foto siswa)
        playSuccess()
        clearCart()
        setMobileCartOpen(false)
        setReceiptData(nextReceipt)
        setReceiptModalOpen(true)
        const toastDescParts = [`Total ${formatRupiah(finalTotal)}`]
        if (finalUangDiterima !== null) {
          toastDescParts.push(`Diterima ${formatRupiah(finalUangDiterima)}`)
        }
        if (finalKembalian !== null) {
          toastDescParts.push(`Kembalian ${formatRupiah(finalKembalian)}`)
        }
        toast.success('Transaksi tunai berhasil!', {
          description: toastDescParts.join(' • '),
        })
        void loadKatalogData()
        void loadSesiData()
      } catch (err: unknown) {
        playError()
        const info = extractKasirTransactionError(
          err,
          'Terjadi kesalahan saat memproses transaksi tunai'
        )

        if (info.isTransient) {
          setPendingRetry({
            type: 'TUNAI',
            uangDiterima,
            alasanStokMinus,
            idempotencyKey,
          })
        }
        setErrorInfo(info)
        setErrorModalOpen(true)

        void logKasirAuditEvent({
          action: 'TRANSAKSI_GAGAL',
          titikKasirId: targetTitikKasirId,
          sesiId: sesi?.id,
          detail: {
            alasan: info.message,
            kekurangan: info.kekurangan,
            metodeBayar: 'TUNAI',
          },
        })
      } finally {
        setIsProcessing(false)
        setConfirmedAlasanStokMinus(null)
      }
    },
    [
      isProcessing,
      totalHarga,
      items,
      activeTitikKasirId,
      getActiveTitikKasir,
      pengaturan.namaKantin,
      sesi,
      confirmedAlasanStokMinus,
      playSuccess,
      playError,
      clearCart,
      loadKatalogData,
      loadSesiData,
    ]
  )

  const handleRetryTransientTransaction = useCallback(() => {
    if (!pendingRetry) return
    const targetRetry = pendingRetry
    setErrorModalOpen(false)
    if (targetRetry.type === 'SALDO') {
      void executeTapTransaction(
        targetRetry.uid,
        targetRetry.alasanStokMinus,
        targetRetry.idempotencyKey
      )
    } else {
      void executeCashTransaction(
        targetRetry.uangDiterima,
        targetRetry.alasanStokMinus,
        targetRetry.idempotencyKey
      )
    }
  }, [pendingRetry, executeTapTransaction, executeCashTransaction])

  const handleProcessCash = useCallback(
    async (uangDiterima: number) => {
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

      if (isProcessing) return

      if (items.length === 0) {
        playError()
        toast.warning(
          'Keranjang belanja kosong! Pilih menu makanan atau minuman terlebih dahulu.'
        )
        return
      }

      const cashCheck = evaluateCashPayment(totalHarga(), uangDiterima)
      // Bila uang kurang, langsung kirim ke BE agar mendapat respons 409 "Uang tunai kurang Rp ..." (tanpa kosongkan keranjang)
      if (!cashCheck.isValid) {
        await executeCashTransaction(uangDiterima, confirmedAlasanStokMinus ?? undefined)
        return
      }

      const hasMarkedMinus = items.some((it) => Boolean(it.jualMelebihiCatatan))
      if (hasMarkedMinus && !confirmedAlasanStokMinus) {
        setPendingScannedUid(null)
        setPendingCashAmount(cashCheck.uangDiterima)
        setStokMinusConfirmOpen(true)
        return
      }

      if (pengaturan.konfirmasiManual) {
        setPendingScannedUid(null)
        setPendingCashAmount(cashCheck.uangDiterima)
        setConfirmManualOpen(true)
        return
      }

      await executeCashTransaction(
        cashCheck.uangDiterima,
        confirmedAlasanStokMinus ?? undefined
      )
    },
    [
      isOnline,
      isSessionClosed,
      isProcessing,
      items,
      totalHarga,
      confirmedAlasanStokMinus,
      pengaturan.konfirmasiManual,
      executeCashTransaction,
      playError,
    ]
  )

  // Bersihkan UID yang ikut tertulis bila scan terjadi saat kursor berada di input cari menu
  const handleHardwareRfidScan = useCallback(
    (scannedUid: string) => {
      const cleanUid = scannedUid.trim().toUpperCase()
      if (document.activeElement === searchInputRef.current) {
        setSearchQuery((prev) => {
          if (!prev) return prev
          const lowerUid = cleanUid.toLowerCase()
          return prev.toLowerCase().endsWith(lowerUid)
            ? prev.slice(0, prev.length - cleanUid.length)
            : prev
        })
        searchInputRef.current?.blur()
      }
      void handleProcessTap(cleanUid)
    },
    [handleProcessTap]
  )

  // Integrasi USB RFID Reader Hook (hanya aktif saat metode bayar Saldo)
  useRfidScanner({
    onScan: handleHardwareRfidScan,
    enabled:
      metodeBayar === 'SALDO' &&
      isOnline &&
      !isSessionClosed &&
      !studentModalOpen &&
      !receiptModalOpen &&
      !pendingTapDialogOpen &&
      !isPendingActionProcessing &&
      !isProcessing &&
      !confirmManualOpen &&
      !stokMinusConfirmOpen &&
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

              {/* Tombol Pending Konfirmasi Manual (Issue #220) */}
              {pendingTaps.length > 0 && (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setPendingTapError(null)
                    setPendingTapDialogOpen(true)
                  }}
                  className='h-9 gap-1.5 border-amber-500/40 bg-amber-500/10 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-500/20 dark:text-amber-300'
                  title='Lihat tap kartu yang menunggu konfirmasi'
                >
                  <Clock className='h-4 w-4' />
                  <span className='hidden sm:inline'>Menunggu</span>
                  <Badge
                    variant='secondary'
                    className='ml-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-900 dark:text-amber-200'
                  >
                    {pendingTaps.length}
                  </Badge>
                </Button>
              )}

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
          onCashCheckout={(uangDiterima) => void handleProcessCash(uangDiterima)}
          onManualRfidOpen={() => setManualRfidOpen(true)}
          metodeBayar={metodeBayar}
          onMetodeBayarChange={setMetodeBayar}
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
            onCashCheckout={(uangDiterima) => void handleProcessCash(uangDiterima)}
            onManualRfidOpen={() => setManualRfidOpen(true)}
            metodeBayar={metodeBayar}
            onMetodeBayarChange={setMetodeBayar}
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
        durasiDetik={pengaturan.durasiFotoDetik ?? 3}
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
              {pendingCashAmount !== null
                ? 'Mode konfirmasi manual aktif. Harap verifikasi kembali pembayaran tunai sebelum diproses.'
                : 'Mode konfirmasi manual aktif. Harap verifikasi kembali sebelum memproses transaksi tap kartu.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='space-y-2 rounded-xl border border-border bg-muted/40 p-3.5 text-sm'>
            {pendingCashAmount !== null ? (
              <>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Metode Bayar:</span>
                  <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                    Tunai (Tamu / Tanpa Kartu)
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Total Item:</span>
                  <span className='font-medium tabular-nums text-foreground'>{totalItems()} item</span>
                </div>
                <div className='flex justify-between border-t border-border pt-2 text-base font-bold'>
                  <span className='text-foreground'>Total Tagihan:</span>
                  <span className='tabular-nums text-primary'>{formatRupiah(totalHarga())}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Uang Diterima:</span>
                  <span className='font-semibold tabular-nums text-foreground'>
                    {formatRupiah(pendingCashAmount)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Kembalian:</span>
                  <span className='font-bold tabular-nums text-emerald-600 dark:text-emerald-400'>
                    {formatRupiah(Math.max(0, pendingCashAmount - totalHarga()))}
                  </span>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmManualOpen(false)
                setConfirmedAlasanStokMinus(null)
                setPendingScannedUid(null)
                setPendingCashAmount(null)
              }}
            >
              Batalkan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const alasan = confirmedAlasanStokMinus ?? undefined
                if (pendingCashAmount !== null) {
                  const cashAmount = pendingCashAmount
                  setConfirmManualOpen(false)
                  setPendingCashAmount(null)
                  await executeCashTransaction(cashAmount, alasan)
                } else if (pendingScannedUid) {
                  const uid = pendingScannedUid
                  setConfirmManualOpen(false)
                  setPendingScannedUid(null)
                  await executeTapTransaction(uid, alasan)
                }
              }}
            >
              Ya, Proses Transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Konfirmasi Penjualan Stok Gudang / Stok Minus (C.1) */}
      <StokMinusConfirmDialog
        open={stokMinusConfirmOpen}
        onOpenChange={setStokMinusConfirmOpen}
        minusItems={minusItemsInCart}
        isProcessing={isProcessing}
        onCancel={() => {
          setStokMinusConfirmOpen(false)
          setConfirmedAlasanStokMinus(null)
          setPendingScannedUid(null)
          setPendingCashAmount(null)
        }}
        onConfirm={async (alasan) => {
          setStokMinusConfirmOpen(false)
          if (pendingCashAmount !== null) {
            if (pengaturan.konfirmasiManual) {
              setConfirmedAlasanStokMinus(alasan)
              setConfirmManualOpen(true)
              return
            }
            const cashAmount = pendingCashAmount
            setPendingCashAmount(null)
            await executeCashTransaction(cashAmount, alasan)
          } else if (pendingScannedUid) {
            const uid = pendingScannedUid
            setPendingScannedUid(null)
            await executeTapTransaction(uid, alasan)
          }
        }}
      />

      {/* Dialog Menunggu Konfirmasi Petugas (Mode Konfirmasi Manual BE, Issue #220) */}
      <PendingTapDialog
        open={pendingTapDialogOpen}
        onOpenChange={setPendingTapDialogOpen}
        pendingTaps={pendingTaps}
        onConfirm={handleConfirmPendingTap}
        onCancel={handleCancelPendingTap}
        isSubmitting={isPendingActionProcessing}
        errorMessage={pendingTapError}
      />

      {/* Modal Error Transaksi Ditolak / Server Sibuk (BE #449) */}
      <TransactionErrorModal
        open={errorModalOpen}
        onOpenChange={(open) => {
          setErrorModalOpen(open)
          if (!open) {
            setPendingRetry(null)
          }
        }}
        errorInfo={errorInfo}
        onRetry={pendingRetry ? handleRetryTransientTransaction : undefined}
      />

      {/* Modal Riwayat Transaksi Sesi Hari Ini (termasuk aksi Cetak Ulang & Refund BE #292) */}
      <SessionHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        transactions={transactions}
        namaKantin={pengaturan.namaKantin || 'Kantin Sehat SKOOLIA'}
        titikKasirNama={getActiveTitikKasir()?.nama || sesi?.titikKasirNama || null}
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
