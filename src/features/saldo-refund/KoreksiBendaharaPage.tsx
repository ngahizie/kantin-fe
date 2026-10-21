import { useState, useEffect, useMemo } from 'react'
import {
  MOCK_KOREKSI_BENDAHARA,
  MOCK_TRANSAKSI_SESI_TUTUP,
} from '@/mocks/mock-data'
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ReceiptText,
  FileSpreadsheet,
  Printer,
  History,
  FileCheck2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import { TableToolbar } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { formatRupiah } from '@/lib/formatters'
import { KoreksiMutasiModal } from './KoreksiMutasiModal'
import type { MutasiKoreksiItem, TransaksiSesiTutupItem } from './types'

export function KoreksiBendaharaPage() {
  const [koreksiList, setKoreksiList] = useState<MutasiKoreksiItem[]>(
    MOCK_KOREKSI_BENDAHARA
  )
  const [transaksiList, setTransaksiList] = useState<TransaksiSesiTutupItem[]>(
    MOCK_TRANSAKSI_SESI_TUTUP
  )

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [subjekFilter, setSubjekFilter] = useState<string>('ALL')
  const [arahFilter, setArahFilter] = useState<string>('ALL')
  const [activeTab, setActiveTab] = useState<string>('riwayat')

  // Modal create koreksi
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTxForKoreksi, setSelectedTxForKoreksi] =
    useState<TransaksiSesiTutupItem | null>(null)

  // Modal print berita acara
  const [selectedKoreksiForPrint, setSelectedKoreksiForPrint] =
    useState<MutasiKoreksiItem | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const [resKoreksi, resTx] = await Promise.all([
          apiClient.get('/api/saldo/koreksi').catch(() => null),
          apiClient.get('/api/transaksi/sesi-tutup').catch(() => null),
        ])

        if (isMounted) {
          if (resKoreksi?.data?.data && Array.isArray(resKoreksi.data.data)) {
            setKoreksiList(resKoreksi.data.data)
          } else {
            setKoreksiList(MOCK_KOREKSI_BENDAHARA)
          }

          if (resTx?.data?.data && Array.isArray(resTx.data.data)) {
            setTransaksiList(resTx.data.data)
          } else {
            setTransaksiList(MOCK_TRANSAKSI_SESI_TUTUP)
          }
        }
      } catch {
        if (isMounted) {
          setKoreksiList(MOCK_KOREKSI_BENDAHARA)
          setTransaksiList(MOCK_TRANSAKSI_SESI_TUTUP)
        }
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleCreateSuccess = (newKoreksi: MutasiKoreksiItem) => {
    setKoreksiList((prev) => [newKoreksi, ...prev])
    if (newKoreksi.transaksi_terkait_id) {
      setTransaksiList((prev) =>
        prev.map((t) =>
          t.id === newKoreksi.transaksi_terkait_id
            ? {
                ...t,
                status: 'DIKOREKSI',
                koreksi_referensi_id: newKoreksi.referensi_id,
              }
            : t
        )
      )
    }
  }

  // Filtered koreksi list
  const filteredKoreksi = useMemo(() => {
    return koreksiList.filter((k) => {
      const q = searchQuery.toLowerCase()
      const matchSearch =
        k.referensi_id.toLowerCase().includes(q) ||
        k.subjek_nama.toLowerCase().includes(q) ||
        k.subjek_info.toLowerCase().includes(q) ||
        k.alasan.toLowerCase().includes(q) ||
        k.bendahara_nama.toLowerCase().includes(q)

      let matchSubjek = true
      if (subjekFilter !== 'ALL') {
        matchSubjek = k.subjek_tipe === subjekFilter
      }

      let matchArah = true
      if (arahFilter !== 'ALL') {
        matchArah = k.arah === arahFilter
      }

      return matchSearch && matchSubjek && matchArah
    })
  }, [koreksiList, searchQuery, subjekFilter, arahFilter])

  // Summary Metrics Calculation
  const totalKoreksiKredit = useMemo(() => {
    return koreksiList
      .filter((k) => k.arah === 'KREDIT')
      .reduce((acc, curr) => acc + curr.nominal, 0)
  }, [koreksiList])

  const totalKoreksiDebit = useMemo(() => {
    return koreksiList
      .filter((k) => k.arah === 'DEBIT')
      .reduce((acc, curr) => acc + curr.nominal, 0)
  }, [koreksiList])

  const totalTransaksiTerkoreksi = useMemo(() => {
    return transaksiList.filter((t) => t.status === 'DIKOREKSI').length
  }, [transaksiList])

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No. Berita Acara',
      'Waktu Audit',
      'Tipe Subjek',
      'Nama Subjek',
      'Info / NIS / Kartu',
      'Jenis Masalah',
      'Arah Mutasi',
      'Nominal (Rp)',
      'Saldo Sebelum (Rp)',
      'Saldo Setelah (Rp)',
      'Alasan Audit Koreksi',
      'Bendahara Otorisator',
      'ID Transaksi Terkait',
    ]

    const rows = filteredKoreksi.map((k) => [
      k.referensi_id,
      k.waktu,
      k.subjek_tipe,
      k.subjek_nama,
      k.subjek_info,
      k.jenis_koreksi,
      k.arah,
      k.nominal,
      k.saldo_sebelum,
      k.saldo_setelah,
      `"${k.alasan.replace(/"/g, '""')}"`,
      k.bendahara_nama,
      k.transaksi_terkait_id || '-',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `Audit_Log_Koreksi_Bendahara_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Log audit mutasi koreksi berhasil diekspor ke CSV')
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6 pb-12'>
        {/* Header Title & Actions */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Mutasi Koreksi Bendahara
            </h1>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='secondary'
              size='sm'
              onClick={handleExportCSV}
              className='gap-1.5 text-xs border-0 bg-muted/80 shadow-none'
            >
              <FileSpreadsheet className='h-3.5 w-3.5 text-emerald-600' />
              Ekspor CSV
            </Button>
            <Button
              size='sm'
              onClick={() => {
                setSelectedTxForKoreksi(null)
                setIsCreateModalOpen(true)
              }}
              className='gap-1.5 text-xs'
            >
              <Plus className='h-4 w-4' />
              Buat Koreksi Saldo
            </Button>
          </div>
        </div>

          {/* KPI Summary Cards */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium text-muted-foreground'>
                  Total Mutasi Koreksi Audit
                </p>
                <h3 className='mt-0.5 text-xl font-bold text-foreground'>
                  {koreksiList.length} Mutasi
                </h3>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Tercatat rapi di append-only ledger
                </p>
              </CardContent>
            </Card>

            <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium text-muted-foreground'>
                  Total Pembalik Kredit (+Saldo)
                </p>
                <h3 className='mt-0.5 text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                  {formatRupiah(totalKoreksiKredit)}
                </h3>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Pengembalian dana sesi tertutup
                </p>
              </CardContent>
            </Card>

            <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium text-muted-foreground'>
                  Total Pembalik Debit (-Saldo)
                </p>
                <h3 className='mt-0.5 text-xl font-bold text-destructive'>
                  {formatRupiah(totalKoreksiDebit)}
                </h3>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Pembatalan kelebihan top-up TU
                </p>
              </CardContent>
            </Card>

            <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium text-muted-foreground'>
                  Transaksi Lampau Dibalik
                </p>
                <h3 className='mt-0.5 text-xl font-bold text-foreground'>
                  {totalTransaksiTerkoreksi} Transaksi
                </h3>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Dari sesi kasir yang telah ditutup
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='space-y-4'
          >
            <TabsList className='grid w-full max-w-md grid-cols-2'>
              <TabsTrigger value='riwayat' className='gap-2 text-xs'>
                <History className='h-3.5 w-3.5' />
                Log Mutasi Koreksi ({filteredKoreksi.length})
              </TabsTrigger>
              <TabsTrigger value='transaksi-lampau' className='gap-2 text-xs'>
                <ReceiptText className='h-3.5 w-3.5' />
                Lookup Sesi Kasir Selesai ({transaksiList.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: LOG MUTASI KOREKSI BENDAHARA */}
            <TabsContent value='riwayat' className='space-y-4'>
              {/* Filter Toolbar */}
              <TableToolbar
                searchPlaceholder='Cari No. Berita Acara, nama siswa, alasan...'
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                filters={[
                  {
                    title: 'Subjek',
                    options: [
                      { label: 'Siswa', value: 'SISWA' },
                      { label: 'Kartu Tamu', value: 'KARTU_TAMU' },
                    ],
                    selectedValues: subjekFilter !== 'ALL' ? [subjekFilter] : [],
                    onSelect: (vals) => setSubjekFilter(vals[0] || 'ALL'),
                    isSingleSelect: true,
                  },
                  {
                    title: 'Arah Mutasi',
                    options: [
                      { label: 'DEBIT (-Saldo)', value: 'DEBIT' },
                      { label: 'KREDIT (+Saldo)', value: 'KREDIT' },
                    ],
                    selectedValues: arahFilter !== 'ALL' ? [arahFilter] : [],
                    onSelect: (vals) => setArahFilter(vals[0] || 'ALL'),
                    isSingleSelect: true,
                  },
                ]}
                isFiltered={Boolean(searchQuery || subjekFilter !== 'ALL' || arahFilter !== 'ALL')}
                onReset={() => {
                  setSearchQuery('')
                  setSubjekFilter('ALL')
                  setArahFilter('ALL')
                }}
              />

              {/* Tabel Mutasi Koreksi */}
              <Card className='border-0 bg-muted/70 dark:bg-muted/30 overflow-hidden'>
                <CardHeader className='border-b bg-muted/20 px-6 py-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-base font-semibold'>
                        Jejak Audit Mutasi Koreksi Saldo
                      </CardTitle>
                      <CardDescription className='mt-0.5 text-xs'>
                        Rekaman riwayat penyesuaian saldo resmi yang diaudit
                        oleh Bendahara Sekolah
                      </CardDescription>
                    </div>
                    <Badge variant='secondary' className='border-0 font-mono text-xs'>
                      {filteredKoreksi.length} Rekaman Audit
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow className='bg-muted/40'>
                          <TableHead className='text-xs font-semibold'>
                            No. Berita Acara & Waktu
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Subjek Pemilik
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Jenis Masalah
                          </TableHead>
                          <TableHead className='text-center text-xs font-semibold'>
                            Arah Mutasi
                          </TableHead>
                          <TableHead className='text-right text-xs font-semibold'>
                            Nominal
                          </TableHead>
                          <TableHead className='text-right text-xs font-semibold'>
                            Saldo (Sebelum → Sesudah)
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Alasan Audit Koreksi
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Bendahara
                          </TableHead>
                          <TableHead className='pr-6 text-right text-xs font-semibold'>
                            Aksi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredKoreksi.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={9}
                              className='h-32 text-center text-muted-foreground'
                            >
                              <div className='flex flex-col items-center justify-center space-y-2'>
                                <FileCheck2 className='h-8 w-8 text-muted-foreground/40' />
                                <p className='text-sm'>
                                  Tidak ada rekaman mutasi koreksi sesuai filter
                                  pencarian.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredKoreksi.map((k) => (
                            <TableRow key={k.id} className='hover:bg-muted/30'>
                              <TableCell className='font-mono text-xs'>
                                <div className='font-bold text-foreground'>
                                  {k.referensi_id}
                                </div>
                                <div className='text-[11px] text-muted-foreground'>
                                  {new Date(k.waktu).toLocaleString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </TableCell>

                              <TableCell className='text-xs'>
                                <div className='font-semibold text-foreground'>
                                  {k.subjek_nama}
                                </div>
                                <div className='text-[11px] text-muted-foreground'>
                                  {k.subjek_info}
                                </div>
                              </TableCell>

                              <TableCell>
                                {k.jenis_koreksi === 'SALAH_INPUT_TOPUP' ? (
                                  <Badge
                                    variant='outline'
                                    className='border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[11px] font-medium'
                                  >
                                    Salah Topup TU
                                  </Badge>
                                ) : k.jenis_koreksi ===
                                  'PEMBALIK_TRANSAKSI_KASIR' ? (
                                  <Badge
                                    variant='outline'
                                    className='border-0 bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[11px] font-medium'
                                  >
                                    Pembalik Kasir Sesi Tutup
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant='outline'
                                    className='border-0 bg-purple-500/15 text-purple-700 dark:text-purple-400 text-[11px] font-medium'
                                  >
                                    Penyesuaian Audit
                                  </Badge>
                                )}
                              </TableCell>

                              <TableCell className='text-center'>
                                {k.arah === 'DEBIT' ? (
                                  <Badge
                                    variant='outline'
                                    className='gap-1 border-0 bg-destructive/15 text-destructive dark:text-destructive text-[11px] font-medium'
                                  >
                                    <ArrowDownRight className='h-3 w-3' />
                                    DEBIT (-Saldo)
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant='outline'
                                    className='gap-1 border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium'
                                  >
                                    <ArrowUpRight className='h-3 w-3' />
                                    KREDIT (+Saldo)
                                  </Badge>
                                )}
                              </TableCell>

                              <TableCell className='text-right font-mono text-xs font-bold'>
                                <span
                                  className={
                                    k.arah === 'DEBIT'
                                      ? 'text-destructive'
                                      : 'text-emerald-700 dark:text-emerald-400'
                                  }
                                >
                                  {k.arah === 'DEBIT' ? '-' : '+'}
                                  {formatRupiah(k.nominal)}
                                </span>
                              </TableCell>

                              <TableCell className='text-right font-mono text-xs'>
                                <span className='text-muted-foreground'>
                                  {formatRupiah(k.saldo_sebelum)}
                                </span>{' '}
                                →{' '}
                                <span className='font-bold text-foreground'>
                                  {formatRupiah(k.saldo_setelah)}
                                </span>
                              </TableCell>

                              <TableCell className='max-w-[240px] text-xs'>
                                <div
                                  className='line-clamp-2 text-muted-foreground'
                                  title={k.alasan}
                                >
                                  "{k.alasan}"
                                </div>
                                {k.transaksi_terkait_id && (
                                  <div className='mt-0.5 font-mono text-[10px] text-primary'>
                                    Terkait: {k.transaksi_terkait_id} (Sesi #
                                    {k.sesi_kasir_id})
                                  </div>
                                )}
                              </TableCell>

                              <TableCell className='text-xs'>
                                <div className='font-medium text-foreground'>
                                  {k.bendahara_nama}
                                </div>
                              </TableCell>

                              <TableCell className='pr-6 text-right'>
                                <Button
                                  variant='secondary'
                                  size='sm'
                                  onClick={() => {
                                    setSelectedKoreksiForPrint(k)
                                    setIsPrintModalOpen(true)
                                  }}
                                  className='h-7 gap-1 text-xs border-0'
                                >
                                  <Printer className='h-3.5 w-3.5' />
                                  Berita Acara
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: LOOKUP SESI KASIR SELESAI / TRANSAKSI LAMPAU */}
            <TabsContent value='transaksi-lampau' className='space-y-4'>
              <Card className='border-0 bg-muted/70 dark:bg-muted/30 overflow-hidden'>
                <CardHeader className='border-b bg-muted/20 px-6 py-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-base font-semibold'>
                        Transaksi Kasir Sesi Lampau
                      </CardTitle>
                      <CardDescription className='mt-0.5 text-xs'>
                        Pilih transaksi bermasalah untuk memproses pengembalian
                        saldo secara resmi
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow className='bg-muted/40'>
                          <TableHead className='text-xs font-semibold'>
                            ID Transaksi & Waktu
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Sesi Kasir & Petugas
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Subjek Pembeli
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Daftar Item
                          </TableHead>
                          <TableHead className='text-right text-xs font-semibold'>
                            Total Belanja
                          </TableHead>
                          <TableHead className='text-center text-xs font-semibold'>
                            Status
                          </TableHead>
                          <TableHead className='pr-6 text-right text-xs font-semibold'>
                            Aksi Otorisasi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transaksiList.map((tx) => (
                          <TableRow key={tx.id} className='hover:bg-muted/30'>
                            <TableCell className='font-mono text-xs'>
                              <div className='font-bold text-foreground'>
                                {tx.id}
                              </div>
                              <div className='text-[11px] text-muted-foreground'>
                                {new Date(tx.waktu).toLocaleString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </TableCell>

                            <TableCell className='text-xs'>
                              <div className='font-medium text-foreground'>
                                Sesi #{tx.sesi_kasir_id} ({tx.titik_kasir})
                              </div>
                              <div className='text-[11px] text-muted-foreground'>
                                Kasir: {tx.petugas_kasir}
                              </div>
                            </TableCell>

                            <TableCell className='text-xs'>
                              <div className='font-semibold text-foreground'>
                                {tx.subjek_nama}
                              </div>
                              <div className='text-[11px] text-muted-foreground'>
                                {tx.subjek_info}
                              </div>
                            </TableCell>

                            <TableCell className='text-xs'>
                              <div className='space-y-0.5'>
                                {tx.items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className='text-[11px] text-muted-foreground'
                                  >
                                    {it.qty}x {it.nama} ({formatRupiah(it.subtotal)})
                                  </div>
                                ))}
                              </div>
                            </TableCell>

                            <TableCell className='text-right font-mono text-xs font-bold text-primary'>
                              {formatRupiah(tx.total)}
                            </TableCell>

                            <TableCell className='text-center'>
                              {tx.status === 'DIKOREKSI' ? (
                                <Badge
                                  variant='outline'
                                  className='border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[11px] font-medium'
                                >
                                  Telah Dikoreksi ({tx.koreksi_referensi_id})
                                </Badge>
                              ) : (
                                <Badge
                                  variant='outline'
                                  className='border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium'
                                >
                                  Selesai (Terkunci)
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className='pr-6 text-right'>
                              {tx.status === 'DIKOREKSI' ? (
                                <span className='text-xs text-muted-foreground italic'>
                                  Sudah Dibalik
                                </span>
                              ) : (
                                <Button
                                  size='sm'
                                  onClick={() => {
                                    setSelectedTxForKoreksi(tx)
                                    setIsCreateModalOpen(true)
                                  }}
                                  className='h-7 gap-1 text-xs'
                                >
                                  <RotateCcw className='h-3.5 w-3.5' />
                                  Koreksi Pembalik
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
      </Main>

      {/* Modal Dialog Form Buat Mutasi Koreksi */}
      <KoreksiMutasiModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        initialTransaction={selectedTxForKoreksi}
        onSuccess={handleCreateSuccess}
      />

      {/* Modal Dialog Cetak Berita Acara Koreksi Audit */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className='sm:max-w-[550px] print:border-none print:p-0'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-semibold'>
              <Printer className='h-4 w-4 text-primary' />
              Berita Acara Koreksi Saldo Audit
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Dokumen resmi Berita Acara penyesuaian/pembalik saldo append-only
              ledger
            </DialogDescription>
          </DialogHeader>

          {selectedKoreksiForPrint && (
            <div
              id='print-koreksi-area'
              className='space-y-4 rounded-lg border bg-card p-6 font-sans text-xs'
            >
              <div className='space-y-1 border-b pb-3 text-center'>
                <h3 className='text-sm font-bold tracking-wider text-foreground uppercase'>
                  SMA NEGERI 1 SKOOLIA
                </h3>
                <p className='text-[11px] text-muted-foreground'>
                  BAGIAN KEUANGAN & BENDAHARA SEKOLAH
                </p>
                <h4 className='pt-1 text-xs font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400'>
                  BERITA ACARA MUTASI KOREKSI SALDO KANTIN
                </h4>
                <p className='font-mono text-[10px] text-muted-foreground'>
                  Nomor Dokumen: {selectedKoreksiForPrint.referensi_id}
                </p>
              </div>

              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    Waktu Eksekusi Audit:
                  </span>
                  <span className='font-semibold'>
                    {new Date(selectedKoreksiForPrint.waktu).toLocaleString(
                      'id-ID'
                    )}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    Subjek Penerima Koreksi:
                  </span>
                  <span className='font-semibold'>
                    {selectedKoreksiForPrint.subjek_nama} (
                    {selectedKoreksiForPrint.subjek_info})
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Jenis Masalah:</span>
                  <span className='font-semibold'>
                    {selectedKoreksiForPrint.jenis_koreksi}
                  </span>
                </div>
                {selectedKoreksiForPrint.transaksi_terkait_id && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>
                      Transaksi Kasir Terkait:
                    </span>
                    <span className='font-mono font-semibold'>
                      {selectedKoreksiForPrint.transaksi_terkait_id} (Sesi #
                      {selectedKoreksiForPrint.sesi_kasir_id})
                    </span>
                  </div>
                )}
              </div>

              <div className='space-y-1.5 rounded-md border bg-muted/40 p-3 font-mono'>
                <div className='flex justify-between'>
                  <span>Arah Mutasi:</span>
                  <span className='font-bold uppercase'>
                    {selectedKoreksiForPrint.arah === 'DEBIT'
                      ? 'DEBIT (Pengurangan Saldo)'
                      : 'KREDIT (Pengembalian/Penambahan Saldo)'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Nominal Koreksi:</span>
                  <span className='font-bold text-primary'>
                    {formatRupiah(selectedKoreksiForPrint.nominal)}
                  </span>
                </div>
                <div className='flex justify-between border-t pt-1'>
                  <span>Saldo Awal → Saldo Baru:</span>
                  <span className='font-semibold'>
                    {formatRupiah(selectedKoreksiForPrint.saldo_sebelum)}{' '}
                    →{' '}
                    {formatRupiah(selectedKoreksiForPrint.saldo_setelah)}
                  </span>
                </div>
              </div>

              <div className='space-y-1 rounded border bg-muted/20 p-2.5'>
                <span className='block text-[10px] font-semibold text-muted-foreground'>
                  Alasan Audit Koreksi Wajib:
                </span>
                <p className='text-[11px] leading-relaxed text-foreground italic'>
                  "{selectedKoreksiForPrint.alasan}"
                </p>
              </div>

              <div className='grid grid-cols-2 gap-4 pt-6 text-center text-xs'>
                <div className='space-y-12'>
                  <p className='text-muted-foreground'>Otorisator Bendahara,</p>
                  <p className='font-semibold underline'>
                    {selectedKoreksiForPrint.bendahara_nama}
                  </p>
                </div>
                <div className='space-y-12'>
                  <p className='text-muted-foreground'>
                    Mengetahui Kepala Sekolah,
                  </p>
                  <p className='font-semibold underline'>
                    Dr. Ir. H. Supriyanto, M.Pd.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='secondary'
              className='border-0'
              onClick={() => setIsPrintModalOpen(false)}
            >
              Tutup
            </Button>
            <Button onClick={() => window.print()} className='gap-1.5'>
              <Printer className='h-4 w-4' />
              Cetak Dokumen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
