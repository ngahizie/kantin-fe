import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search,
  Download,
  User,
  Phone,
  FileText,
  Building2,
  Printer,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { formatRupiah, formatDateTime } from '@/lib/formatters'
import { exportTableToExcel } from '@/lib/excelExport'
import { laporanApi } from './api/laporan-api'
import type {
  ProfilSiswaRiwayat,
  RiwayatBelanjaSiswaItem,
  SiswaSaldoDetail,
} from './types'

export function LaporanRiwayatSiswaPage() {
  const [siswaList, setSiswaList] = useState<SiswaSaldoDetail[]>([])
  const [selectedSiswaId, setSelectedSiswaId] = useState<number | null>(null)
  const [searchStudentQuery, setSearchStudentQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const [profil, setProfil] = useState<ProfilSiswaRiwayat | null>(null)
  const [riwayat, setRiwayat] = useState<RiwayatBelanjaSiswaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchFilter, setSearchFilter] = useState('')
  const [jenisFilter, setJenisFilter] = useState<string>('ALL')

  // Modal Struk Digital
  const [selectedTrxForReceipt, setSelectedTrxForReceipt] =
    useState<RiwayatBelanjaSiswaItem | null>(null)

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false)
        const currentStudent = siswaList.find((s) => s.siswaId === selectedSiswaId)
        if (currentStudent) {
          setSearchStudentQuery(
            `${currentStudent.nis} - ${currentStudent.nama} (${currentStudent.kelas})`
          )
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [siswaList, selectedSiswaId])

  // Load daftar siswa terlebih dahulu
  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const list = await laporanApi.getSiswaSaldoList()
        if (!isMounted) return
        setSiswaList(list)

        const searchParams = new URLSearchParams(window.location.search)
        const paramId = searchParams.get('siswaId')
        const initialId = paramId
          ? Number(paramId)
          : list.length > 0
          ? list[0].siswaId
          : null

        if (initialId) {
          setSelectedSiswaId(initialId)
          const initialStudent =
            list.find((s) => s.siswaId === initialId) || list[0]
          if (initialStudent) {
            setSearchStudentQuery(
              `${initialStudent.nis} - ${initialStudent.nama} (${initialStudent.kelas})`
            )
          }
        } else {
          setIsLoading(false)
        }
      } catch (_err: unknown) {
        if (!isMounted) return
        toast.error('Gagal Memuat Daftar Siswa')
        setIsLoading(false)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  // Filter pencarian siswa di search box
  const filteredStudents = useMemo(() => {
    if (!searchStudentQuery.trim()) return siswaList
    const q = searchStudentQuery.toLowerCase().trim()
    return siswaList.filter((s) => {
      const matchNis = s.nis.toLowerCase().includes(q)
      const matchNisn = s.nisn ? s.nisn.toLowerCase().includes(q) : false
      const matchNama = s.nama.toLowerCase().includes(q)
      const matchKelas = s.kelas.toLowerCase().includes(q)
      return matchNis || matchNisn || matchNama || matchKelas
    })
  }, [siswaList, searchStudentQuery])

  const handleSelectStudent = (s: SiswaSaldoDetail) => {
    setSelectedSiswaId(s.siswaId)
    setSearchStudentQuery(`${s.nis} - ${s.nama} (${s.kelas})`)
    setIsDropdownOpen(false)
  }

  useEffect(() => {
    if (!selectedSiswaId) return
    let isMounted = true
    const fetchRiwayat = async (id: number) => {
      setIsLoading(true)
      try {
        const res = await laporanApi.getRiwayatBelanjaSiswa(id)
        if (!isMounted) return
        const currentStudent = siswaList.find((s) => s.siswaId === id)
        const profilData: ProfilSiswaRiwayat = {
          ...res.profil,
          nis: res.profil.nis && res.profil.nis !== '-' ? res.profil.nis : (currentStudent?.nis || '-'),
          nama: res.profil.nama && res.profil.nama !== 'Siswa' ? res.profil.nama : (currentStudent?.nama || 'Siswa'),
          kelas: res.profil.kelas && res.profil.kelas !== '-' ? res.profil.kelas : (currentStudent?.kelas || '-'),
          saldo: res.profil.saldo ?? (currentStudent?.saldo || 0),
          limitHarian: res.profil.limitHarian ?? (currentStudent?.limitHarian || 0),
          isBlocked: res.profil.isBlocked ?? (currentStudent?.isBlocked || false),
          parentName: res.profil.parentName && res.profil.parentName !== '-' ? res.profil.parentName : (currentStudent?.parentName || '-'),
          parentPhone: res.profil.parentPhone && res.profil.parentPhone !== '-' ? res.profil.parentPhone : (currentStudent?.parentPhone || '-'),
        }
        setProfil(profilData)
        setRiwayat(res.riwayat || [])
      } catch (err: unknown) {
        if (!isMounted) return
        const isNotFound =
          (err as { response?: { status?: number } })?.response?.status === 404 ||
          (err as { status?: number })?.status === 404 ||
          (err instanceof Error && err.message?.includes('404'))

        if (isNotFound) {
          const currentStudent = siswaList.find((s) => s.siswaId === id)
          setProfil({
            siswaId: id,
            nis: currentStudent?.nis || '-',
            nama: currentStudent?.nama || 'Siswa',
            kelas: currentStudent?.kelas || '-',
            saldo: currentStudent?.saldo || 0,
            belanjaHariIni: currentStudent?.belanjaHariIni || 0,
            limitHarian: currentStudent?.limitHarian || 0,
            isBlocked: currentStudent?.isBlocked || false,
            parentName: currentStudent?.parentName || '-',
            parentPhone: currentStudent?.parentPhone || '-',
          })
          setRiwayat([])
        } else {
          const msg = err instanceof Error ? err.message : 'Gagal memuat riwayat siswa'
          toast.error('Gagal Memuat Riwayat', { description: msg })
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void fetchRiwayat(selectedSiswaId)
    return () => {
      isMounted = false
    }
  }, [selectedSiswaId, siswaList])

  // Filter riwayat
  const filteredRiwayat = useMemo(() => {
    return riwayat.filter((trx) => {
      if (jenisFilter !== 'ALL' && trx.jenis !== jenisFilter) {
        return false
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase()
        const matchKeterangan = trx.keterangan.toLowerCase().includes(q)
        const matchRef = trx.referensiId.toLowerCase().includes(q)
        const matchKasir = trx.titikKasir.toLowerCase().includes(q)
        const matchItems =
          trx.items?.some((i) => i.nama.toLowerCase().includes(q)) || false
        return matchKeterangan || matchRef || matchKasir || matchItems
      }
      return true
    })
  }, [riwayat, jenisFilter, searchFilter])

  // Ekspor Excel Rekening Koran Siswa
  const handleExportExcel = () => {
    if (!profil) {
      toast.error('Data profil siswa belum siap')
      return
    }

    if (filteredRiwayat.length === 0) {
      toast.info('Tidak ada riwayat transaksi untuk diekspor')
      return
    }

    try {
      const exportRows = filteredRiwayat.map((trx) => {
        const itemStr =
          trx.items && trx.items.length > 0
            ? trx.items.map((i) => `${i.qty}x ${i.nama}`).join(', ')
            : '-'

        return {
          waktu: formatDateTime(trx.waktu),
          referensiId: trx.referensiId,
          jenis: trx.jenis,
          titikKasir: trx.titikKasir,
          petugas: trx.petugas,
          daftarItem: itemStr,
          keterangan: trx.keterangan,
          arah: trx.arah,
          nominal: trx.arah === 'DEBIT' ? -trx.nominal : trx.nominal,
          saldoSetelah: trx.saldoSetelah,
        }
      })

      exportTableToExcel({
        filename: `Rekening_Koran_${profil.nis}_${profil.nama.replace(/\s+/g, '_')}`,
        sheetName: 'Riwayat Transaksi',
        title: `REKENING KORAN & HISTORI TRANSAKSI SISWA - ${profil.nama.toUpperCase()}`,
        metadata: {
          'NIS': profil.nis,
          'Kelas': profil.kelas,
          'Nama Wali Murid': profil.parentName,
          'Kontak Wali': profil.parentPhone,
          'Saldo Berjalan Saat Ini': formatRupiah(profil.saldo),
          'Limit Harian': formatRupiah(profil.limitHarian),
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
        },
        columns: [
          { header: 'Waktu Transaksi', key: 'waktu', width: 22 },
          { header: 'No. Bukti / Referensi', key: 'referensiId', width: 22 },
          { header: 'Jenis Mutasi', key: 'jenis', width: 14 },
          { header: 'Titik Kasir / Loket', key: 'titikKasir', width: 22 },
          { header: 'Petugas', key: 'petugas', width: 18 },
          { header: 'Menu / Item yang Dibeli', key: 'daftarItem', width: 35 },
          { header: 'Keterangan', key: 'keterangan', width: 30 },
          { header: 'Arah', key: 'arah', width: 10 },
          { header: 'Nominal (Rp)', key: 'nominal', width: 16 },
          { header: 'Saldo Akhir (Rp)', key: 'saldoSetelah', width: 16 },
        ],
        data: exportRows,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: `Rekening koran siswa ${profil.nama} (.xlsx) berhasil diunduh.`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas Excel'
      toast.error('Gagal Ekspor', { description: msg })
    }
  }

  const handlePrintReceipt = () => {
    if (!selectedTrxForReceipt || !profil) return

    const itemsHtml = selectedTrxForReceipt.items && selectedTrxForReceipt.items.length > 0
      ? selectedTrxForReceipt.items.map((it) => `
          <tr>
            <td style="font-weight: bold; width: 28px; padding: 3px 0; vertical-align: top;">${it.qty}x</td>
            <td style="padding: 3px 0; vertical-align: top;">${it.nama}</td>
            <td style="text-align: right; font-weight: bold; white-space: nowrap; padding: 3px 0; vertical-align: top;">${formatRupiah(it.subtotal)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="3" style="padding: 6px 0; color: #555; font-style: italic;">${selectedTrxForReceipt.keterangan || 'Transaksi Kantin'}</td></tr>`

    const receiptHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Struk Transaksi - ${selectedTrxForReceipt.referensiId}</title>
  <style>
    @page {
      margin: 6mm auto;
      size: 80mm auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Courier New', Courier, monospace, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      width: 72mm;
      margin: 0 auto;
      padding: 2mm 0;
    }
    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 1px dashed #000;
    }
    .store-name {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sub-title {
      font-size: 9px;
      color: #333;
      margin-top: 2px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .ref-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: bold;
      border: 1px solid #000;
      border-radius: 4px;
      background: #f8fafc;
    }
    .info-section {
      padding: 8px 0;
      border-bottom: 1px dashed #000;
      font-size: 11px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .info-label {
      color: #444;
    }
    .info-value {
      font-weight: bold;
      text-align: right;
    }
    .student-box {
      border: 1px solid #000;
      border-radius: 4px;
      padding: 6px 8px;
      margin: 8px 0;
      background: #fafafa;
    }
    .student-title {
      font-size: 9px;
      color: #555;
      text-transform: uppercase;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .order-section {
      padding: 8px 0;
    }
    .order-title {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .total-box {
      padding-top: 8px;
      border-top: 2px solid #000;
      margin-top: 6px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: bold;
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #333;
      margin-top: 4px;
    }
    .footer {
      text-align: center;
      padding-top: 8px;
      border-top: 1px dashed #000;
      margin-top: 8px;
      font-size: 9px;
      color: #444;
      line-height: 1.3;
    }
    .footer-brand {
      margin-top: 4px;
      font-weight: bold;
      letter-spacing: 1px;
      color: #222;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">SKOOLIA CANTEEN</div>
    <div class="sub-title">STRUK TRANSAKSI DIGITAL KASIR</div>
    <div>
      <div style="font-size: 8px; color: #666; margin-top: 4px;">NO. REFERENSI TRANSAKSI:</div>
      <div class="ref-badge">${selectedTrxForReceipt.referensiId}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Waktu:</span>
      <span class="info-value">${formatDateTime(selectedTrxForReceipt.waktu)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Titik Kasir:</span>
      <span class="info-value">${selectedTrxForReceipt.titikKasir}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Petugas:</span>
      <span class="info-value">${selectedTrxForReceipt.petugas}</span>
    </div>
  </div>

  <div class="student-box">
    <div class="student-title">Identitas Siswa:</div>
    <div class="info-row" style="margin-bottom: 2px;">
      <span style="font-weight: bold; font-size: 11px;">${profil.nama}</span>
      <span style="font-size: 10px; color: #333;">NIS: ${profil.nis}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Kelas:</span>
      <span style="font-weight: bold;">${profil.kelas}</span>
    </div>
  </div>

  <div class="order-section">
    <div class="order-title">Daftar Pesanan:</div>
    <table class="items-table">
      ${itemsHtml}
    </table>
  </div>

  <div class="total-box">
    <div class="total-row">
      <span>TOTAL POTONG SALDO:</span>
      <span>${formatRupiah(selectedTrxForReceipt.nominal)}</span>
    </div>
    <div class="balance-row">
      <span>Sisa Saldo Kartu:</span>
      <span style="font-weight: bold;">${formatRupiah(selectedTrxForReceipt.saldoSetelah)}</span>
    </div>
  </div>

  <div class="footer">
    <p>Simpan bukti ini sebagai bukti transaksi resmi kantin sekolah.</p>
    <p class="footer-brand">*** SKOOLIA CASHLESS CANTEEN ***</p>
  </div>
</body>
</html>`

    const existingFrame = document.getElementById('receipt-print-iframe')
    if (existingFrame) {
      existingFrame.remove()
    }

    const iframe = document.createElement('iframe')
    iframe.id = 'receipt-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(receiptHtml)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        iframe.remove()
      }, 3000)
    }, 250)
  }

  return (
    <>
      <Header fixed>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Laporan Keuangan
            </span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-medium">Riwayat Belanja per Siswa</span>
          </div>
          <div className="flex items-center gap-2">
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      <Main>
        <div className="space-y-6 pb-12">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Riwayat Belanja per Siswa
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box Siswa (NIS/NISN/Nama) */}
              <div ref={searchContainerRef} className="relative w-72 sm:w-80">
                <Search className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Cari NIS, NISN, atau Nama Siswa..."
                  value={searchStudentQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchStudentQuery(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    setIsDropdownOpen(true)
                    e.target.select()
                  }}
                  className="pl-8 pr-8 text-xs h-9 border-0 bg-background/80 dark:bg-background/40 shadow-none"
                />
                {searchStudentQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchStudentQuery('')
                      setIsDropdownOpen(true)
                    }}
                    className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5"
                    title="Kosongkan pencarian"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Dropdown Hasil Pencarian Siswa */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border-0 bg-popover text-popover-foreground shadow-lg">
                    {filteredStudents.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        Siswa tidak ditemukan.
                      </div>
                    ) : (
                      <div className="p-1">
                        {filteredStudents.map((s) => (
                          <button
                            key={s.siswaId}
                            type="button"
                            onClick={() => handleSelectStudent(s)}
                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground ${
                              selectedSiswaId === s.siswaId
                                ? 'bg-accent/80 font-semibold'
                                : ''
                            }`}
                          >
                            <div>
                              <p className="font-medium text-foreground">
                                {s.nama}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                NIS: {s.nis} {s.nisn ? `• NISN: ${s.nisn}` : ''} • {s.kelas}
                              </p>
                            </div>
                            <Badge variant="secondary" className="border-0 text-[10px]">
                              {s.kelas}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={handleExportExcel}
                disabled={isLoading || !profil}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>
            </div>
          </div>

          {/* STUDENT PROFILE CARD */}
          {profil && (
            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-bold border-0">
                      {profil.nama
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight">
                          {profil.nama}
                        </h2>
                        <Badge variant="secondary" className="border-0 font-mono text-xs bg-background/80 dark:bg-background/40">
                          NIS: {profil.nis}
                        </Badge>
                        <Badge className="border-0 bg-primary/20 text-primary hover:bg-primary/20 text-xs">
                          {profil.kelas}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Wali: <strong className="text-foreground">{profil.parentName}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {profil.parentPhone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-4 md:pt-0">
                    <div className="rounded-xl border-0 bg-background/80 dark:bg-background/40 px-4 py-2.5 text-center shadow-none">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        Saldo Berjalan
                      </p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        {formatRupiah(profil.saldo)}
                      </p>
                    </div>

                    <div className="rounded-xl border-0 bg-background/80 dark:bg-background/40 px-4 py-2.5 text-center shadow-none">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        Belanja Hari Ini
                      </p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        {formatRupiah(profil.belanjaHariIni)}
                      </p>
                    </div>

                    <div className="rounded-xl border-0 bg-background/80 dark:bg-background/40 px-4 py-2.5 text-center shadow-none">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        Limit Harian
                      </p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        {formatRupiah(profil.limitHarian)}
                      </p>
                    </div>
                  </div>
                </div>

                {profil.catatanKontrol && (
                  <div className="mt-4 rounded-lg bg-background/80 dark:bg-background/40 p-3 text-xs text-foreground/85 border-0">
                    <span>
                      <strong className="text-foreground">Catatan Ortu:</strong> {profil.catatanKontrol}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TABLE RIWAYAT TRANSAKSI SISWA */}
          <Card className="border-0 bg-muted/70 dark:bg-muted/30">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Histori Transaksi Lengkap Siswa
                </CardTitle>
                <CardDescription>
                  Daftar transaksi kasir, top-up, pembatalan void, dan mutasi saldo untuk menjawab pertanyaan orang tua.
                </CardDescription>
              </div>

              <TableToolbar
                searchPlaceholder="Cari transaksi / menu..."
                searchValue={searchFilter}
                onSearchChange={setSearchFilter}
                filters={[
                  {
                    title: 'Mutasi',
                    options: [
                      { label: 'Belanja Kasir', value: 'BELANJA' },
                      { label: 'Top-up Tunai TU', value: 'TOPUP_TUNAI' },
                      { label: 'Koreksi Bendahara', value: 'KOREKSI' },
                      { label: 'Void Pembatalan', value: 'VOID' },
                    ],
                    selectedValues: jenisFilter !== 'ALL' ? [jenisFilter] : [],
                    onSelect: (vals) => setJenisFilter(vals[0] || 'ALL'),
                    isSingleSelect: true,
                  },
                ]}
                isFiltered={Boolean(searchFilter || jenisFilter !== 'ALL')}
                onReset={() => {
                  setSearchFilter('')
                  setJenisFilter('ALL')
                }}
              />
            </CardHeader>

            <CardContent>
              <div className="overflow-hidden rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Waktu & Tanggal</TableHead>
                      <TableHead>No. Referensi</TableHead>
                      <TableHead className="text-center">Jenis</TableHead>
                      <TableHead>Titik Kasir & Petugas</TableHead>
                      <TableHead>Rincian Menu / Deskripsi</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="text-right">Saldo Sisa</TableHead>
                      <TableHead className="text-center">Struk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          Memuat histori transaksi siswa...
                        </TableCell>
                      </TableRow>
                    ) : filteredRiwayat.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                          {searchFilter || jenisFilter !== 'ALL'
                            ? 'Tidak ditemukan transaksi untuk kriteria pencarian ini.'
                            : 'Siswa ini belum memiliki histori transaksi atau saldo di kantin.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRiwayat.map((trx, idx) => (
                        <TableRow key={trx.id}>
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {formatDateTime(trx.waktu)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {trx.referensiId}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={`border-0 text-xs font-medium ${
                                trx.jenis === 'BELANJA'
                                  ? 'bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                                  : trx.jenis.startsWith('TOPUP')
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                  : trx.jenis === 'VOID'
                                  ? 'bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-red-400'
                                  : 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                              }`}
                            >
                              {trx.jenis}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">{trx.titikKasir}</div>
                            <div className="text-[11px] text-muted-foreground">{trx.petugas}</div>
                          </TableCell>
                          <TableCell className="text-xs max-w-xs">
                            {trx.items && trx.items.length > 0 ? (
                              <div className="space-y-0.5">
                                {trx.items.map((it, iIdx) => (
                                  <div key={iIdx} className="flex justify-between gap-2">
                                    <span className="font-medium">
                                      {it.qty}x {it.nama}
                                    </span>
                                    <span className="text-muted-foreground font-mono">
                                      {formatRupiah(it.subtotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">{trx.keterangan}</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-bold text-sm ${
                              trx.arah === 'DEBIT' ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {trx.arah === 'DEBIT' ? `− ${formatRupiah(trx.nominal)}` : `+ ${formatRupiah(trx.nominal)}`}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-primary">
                            {formatRupiah(trx.saldoSetelah)}
                          </TableCell>
                          <TableCell className="text-center">
                            {trx.items && trx.items.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTrxForReceipt(trx)}
                                className="h-8 text-xs gap-1"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Lihat</span>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
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

          {/* DIALOG STRUK DIGITAL KASIR (UNTUK JAWAB KOMPLAIN ORTU) */}
          <Dialog
            open={!!selectedTrxForReceipt}
            onOpenChange={(open) => !open && setSelectedTrxForReceipt(null)}
          >
            <DialogContent
              className="sm:max-w-md font-sans border-0 border-none shadow-2xl p-0 overflow-hidden"
              style={{ border: 'none' }}
            >
              <div className="p-5 space-y-4 bg-muted/30">
                {/* Modal Title Bar (Screen Only) */}
                <DialogHeader className="no-print">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <DialogTitle className="font-bold text-sm text-foreground">
                        Struk Transaksi Digital
                      </DialogTitle>
                      <DialogDescription className="text-[11px] text-muted-foreground">
                        Bukti Transaksi Resmi Kasir Kantin
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* The Authentic Thermal Receipt Card (Screen & Print) */}
                {selectedTrxForReceipt && profil && (
                  <div className="printable-slip w-full rounded-xl border-0 bg-white p-5 font-mono text-xs text-slate-900 shadow-none">
                    {/* Header Nota */}
                    <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm font-bold tracking-tight text-slate-900 uppercase">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        <span>SKOOLIA CANTEEN</span>
                      </div>
                      <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                        STRUK TRANSAKSI DIGITAL KASIR
                      </p>

                      {/* Nomor Referensi */}
                      <div className="pt-1.5">
                        <span className="block font-sans text-[9px] text-slate-400 uppercase tracking-wide">
                          No. Referensi Transaksi
                        </span>
                        <span className="mt-0.5 inline-block rounded border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wide text-slate-900">
                          {selectedTrxForReceipt.referensiId}
                        </span>
                      </div>
                    </div>

                    {/* Informasi Waktu & Kasir */}
                    <div className="space-y-1.5 pt-2.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Waktu:</span>
                        <span className="font-semibold text-slate-900">{formatDateTime(selectedTrxForReceipt.waktu)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Titik Kasir:</span>
                        <span className="font-medium text-slate-800">{selectedTrxForReceipt.titikKasir}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Petugas:</span>
                        <span className="font-medium text-slate-800">{selectedTrxForReceipt.petugas}</span>
                      </div>
                    </div>

                    <div className="my-2.5 border-b border-dashed border-slate-300" />

                    {/* Identitas Siswa */}
                    <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
                      <div className="font-sans text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                        Identitas Siswa:
                      </div>
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{profil.nama}</span>
                        <span className="text-[11px] font-semibold text-slate-600 font-mono">NIS: {profil.nis}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Kelas:</span>
                        <span className="font-medium text-slate-700">{profil.kelas}</span>
                      </div>
                    </div>

                    <div className="my-2.5 border-b border-dashed border-slate-300" />

                    {/* Rincian Pesanan Menu */}
                    <div className="space-y-2 pt-0.5">
                      <div className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Daftar Pesanan:
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {selectedTrxForReceipt.items && selectedTrxForReceipt.items.length > 0 ? (
                          selectedTrxForReceipt.items.map((it, idx) => (
                            <div key={idx} className="flex items-start justify-between">
                              <div className="pr-2">
                                <span className="font-semibold text-slate-900">{it.qty}x</span>{' '}
                                <span className="text-slate-800">{it.nama}</span>
                              </div>
                              <span className="shrink-0 font-semibold text-slate-900 font-mono">
                                {formatRupiah(it.subtotal)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-500 italic text-xs">
                            {selectedTrxForReceipt.keterangan || 'Transaksi Kantin'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Potong Saldo & Sisa Saldo */}
                    <div className="mt-3 space-y-1.5 border-t-2 border-slate-900 pt-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>TOTAL POTONG SALDO:</span>
                        <span className="text-sm font-bold text-slate-900 font-mono">
                          {formatRupiah(selectedTrxForReceipt.nominal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                        <span className="text-slate-500">Sisa Saldo Kartu:</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {formatRupiah(selectedTrxForReceipt.saldoSetelah)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Struk */}
                    <div className="mt-3.5 space-y-1 border-t border-dashed border-slate-300 pt-3 text-center">
                      <p className="font-sans text-[10px] text-slate-500 leading-tight">
                        Simpan bukti ini sebagai bukti transaksi resmi kantin sekolah.
                      </p>
                      <p className="font-mono text-[9px] font-bold tracking-widest text-slate-400 uppercase pt-0.5">
                        *** SKOOLIA CASHLESS CANTEEN ***
                      </p>
                    </div>
                  </div>
                )}

                {/* Tombol Aksi (Screen Only) */}
                <div className="no-print flex justify-end gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedTrxForReceipt(null)}
                    className="border-0"
                  >
                    Tutup
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePrintReceipt}
                    className="gap-1.5"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Cetak Struk</span>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  )
}
