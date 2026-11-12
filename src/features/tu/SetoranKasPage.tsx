import { TableToolbar } from '@/components/data-table'
import { ExportButton } from '@/components/export-button'
import { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  Printer,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import apiClient from '@/lib/api-client'
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { formatRupiah } from '@/lib/formatters'
import { exportTableToPdf } from '@/lib/pdfExport'
import {
  LaporanDateFilter,
  getDefaultDateFilter,
  formatYmd,
} from '@/features/laporan/components'
import type { LaporanFilterParams } from '@/features/laporan/types'
import { KonfirmasiSetoranModal } from './KonfirmasiSetoranModal'
import {
  type SetoranKasItem,
  type TransaksiTopupDetail,
  type RawRekapTu,
  mapRekapSetoranTuItem,
  KNOWN_PETUGAS_MAP,
} from './types'
import {
  getStoredTopupTransactions,
  saveStoredSetoranConfirmation,
  applyStoredSetoranConfirmations,
} from './saldo-storage'

const isSetoranConfirmed = (status: string) =>
  status === 'TERKONFIRMASI' || status === 'DIKONFIRMASI'

const isSetoranWaiting = (status: string) =>
  status === 'MENUNGGU_KONFIRMASI' || status === 'MENUNGGU'

function resolveFilterDates(params: LaporanFilterParams): string[] {
  if (params.tanggal) return [params.tanggal]
  if (params.dari && params.sampai) {
    const startYmd = params.dari.slice(0, 10)
    const endYmd = params.sampai.slice(0, 10)
    const [sy, sm, sd] = startYmd.split('-').map(Number)
    const [ey, em, ed] = endYmd.split('-').map(Number)
    if (sy && sm && sd && ey && em && ed) {
      const cursor = new Date(sy, sm - 1, sd)
      const end = new Date(ey, em - 1, ed)
      const dates: string[] = []
      while (cursor < end && dates.length < 62) {
        dates.push(formatYmd(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      if (dates.length > 0) return dates
    }
  }
  return [formatYmd(new Date())]
}

export function SetoranKasPage() {
  const { auth } = useAuthStore()
  const isBendaharaOrAdmin = auth.hasRole(['admin', 'bendahara'])

  const [dateFilterParams, setDateFilterParams] = useState<LaporanFilterParams>(
    () => getDefaultDateFilter().params
  )
  const [dateFilterLabel, setDateFilterLabel] = useState<string>(
    () => getDefaultDateFilter().label
  )
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [setoranList, setSetoranList] = useState<SetoranKasItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // State modal konfirmasi
  const [selectedSetoranForConfirm, setSelectedSetoranForConfirm] =
    useState<SetoranKasItem | null>(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  // State modal rincian transaksi topup
  const [selectedSetoranForDetail, setSelectedSetoranForDetail] =
    useState<SetoranKasItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // State modal berita acara cetak
  const [selectedSetoranForPrint, setSelectedSetoranForPrint] =
    useState<SetoranKasItem | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    const targetDates = resolveFilterDates(dateFilterParams)
    const defaultFallbackDate =
      dateFilterParams.tanggal || targetDates[0] || formatYmd(new Date())

    const load = async () => {
      setIsLoading(true)
      try {
        let items: SetoranKasItem[] = []

        try {
          const res = await apiClient.get('/api/saldo/setoran-tu/rekap', {
            params: dateFilterParams,
          })
          const rawItems = res.data?.data
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            items = rawItems.map((item: RawRekapTu) =>
              mapRekapSetoranTuItem(
                item,
                typeof item.tanggal === 'string' && item.tanggal
                  ? item.tanggal
                  : defaultFallbackDate
              )
            )
          }
        } catch {
          // Abaikan jika live query rekap backend mengembalikan error atau 404
        }

        // Ambil transaksi top-up lokal untuk setiap tanggal pada periode yang dipilih agar mutasi top-up
        // terbaru selalu terangkum di rekapitulasi setoran kas TU
        for (const tgl of targetDates) {
          const localTxs = getStoredTopupTransactions(tgl)
          if (localTxs.length === 0) continue

          const groupedByPetugas = new Map<number, TransaksiTopupDetail[]>()
          for (const tx of localTxs) {
            const pId =
              tx.petugas_id ??
              (auth.user?.userId ? Number(auth.user.userId) : 2)
            const currentGroup = groupedByPetugas.get(pId) || []
            currentGroup.push(tx)
            groupedByPetugas.set(pId, currentGroup)
          }

          for (const [pId, txs] of groupedByPetugas.entries()) {
            const existingIdx = items.findIndex(
              (it) => it.petugas_id === pId && it.tanggal === tgl
            )
            const totalSiswa = txs.reduce(
              (sum, t) => sum + (t.nominal || 0),
              0
            )
            const totalSistem = totalSiswa

            if (existingIdx >= 0) {
              const existing = items[existingIdx]
              items[existingIdx] = {
                ...existing,
                total_transaksi: Math.max(existing.total_transaksi, txs.length),
                total_topup_siswa: Math.max(
                  existing.total_topup_siswa,
                  totalSiswa
                ),
                total_sistem: Math.max(existing.total_sistem, totalSistem),
                rincian_transaksi:
                  existing.rincian_transaksi &&
                  existing.rincian_transaksi.length > 0
                    ? existing.rincian_transaksi
                    : txs,
              }
            } else {
              const currentUser = auth.user
              const isCurrentPetugas =
                currentUser?.userId && Number(currentUser.userId) === pId
              const petugasNama = isCurrentPetugas
                ? currentUser?.nama || 'Petugas TU'
                : KNOWN_PETUGAS_MAP[pId]?.nama || `Petugas Loket TU #${pId}`
              const petugasNip = KNOWN_PETUGAS_MAP[pId]?.nip

              items.push({
                id: `SETOR-${tgl.replace(/-/g, '')}-${pId}`,
                tanggal: tgl,
                petugas_id: pId,
                petugas_nama: petugasNama,
                petugas_nip: petugasNip,
                total_transaksi: txs.length,
                total_topup_siswa: totalSiswa,
                total_sistem: totalSistem,
                uang_fisik: null,
                selisih: null,
                status: 'MENUNGGU_KONFIRMASI',
                rincian_transaksi: txs,
              })
            }
          }
        }

        // Urutkan terbaru lebih dulu untuk mode rentang
        items.sort((a, b) => {
          if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal)
          return a.petugas_id - b.petugas_id
        })

        // Terapkan data konfirmasi yang tersimpan di storage lokal jika ada
        items = applyStoredSetoranConfirmations(items)

        if (isMounted) {
          setSetoranList(items)
        }
      } catch {
        if (isMounted) {
          setSetoranList([])
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [dateFilterParams, auth.user])

  // Handle successful confirmation from modal
  const handleConfirmSuccess = (updatedItem: SetoranKasItem) => {
    saveStoredSetoranConfirmation(updatedItem)
    setSetoranList((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    )
  }

  // Filtered list based on search and status
  const filteredList = useMemo(() => {
    return setoranList.filter((item) => {
      const pNama = (item.petugas_nama || '').toLowerCase()
      const sId = (item.id || '').toLowerCase()
      const query = (searchQuery || '').toLowerCase().trim()
      const matchSearch =
        !query || pNama.includes(query) || sId.includes(query)

      let matchStatus = true
      if (statusFilter === 'MENUNGGU_KONFIRMASI') {
        matchStatus = isSetoranWaiting(item.status)
      } else if (statusFilter === 'TERKONFIRMASI') {
        matchStatus = isSetoranConfirmed(item.status)
      } else if (statusFilter === 'SELISIH') {
        matchStatus = item.selisih !== null && item.selisih !== 0
      }

      return matchSearch && matchStatus
    })
  }, [setoranList, searchQuery, statusFilter])

  // Summary Metrics Calculation
  const totalPenerimaanSistem = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + (curr.total_sistem || 0), 0)
  }, [filteredList])

  const totalUangFisikDisetor = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + (curr.uang_fisik || 0), 0)
  }, [filteredList])

  const totalSelisihFisik = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + (curr.selisih || 0), 0)
  }, [filteredList])

  const totalPetugasSelesai = useMemo(() => {
    return filteredList.filter((i) => isSetoranConfirmed(i.status)).length
  }, [filteredList])

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      toast.warning('Tidak ada data untuk diekspor')
      return
    }
    const headers = [
      'ID Setoran',
      'Tanggal',
      'Petugas TU',
      'NIP',
      'Jumlah Transaksi',
      'Topup Siswa (Rp)',
      'Total Sistem (Rp)',
      'Uang Fisik (Rp)',
      'Selisih (Rp)',
      'Status',
      'Catatan / Berita Acara',
      'Bendahara',
      'Waktu Konfirmasi',
    ]

    const rows = filteredList.map((item) => [
      item.id,
      item.tanggal,
      item.petugas_nama,
      item.petugas_nip || '-',
      item.total_transaksi,
      item.total_topup_siswa,
      item.total_sistem,
      item.uang_fisik !== null ? item.uang_fisik : '-',
      item.selisih !== null ? item.selisih : '-',
      item.status,
      `"${(item.catatan || '-').replace(/"/g, '""')}"`,
      item.bendahara_nama || '-',
      item.konfirmasi_pada || '-',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const fileSlug =
      dateFilterParams.tanggal ||
      `${dateFilterParams.dari?.slice(0, 10) || 'awal'}_sd_${dateFilterParams.sampai?.slice(0, 10) || 'akhir'}`
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Rekap_Setoran_Kas_TU_${fileSlug}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Laporan rekapitulasi setoran kas berhasil diekspor ke CSV')
  }

  const handleExportPdf = () => {
    if (filteredList.length === 0) {
      toast.warning('Tidak ada data setoran untuk diekspor')
      return
    }

    try {
      const rows = filteredList.map((item) => ({
        id: item.id,
        tanggal: item.tanggal,
        petugas: item.petugas_nama,
        trx: item.total_transaksi,
        topupSiswa: formatRupiah(item.total_topup_siswa),
        totalSistem: formatRupiah(item.total_sistem),
        uangFisik: item.uang_fisik !== null ? formatRupiah(item.uang_fisik) : '-',
        selisih: item.selisih !== null ? formatRupiah(item.selisih) : '-',
        status: item.status,
      }))

      const fileSlug =
        dateFilterParams.tanggal ||
        `${dateFilterParams.dari?.slice(0, 10) || 'awal'}_sd_${dateFilterParams.sampai?.slice(0, 10) || 'akhir'}`

      exportTableToPdf({
        filename: `Rekap_Setoran_Kas_TU_${fileSlug}`,
        title: 'REKAPITULASI & SETORAN KAS TU KANTIN SKOOLIA',
        subtitle: `Periode: ${dateFilterLabel}`,
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Total Setoran Sistem': formatRupiah(totalPenerimaanSistem),
          'Total Uang Fisik Diterima': formatRupiah(totalUangFisikDisetor),
          'Total Selisih Kas': formatRupiah(totalSelisihFisik),
          'Petugas Terlibat': `${filteredList.length} Petugas`,
        },
        columns: [
          { header: 'ID Setoran', key: 'id' },
          { header: 'Tanggal', key: 'tanggal' },
          { header: 'Petugas TU', key: 'petugas' },
          { header: 'Trx', key: 'trx' },
          { header: 'Topup Siswa', key: 'topupSiswa' },
          { header: 'Total Sistem', key: 'totalSistem' },
          { header: 'Uang Fisik', key: 'uangFisik' },
          { header: 'Selisih', key: 'selisih' },
          { header: 'Status', key: 'status' },
        ],
        data: rows,
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Laporan Setoran Kas TU (.pdf) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    }
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        {/* Title Header */}
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Setoran Kas TU Harian
            </h1>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              Periode: <strong className='text-foreground'>{dateFilterLabel}</strong>
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2.5'>
            <LaporanDateFilter
              initialPreset='TODAY'
              onChange={(params, label) => {
                setDateFilterParams(params)
                setDateFilterLabel(label)
              }}
            />
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>
                Catatan Sistem (Penerimaan TU)
              </p>
              <h3 className='mt-0.5 text-xl font-bold text-foreground'>
                {formatRupiah(totalPenerimaanSistem)}
              </h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                Dari{' '}
                {filteredList.reduce((acc, c) => acc + (c.total_transaksi || 0), 0)}{' '}
                transaksi isi saldo tunai
              </p>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>
                Total Uang Tunai Diterima
              </p>
              <h3 className='mt-0.5 text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                {formatRupiah(totalUangFisikDisetor)}
              </h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                Uang tunai dihitung dan diterima Bendahara
              </p>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>
                Selisih Uang Kas
              </p>
              <h3
                className={`mt-0.5 text-xl font-bold ${
                  totalSelisihFisik === 0
                    ? 'text-foreground'
                    : totalSelisihFisik < 0
                      ? 'text-destructive'
                      : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {totalSelisihFisik > 0 ? '+' : ''}
                {formatRupiah(totalSelisihFisik)}
              </h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                {totalSelisihFisik === 0
                  ? 'Jumlah uang pas / cocok'
                  : totalSelisihFisik < 0
                    ? 'Uang fisik kurang dari catatan'
                    : 'Uang fisik lebih dari catatan'}
              </p>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>
                Status Penyerahan Kas
              </p>
              <h3 className='mt-0.5 text-xl font-bold text-foreground'>
                {totalPetugasSelesai} / {filteredList.length} Petugas
              </h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                {totalPetugasSelesai === filteredList.length &&
                filteredList.length > 0
                  ? 'Semua setoran hari ini telah diverifikasi'
                  : `${filteredList.length - totalPetugasSelesai} setoran menunggu verifikasi`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <TableToolbar
          searchPlaceholder='Cari nama petugas atau No. Setoran...'
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              title: 'Status',
              options: [
                { label: 'Menunggu Verifikasi', value: 'MENUNGGU_KONFIRMASI' },
                { label: 'Sudah Diverifikasi', value: 'TERKONFIRMASI' },
                { label: 'Ada Selisih Kas', value: 'SELISIH' },
              ],
              selectedValues: statusFilter !== 'ALL' ? [statusFilter] : [],
              onSelect: (vals) => setStatusFilter(vals[0] || 'ALL'),
              isSingleSelect: true,
            },
          ]}
          isFiltered={Boolean(searchQuery || statusFilter !== 'ALL')}
          onReset={() => {
            setSearchQuery('')
            setStatusFilter('ALL')
          }}
        >
          <ExportButton
            onExportCsv={handleExportCSV}
            onExportPdf={handleExportPdf}
            disabled={filteredList.length === 0}
            className='h-8 text-xs'
            data-testid='btn-setoran-kas-export'
          />
        </TableToolbar>

        {/* Rekapitulasi Table */}
        <Card className='border-0 bg-muted/70 dark:bg-muted/30 overflow-hidden shadow-none'>
          <CardHeader className='border-b bg-muted/20 px-6 py-4'>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-base font-semibold'>
                  Daftar Rekapitulasi Kas TU Per Petugas ({dateFilterLabel})
                </CardTitle>
                <CardDescription className='mt-0.5 text-xs'>
                  Rincian setoran uang tunai dari seluruh titik loket TU
                  kepada Bendahara Sekolah
                </CardDescription>
              </div>
              <Badge className='border-0 bg-muted/80 font-mono text-xs text-muted-foreground'>
                {filteredList.length} Petugas TU Terdaftar
              </Badge>
            </div>
          </CardHeader>
            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/40'>
                      <TableHead className='w-12 text-center text-xs font-semibold'>
                        No.
                      </TableHead>
                      <TableHead className='text-xs font-semibold'>
                        ID & Tanggal
                      </TableHead>
                      <TableHead className='text-xs font-semibold'>
                        Petugas TU
                      </TableHead>
                      <TableHead className='text-xs font-semibold'>
                        Rincian Top-up
                      </TableHead>
                      <TableHead className='text-right text-xs font-semibold'>
                        Catatan Sistem
                      </TableHead>
                      <TableHead className='text-right text-xs font-semibold'>
                        Uang Tunai
                      </TableHead>
                      <TableHead className='text-center text-xs font-semibold'>
                        Selisih
                      </TableHead>
                      <TableHead className='text-center text-xs font-semibold'>
                        Status
                      </TableHead>
                      <TableHead className='text-xs font-semibold'>
                        Verifikasi Bendahara
                      </TableHead>
                      <TableHead className='pr-6 text-right text-xs font-semibold'>
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
                            <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                            <p className='text-sm text-muted-foreground'>
                              Memuat data rekapitulasi setoran kas TU...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className='h-32 text-center text-muted-foreground'
                        >
                          <p className='text-sm'>
                            Tidak ada data setoran kas TU untuk tanggal dan
                            filter ini.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((item, idx) => (
                        <TableRow key={item.id} className='hover:bg-muted/30'>
                          <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                            {idx + 1}
                          </TableCell>
                          <TableCell className='font-mono text-xs'>
                            <div className='font-semibold text-foreground'>
                              {item.id}
                            </div>
                            <div className='text-[11px] text-muted-foreground'>
                              {item.tanggal}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className='text-xs font-medium'>
                              {item.petugas_nama}
                            </div>
                            {item.petugas_nip && (
                              <div className='font-mono text-[11px] text-muted-foreground'>
                                NIP: {item.petugas_nip}
                              </div>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className='text-xs font-medium'>
                              {item.total_transaksi} Transaksi
                            </div>
                            <div className='text-[11px] text-muted-foreground'>
                              Topup Siswa: {formatRupiah(item.total_topup_siswa)}
                            </div>
                          </TableCell>

                          <TableCell className='text-right font-mono text-xs font-semibold text-primary'>
                            {formatRupiah(item.total_sistem)}
                          </TableCell>

                          <TableCell className='text-right font-mono text-xs font-medium'>
                            {item.uang_fisik !== null ? (
                              <span className='font-semibold text-emerald-700 dark:text-emerald-400'>
                                {formatRupiah(item.uang_fisik)}
                              </span>
                            ) : (
                              <span className='text-muted-foreground italic'>
                                Belum disetor
                              </span>
                            )}
                          </TableCell>

                          <TableCell className='text-center'>
                            {item.selisih === null ? (
                              <span className='text-xs text-muted-foreground'>
                                -
                              </span>
                            ) : item.selisih === 0 ? (
                              <Badge
                                className='border-0 bg-emerald-500/15 text-[11px] font-medium text-emerald-700 dark:text-emerald-400'
                              >
                                Cocok (Rp 0)
                              </Badge>
                            ) : item.selisih < 0 ? (
                              <Badge
                                className='border-0 bg-destructive/15 text-[11px] font-medium text-destructive'
                              >
                                Kurang -{formatRupiah(Math.abs(item.selisih))}
                              </Badge>
                            ) : (
                              <Badge
                                className='border-0 bg-blue-500/15 text-[11px] font-medium text-blue-700 dark:text-blue-400'
                              >
                                Lebih +{formatRupiah(item.selisih)}
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className='text-center'>
                            {isSetoranConfirmed(item.status) ? (
                              <Badge
                                className='gap-1 border-0 bg-emerald-500/15 text-[11px] font-medium text-emerald-700 dark:text-emerald-400'
                              >
                                <CheckCircle2 className='h-3 w-3' />
                                Selesai
                              </Badge>
                            ) : (
                              <Badge
                                className='gap-1 border-0 bg-amber-500/15 text-[11px] font-medium text-amber-700 dark:text-amber-400'
                              >
                                <AlertTriangle className='h-3 w-3' />
                                Menunggu Setoran
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            {isSetoranConfirmed(item.status) ? (
                              <div className='text-xs'>
                                <div className='font-medium text-foreground'>
                                  {item.bendahara_nama}
                                </div>
                                <div className='text-[11px] text-muted-foreground'>
                                  {item.konfirmasi_pada
                                    ? new Date(
                                        item.konfirmasi_pada
                                      ).toLocaleTimeString('id-ID', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }) + ' WIB'
                                    : '-'}
                                </div>
                                {item.catatan && (
                                  <div className='max-w-[180px] truncate text-[11px] text-muted-foreground italic'>
                                    "{item.catatan}"
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className='text-xs text-muted-foreground italic'>
                                -
                              </span>
                            )}
                          </TableCell>

                          <TableCell className='pr-6 text-right'>
                            <div className='flex items-center justify-end gap-1.5'>
                              {/* Tombol Konfirmasi Bendahara */}
                              {isBendaharaOrAdmin &&
                                isSetoranWaiting(item.status) && (
                                  <Button
                                    size='sm'
                                    onClick={() => {
                                      setSelectedSetoranForConfirm(item)
                                      setIsConfirmModalOpen(true)
                                    }}
                                    className='h-7 gap-1 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700'
                                  >
                                    <CheckCircle2 className='h-3.5 w-3.5' />
                                    Terima Kas
                                  </Button>
                                )}

                              {/* Tombol Edit Konfirmasi jika sudah terkonfirmasi */}
                              {isBendaharaOrAdmin &&
                                isSetoranConfirmed(item.status) && (
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => {
                                      setSelectedSetoranForConfirm(item)
                                      setIsConfirmModalOpen(true)
                                    }}
                                    className='h-7 border-0 bg-muted/60 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                                    title='Koreksi / Update Konfirmasi Setoran'
                                  >
                                    Ubah Kas
                                  </Button>
                                )}

                              {/* Tombol Lihat Rincian Transaksi */}
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  const rincian =
                                    item.rincian_transaksi && item.rincian_transaksi.length > 0
                                      ? item.rincian_transaksi
                                      : getStoredTopupTransactions(item.tanggal, item.petugas_id)
                                  setSelectedSetoranForDetail({
                                    ...item,
                                    rincian_transaksi: rincian,
                                  })
                                  setIsDetailModalOpen(true)
                                }}
                                className='h-7 gap-1 border-border text-xs'
                                title='Lihat Rincian Transaksi Top-up Petugas'
                              >
                                <Eye className='h-3.5 w-3.5' />
                                Rincian
                              </Button>

                              {/* Tombol Cetak Berita Acara */}
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => {
                                  setSelectedSetoranForPrint(item)
                                  setIsPrintModalOpen(true)
                                }}
                                className='h-7 p-1.5 text-xs text-muted-foreground hover:text-foreground'
                                title='Cetak Berita Acara Setoran Kas'
                              >
                                <Printer className='h-3.5 w-3.5' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
      </Main>

      {/* Modal Konfirmasi Setoran Kas Bendahara */}
      <KonfirmasiSetoranModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        setoran={selectedSetoranForConfirm}
        onSuccess={handleConfirmSuccess}
      />

      {/* Modal Dialog Rincian Transaksi Topup Petugas */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-[700px]'>
          {(() => {
            const displayRincian =
              selectedSetoranForDetail?.rincian_transaksi &&
              selectedSetoranForDetail.rincian_transaksi.length > 0
                ? selectedSetoranForDetail.rincian_transaksi
                : selectedSetoranForDetail
                  ? getStoredTopupTransactions(
                      selectedSetoranForDetail.tanggal,
                      selectedSetoranForDetail.petugas_id
                    )
                  : []

            const totalDisplay =
              displayRincian.reduce((acc, t) => acc + (t.nominal || 0), 0) ||
              selectedSetoranForDetail?.total_sistem ||
              0

            return (
              <>
                <DialogHeader>
                  <DialogTitle className='text-base font-semibold'>
                    Rincian Transaksi Top-up Petugas:{' '}
                    {selectedSetoranForDetail?.petugas_nama}
                  </DialogTitle>
                  <DialogDescription className='text-xs'>
                    Daftar seluruh top-up tunai yang dilayani pada tanggal{' '}
                    {selectedSetoranForDetail?.tanggal} (Total:{' '}
                    {formatRupiah(totalDisplay)})
                  </DialogDescription>
                </DialogHeader>

                <div className='space-y-4 py-2'>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow className='bg-muted/30'>
                          <TableHead className='w-12 text-center text-xs font-semibold'>
                            No.
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Waktu & No. Ref
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Subjek / Penerima
                          </TableHead>
                          <TableHead className='text-xs font-semibold'>
                            Penyetor
                          </TableHead>
                          <TableHead className='text-right text-xs font-semibold'>
                            Nominal
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayRincian.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className='h-24 text-center text-xs text-muted-foreground'
                            >
                              Rincian detail transaksi top-up tersimpan di sistem riwayat mutasi kasir/TU.
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayRincian.map((tx: TransaksiTopupDetail, idx: number) => (
                            <TableRow key={tx.id}>
                              <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                                {idx + 1}
                              </TableCell>
                              <TableCell className='text-xs'>
                                <div className='font-mono font-medium'>
                                  {new Date(tx.waktu).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </div>
                                <div className='font-mono text-[11px] text-muted-foreground'>
                                  {tx.referensi_id}
                                </div>
                              </TableCell>
                              <TableCell className='text-xs'>
                                <div className='font-medium text-foreground'>
                                  {tx.siswa_nama}
                                </div>
                                <div className='text-[11px] text-muted-foreground'>
                                  {tx.siswa_info}
                                </div>
                              </TableCell>
                              <TableCell className='text-xs text-muted-foreground'>
                                {tx.penyetor}
                              </TableCell>
                              <TableCell className='text-right font-mono text-xs font-semibold text-primary'>
                                {formatRupiah(tx.nominal)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Cetak Berita Acara Setoran Kas */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className='sm:max-w-[550px] print:border-none print:p-0'>
          <DialogHeader>
            <DialogTitle className='text-base font-semibold'>
              Berita Acara Serah Terima Kas TU
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Dokumen fisik serah terima uang kas tunai harian petugas TU ke
              Bendahara Sekolah
            </DialogDescription>
          </DialogHeader>

          {selectedSetoranForPrint && (
            <div
              id='print-area'
              className='space-y-4 rounded-lg bg-card p-6 font-sans text-xs'
            >
              <div className='space-y-1 border-b pb-3 text-center'>
                <img
                  src='/logo.png'
                  alt='Logo Skoolia'
                  className='mx-auto h-7 w-7 object-contain mb-1.5'
                />
                <h3 className='text-sm font-bold tracking-wider text-foreground uppercase'>
                  SMA NEGERI 1 SKOOLIA
                </h3>
                <p className='text-[11px] text-muted-foreground'>
                  MODUL KANTIN CASHLESS & LAYANAN KAS TU
                </p>
                <h4 className='pt-1 text-xs font-semibold text-primary'>
                  BERITA ACARA PENYERAHAN KAS TOP-UP TUNAI
                </h4>
                <p className='font-mono text-[10px] text-muted-foreground'>
                  No. Dokumen: {selectedSetoranForPrint.id}
                </p>
              </div>

              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Hari, Tanggal:</span>
                  <span className='font-semibold'>
                    {selectedSetoranForPrint.tanggal}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    Petugas TU (Penyetor):
                  </span>
                  <span className='font-semibold'>
                    {selectedSetoranForPrint.petugas_nama}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    Penerima (Bendahara):
                  </span>
                  <span className='font-semibold'>
                    {selectedSetoranForPrint.bendahara_nama ||
                      'Siti Rahma (Bendahara)'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    Total Transaksi Top-up:
                  </span>
                  <span>
                    {selectedSetoranForPrint.total_transaksi} Transaksi
                  </span>
                </div>
              </div>

              <div className='space-y-1.5 rounded-md bg-muted/40 p-3 font-mono'>
                <div className='flex justify-between'>
                  <span>Total Sistem:</span>
                  <span className='font-bold'>
                    {formatRupiah(selectedSetoranForPrint.total_sistem)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Total Uang Fisik Disetor:</span>
                  <span className='font-bold text-emerald-700 dark:text-emerald-400'>
                    {formatRupiah(
                      selectedSetoranForPrint.uang_fisik ||
                        selectedSetoranForPrint.total_sistem
                    )}
                  </span>
                </div>
                <div className='flex justify-between border-t pt-1 font-semibold'>
                  <span>Selisih Kas Fisik:</span>
                  <span
                    className={
                      selectedSetoranForPrint.selisih &&
                      selectedSetoranForPrint.selisih < 0
                        ? 'text-destructive'
                        : ''
                    }
                  >
                    {selectedSetoranForPrint.selisih !== null
                      ? `${selectedSetoranForPrint.selisih > 0 ? '+' : ''}${formatRupiah(selectedSetoranForPrint.selisih)}`
                      : 'Rp 0 (Pas)'}
                  </span>
                </div>
              </div>

              {selectedSetoranForPrint.catatan && (
                <div className='rounded bg-muted/20 p-2'>
                  <span className='block text-[10px] font-semibold text-muted-foreground'>
                    Catatan Berita Acara:
                  </span>
                  <p className='text-[11px] italic'>
                    {selectedSetoranForPrint.catatan}
                  </p>
                </div>
              )}

              <div className='grid grid-cols-2 gap-4 pt-6 text-center text-xs'>
                <div className='space-y-12'>
                  <p className='text-muted-foreground'>
                    Petugas TU yang Menyerahkan,
                  </p>
                  <p className='font-semibold underline'>
                    {selectedSetoranForPrint.petugas_nama}
                  </p>
                </div>
                <div className='space-y-12'>
                  <p className='text-muted-foreground'>
                    Bendahara yang Menerima,
                  </p>
                  <p className='font-semibold underline'>
                    {selectedSetoranForPrint.bendahara_nama ||
                      'Siti Rahma (Bendahara)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='secondary'
              onClick={() => setIsPrintModalOpen(false)}
              className='border-0 bg-muted/80 hover:bg-muted text-foreground shadow-none'
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
