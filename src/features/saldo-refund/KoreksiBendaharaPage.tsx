import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ReceiptText,
  Printer,
  History,
  FileCheck2,
  RotateCcw,
  AlertCircle,
  Loader2,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import { useRoleStore } from '@/stores/useRoleStore'
import { TableToolbar } from '@/components/data-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { ExportButton } from '@/components/export-button'
import { formatDateTime, formatRupiah } from '@/lib/formatters'
import { exportTableToPdf } from '@/lib/pdfExport'
import { type KartuSiswaMock } from '@/types/kantin'
import { KoreksiMutasiModal } from './KoreksiMutasiModal'
import {
  type MutasiKoreksiItem,
  type TransaksiSesiTutupItem,
  mapTransaksiKasirItemToSesiTutup,
  mapMutasiKoreksiItem,
} from './types'

export function KoreksiBendaharaPage() {
  const [students, setStudents] = useState<KartuSiswaMock[]>([])
  const [koreksiList, setKoreksiList] = useState<MutasiKoreksiItem[]>([])
  const [transaksiList, setTransaksiList] = useState<TransaksiSesiTutupItem[]>(
    []
  )

  const [isLoading, setIsLoading] = useState(true)
  const [errorKoreksi, setErrorKoreksi] = useState<string | null>(null)
  const [errorTransaksi, setErrorTransaksi] = useState<string | null>(null)

  // Filters state Tab 1 (Mutasi Koreksi)
  const [searchQuery, setSearchQuery] = useState('')
  const [arahFilter, setArahFilter] = useState<string>('ALL')
  const [activeTab, setActiveTab] = useState<string>('riwayat')

  // Filters state Tab 2 (Transaksi Lampau Sesi Tutup)
  const [txSearchQuery, setTxSearchQuery] = useState('')
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL')

  // Modal create koreksi
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTxForKoreksi, setSelectedTxForKoreksi] =
    useState<TransaksiSesiTutupItem | null>(null)

  // Modal print berita acara
  const [selectedKoreksiForPrint, setSelectedKoreksiForPrint] =
    useState<MutasiKoreksiItem | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  const { currentRole } = useRoleStore()
  const isKepsek = currentRole === 'kepsek'
  const canAccessSesiTutup = !isKepsek

  const executeFetch = useCallback(async () => {
    const [resSiswa, resKoreksi, resTx] = await Promise.allSettled([
      apiClient.get('/api/siswa', { params: { batas: 50 } }),
      apiClient.get('/api/saldo/koreksi'),
      canAccessSesiTutup
        ? apiClient.get('/api/kasir/transaksi', {
            silent: true,
          } as unknown as Record<string, unknown>)
        : Promise.resolve({ data: { data: { items: [] } } }),
    ])

    let loadedStudents: KartuSiswaMock[] = []
    if (
      resSiswa.status === 'fulfilled' &&
      Array.isArray(resSiswa.value.data?.data)
    ) {
      loadedStudents = (
        resSiswa.value.data.data as Record<string, unknown>[]
      ).map((raw) => {
        const sid = Number(raw.siswaId ?? raw.siswa_id ?? raw.id ?? 0)
        const nis = String(raw.nis ?? '')
        return {
          uid: String(raw.uid ?? raw.rfidUid ?? (nis ? `UID-${nis}` : `UID-${sid}`)),
          siswa_id: sid,
          nis,
          nama: String(raw.nama ?? `Siswa #${sid}`),
          kelas: String(raw.kelas ?? '-'),
          foto_url: String(raw.fotoUrl ?? raw.foto_url ?? ''),
          saldo: Number(raw.saldo ?? 0),
          limit_harian: 0,
          belanja_hari_ini: 0,
          is_blocked: Boolean(raw.diblokir ?? raw.tidakAktif),
        }
      })
      setStudents(loadedStudents)
    }

    // 1. Process GET /api/saldo/koreksi
    if (resKoreksi.status === 'fulfilled') {
      const rawData = resKoreksi.value.data
      const items =
        rawData?.data?.items ??
        (Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData)
            ? rawData
            : [])
      setKoreksiList(
        items.map((it: unknown) =>
          mapMutasiKoreksiItem(it as Record<string, unknown>, loadedStudents)
        )
      )
      setErrorKoreksi(null)
    } else {
      const err = resKoreksi.reason as
        | { response?: { data?: { message?: string } }; message?: string }
        | undefined
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gagal memuat log mutasi koreksi bendahara'
      setErrorKoreksi(msg)
      setKoreksiList([])
    }

    // 2. Process GET /api/kasir/transaksi
    if (resTx.status === 'fulfilled') {
      const rawData = resTx.value.data as Record<string, unknown> | undefined
      const rawDataObj = rawData?.data as Record<string, unknown> | unknown[] | undefined
      const items =
        (rawDataObj as { items?: unknown[] })?.items ??
        (Array.isArray(rawDataObj)
          ? rawDataObj
          : Array.isArray(rawData)
            ? rawData
            : [])
      setTransaksiList(
        items.map((it: unknown) =>
          mapTransaksiKasirItemToSesiTutup(
            it as Record<string, unknown>,
            loadedStudents
          )
        )
      )
      setErrorTransaksi(null)
    } else {
      const err = resTx.reason as
        | { response?: { data?: { message?: string } }; message?: string }
        | undefined
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gagal memuat daftar transaksi sesi tutup'
      setErrorTransaksi(msg)
      setTransaksiList([])
    }
  }, [canAccessSesiTutup])

  const loadData = useCallback(
    async (showSuccessToast = false) => {
      setIsLoading(true)
      try {
        await executeFetch()
        if (showSuccessToast) {
          toast.success(
            'Data mutasi dan transaksi sesi tutup berhasil diperbarui'
          )
        }
      } finally {
        setIsLoading(false)
      }
    },
    [executeFetch]
  )

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        await executeFetch()
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [executeFetch])

  const handleCreateSuccess = (newKoreksi: MutasiKoreksiItem) => {
    setKoreksiList((prev) => [newKoreksi, ...prev])
    if (newKoreksi.transaksi_terkait_id) {
      setTransaksiList((prev) =>
        prev.map((t) =>
          String(t.id) === String(newKoreksi.transaksi_terkait_id)
            ? {
                ...t,
                status: 'DIKOREKSI',
                koreksi_referensi_id: newKoreksi.referensi_id,
                dapatDikoreksi: false,
                dapat_dikoreksi: false,
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
        k.siswa_nama.toLowerCase().includes(q) ||
        k.siswa_info.toLowerCase().includes(q) ||
        k.alasan.toLowerCase().includes(q) ||
        k.bendahara_nama.toLowerCase().includes(q)

      let matchArah = true
      if (arahFilter !== 'ALL') {
        matchArah = k.arah === arahFilter
      }

      return matchSearch && matchArah
    })
  }, [koreksiList, searchQuery, arahFilter])

  // Filtered transaksi sesi tutup list
  const filteredTransaksi = useMemo(() => {
    return transaksiList.filter((tx) => {
      const q = txSearchQuery.toLowerCase()
      const matchSearch =
        String(tx.id).toLowerCase().includes(q) ||
        String(tx.sesi_kasir_id).toLowerCase().includes(q) ||
        tx.siswa_nama.toLowerCase().includes(q) ||
        tx.siswa_info.toLowerCase().includes(q) ||
        tx.titik_kasir.toLowerCase().includes(q) ||
        (tx.kartu_uid && tx.kartu_uid.toLowerCase().includes(q)) ||
        (tx.petugas_kasir && tx.petugas_kasir.toLowerCase().includes(q))

      let matchStatus = true
      if (txStatusFilter !== 'ALL') {
        if (txStatusFilter === 'BISA_DIKOREKSI') {
          matchStatus = tx.status !== 'VOID' && tx.status !== 'DIKOREKSI' && tx.dapatDikoreksi !== false
        } else if (txStatusFilter === 'VOID') {
          matchStatus = tx.status === 'VOID'
        } else if (txStatusFilter === 'DIKOREKSI') {
          matchStatus = tx.status === 'DIKOREKSI'
        }
      }

      return matchSearch && matchStatus
    })
  }, [transaksiList, txSearchQuery, txStatusFilter])

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
    if (filteredKoreksi.length === 0) {
      toast.warning('Tidak ada data mutasi koreksi untuk diekspor')
      return
    }

    const headers = [
      'No. Berita Acara',
      'Waktu Audit',
      'Nama Siswa',
      'Info / NIS',
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
      k.siswa_nama,
      k.siswa_info,
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

  const handleExportPdf = () => {
    if (filteredKoreksi.length === 0) {
      toast.warning('Tidak ada data mutasi koreksi untuk diekspor')
      return
    }

    try {
      const filteredKredit = filteredKoreksi
        .filter((item) => item.arah === 'KREDIT')
        .reduce((acc, item) => acc + item.nominal, 0)
      const filteredDebit = filteredKoreksi
        .filter((item) => item.arah === 'DEBIT')
        .reduce((acc, item) => acc + item.nominal, 0)

      exportTableToPdf({
        filename: `Audit_Log_Koreksi_Bendahara_${new Date().toISOString().slice(0, 10)}`,
        title: 'LOG AUDIT PENYESUAIAN SALDO BENDAHARA',
        subtitle: 'Rekapitulasi riwayat mutasi koreksi saldo kantin',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Total Mutasi': `${filteredKoreksi.length} transaksi`,
          'Total Koreksi Kredit (+)': formatRupiah(filteredKredit),
          'Total Koreksi Debit (-)': formatRupiah(filteredDebit),
        },
        columns: [
          { header: 'Ref ID', key: 'referensi_id' },
          { header: 'Waktu', key: 'waktu' },
          { header: 'Siswa', key: 'siswa' },
          { header: 'Jenis', key: 'jenis_koreksi' },
          { header: 'Arah', key: 'arah' },
          { header: 'Nominal', key: 'nominal' },
          { header: 'Saldo Sebelum', key: 'saldo_sebelum' },
          { header: 'Saldo Setelah', key: 'saldo_setelah' },
          { header: 'Alasan', key: 'alasan' },
          { header: 'Bendahara', key: 'bendahara_nama' },
        ],
        data: filteredKoreksi.map((item) => ({
          referensi_id: item.referensi_id,
          waktu: formatDateTime(item.waktu),
          siswa: item.siswa_info
            ? `${item.siswa_nama} (${item.siswa_info})`
            : item.siswa_nama,
          jenis_koreksi: item.jenis_koreksi,
          arah: item.arah === 'KREDIT' ? '+ Kredit' : '- Debit',
          nominal: formatRupiah(item.nominal),
          saldo_sebelum: formatRupiah(item.saldo_sebelum),
          saldo_setelah: formatRupiah(item.saldo_setelah),
          alasan: item.alasan,
          bendahara_nama: item.bendahara_nama,
        })),
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Log audit mutasi koreksi (.pdf) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Saldo & Pengawasan' title='Penyesuaian Saldo Bendahara' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Header Title & Actions */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Penyesuaian Saldo Bendahara
            </h1>
          </div>
          <div className='flex items-center gap-2'>
            <ExportButton
              onExportCsv={handleExportCSV}
              onExportPdf={handleExportPdf}
              disabled={filteredKoreksi.length === 0}
              data-testid='btn-koreksi-export'
            />
            {!isKepsek && (
              <Button
                size='sm'
                onClick={() => {
                  setSelectedTxForKoreksi(null)
                  setIsCreateModalOpen(true)
                }}
                className='gap-1.5 text-xs'
              >
                <Plus className='h-4 w-4' />
                Buat Penyesuaian Saldo
              </Button>
            )}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Total Catatan Penyesuaian
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400'>
                <ClipboardList className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {koreksiList.length} Mutasi
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Tercatat rapi dan aman di buku besar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Penambahan Saldo (+)
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400'>
                <ArrowUpRight className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums'>
                {formatRupiah(totalKoreksiKredit)}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Pengembalian saldo akibat salah potong kasir
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Pengurangan Saldo (-)
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400'>
                <ArrowDownRight className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-destructive tabular-nums'>
                {formatRupiah(totalKoreksiDebit)}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Koreksi kelebihan pengisian saldo TU
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Transaksi Selesai Disesuaikan
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-400'>
                <CheckCircle2 className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {totalTransaksiTerkoreksi} Transaksi
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Dari transaksi kasir yang telah ditutup
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
          <TabsList className={`grid w-full ${isKepsek ? 'max-w-xs grid-cols-1' : 'max-w-md grid-cols-2'}`}>
            <TabsTrigger value='riwayat' className='gap-2 text-xs'>
              <History className='h-3.5 w-3.5' />
              Riwayat Penyesuaian Saldo ({filteredKoreksi.length})
            </TabsTrigger>
            {!isKepsek && (
              <TabsTrigger value='transaksi-lampau' className='gap-2 text-xs'>
                <ReceiptText className='h-3.5 w-3.5' />
                Cari Transaksi Kasir Terdahulu ({filteredTransaksi.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* TAB 1: LOG MUTASI KOREKSI BENDAHARA */}
          <TabsContent value='riwayat' className='space-y-4'>
            {errorKoreksi && (
              <Alert variant='destructive' role='alert' className='text-xs'>
                <AlertCircle className='h-4 w-4' />
                <AlertTitle className='font-semibold'>Gagal Memuat Data Mutasi</AlertTitle>
                <AlertDescription className='mt-1 flex items-center justify-between gap-2'>
                  <span>{errorKoreksi}</span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => void loadData(true)}
                    className='h-6 px-2 text-[11px]'
                  >
                    Coba Lagi
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Filter Toolbar */}
            <TableToolbar
              searchPlaceholder='Cari No. Berita Acara, nama siswa, alasan...'
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              filters={[
                {
                  title: 'Arah Mutasi',
                  options: [
                    { label: 'Kurangi Saldo Siswa (-)', value: 'DEBIT' },
                    { label: 'Tambah Saldo Siswa (+)', value: 'KREDIT' },
                  ],
                  selectedValues: arahFilter !== 'ALL' ? [arahFilter] : [],
                  onSelect: (vals) => setArahFilter(vals[0] || 'ALL'),
                  isSingleSelect: true,
                },
              ]}
              isFiltered={Boolean(searchQuery || arahFilter !== 'ALL')}
              onReset={() => {
                setSearchQuery('')
                setArahFilter('ALL')
              }}
            />

            {/* Tabel Mutasi Koreksi */}
            <Card className='p-0 gap-0 overflow-hidden'>
              <CardHeader className='border-b border-border bg-muted/30 px-6 py-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <CardTitle className='text-base font-semibold'>
                      Riwayat Resmi Penyesuaian Saldo
                    </CardTitle>
                    <CardDescription className='mt-0.5 text-xs'>
                      Daftar penyesuaian saldo resmi yang diperiksa dan disetujui oleh Bendahara Sekolah
                    </CardDescription>
                  </div>
                  <Badge
                    variant='outline'
                    className='rounded-full border-border bg-muted/50 px-2.5 py-0.5 font-mono text-xs font-medium text-muted-foreground tabular-nums'
                  >
                    {filteredKoreksi.length} Rekaman Audit
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow className='border-b border-border hover:bg-transparent'>
                        <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          No.
                        </TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          No. Berita Acara & Waktu
                        </TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Subjek Pemilik
                        </TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Jenis Masalah
                        </TableHead>
                        <TableHead className='text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Arah Mutasi
                        </TableHead>
                        <TableHead className='text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Nominal
                        </TableHead>
                        <TableHead className='text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Saldo (Sebelum → Sesudah)
                        </TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Alasan Audit Koreksi
                        </TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Bendahara
                        </TableHead>
                        <TableHead className='pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Aksi
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className='h-32 text-center text-muted-foreground'
                          >
                            <div className='flex flex-col items-center justify-center space-y-2'>
                              <Loader2 className='size-6 animate-spin text-muted-foreground' />
                              <p className='text-sm text-muted-foreground'>
                                Memuat data mutasi koreksi...
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredKoreksi.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className='h-32 text-center text-muted-foreground'
                          >
                            <div className='flex flex-col items-center justify-center space-y-2'>
                              <FileCheck2 className='h-8 w-8 text-muted-foreground/40' />
                              <p className='text-sm'>
                                Tidak ada rekaman mutasi koreksi sesuai filter pencarian.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredKoreksi.map((k, idx) => (
                          <TableRow
                            key={k.id}
                            className='border-b border-border last:border-b-0 hover:bg-muted/30'
                          >
                            <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                              {idx + 1}
                            </TableCell>
                            <TableCell className='font-mono text-xs tabular-nums'>
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
                                {k.siswa_nama}
                              </div>
                              <div className='text-[11px] text-muted-foreground tabular-nums'>
                                {k.siswa_info}
                              </div>
                            </TableCell>

                            <TableCell>
                              {k.jenis_koreksi === 'SALAH_INPUT_TOPUP' ? (
                                <Badge
                                  variant='outline'
                                  className='rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                                >
                                  Salah Topup TU
                                </Badge>
                              ) : k.jenis_koreksi ===
                                'PEMBALIK_TRANSAKSI_KASIR' ? (
                                <Badge
                                  variant='outline'
                                  className='rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                                >
                                  Pembalik Kasir Sesi Tutup
                                </Badge>
                              ) : (
                                <Badge
                                  variant='outline'
                                  className='rounded-full border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
                                >
                                  Penyesuaian Audit
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className='text-center'>
                              {k.arah === 'DEBIT' ? (
                                <Badge
                                  variant='outline'
                                  className='gap-1 rounded-full border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                                >
                                  <ArrowDownRight className='h-3 w-3' />
                                  DEBIT (-Saldo)
                                </Badge>
                              ) : (
                                <Badge
                                  variant='outline'
                                  className='gap-1 rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                >
                                  <ArrowUpRight className='h-3 w-3' />
                                  KREDIT (+Saldo)
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className='text-right font-mono text-xs font-bold tabular-nums'>
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

                            <TableCell className='text-right font-mono text-xs tabular-nums'>
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
                                <div className='mt-0.5 font-mono text-[10px] text-primary tabular-nums'>
                                  Terkait: {k.transaksi_terkait_id}
                                  {k.sesi_kasir_id ? ` (Sesi #${k.sesi_kasir_id})` : ''}
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
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setSelectedKoreksiForPrint(k)
                                  setIsPrintModalOpen(true)
                                }}
                                className='h-8 gap-1 text-xs'
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
            {errorTransaksi && (
              <Alert variant='destructive' role='alert' className='text-xs'>
                <AlertCircle className='h-4 w-4' />
                <AlertTitle className='font-semibold'>Gagal Memuat Transaksi Sesi Tutup</AlertTitle>
                <AlertDescription className='mt-1 flex items-center justify-between gap-2'>
                  <span>{errorTransaksi}</span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => void loadData(true)}
                    className='h-6 px-2 text-[11px]'
                  >
                    Coba Lagi
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Toolbar Filter Tab 2 */}
            <TableToolbar
              searchPlaceholder='Cari ID Transaksi, Sesi, nama siswa, kartu UID...'
              searchValue={txSearchQuery}
              onSearchChange={setTxSearchQuery}
              filters={[
                {
                  title: 'Status Koreksi',
                  options: [
                    { label: 'Bisa Dikoreksi', value: 'BISA_DIKOREKSI' },
                    { label: 'Sudah Dibalik', value: 'DIKOREKSI' },
                    { label: 'Transaksi VOID', value: 'VOID' },
                  ],
                  selectedValues: txStatusFilter !== 'ALL' ? [txStatusFilter] : [],
                  onSelect: (vals) => setTxStatusFilter(vals[0] || 'ALL'),
                  isSingleSelect: true,
                },
              ]}
              isFiltered={Boolean(txSearchQuery || txStatusFilter !== 'ALL')}
              onReset={() => {
                setTxSearchQuery('')
                setTxStatusFilter('ALL')
              }}
            />

            <Card className='p-0 gap-0 overflow-hidden'>
              <CardHeader className='border-b border-border bg-muted/30 px-6 py-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <CardTitle className='text-base font-semibold'>
                      Transaksi Kasir Sesi Lampau
                    </CardTitle>
                    <CardDescription className='mt-0.5 text-xs'>
                      Pilih transaksi bermasalah pada sesi yang telah ditutup untuk memproses pengembalian saldo secara resmi
                    </CardDescription>
                  </div>
                  <Badge
                    variant='outline'
                    className='rounded-full border-border bg-muted/50 px-2.5 py-0.5 font-mono text-xs font-medium text-muted-foreground tabular-nums'
                  >
                    {filteredTransaksi.length} Transaksi Kandidat
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow className='border-b border-border hover:bg-transparent'>
                        <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          No.
                        </TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          ID Transaksi & Waktu
                        </TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Sesi Kasir & Petugas
                        </TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Subjek Pembeli
                        </TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Rincian / Info Belanja
                        </TableHead>
                        <TableHead className='text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Total Belanja
                        </TableHead>
                        <TableHead className='text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Status
                        </TableHead>
                        <TableHead className='pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                          Aksi Otorisasi
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className='h-32 text-center text-muted-foreground'
                          >
                            <div className='flex flex-col items-center justify-center space-y-2'>
                              <Loader2 className='size-6 animate-spin text-muted-foreground' />
                              <p className='text-sm text-muted-foreground'>
                                Memuat data transaksi sesi tutup...
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredTransaksi.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className='h-32 text-center text-muted-foreground'
                          >
                            <div className='flex flex-col items-center justify-center space-y-2'>
                              <ReceiptText className='h-8 w-8 text-muted-foreground/40' />
                              <p className='text-sm'>
                                Tidak ada transaksi sesi tutup yang sesuai kriteria pencarian.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTransaksi.map((tx, idx) => (
                          <TableRow
                            key={tx.id}
                            className='border-b border-border last:border-b-0 hover:bg-muted/30'
                          >
                            <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                              {idx + 1}
                            </TableCell>
                            <TableCell className='font-mono text-xs tabular-nums'>
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
                              <div className='font-medium text-foreground tabular-nums'>
                                Sesi #{tx.sesi_kasir_id} ({tx.titik_kasir})
                              </div>
                              <div className='text-[11px] text-muted-foreground'>
                                Kasir: {tx.petugas_kasir}
                              </div>
                            </TableCell>

                            <TableCell className='text-xs'>
                              <div className='font-semibold text-foreground'>
                                {tx.siswa_nama}
                              </div>
                              <div className='text-[11px] text-muted-foreground tabular-nums'>
                                {tx.siswa_info}
                              </div>
                            </TableCell>

                            <TableCell className='text-xs'>
                              {tx.items && tx.items.length > 0 ? (
                                <div className='space-y-0.5 tabular-nums'>
                                  {tx.items.map((it, idx) => (
                                    <div
                                      key={idx}
                                      className='text-[11px] text-muted-foreground'
                                    >
                                      {it.qty}x {it.nama} ({formatRupiah(it.subtotal)})
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className='text-[11px] text-muted-foreground tabular-nums'>
                                  {tx.kartu_uid ? `Kartu UID: ${tx.kartu_uid}` : 'Transaksi Kasir POS'}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className='text-right font-mono text-xs font-bold text-primary tabular-nums'>
                              {formatRupiah(tx.total)}
                            </TableCell>

                            <TableCell className='text-center'>
                              {tx.status === 'DIKOREKSI' ? (
                                <Badge
                                  variant='outline'
                                  className='rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                                >
                                  Telah Dikoreksi {tx.koreksi_referensi_id ? `(${tx.koreksi_referensi_id})` : ''}
                                </Badge>
                              ) : tx.status === 'VOID' ? (
                                <Badge
                                  variant='outline'
                                  className='rounded-full border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                                >
                                  VOID {tx.alasanVoid ? `(${tx.alasanVoid})` : ''}
                                </Badge>
                              ) : (
                                <Badge
                                  variant='outline'
                                  className='rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
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
                              ) : tx.status === 'VOID' || tx.dapatDikoreksi === false ? (
                                <span className='text-xs text-muted-foreground italic'>
                                  Tidak Dapat Dikoreksi
                                </span>
                              ) : (
                                <Button
                                  size='sm'
                                  onClick={() => {
                                    setSelectedTxForKoreksi(tx)
                                    setIsCreateModalOpen(true)
                                  }}
                                  className='h-8 gap-1 text-xs'
                                >
                                  <RotateCcw className='h-3.5 w-3.5' />
                                  Koreksi Pembalik
                                </Button>
                              )}
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
        </Tabs>
      </Main>

      {/* Modal Dialog Form Buat Mutasi Koreksi */}
      <KoreksiMutasiModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        initialTransaction={selectedTxForKoreksi}
        students={students}
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
              Dokumen resmi Berita Acara penyesuaian/pembalik saldo append-only ledger
            </DialogDescription>
          </DialogHeader>

          {selectedKoreksiForPrint && (
            <div
              id='print-koreksi-area'
              className='space-y-4 rounded-xl border border-border bg-card p-4 font-sans text-xs print:border-none'
            >
              <div className='space-y-1 border-b border-border pb-3 text-center'>
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
                    Siswa Penerima Koreksi:
                  </span>
                  <span className='font-semibold'>
                    {selectedKoreksiForPrint.siswa_nama} (
                    {selectedKoreksiForPrint.siswa_info})
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
                      {selectedKoreksiForPrint.transaksi_terkait_id}
                      {selectedKoreksiForPrint.sesi_kasir_id
                        ? ` (Sesi #${selectedKoreksiForPrint.sesi_kasir_id})`
                        : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className='space-y-1.5 rounded-md border border-border bg-muted/30 p-3 font-mono tabular-nums'>
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
                <div className='flex justify-between border-t border-border pt-1'>
                  <span>Saldo Awal → Saldo Baru:</span>
                  <span className='font-semibold'>
                    {formatRupiah(selectedKoreksiForPrint.saldo_sebelum)}{' '}
                    →{' '}
                    {formatRupiah(selectedKoreksiForPrint.saldo_setelah)}
                  </span>
                </div>
              </div>

              <div className='space-y-1 rounded border border-border bg-muted/20 p-2.5'>
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
              type='button'
              variant='outline'
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
