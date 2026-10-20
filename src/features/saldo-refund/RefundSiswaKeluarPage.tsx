import { useState, useEffect, useMemo } from 'react'
import {
  Banknote,
  ArrowLeftRight,
  CheckCircle2,
  Lock,
  Users,
  Eye,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { TableToolbar } from '@/components/data-table'
import { formatRupiah } from '@/lib/formatters'
import { MOCK_SISWA_NONAKTIF, type SiswaNonaktifMock } from '@/mocks/mock-data'
import { RefundOrangTuaModal } from './RefundOrangTuaModal'
import { PindahSaldoModal } from './PindahSaldoModal'
import { SlipRefundModal } from './SlipRefundModal'
import type { RefundSlipData } from './types'

export function RefundSiswaKeluarPage() {
  const [students, setStudents] = useState<SiswaNonaktifMock[]>(MOCK_SISWA_NONAKTIF)
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
        const res = await apiClient.get('/api/saldo/refund/kandidat', {
          params: { hanyaTidakAktif: true },
        })
        if (isMounted && res.data?.data && Array.isArray(res.data.data)) {
          setStudents(res.data.data)
        }
      } catch {
        // Fallback
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
      petugas_nama: 'Wibisana Bama (Petugas TU/Bendahara)',
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
        <div className='ms-auto flex items-center space-x-4'>
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        {/* Title Header */}
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>
            Refund Saldo Siswa Keluar / Lulus
          </h1>
        </div>

        {/* KPI Cards Ringkasan */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2'>
              <CardDescription className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Dana Titipan Mengendap
              </CardDescription>
              <CardTitle className='text-2xl font-bold font-mono text-amber-600 dark:text-amber-400'>
                {formatRupiah(totalDanaMengendap)}
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0 text-[11px] text-muted-foreground'>
              Kewajiban sekolah kepada siswa nonaktif
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2'>
              <CardDescription className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Menunggu Refund / Pindah
              </CardDescription>
              <CardTitle className='text-2xl font-bold text-foreground'>
                {pendingRefundCount} Siswa
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0 text-[11px] text-muted-foreground'>
              Siswa nonaktif dengan sisa saldo &gt; 0
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2'>
              <CardDescription className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Selesai Diproses
              </CardDescription>
              <CardTitle className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                {completedRefundCount} Siswa
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0 text-[11px] text-muted-foreground'>
              Saldo menjadi Rp 0 & RFID diblokir
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2'>
              <CardDescription className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Kartu RFID Diamankan
              </CardDescription>
              <CardTitle className='text-2xl font-bold text-foreground'>
                {completedRefundCount} Kartu
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0 text-[11px] text-muted-foreground'>
              Blokir instan otomatis server
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
                  <span>Menunggu Refund</span>
                  {pendingRefundCount > 0 && (
                    <Badge variant='secondary' className='ml-1 px-1.5 py-0 text-[10px]'>
                      {pendingRefundCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value='completed' className='text-xs gap-2'>
                  <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600' />
                  <span>Riwayat Selesai</span>
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
            <Card>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow className='bg-muted/50 text-xs'>
                        <TableHead className='w-[240px]'>Data Siswa Nonaktif</TableHead>
                        <TableHead>Status Akademik</TableHead>
                        <TableHead>Orang Tua / Kontak</TableHead>
                        <TableHead>Kartu RFID</TableHead>
                        <TableHead>Saudara Aktif</TableHead>
                        <TableHead className='text-right font-semibold'>Sisa Saldo</TableHead>
                        <TableHead className='text-right w-[250px]'>Aksi Proses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-xs'>
                            <CheckCircle2 className='h-8 w-8 text-emerald-500 mx-auto mb-2' />
                            Tidak ada sisa saldo siswa nonaktif yang tertahan. Seluruh kewajiban telah selesai!
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingStudents.map((siswa) => {
                          const hasSibling =
                            siswa.saudara_kandung && siswa.saudara_kandung.length > 0
                          const firstSibling = hasSibling ? siswa.saudara_kandung![0] : null

                          return (
                            <TableRow key={siswa.siswa_id} className='text-xs hover:bg-muted/40'>
                              {/* Siswa */}
                              <TableCell>
                                <div className='flex items-center gap-3'>
                                  <img
                                    src={siswa.foto_url}
                                    alt={siswa.nama}
                                    className='h-10 w-10 rounded-full object-cover border'
                                  />
                                  <div>
                                    <p className='font-bold text-foreground'>
                                      {siswa.nama}
                                    </p>
                                    <p className='text-muted-foreground font-mono text-[11px]'>
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
                                      ? 'border-0 bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[11px] font-medium'
                                      : siswa.status_siswa === 'PINDAH'
                                      ? 'border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[11px] font-medium'
                                      : 'border-0 bg-destructive/15 text-destructive text-[11px] font-medium'
                                  }
                                >
                                  {siswa.status_siswa}
                                </Badge>
                                <p className='text-[10px] text-muted-foreground mt-1'>
                                  Tgl: {siswa.tanggal_nonaktif}
                                </p>
                              </TableCell>

                              {/* Orang Tua / Kontak */}
                              <TableCell>
                                <p className='font-medium text-foreground'>
                                  {siswa.nama_ortu}
                                </p>
                                <p className='text-muted-foreground font-mono text-[11px]'>
                                  {siswa.kontak_ortu}
                                </p>
                                {siswa.bank_ortu && (
                                  <p className='text-[10px] text-muted-foreground font-mono'>
                                    {siswa.bank_ortu}: {siswa.no_rekening_ortu}
                                  </p>
                                )}
                              </TableCell>

                              {/* Status Kartu RFID */}
                              <TableCell>
                                <div className='space-y-1 font-mono text-[11px]'>
                                  <div className='flex items-center gap-1.5'>
                                    <code className='bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]'>
                                      {siswa.rfid_uid}
                                    </code>
                                  </div>
                                  <Badge
                                    variant='outline'
                                    className='border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-medium py-0'
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
                                    <p className='text-[10px] text-muted-foreground font-mono'>
                                      NIS: {firstSibling.nis} ({firstSibling.kelas})
                                    </p>
                                    <span className='inline-block text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium'>
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
                                <span className='text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400'>
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
                                    <span>Refund Ortu</span>
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
                                    <span>Pindah Saudara</span>
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
            <Card>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow className='bg-muted/50 text-xs'>
                        <TableHead>Siswa Nonaktif</TableHead>
                        <TableHead>Jenis Penyelesaian</TableHead>
                        <TableHead>Nominal Diselesaikan</TableHead>
                        <TableHead>Status Kartu RFID</TableHead>
                        <TableHead>Keterangan / Penerima</TableHead>
                        <TableHead className='text-right'>Struk Bukti</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-xs'>
                            Belum ada riwayat transaksi refund atau pemindahan saldo yang diproses.
                          </TableCell>
                        </TableRow>
                      ) : (
                        completedStudents.map((siswa) => {
                          const info = siswa.refund_info
                          const isTrf = info?.tipe === 'TRANSFER_SAUDARA'

                          return (
                            <TableRow key={siswa.siswa_id} className='text-xs hover:bg-muted/40'>
                              <TableCell>
                                <div className='flex items-center gap-2.5'>
                                  <img
                                    src={siswa.foto_url}
                                    alt={siswa.nama}
                                    className='h-9 w-9 rounded-full object-cover border'
                                  />
                                  <div>
                                    <p className='font-semibold text-foreground'>
                                      {siswa.nama}
                                    </p>
                                    <p className='text-muted-foreground font-mono text-[11px]'>
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
                                      ? 'border-0 bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[11px] font-medium'
                                      : 'border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium'
                                  }
                                >
                                  {isTrf ? 'Pindah ke Saudara' : `Refund (${info?.metode || 'Tunai'})`}
                                </Badge>
                                <p className='text-[10px] text-muted-foreground font-mono mt-1'>
                                  Ref: {info?.referensi_id || '-'}
                                </p>
                              </TableCell>

                              <TableCell>
                                <div className='font-mono font-bold text-foreground'>
                                  {formatRupiah(info?.nominal || 0)}
                                </div>
                                <span className='text-[10px] text-muted-foreground'>
                                  Sisa saldo saat ini: Rp 0
                                </span>
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant='outline'
                                  className='border-0 bg-destructive/15 text-destructive text-[10px] font-medium py-0 px-2 gap-1'
                                >
                                  <Lock className='h-2.5 w-2.5' /> DIBLOKIR PERMANEN
                                </Badge>
                                <p className='text-[10px] font-mono text-muted-foreground mt-0.5'>
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
