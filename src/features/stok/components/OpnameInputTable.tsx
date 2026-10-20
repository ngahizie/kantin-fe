import { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Send,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { stokApi } from '../api/stok-api'
import {
  KATEGORI_ALASAN_OPNAME,
  type OpnameRowState,
  type OpnameBatchRequest,
} from '../types'
import type { MenuItem, KategoriItem } from '@/features/katalog/types'

interface OpnameInputTableProps {
  menuList: MenuItem[]
  kategoriList: KategoriItem[]
  hppMap: Record<number, number>
  isLoading?: boolean
  onSuccess: () => void
}

interface UserInputState {
  qtyFisik: number | ''
  alasan: string
  keterangan: string
  rusak: boolean
}

export function OpnameInputTable({
  menuList,
  kategoriList,
  hppMap,
  isLoading = false,
  onSuccess,
}: OpnameInputTableProps) {
  // Local input overrides keyed by menuId
  const [inputs, setInputs] = useState<Record<number, UserInputState>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL')
  const [filterSelisih, setFilterSelisih] = useState<
    'ALL' | 'SELISIH' | 'SESUAI' | 'BELUM_DIISI'
  >('ALL')

  // Modal konfirmasi batch
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [referensiId, setReferensiId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derive rows on each render without cascading effects
  const rows = useMemo<Record<number, OpnameRowState>>(() => {
    const map: Record<number, OpnameRowState> = {}
    menuList.forEach((m) => {
      const input = inputs[m.id]
      const hpp = hppMap[m.id] || Math.round(m.hargaJual * 0.7)
      const kategori = kategoriList.find((k) => k.id === m.kategoriId)
      const qtyFisik = input !== undefined ? input.qtyFisik : ''
      const selisih =
        typeof qtyFisik === 'number' ? qtyFisik - m.stokBerjalan : 0
      const nilaiSelisih = Math.abs(selisih) * hpp

      map[m.id] = {
        menuId: m.id,
        nama: m.nama,
        kategoriNama: kategori?.nama || 'Tanpa Kategori',
        satuan: m.satuan || 'PCS',
        stokSistem: m.stokBerjalan,
        hpp,
        hargaJual: m.hargaJual,
        qtyFisik,
        selisih,
        nilaiSelisih,
        alasan: input?.alasan || '',
        keterangan: input?.keterangan || '',
        rusak: input?.rusak || false,
      }
    })
    return map
  }, [menuList, kategoriList, hppMap, inputs])

  const handleQtyFisikChange = (menuId: number, val: string) => {
    setInputs((prev) => {
      const current = prev[menuId] || {
        qtyFisik: '',
        alasan: '',
        keterangan: '',
        rusak: false,
      }
      const qtyFisik = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0)
      return {
        ...prev,
        [menuId]: {
          ...current,
          qtyFisik,
        },
      }
    })
  }

  const handleAlasanChange = (menuId: number, alasanVal: string) => {
    const preset = KATEGORI_ALASAN_OPNAME.find((a) => a.value === alasanVal)
    setInputs((prev) => {
      const current = prev[menuId] || {
        qtyFisik: '',
        alasan: '',
        keterangan: '',
        rusak: false,
      }
      return {
        ...prev,
        [menuId]: {
          ...current,
          alasan: alasanVal,
          rusak: preset ? preset.isRusak : false,
        },
      }
    })
  }

  const handleKeteranganChange = (menuId: number, text: string) => {
    setInputs((prev) => {
      const current = prev[menuId] || {
        qtyFisik: '',
        alasan: '',
        keterangan: '',
        rusak: false,
      }
      return {
        ...prev,
        [menuId]: {
          ...current,
          keterangan: text,
        },
      }
    })
  }

  // Shortcuts
  const handleIsiSemuaSesuaiSistem = () => {
    setInputs((prev) => {
      const next = { ...prev }
      menuList.forEach((m) => {
        const cur = next[m.id]
        if (!cur || cur.qtyFisik === '') {
          next[m.id] = {
            qtyFisik: m.stokBerjalan,
            alasan: '',
            keterangan: '',
            rusak: false,
          }
        }
      })
      return next
    })
    toast.success('Stok fisik yang kosong telah diisi sesuai stok sistem')
  }

  const handleResetSemua = () => {
    setInputs({})
    toast.info('Perhitungan fisik telah direset')
  }

  // Filtered rows for display
  const displayedRows = useMemo(() => {
    return Object.values(rows).filter((r) => {
      // Search query
      if (
        searchQuery &&
        !r.nama.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.kategoriNama?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Kategori
      if (selectedKategori !== 'ALL') {
        const menu = menuList.find((m) => m.id === r.menuId)
        if (menu && String(menu.kategoriId) !== selectedKategori) {
          return false
        }
      }

      // Filter selisih
      if (filterSelisih === 'SELISIH') {
        return typeof r.qtyFisik === 'number' && r.selisih !== 0
      }
      if (filterSelisih === 'SESUAI') {
        return typeof r.qtyFisik === 'number' && r.selisih === 0
      }
      if (filterSelisih === 'BELUM_DIISI') {
        return r.qtyFisik === ''
      }

      return true
    })
  }, [rows, searchQuery, selectedKategori, filterSelisih, menuList])

  // Summary metrics across ALL rows
  const summary = useMemo(() => {
    const all = Object.values(rows)
    const dihitung = all.filter((r) => typeof r.qtyFisik === 'number')
    const berselisih = dihitung.filter((r) => r.selisih !== 0)
    const selisihKurang = berselisih.filter((r) => r.selisih < 0)
    const selisihLebih = berselisih.filter((r) => r.selisih > 0)

    // Total kerugian = nilai dari selisih yang kurang (stok hilang/rusak)
    const totalKerugian = selisihKurang.reduce(
      (sum, r) => sum + r.nilaiSelisih,
      0
    )
    const totalKelebihan = selisihLebih.reduce(
      (sum, r) => sum + r.nilaiSelisih,
      0
    )

    // Missing reason check (DoD requirement: form blocks submit if alasan is missing)
    const berselisihTanpaAlasan = berselisih.filter((r) => !r.alasan.trim())

    return {
      totalItem: all.length,
      totalDihitung: dihitung.length,
      totalBerselisih: berselisih.length,
      totalSelisihKurang: selisihKurang.length,
      totalSelisihLebih: selisihLebih.length,
      totalKerugian,
      totalKelebihan,
      berselisihTanpaAlasan,
      isSiapSubmit: dihitung.length > 0 && berselisihTanpaAlasan.length === 0,
    }
  }, [rows])

  const handleOpenConfirm = () => {
    if (summary.totalDihitung === 0) {
      toast.warning('Belum ada item yang dihitung fisik')
      return
    }

    if (summary.berselisihTanpaAlasan.length > 0) {
      toast.error(
        `Ada ${summary.berselisihTanpaAlasan.length} item berselisih yang belum memiliki alasan!`,
        {
          description:
            'Setiap selisih stok wajib mencantumkan alasan penyebab selisih.',
        }
      )
      return
    }

    // Generate Berita Acara Reference
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const rnd = Math.floor(1000 + Math.random() * 9000)
    setReferensiId(`OPN-${yyyy}${mm}${dd}-${rnd}`)
    setIsConfirmOpen(true)
  }

  const handleSubmitBatch = async () => {
    if (!referensiId.trim()) {
      toast.error('Nomor Berita Acara / Referensi wajib diisi')
      return
    }

    // Only submit items that have been counted
    const itemsToSubmit = Object.values(rows)
      .filter((r) => typeof r.qtyFisik === 'number')
      .map((r) => {
        let alasanFinal = r.alasan
        if (r.keterangan.trim()) {
          alasanFinal = `${r.alasan}: ${r.keterangan.trim()}`
        }
        if (r.selisih === 0) {
          alasanFinal = 'Audit fisik sesuai sistem'
        }

        return {
          menuId: r.menuId,
          qtyFisik: r.qtyFisik as number,
          alasan: alasanFinal,
          rusak: r.rusak,
        }
      })

    setIsSubmitting(true)
    try {
      const payload: OpnameBatchRequest = {
        referensiId: referensiId.trim(),
        items: itemsToSubmit,
      }

      const res = await stokApi.sesuaikanOpnameBatch(payload)
      toast.success('Stok Opname Berhasil Disimpan!', {
        description: `Berita Acara ${res.referensiId}: ${res.jumlahBerubah} item disesuaikan, ${res.jumlahTanpaSelisih} item sesuai.`,
      })

      setIsConfirmOpen(false)
      onSuccess()
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Gagal menyimpan stok opname'
      toast.error('Gagal Menyimpan Opname', { description: errMsg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-muted/70 dark:bg-muted/30 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              Progress Audit Fisik
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {summary.totalDihitung} / {summary.totalItem}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {summary.totalItem - summary.totalDihitung} item belum dihitung
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-muted/70 dark:bg-muted/30 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              Total Item Berselisih
            </CardDescription>
            <CardTitle
              className={`text-2xl font-bold ${
                summary.totalBerselisih > 0
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            >
              {summary.totalBerselisih} item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="text-destructive font-medium">
                Kurang: {summary.totalSelisihKurang}
              </span>
              <span>•</span>
              <span className="text-emerald-500 font-medium">
                Lebih: {summary.totalSelisihLebih}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-muted/70 dark:bg-muted/30 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              Estimasi Nilai Kerugian
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive">
              Rp {summary.totalKerugian.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Akumulasi selisih kurang x HPP
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-muted/70 dark:bg-muted/30 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              Estimasi Nilai Kelebihan
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-500">
              Rp {summary.totalKelebihan.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Akumulasi selisih lebih x HPP
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar & Filters */}
      <Card className="border-0 bg-muted/60 dark:bg-muted/25 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm bg-background"
                />
              </div>

              <Select
                value={selectedKategori}
                onValueChange={setSelectedKategori}
              >
                <SelectTrigger className="h-9 w-[160px] text-xs bg-background">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  {kategoriList.map((k) => (
                    <SelectItem key={k.id} value={String(k.id)}>
                      {k.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterSelisih}
                onValueChange={(v) =>
                  setFilterSelisih(
                    v as 'ALL' | 'SELISIH' | 'SESUAI' | 'BELUM_DIISI'
                  )
                }
              >
                <SelectTrigger className="h-9 w-[150px] text-xs bg-background">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Status Hitung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Baris</SelectItem>
                  <SelectItem value="SELISIH">Hanya Berselisih</SelectItem>
                  <SelectItem value="SESUAI">Sesuai (0 Selisih)</SelectItem>
                  <SelectItem value="BELUM_DIISI">Belum Dihitung</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleIsiSemuaSesuaiSistem}
                className="text-xs h-9 border-0 bg-background hover:bg-muted/60"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                Samakan dengan Sistem
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetSemua}
                className="text-xs h-9 border-0 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        disabled={
                          summary.totalDihitung === 0 ||
                          summary.berselisihTanpaAlasan.length > 0 ||
                          isLoading
                        }
                        onClick={handleOpenConfirm}
                        className="text-xs h-9 font-semibold bg-primary text-primary-foreground shadow hover:bg-primary/90"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Simpan Berita Acara ({summary.totalDihitung})
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {summary.berselisihTanpaAlasan.length > 0 && (
                    <TooltipContent className="bg-destructive text-destructive-foreground text-xs p-2">
                      ⚠️ Ada {summary.berselisihTanpaAlasan.length} baris
                      berselisih belum diberi alasan
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Warning banner if there are discrepancies without reason */}
          {summary.berselisihTanpaAlasan.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Terdapat{' '}
                  <strong>{summary.berselisihTanpaAlasan.length} menu</strong>{' '}
                  yang memiliki selisih fisik tetapi alasan belum dipilih.
                  Alasan wajib diisi sebelum menyimpan berita acara.
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterSelisih('SELISIH')}
                className="h-6 text-xs text-amber-500 hover:text-amber-400 p-1"
              >
                Lihat Baris Berselisih
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 bg-muted/60 dark:bg-muted/25 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/90 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Nama Menu & Kategori</th>
                <th className="py-3 px-3 text-center w-24">Stok Sistem</th>
                <th className="py-3 px-3 text-center w-32">Stok Fisik</th>
                <th className="py-3 px-3 text-center w-28">Selisih Qty</th>
                <th className="py-3 px-3 text-right w-36">Nilai Selisih</th>
                <th className="py-3 px-3 w-56">Alasan Selisih (Wajib)</th>
                <th className="py-3 px-4 w-60">Catatan Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {displayedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground text-sm"
                  >
                    Tidak ada menu yang sesuai kriteria pencarian
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => {
                  const isCounted = typeof row.qtyFisik === 'number'
                  const hasDiscrepancy = isCounted && row.selisih !== 0
                  const isReasonMissing = hasDiscrepancy && !row.alasan.trim()

                  return (
                    <tr
                      key={row.menuId}
                      className={`transition-colors hover:bg-muted/30 ${
                        isReasonMissing
                          ? 'bg-amber-500/5'
                          : hasDiscrepancy
                            ? row.selisih < 0
                              ? 'bg-destructive/5'
                              : 'bg-emerald-500/5'
                            : ''
                      }`}
                    >
                      {/* 1. Nama Menu */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">
                          {row.nama}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                            {row.kategoriNama}
                          </span>
                          <span>•</span>
                          <span>HPP: Rp {row.hpp.toLocaleString('id-ID')}</span>
                        </div>
                      </td>

                      {/* 2. Stok Sistem */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-foreground">
                          {row.stokSistem}
                        </span>{' '}
                        <span className="text-xs text-muted-foreground">
                          {row.satuan}
                        </span>
                      </td>

                      {/* 3. Input Stok Fisik */}
                      <td className="py-3 px-3 text-center">
                        <Input
                          type="number"
                          min={0}
                          placeholder="—"
                          value={row.qtyFisik}
                          onChange={(e) =>
                            handleQtyFisikChange(row.menuId, e.target.value)
                          }
                          className={`h-9 w-24 text-center font-semibold mx-auto bg-background ${
                            isReasonMissing
                              ? 'border-amber-500 focus-visible:ring-amber-500'
                              : ''
                          }`}
                        />
                      </td>

                      {/* 4. Selisih Qty */}
                      <td className="py-3 px-3 text-center">
                        {!isCounted ? (
                          <span className="text-xs text-muted-foreground italic">
                            Belum diisi
                          </span>
                        ) : row.selisih === 0 ? (
                          <Badge
                            className="border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-0.5 font-medium"
                          >
                            ✓ Pas (0)
                          </Badge>
                        ) : row.selisih < 0 ? (
                          <Badge
                            className="border-0 bg-rose-500/15 text-rose-700 dark:text-rose-400 text-xs px-2 py-0.5 font-mono font-bold"
                          >
                            {row.selisih} {row.satuan}
                          </Badge>
                        ) : (
                          <Badge
                            className="border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-0.5 font-mono font-bold"
                          >
                            +{row.selisih} {row.satuan}
                          </Badge>
                        )}
                      </td>

                      {/* 5. Nilai Selisih */}
                      <td className="py-3 px-3 text-right">
                        {!isCounted || row.selisih === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Rp 0
                          </span>
                        ) : (
                          <div
                            className={`font-semibold font-mono ${
                              row.selisih < 0
                                ? 'text-destructive'
                                : 'text-emerald-500'
                            }`}
                          >
                            {row.selisih < 0 ? '-' : '+'} Rp{' '}
                            {row.nilaiSelisih.toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      {/* 6. Alasan Selisih */}
                      <td className="py-3 px-3">
                        {hasDiscrepancy ? (
                          <Select
                            value={row.alasan}
                            onValueChange={(val) =>
                              handleAlasanChange(row.menuId, val)
                            }
                          >
                            <SelectTrigger
                              className={`h-9 text-xs bg-background ${
                                isReasonMissing
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-medium'
                                  : ''
                              }`}
                            >
                              <SelectValue placeholder="Pilih Alasan Wajib..." />
                            </SelectTrigger>
                            <SelectContent>
                              {KATEGORI_ALASAN_OPNAME.map((kat) => (
                                <SelectItem
                                  key={kat.value}
                                  value={kat.value}
                                  className="text-xs"
                                >
                                  {kat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* 7. Catatan Detail */}
                      <td className="py-3 px-4">
                        {hasDiscrepancy ? (
                          <Input
                            placeholder="Catatan tambahan..."
                            value={row.keterangan}
                            onChange={(e) =>
                              handleKeteranganChange(row.menuId, e.target.value)
                            }
                            className="h-9 text-xs bg-background"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Konfirmasi Berita Acara Stok Opname
            </DialogTitle>
            <DialogDescription className="sr-only">
              Konfirmasi Berita Acara Stok Opname
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nomor Berita Acara / Referensi (Idempotency Key)
              </label>
              <Input
                value={referensiId}
                onChange={(e) => setReferensiId(e.target.value)}
                placeholder="OPN-YYYYMMDD-XXXX"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Nomor referensi unik mencegah duplikasi audit jika terjadi retry
                jaringan.
              </p>
            </div>

            <div className="rounded-lg border-0 bg-muted/60 dark:bg-muted/25 p-3 space-y-2 text-xs shadow-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Menu Diaudit:</span>
                <span className="font-semibold">
                  {summary.totalDihitung} item
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Menu Berselisih (Mutasi Dibuat):
                </span>
                <span className="font-semibold text-amber-500">
                  {summary.totalBerselisih} item
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Menu Sesuai (Tanpa Mutasi):
                </span>
                <span className="font-semibold text-emerald-500">
                  {summary.totalDihitung - summary.totalBerselisih} item
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Estimasi Total Kerugian (Rp):</span>
                <span className="text-destructive font-mono">
                  Rp {summary.totalKerugian.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmitBatch}
              disabled={isSubmitting || !referensiId.trim()}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isSubmitting ? 'Menyimpan...' : 'Konfirmasi & Terapkan Stok'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
