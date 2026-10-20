import { useState, useEffect } from 'react'
import {
  CreditCard,
  RefreshCw,
  Plus,
  Wallet,
  ArrowLeftRight,
  ShieldAlert,
  ShieldCheck,
  PackageOpen,
  Eye,
  Search,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search as SearchComp } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import apiClient from '@/lib/api-client'
import { TableToolbar } from '@/components/data-table'
import { MOCK_KARTU_TAMU, type KartuTamuMock } from '@/mocks/mock-data'
import { RegisterKartuModal } from './RegisterKartuModal'
import { TopupKartuTamuModal } from './TopupKartuTamuModal'
import { RefundKartuModal } from './RefundKartuModal'
import { BlokirKartuModal } from './BlokirKartuModal'
import { UnblockKartuModal } from './UnblockKartuModal'
import { KartuTamuSlipModal, type KartuTamuSlipData } from './KartuTamuSlipModal'
import { mapBackendToKartuTamu, type KartuTamuBackendDto } from './types'

type ModalType = 'register' | 'topup' | 'refund' | 'blokir' | 'unblock' | null

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Aktif',
    className:
      'border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20',
    icon: ShieldCheck,
  },
  BLOCKED: {
    label: 'Diblokir',
    className:
      'border-0 bg-destructive/15 text-destructive dark:text-destructive hover:bg-destructive/20',
    icon: ShieldAlert,
  },
  AVAILABLE: {
    label: 'Tersedia',
    className:
      'border-0 bg-muted text-muted-foreground hover:bg-muted/80',
    icon: PackageOpen,
  },
}

async function fetchCardsWithBalances(): Promise<KartuTamuMock[]> {
  const res = await apiClient.get('/api/kartu-tamu')

  const rawList = (res.data?.data || []) as KartuTamuBackendDto[]
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return MOCK_KARTU_TAMU
  }

  const mappedList = await Promise.all(
    rawList.map(async (raw) => {
      let saldo = raw.saldo ?? 0
      if (raw.saldo === undefined && raw.id) {
        try {
          const saldoRes = await apiClient.get('/api/saldo', {
            params: { subjekTipe: 'KARTU_TAMU', subjekId: raw.id },
          })
          if (saldoRes.data?.data?.saldo !== undefined) {
            saldo = Number(saldoRes.data.data.saldo)
          }
        } catch {
          // saldo tetap 0
        }
      }
      return mapBackendToKartuTamu(raw, saldo)
    })
  )

  return mappedList
}

export function KartuTamuPage() {
  const [cards, setCards] = useState<KartuTamuMock[]>(MOCK_KARTU_TAMU)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [selectedCard, setSelectedCard] = useState<KartuTamuMock | null>(null)
  const [slipData, setSlipData] = useState<KartuTamuSlipData | null>(null)
  const [isSlipOpen, setIsSlipOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const loadedCards = await fetchCardsWithBalances()
        if (isMounted) setCards(loadedCards)
      } catch {
        if (isMounted) setCards(MOCK_KARTU_TAMU)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void load()
    return () => { isMounted = false }
  }, [])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const loadedCards = await fetchCardsWithBalances()
      setCards(loadedCards)
    } catch {
      setCards(MOCK_KARTU_TAMU)
    } finally {
      setIsLoading(false)
    }
  }

  const openModal = (type: ModalType, card?: KartuTamuMock) => {
    setSelectedCard(card ?? null)
    setActiveModal(type)
  }

  const closeModal = () => {
    setActiveModal(null)
    setSelectedCard(null)
  }

  const showSlip = (data: KartuTamuSlipData) => {
    setSlipData(data)
    setIsSlipOpen(true)
  }

  // --- Handlers ---
  const handleRegistered = (newCard: KartuTamuMock) => {
    setCards((prev) => [...prev, newCard])
  }

  const handleTopupSuccess = (kartuId: number, saldoBaru: number) => {
    setCards((prev) =>
      prev.map((c) => (c.id === kartuId ? { ...c, saldo: saldoBaru } : c))
    )
  }

  const handleRefundSuccess = (kartuId: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === kartuId
          ? { ...c, saldo: 0, label_pemegang: '', status: 'AVAILABLE', is_active: false }
          : c
      )
    )
  }

  const handleBlokirSuccess = (kartuId: number, transferToId?: number) => {
    setCards((prev) => {
      const blocked = prev.find((c) => c.id === kartuId)
      return prev.map((c) => {
        if (c.id === kartuId) {
          return { ...c, status: 'BLOCKED', is_active: false, saldo: 0 }
        }
        if (transferToId && c.id === transferToId && blocked) {
          return { ...c, saldo: c.saldo + blocked.saldo }
        }
        return c
      })
    })
  }

  const handleUnblockSuccess = (kartuId: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === kartuId
          ? { ...c, status: 'AVAILABLE', is_active: false }
          : c
      )
    )
  }

  // --- Stats ---
  const totalAktif = cards.filter((c) => c.status === 'ACTIVE').length
  const totalSaldo = cards
    .filter((c) => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + c.saldo, 0)
  const totalDiblokir = cards.filter((c) => c.status === 'BLOCKED').length
  const totalTersedia = cards.filter((c) => c.status === 'AVAILABLE').length

  // --- Filter ---
  const filteredCards = cards.filter((c) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      c.nomor_kartu.toLowerCase().includes(q) ||
      c.label_pemegang.toLowerCase().includes(q) ||
      c.uid.toLowerCase().includes(q)
    const matchesStatus =
      statusFilter.length === 0 || statusFilter.includes(c.status)
    return matchesSearch && matchesStatus
  })

  return (
    <>
      <Header fixed>
        <SearchComp showKbd={false} />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-6 pb-10'>
          {/* Page Header */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                Manajemen Kartu Tamu
              </h1>
              <p className='text-sm text-muted-foreground'>
                Registrasi, top-up, pengembalian, dan pemblokiran kartu tamu RFID.
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                disabled={isLoading}
                className='gap-1.5 text-xs'
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Muat Ulang
              </Button>
              <Button
                size='sm'
                onClick={() => openModal('register')}
                className='gap-1.5 text-xs'
              >
                <Plus className='h-4 w-4' />
                Daftarkan Kartu Baru
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <Card className='border-0 bg-muted/70 shadow-xs dark:bg-muted/30 transition-all hover:shadow-md'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium text-muted-foreground'>
                  Kartu Aktif Beredar
                </p>
                <h3 className='mt-0.5 text-xl font-bold text-foreground'>
                  {totalAktif} Kartu
                </h3>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Dapat digunakan bertransaksi di POS
                </p>
              </CardContent>
            </Card>

            <Card className='border-0 bg-muted/70 shadow-xs dark:bg-muted/30 transition-all hover:shadow-md'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium text-muted-foreground'>
                  Total Saldo Mengendap
                </p>
                <h3 className='mt-0.5 text-xl font-bold text-foreground'>
                  Rp {totalSaldo.toLocaleString('id-ID')}
                </h3>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Akumulasi saldo tamu aktif
                </p>
              </CardContent>
            </Card>

            <Card className='border-0 bg-muted/70 shadow-xs dark:bg-muted/30 transition-all hover:shadow-md'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium text-muted-foreground'>
                  Kartu Diblokir
                </p>
                <h3 className='mt-0.5 text-xl font-bold text-destructive'>
                  {totalDiblokir} Kartu
                </h3>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Hilang / dinonaktifkan di sistem
                </p>
              </CardContent>
            </Card>

            <Card className='border-0 bg-muted/70 shadow-xs dark:bg-muted/30 transition-all hover:shadow-md'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium text-muted-foreground'>
                  Kartu Tersedia
                </p>
                <h3 className='mt-0.5 text-xl font-bold text-foreground'>
                  {totalTersedia} Kartu
                </h3>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Siap diterbitkan & dipinjamkan
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table Section */}
          <div className='bg-card rounded-xl border shadow-xs overflow-hidden'>
            {/* Table Header & Toolbar */}
            <div className='p-4 border-b'>
              <TableToolbar
                searchPlaceholder='Cari nomor, label, UID...'
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                filters={[
                  {
                    title: 'Status',
                    options: [
                      { label: 'Aktif', value: 'ACTIVE' },
                      { label: 'Tersedia', value: 'AVAILABLE' },
                      { label: 'Diblokir', value: 'BLOCKED' },
                    ],
                    selectedValues: statusFilter,
                    onSelect: setStatusFilter,
                  },
                ]}
                isFiltered={Boolean(searchQuery || statusFilter.length > 0)}
                onReset={() => {
                  setSearchQuery('')
                  setStatusFilter([])
                }}
              >
                <Button
                  size='sm'
                  onClick={() => openModal('register')}
                  className='h-8 gap-1.5 text-xs'
                >
                  <Plus className='size-4' />
                  Daftarkan Kartu Baru
                </Button>
              </TableToolbar>
            </div>

            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs font-medium w-[110px]'>
                      No. Kartu
                    </TableHead>
                    <TableHead className='text-xs font-medium'>
                      Label Pemegang
                    </TableHead>
                    <TableHead className='text-xs font-medium'>
                      UID RFID
                    </TableHead>
                    <TableHead className='text-xs font-medium text-right'>
                      Saldo
                    </TableHead>
                    <TableHead className='text-xs font-medium text-center'>
                      Status
                    </TableHead>
                    <TableHead className='text-xs font-medium text-center'>
                      Terakhir Dipakai
                    </TableHead>
                    <TableHead className='text-xs font-medium text-center w-[180px]'>
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className='text-center py-12'>
                        <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                          <CreditCard className='h-10 w-10 opacity-30' />
                          <p className='text-sm font-medium'>Tidak ada kartu ditemukan</p>
                          {searchQuery && (
                            <p className='text-xs'>
                              Coba ubah kata kunci pencarian
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredCards.map((card) => {
                    const statusCfg = STATUS_CONFIG[card.status]
                    const StatusIcon = statusCfg.icon
                    const isActive = card.status === 'ACTIVE'
                    const isBlocked = card.status === 'BLOCKED'

                    return (
                      <TableRow
                        key={card.id}
                        className={isBlocked ? 'opacity-60' : ''}
                      >
                        {/* Nomor Kartu */}
                        <TableCell>
                          <span className='font-mono font-bold text-sm text-foreground'>
                            {card.nomor_kartu}
                          </span>
                        </TableCell>

                        {/* Label */}
                        <TableCell>
                          <span className='text-sm text-foreground'>
                            {card.label_pemegang || (
                              <span className='text-muted-foreground italic text-xs'>
                                (Kosong)
                              </span>
                            )}
                          </span>
                        </TableCell>

                        {/* UID */}
                        <TableCell>
                          <code className='text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded'>
                            {card.uid}
                          </code>
                        </TableCell>

                        {/* Saldo */}
                        <TableCell className='text-right'>
                          <span
                            className={`font-mono font-bold text-sm ${
                              isActive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                            }`}
                          >
                            Rp {card.saldo.toLocaleString('id-ID')}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className='text-center'>
                          <Badge
                            variant='outline'
                            className={`text-xs gap-1 font-medium ${statusCfg.className}`}
                          >
                            <StatusIcon className='h-3 w-3' />
                            {statusCfg.label}
                          </Badge>
                        </TableCell>

                        {/* Last Used */}
                        <TableCell className='text-center'>
                          <span className='text-xs text-muted-foreground'>
                            {card.last_used_at
                              ? new Date(card.last_used_at).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className='text-center'>
                          <TooltipProvider delayDuration={150}>
                            <div className='flex items-center justify-center gap-1.5'>
                              {/* Top-up */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    disabled={!isActive}
                                    onClick={() => openModal('topup', card)}
                                    className='h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 disabled:opacity-30'
                                  >
                                    <Wallet className='h-4 w-4' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Top-up Saldo</TooltipContent>
                              </Tooltip>

                              {/* Refund / Return */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    disabled={!isActive}
                                    onClick={() => openModal('refund', card)}
                                    className='h-8 w-8 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 disabled:opacity-30'
                                  >
                                    <ArrowLeftRight className='h-4 w-4' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Kembalikan Kartu & Refund</TooltipContent>
                              </Tooltip>

                              {/* Blokir / Buka Blokir */}
                              {isBlocked ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size='icon'
                                      variant='ghost'
                                      onClick={() => openModal('unblock', card)}
                                      className='h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40'
                                    >
                                      <ShieldCheck className='h-4 w-4' />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Buka Blokir Kartu (Aktifkan Kembali)</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size='icon'
                                      variant='ghost'
                                      onClick={() => openModal('blokir', card)}
                                      className='h-8 w-8 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40'
                                    >
                                      <ShieldAlert className='h-4 w-4' />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Blokir Kartu</TooltipContent>
                                </Tooltip>
                              )}

                              {/* Riwayat (placeholder) */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    className='h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted'
                                    onClick={() => {
                                      // Placeholder: riwayat transaksi per kartu
                                    }}
                                  >
                                    <Eye className='h-4 w-4' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Riwayat Transaksi</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Legend */}
            <div className='flex flex-wrap items-center gap-4 px-4 py-3 border-t bg-muted/40'>
              <p className='text-xs text-muted-foreground font-medium'>Keterangan status:</p>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <div key={key} className='flex items-center gap-1.5'>
                    <Badge variant='outline' className={`text-xs gap-1 font-medium ${cfg.className}`}>
                      <Icon className='h-3 w-3' />
                      {cfg.label}
                    </Badge>
                    {key === 'ACTIVE' && (
                      <span className='text-xs text-muted-foreground'>= Sedang dipinjam, dapat bertransaksi</span>
                    )}
                    {key === 'BLOCKED' && (
                      <span className='text-xs text-muted-foreground'>= Dilaporkan hilang, ditolak di kasir</span>
                    )}
                    {key === 'AVAILABLE' && (
                      <span className='text-xs text-muted-foreground'>= Dikembalikan, siap dipinjam ulang</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Main>

      {/* Modals */}
      <RegisterKartuModal
        open={activeModal === 'register'}
        onOpenChange={(o) => !o && closeModal()}
        existingCards={cards}
        onRegistered={handleRegistered}
        onShowSlip={showSlip}
      />
      <TopupKartuTamuModal
        open={activeModal === 'topup'}
        onOpenChange={(o) => !o && closeModal()}
        kartu={selectedCard}
        onTopupSuccess={handleTopupSuccess}
        onShowSlip={showSlip}
      />
      <RefundKartuModal
        open={activeModal === 'refund'}
        onOpenChange={(o) => !o && closeModal()}
        kartu={selectedCard}
        onRefundSuccess={handleRefundSuccess}
        onShowSlip={showSlip}
      />
      <BlokirKartuModal
        open={activeModal === 'blokir'}
        onOpenChange={(o) => !o && closeModal()}
        kartu={selectedCard}
        allCards={cards}
        onBlokirSuccess={handleBlokirSuccess}
      />
      <UnblockKartuModal
        open={activeModal === 'unblock'}
        onOpenChange={(o) => !o && closeModal()}
        kartu={selectedCard}
        onUnblockSuccess={handleUnblockSuccess}
      />
      <KartuTamuSlipModal
        open={isSlipOpen}
        onOpenChange={setIsSlipOpen}
        slipData={slipData}
      />
    </>
  )
}
