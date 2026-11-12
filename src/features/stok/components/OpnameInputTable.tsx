import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableToolbar } from '@/components/data-table'
import { useState, useMemo } from 'react'
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
              Progress Audit Fisik
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
              <ClipboardCheck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {summary.totalDihitung} / {summary.totalItem}
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {summary.totalItem - summary.totalDihitung} item belum dihitung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
              Total Item Berselisih
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tabular-nums ${
                summary.totalBerselisih > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {summary.totalBerselisih} item
            </div>
            <div className="mt-1 flex gap-2 text-xs text-muted-foreground tabular-nums">
              <span className="font-medium text-destructive">
                Kurang: {summary.totalSelisihKurang}
              </span>
              <span>•</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Lebih: {summary.totalSelisihLebih}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
              Estimasi Nilai Kerugian
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
              <TrendingDown className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive tabular-nums">
              Rp {summary.totalKerugian.toLocaleString('id-ID')}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Akumulasi selisih kurang x HPP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
              Estimasi Nilai Kelebihan
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              Rp {summary.totalKelebihan.toLocaleString('id-ID')}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Akumulasi selisih lebih x HPP
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar & Filters */}
      <TableToolbar
        searchPlaceholder='Cari nama menu...'
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            title: 'Kategori',
            options: kategoriList.map((k) => ({
              label: k.nama,
              value: String(k.id),
            })),
            selectedValues: selectedKategori !== 'ALL' ? [selectedKategori] : [],
            onSelect: (vals) => setSelectedKategori(vals[0] || 'ALL'),
            isSingleSelect: true,
          },
          {
            title: 'Status Hitung',
            options: [
              { label: 'Hanya Berselisih', value: 'SELISIH' },
              { label: 'Sesuai (0 Selisih)', value: 'SESUAI' },
              { label: 'Belum Dihitung', value: 'BELUM_DIISI' },
            ],
            selectedValues: filterSelisih !== 'ALL' ? [filterSelisih] : [],
            onSelect: (vals) => setFilterSelisih((vals[0] as 'ALL' | 'SELISIH' | 'SESUAI' | 'BELUM_DIISI') || 'ALL'),
            isSingleSelect: true,
          },
        ]}
        isFiltered={Boolean(searchQuery || selectedKategori !== 'ALL' || filterSelisih !== 'ALL')}
        onReset={() => {
          setSearchQuery('')
          setSelectedKategori('ALL')
          setFilterSelisih('ALL')
        }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleIsiSemuaSesuaiSistem}
          className="h-8 text-xs"
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          Samakan Sistem
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetSemua}
          className="h-8 text-xs text-muted-foreground"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Reset Form
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
                  className="h-8 text-xs font-semibold tabular-nums"
                >
                  <Send className="mr-1 h-3.5 w-3.5" />
                  Simpan Berita Acara ({summary.totalDihitung})
                </Button>
              </span>
            </TooltipTrigger>
            {summary.berselisihTanpaAlasan.length > 0 && (
              <TooltipContent className="bg-destructive p-2 text-xs text-destructive-foreground">
                Ada {summary.berselisihTanpaAlasan.length} baris
                berselisih belum diberi alasan
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </TableToolbar>

      {/* Warning banner if there are discrepancies without reason */}
      {summary.berselisihTanpaAlasan.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Terdapat{' '}
              <strong className="tabular-nums">{summary.berselisihTanpaAlasan.length} menu</strong>{' '}
              yang memiliki selisih fisik tetapi alasan belum dipilih.
              Alasan wajib diisi sebelum menyimpan berita acara.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterSelisih('SELISIH')}
            className="h-7 px-2 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
          >
            Lihat Baris Berselisih
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-b border-border hover:bg-muted/50">
              <TableHead className="px-4 py-3">Nama Menu & Kategori</TableHead>
              <TableHead className="w-24 px-3 py-3 text-center">Stok Sistem</TableHead>
              <TableHead className="w-32 px-3 py-3 text-center">Stok Fisik</TableHead>
              <TableHead className="w-28 px-3 py-3 text-center">Selisih Qty</TableHead>
              <TableHead className="w-36 px-3 py-3 text-right">Nilai Selisih</TableHead>
              <TableHead className="w-56 px-3 py-3">Alasan Selisih (Wajib)</TableHead>
              <TableHead className="w-60 px-4 py-3">Catatan Audit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <span className="text-sm">Memuat daftar menu opname...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : displayedRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  Tidak ada menu yang sesuai kriteria pencarian
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((row) => {
                const isCounted = typeof row.qtyFisik === 'number'
                const hasDiscrepancy = isCounted && row.selisih !== 0
                const isReasonMissing = hasDiscrepancy && !row.alasan.trim()

                return (
                  <TableRow
                    key={row.menuId}
                    className={`border-b border-border transition-colors hover:bg-muted/30 ${
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
                    <TableCell className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {row.nama}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium">
                          {row.kategoriNama}
                        </span>
                        <span>•</span>
                        <span className="tabular-nums">HPP: Rp {row.hpp.toLocaleString('id-ID')}</span>
                      </div>
                    </TableCell>

                    {/* 2. Stok Sistem */}
                    <TableCell className="px-3 py-3 text-center tabular-nums">
                      <span className="font-semibold text-foreground">
                        {row.stokSistem}
                      </span>{' '}
                      <span className="text-xs text-muted-foreground">
                        {row.satuan}
                      </span>
                    </TableCell>

                    {/* 3. Input Stok Fisik */}
                    <TableCell className="px-3 py-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        placeholder="—"
                        value={row.qtyFisik}
                        onChange={(e) =>
                          handleQtyFisikChange(row.menuId, e.target.value)
                        }
                        className={`mx-auto h-9 w-24 text-center font-semibold tabular-nums ${
                          isReasonMissing
                            ? 'border-amber-500 focus-visible:ring-amber-500/40'
                            : ''
                        }`}
                      />
                    </TableCell>

                    {/* 4. Selisih Qty */}
                    <TableCell className="px-3 py-3 text-center">
                      {!isCounted ? (
                        <span className="text-xs italic text-muted-foreground">
                          Belum diisi
                        </span>
                      ) : row.selisih === 0 ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                        >
                          Pas (0)
                        </Badge>
                      ) : row.selisih < 0 ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border border-rose-500/20 bg-rose-500/15 px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-rose-700 dark:text-rose-400"
                        >
                          {row.selisih} {row.satuan}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400"
                        >
                          +{row.selisih} {row.satuan}
                        </Badge>
                      )}
                    </TableCell>

                    {/* 5. Nilai Selisih */}
                    <TableCell className="px-3 py-3 text-right tabular-nums">
                      {!isCounted || row.selisih === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Rp 0
                        </span>
                      ) : (
                        <div
                          className={`font-mono font-semibold tabular-nums ${
                            row.selisih < 0
                              ? 'text-destructive'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {row.selisih < 0 ? '-' : '+'} Rp{' '}
                          {row.nilaiSelisih.toLocaleString('id-ID')}
                        </div>
                      )}
                    </TableCell>

                    {/* 6. Alasan Selisih */}
                    <TableCell className="px-3 py-3">
                      {hasDiscrepancy ? (
                        <Select
                          value={row.alasan}
                          onValueChange={(val) =>
                            handleAlasanChange(row.menuId, val)
                          }
                        >
                          <SelectTrigger
                            className={`h-9 text-xs ${
                              isReasonMissing
                                ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-700 dark:text-amber-400'
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
                        <span className="text-xs italic text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>

                    {/* 7. Catatan Detail */}
                    <TableCell className="px-4 py-3">
                      {hasDiscrepancy ? (
                        <Input
                          placeholder="Catatan tambahan..."
                          value={row.keterangan}
                          onChange={(e) =>
                            handleKeteranganChange(row.menuId, e.target.value)
                          }
                          className="h-9 text-xs"
                        />
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

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

            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Menu Diaudit:</span>
                <span className="font-semibold tabular-nums">
                  {summary.totalDihitung} item
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Menu Berselisih (Mutasi Dibuat):
                </span>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {summary.totalBerselisih} item
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Menu Sesuai (Tanpa Mutasi):
                </span>
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {summary.totalDihitung - summary.totalBerselisih} item
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Estimasi Total Kerugian (Rp):</span>
                <span className="font-mono tabular-nums text-destructive">
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
              className="font-semibold"
            >
              {isSubmitting ? 'Menyimpan...' : 'Konfirmasi & Terapkan Stok'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
