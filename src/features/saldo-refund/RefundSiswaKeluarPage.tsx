import { useState, useEffect, useMemo } from 'react'
import {
  Banknote,
  ArrowLeftRight,
  CheckCircle2,
  Lock,
  Users,
  Eye,
  Loader2,
  Clock,
  Wallet,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import apiClient from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { TableToolbar } from '@/components/data-table'
import { formatRupiah } from '@/lib/formatters'
import { type SiswaNonaktifMock } from '@/types/kantin'
import { RefundOrangTuaModal } from './RefundOrangTuaModal'
import { PindahSaldoModal } from './PindahSaldoModal'
import { SlipRefundModal } from './SlipRefundModal'
import type { RefundSlipData } from './types'

export function RefundSiswaKeluarPage() {
  const { auth } = useAuthStore()
  const [students, setStudents] = useState<SiswaNonaktifMock[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [activeTab, setActiveTab] = useState('pending')

  // Modals state
  const [selectedStudentRefund, setSelectedStudentRefund] = useState<SiswaNonaktifMock | null>(null)
  const [selectedStudentTransfer, setSelectedStudentTransfer] = useState<SiswaNonaktifMock | null>(null)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)

  // Slip modal state
  const [activeSlip, setActiveSlip] = useState<RefundSlipData | null>(null)
  const [isSlipOpen, setIsSlipOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadInitialData = async () => {
      try {
        const [kandidatRes, siswaRes] = await Promise.allSettled([
          apiClient.get('/api/saldo/refund/kandidat', {
            params: { hanyaTidakAktif: true },
          }),
          apiClient.get('/api/siswa', { params: { batas: 50 } }),
        ])
        if (!isMounted) return

        const siswaInfoMap = new Map<number, Record<string, unknown>>()
        if (
          siswaRes.status === 'fulfilled' &&
          Array.isArray(siswaRes.value.data?.data)
        ) {
          for (const raw of siswaRes.value.data.data as Record<string, unknown>[]) {
            const sid = Number(raw.siswaId ?? raw.siswa_id ?? raw.id ?? 0)
            if (sid > 0) siswaInfoMap.set(sid, raw)
          }
        }

        if (
          kandidatRes.status === 'fulfilled' &&
          Array.isArray(kandidatRes.value.data?.data)
        ) {
          const rawItems = kandidatRes.value.data.data as Record<string, unknown>[]
          const isRichStudent = rawItems.some(
            (item) => item.nama && item.nis && item.kelas_terakhir
          )
          if (isRichStudent) {
            setStudents(rawItems as unknown as SiswaNonaktifMock[])
          } else {
            const mapped: SiswaNonaktifMock[] = rawItems.map((item) => {
              const sid = Number(item.siswaId ?? item.siswa_id ?? 0)
              const info = siswaInfoMap.get(sid)
              const saldoVal = Number(item.saldo ?? 0)
              const rawStatus = String(
                item.status_siswa ?? item.statusSiswa ?? 'KELUAR'
              ).toUpperCase()
              const statusSiswa: 'LULUS' | 'PINDAH' | 'KELUAR' =
                rawStatus === 'LULUS' || rawStatus === 'PINDAH'
                  ? rawStatus
                  : 'KELUAR'
              return {
                siswa_id: sid,
                nis: String(item.nis ?? info?.nis ?? '-'),
                nama: String(item.nama ?? info?.nama ?? `Siswa #${sid}`),
                kelas_terakhir: String(
                  item.kelas ?? item.kelas_terakhir ?? info?.kelas ?? '-'
                ),
                foto_url: String(
                  item.fotoUrl ?? item.foto_url ?? info?.fotoUrl ?? ''
                ),
                saldo: saldoVal,
                status_siswa: statusSiswa,
                tanggal_nonaktif: String(
                  item.tanggal_nonaktif ?? new Date().toISOString().slice(0, 10)
                ),
                alasan_nonaktif: String(
                  item.alasan_nonaktif ?? 'Siswa nonaktif'
                ),
                rfid_uid: String(
                  item.rfid_uid ?? info?.rfidUid ?? (item.nis ? `UID-${item.nis}` : `UID-${sid}`)
                ),
                is_card_blocked: true,
                nama_ortu: String(
                  item.nama_ortu ?? item.namaOrangTua ?? info?.namaOrangTua ?? '-'
                ),
                kontak_ortu: String(
                  item.kontak_ortu ??
                    item.teleponOrangTua ??
                    info?.teleponOrangTua ??
                    '-'
                ),
                is_refunded: saldoVal === 0,
              }
            })
            setStudents(mapped)
          }
        }
      } catch {
        if (isMounted) {
          setStudents([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    void loadInitialData()
    return () => {
      isMounted = false
    }
  }, [])



  // KPI Calculations
  const totalDanaMengendap = useMemo(() => {
    return students
      .filter((s) => s.saldo > 0)
      .reduce((sum, s) => sum + s.saldo, 0)
  }, [students])

  const pendingRefundCount = useMemo(() => {
    return students.filter((s) => s.saldo > 0).length
  }, [students])

  const completedRefundCount = useMemo(() => {
    return students.filter((s) => s.is_refunded || s.saldo === 0).length
  }, [students])

  // Filtered List
  const pendingStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSaldo = s.saldo > 0
      const matchStatus = statusFilter === 'ALL' || s.status_siswa === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nama_ortu.toLowerCase().includes(q) ||
        s.kelas_terakhir.toLowerCase().includes(q)

      return matchSaldo && matchStatus && matchSearch
    })
  }, [students, statusFilter, searchQuery])

  const completedStudents = useMemo(() => {
    return students.filter((s) => {
      const matchDone = s.is_refunded || s.saldo === 0
      const matchStatus = statusFilter === 'ALL' || s.status_siswa === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nama_ortu.toLowerCase().includes(q)

      return matchDone && matchStatus && matchSearch
    })
  }, [students, statusFilter, searchQuery])

  // Handlers for successful transactions
  const handleRefundSuccess = (siswaId: number, slipData: RefundSlipData) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.siswa_id === siswaId) {
          return {
            ...s,
            saldo: 0,
            is_card_blocked: true,
            is_refunded: true,
            refund_info: {
              tipe: 'REFUND_ORTU',
              metode: slipData.metode,
              nominal: slipData.nominal,
              tanggal: slipData.waktu,
              referensi_id: slipData.ref_no,
              keterangan: slipData.berita_acara || 'Refund ke orang tua',
              bank: slipData.bank,
              nomor_rekening: slipData.nomor_rekening,
              nama_rekening: slipData.nama_rekening,
              bukti_url: slipData.bukti_url,
            },
          }
        }
        return s
      })
    )
    setActiveSlip(slipData)
    setIsSlipOpen(true)
  }

  const handleTransferSuccess = (siswaAsalId: number, slipData: RefundSlipData) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.siswa_id === siswaAsalId) {
          return {
            ...s,
            saldo: 0,
            is_card_blocked: true,
            is_refunded: true,
            refund_info: {
              tipe: 'TRANSFER_SAUDARA',
              nominal: slipData.nominal,
              tanggal: slipData.waktu,
              referensi_id: slipData.ref_no,
              keterangan: slipData.berita_acara || 'Pindah saldo ke saudara',
              saudara_tujuan_id: slipData.siswa_tujuan?.siswa_id,
              saudara_tujuan_nama: slipData.siswa_tujuan?.nama,
            },
          }
        }
        return s
      })
    )
    setActiveSlip(slipData)
    setIsSlipOpen(true)
  }

  const handleOpenSlipFromHistory = (s: SiswaNonaktifMock) => {
    const info = s.refund_info
    const isTrf = info?.tipe === 'TRANSFER_SAUDARA'
    const slip: RefundSlipData = {
      type: isTrf ? 'TRANSFER_SAUDARA' : 'REFUND_ORTU',
      ref_no: info?.referensi_id || `SLIP-${s.nis}-SELESAI`,
      waktu: info?.tanggal || s.tanggal_nonaktif,
      petugas_nama: auth.user?.nama || 'Petugas TU / Bendahara',
      siswa_asal: {
        siswa_id: s.siswa_id,
        nis: s.nis,
        nama: s.nama,
        kelas_terakhir: s.kelas_terakhir,
        rfid_uid: s.rfid_uid,
        status_kartu: 'DIBLOKIR_PERMANEN',
      },
      nominal: info?.nominal || 0,
      metode: info?.metode || 'TUNAI',
      nama_penerima: s.nama_ortu,
      kontak_penerima: s.kontak_ortu,
      bank: info?.bank,
      nomor_rekening: info?.nomor_rekening,
      nama_rekening: info?.nama_rekening,
      bukti_url: info?.bukti_url,
      siswa_tujuan: isTrf
        ? {
            siswa_id: info?.saudara_tujuan_id || 0,
            nis: '-',
            nama: info?.saudara_tujuan_nama || 'Saudara Kandung',
            kelas: '-',
            saldo_awal: 0,
            saldo_akhir: info?.nominal || 0,
            nominal_diterima: info?.nominal || 0,
          }
        : undefined,
      berita_acara: info?.keterangan || 'Pemrosesan sisa saldo',
    }
    setActiveSlip(slip)
    setIsSlipOpen(true)
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Saldo & Pengawasan' title='Pengembalian Saldo Siswa' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Title Header */}
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>
            Pengembalian Saldo Siswa Lulus / Pindah
          </h1>
        </div>

        {/* KPI Cards Ringkasan */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Sisa Saldo Siswa Keluar
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400'>
                <Wallet className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums'>
                {formatRupiah(totalDanaMengendap)}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Total uang siswa yang belum diserahkan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Belum Diambil / Diserahkan
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400'>
                <Clock className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {pendingRefundCount} Siswa
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Siswa lulus / pindah yang masih punya sisa saldo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Sudah Selesai Diserahkan
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400'>
                <CheckCircle2 className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums'>
                {completedRefundCount} Siswa
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Sisa saldo sudah diserahkan kepada orang tua
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Kartu Dinonaktifkan
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400'>
                <Lock className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {completedRefundCount} Kartu
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Kartu dinonaktifkan agar tidak disalahgunakan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab & Toolbar */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
          <TableToolbar
            extraLeft={
              <TabsList className='grid grid-cols-2 w-full sm:w-auto'>
                <TabsTrigger value='pending' className='text-xs gap-2'>
                  <Banknote className='h-3.5 w-3.5' />
                  <span>Belum Diambil</span>
                  {pendingRefundCount > 0 && (
                    <Badge variant='secondary' className='ml-1 px-1.5 py-0 text-[10px] tabular-nums'>
                      {pendingRefundCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value='completed' className='text-xs gap-2'>
                  <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
                  <span>Sudah Selesai</span>
                </TabsTrigger>
              </TabsList>
            }
            searchPlaceholder='Cari NIS, nama, atau ortu...'
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={[
              {
                title: 'Status Akademik',
                options: [
                  { label: 'Lulus', value: 'LULUS' },
                  { label: 'Pindah Sekolah', value: 'PINDAH' },
                  { label: 'Keluar / Undur Diri', value: 'KELUAR' },
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
          />

          {/* TAB 1: DAFTAR SISWA MENUNGGU REFUND (SALDO > 0) */}
          <TabsContent value='pending' className='space-y-4 m-0'>
            <Card className='p-0 gap-0 overflow-hidden'>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow className='border-b border-border hover:bg-transparent'>
                        <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                        <TableHead className='w-[240px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Data Siswa Nonaktif</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status Akademik</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Orang Tua / Kontak</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Kartu RFID</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Saudara Aktif</TableHead>
                        <TableHead className='text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Sisa Saldo</TableHead>
                        <TableHead className='text-right w-[250px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Aksi Proses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className='h-32 text-center text-muted-foreground'>
                            <div className='flex flex-col items-center justify-center space-y-2'>
                              <Loader2 className='size-6 animate-spin text-muted-foreground' />
                              <p className='text-sm text-muted-foreground'>
                                Memuat data pengembalian saldo siswa...
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : pendingStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-xs'>
                            <CheckCircle2 className='h-8 w-8 text-emerald-500 mx-auto mb-2' />
                            Tidak ada sisa saldo siswa nonaktif yang tertahan. Seluruh kewajiban telah selesai!
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingStudents.map((siswa, idx) => {
                          const hasSibling =
                            siswa.saudara_kandung && siswa.saudara_kandung.length > 0
                          const firstSibling = hasSibling ? siswa.saudara_kandung![0] : null

                          return (
                            <TableRow
                              key={siswa.siswa_id}
                              className='border-b border-border last:border-b-0 text-xs hover:bg-muted/30'
                            >
                              <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                                {idx + 1}
                              </TableCell>
                              {/* Siswa */}
                              <TableCell>
                                <div className='flex items-center gap-3'>
                                  <Avatar className='h-10 w-10 border border-border'>
                                    <AvatarImage src={siswa.foto_url} alt={siswa.nama} />
                                    <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>
                                      {siswa.nama.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className='font-bold text-foreground'>
                                      {siswa.nama}
                                    </p>
                                    <p className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                                      NIS: {siswa.nis}
                                    </p>
                                    <p className='text-[11px] text-muted-foreground'>
                                      {siswa.kelas_terakhir}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Status Akademik */}
                              <TableCell>
                                <Badge
                                  variant='outline'
                                  className={
                                    siswa.status_siswa === 'LULUS'
                                      ? 'rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                                      : siswa.status_siswa === 'PINDAH'
                                      ? 'rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                                      : 'rounded-full border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                                  }
                                >
                                  {siswa.status_siswa}
                                </Badge>
                                <p className='text-[10px] text-muted-foreground mt-1 tabular-nums'>
                                  Tgl: {siswa.tanggal_nonaktif}
                                </p>
                              </TableCell>

                              {/* Orang Tua / Kontak */}
                              <TableCell>
                                <p className='font-medium text-foreground'>
                                  {siswa.nama_ortu}
                                </p>
                                <p className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                                  {siswa.kontak_ortu}
                                </p>
                                {siswa.bank_ortu && (
                                  <p className='text-[10px] text-muted-foreground font-mono tabular-nums'>
                                    {siswa.bank_ortu}: {siswa.no_rekening_ortu}
                                  </p>
                                )}
                              </TableCell>

                              {/* Status Kartu RFID */}
                              <TableCell>
                                <div className='space-y-1 font-mono text-[11px]'>
                                  <div className='flex items-center gap-1.5'>
                                    <code className='bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] tabular-nums'>
                                      {siswa.rfid_uid}
                                    </code>
                                  </div>
                                  <Badge
                                    variant='outline'
                                    className='rounded-full border-amber-200 bg-amber-50 px-2 py-0 text-[10px] font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                                  >
                                    Siap Diblokir
                                  </Badge>
                                </div>
                              </TableCell>

                              {/* Saudara Kandung */}
                              <TableCell>
                                {firstSibling ? (
                                  <div className='space-y-0.5'>
                                    <p className='font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1'>
                                      <Users className='h-3 w-3' />
                                      {firstSibling.nama}
                                    </p>
                                    <p className='text-[10px] text-muted-foreground font-mono tabular-nums'>
                                      NIS: {firstSibling.nis} ({firstSibling.kelas})
                                    </p>
                                    <span className='inline-block text-[10px] rounded-full border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0 font-medium tabular-nums'>
                                      Saldo: {formatRupiah(firstSibling.saldo)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className='text-muted-foreground text-[11px] italic'>
                                    Tidak terdeteksi
                                  </span>
                                )}
                              </TableCell>

                              {/* Sisa Saldo */}
                              <TableCell className='text-right'>
                                <span className='text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums'>
                                  {formatRupiah(siswa.saldo)}
                                </span>
                              </TableCell>

                              {/* Aksi */}
                              <TableCell className='text-right'>
                                <div className='flex items-center justify-end gap-1.5'>
                                  {/* Opsi A: Refund ke Ortu */}
                                  <Button
                                    size='sm'
                                    onClick={() => {
                                      setSelectedStudentRefund(siswa)
                                      setIsRefundModalOpen(true)
                                    }}
                                    className='h-8 text-xs gap-1.5'
                                  >
                                    <Banknote className='h-3.5 w-3.5' />
                                    <span>Kembalikan ke Ortu</span>
                                  </Button>

                                  {/* Opsi B: Pindah ke Saudara */}
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => {
                                      setSelectedStudentTransfer(siswa)
                                      setIsTransferModalOpen(true)
                                    }}
                                    className='h-8 text-xs gap-1.5'
                                  >
                                    <ArrowLeftRight className='h-3.5 w-3.5' />
                                    <span>Alihkan ke Saudara</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: RIWAYAT PEMROSESAN SELESAI */}
          <TabsContent value='completed' className='space-y-4 m-0'>
            <Card className='p-0 gap-0 overflow-hidden'>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow className='border-b border-border hover:bg-transparent'>
                        <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Siswa Nonaktif</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Jenis Penyelesaian</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Nominal Diselesaikan</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status Kartu RFID</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Keterangan / Penerima</TableHead>
                        <TableHead className='text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Struk Bukti</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className='h-32 text-center text-muted-foreground'>
                            <div className='flex flex-col items-center justify-center space-y-2'>
                              <Loader2 className='size-6 animate-spin text-muted-foreground' />
                              <p className='text-sm text-muted-foreground'>
                                Memuat riwayat pengembalian saldo...
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : completedStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-xs'>
                            Belum ada riwayat transaksi refund atau pemindahan saldo yang diproses.
                          </TableCell>
                        </TableRow>
                      ) : (
                        completedStudents.map((siswa, idx) => {
                          const info = siswa.refund_info
                          const isTrf = info?.tipe === 'TRANSFER_SAUDARA'

                          return (
                            <TableRow
                              key={siswa.siswa_id}
                              className='border-b border-border last:border-b-0 text-xs hover:bg-muted/30'
                            >
                              <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <div className='flex items-center gap-2.5'>
                                  <Avatar className='h-9 w-9 border border-border'>
                                    <AvatarImage src={siswa.foto_url} alt={siswa.nama} />
                                    <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>
                                      {siswa.nama.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className='font-semibold text-foreground'>
                                      {siswa.nama}
                                    </p>
                                    <p className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                                      NIS: {siswa.nis} • {siswa.kelas_terakhir}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant='outline'
                                  className={
                                    isTrf
                                      ? 'rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                                      : 'rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  }
                                >
                                  {isTrf ? 'Pindah ke Saudara' : `Refund (${info?.metode || 'Tunai'})`}
                                </Badge>
                                <p className='text-[10px] text-muted-foreground font-mono mt-1 tabular-nums'>
                                  Ref: {info?.referensi_id || '-'}
                                </p>
                              </TableCell>

                              <TableCell>
                                <div className='font-mono font-bold text-foreground tabular-nums'>
                                  {formatRupiah(info?.nominal || 0)}
                                </div>
                                <span className='text-[10px] text-muted-foreground tabular-nums'>
                                  Sisa saldo saat ini: Rp 0
                                </span>
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant='outline'
                                  className='rounded-full border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 text-[10px] font-medium py-0 px-2 gap-1'
                                >
                                  <Lock className='h-2.5 w-2.5' /> DIBLOKIR PERMANEN
                                </Badge>
                                <p className='text-[10px] font-mono text-muted-foreground mt-0.5 tabular-nums'>
                                  UID: {siswa.rfid_uid}
                                </p>
                              </TableCell>

                              <TableCell>
                                <p className='text-[11px] text-foreground'>
                                  {isTrf
                                    ? `Diterima adik: ${info?.saudara_tujuan_nama || 'Saudara Aktif'}`
                                    : `Penerima: ${siswa.nama_ortu}`}
                                </p>
                                <p className='text-[10px] text-muted-foreground italic truncate max-w-[200px]'>
                                  {info?.keterangan || '-'}
                                </p>
                              </TableCell>

                              <TableCell className='text-right'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => handleOpenSlipFromHistory(siswa)}
                                  className='h-8 text-xs gap-1.5'
                                >
                                  <Eye className='h-3.5 w-3.5' />
                                  <span>Lihat Bukti</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>

      {/* MODALS */}
      <RefundOrangTuaModal
        open={isRefundModalOpen}
        onOpenChange={setIsRefundModalOpen}
        siswa={selectedStudentRefund}
        onRefundSuccess={handleRefundSuccess}
      />

      <PindahSaldoModal
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        siswaAsal={selectedStudentTransfer}
        onTransferSuccess={handleTransferSuccess}
      />

      <SlipRefundModal
        open={isSlipOpen}
        onOpenChange={setIsSlipOpen}
        slipData={activeSlip}
      />
    </>
  )
}
export default RefundSiswaKeluarPage
