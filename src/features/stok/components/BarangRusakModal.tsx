import { useState, useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { stokApi } from '../api/stok-api'
import type { MenuItem } from '@/features/katalog/types'

interface BarangRusakModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  menuList: MenuItem[]
  hppMap: Record<number, number>
  onSuccess: () => void
}

const KATEGORI_KERUSAKAN = [
  'Basi / Makanan Busuk',
  'Kedaluwarsa (Expired)',
  'Kemasan Rusak / Bocor',
  'Jatuh / Terkontaminasi',
  'Cacat Produksi / Pengiriman',
  'Lainnya',
] as const

function generateDefaultReferensiId() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const rnd = Math.floor(1000 + Math.random() * 9000)
  return `BR-${yyyy}${mm}${dd}-${rnd}`
}

interface FormContentProps {
  menuList: MenuItem[]
  hppMap: Record<number, number>
  onClose: () => void
  onSuccess: () => void
}

function BarangRusakFormContent({
  menuList,
  hppMap,
  onClose,
  onSuccess,
}: FormContentProps) {
  const formId = useId()
  const [selectedMenuId, setSelectedMenuId] = useState<string>('')
  const [qtyRusak, setQtyRusak] = useState<number | ''>(1)
  const [kategori, setKategori] = useState<string>('Basi / Makanan Busuk')
  const [catatan, setCatatan] = useState('')
  const [referensiId, setReferensiId] = useState(() =>
    generateDefaultReferensiId()
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedMenu = menuList.find((m) => String(m.id) === selectedMenuId)
  const stokSistem = selectedMenu ? selectedMenu.stokBerjalan : 0
  const hpp = selectedMenu
    ? hppMap[selectedMenu.id] || Math.round(selectedMenu.hargaJual * 0.7)
    : 0

  const qty = typeof qtyRusak === 'number' ? qtyRusak : 0
  const totalKerugian = qty * hpp

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedMenu) {
      toast.error('Pilih menu yang mengalami kerusakan')
      return
    }

    if (qty <= 0) {
      toast.error('Jumlah barang rusak minimal 1 unit')
      return
    }

    if (qty > stokSistem) {
      toast.error(
        `Jumlah rusak (${qty}) tidak boleh melebihi stok berjalan (${stokSistem})`
      )
      return
    }

    if (!kategori) {
      toast.error('Pilih kategori penyebab kerusakan')
      return
    }

    if (!referensiId.trim()) {
      toast.error('Nomor referensi bukti wajib diisi')
      return
    }

    const alasanFinal = catatan.trim()
      ? `Rusak: ${kategori} - ${catatan.trim()}`
      : `Rusak: ${kategori}`

    setIsSubmitting(true)
    try {
      await stokApi.catatBarangRusak({
        menuId: selectedMenu.id,
        qtyRusak: qty,
        stokSistem,
        alasan: alasanFinal,
        referensiId: referensiId.trim(),
      })

      toast.success(
        `Pencatatan barang rusak berhasil! Stok "${selectedMenu.nama}" berkurang ${qty} unit.`,
        {
          description: `Total kerugian tercatat: Rp ${totalKerugian.toLocaleString('id-ID')}`,
        }
      )

      onClose()
      onSuccess()
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Gagal mencatat barang rusak'
      toast.error('Gagal Mencatat Barang Rusak', { description: errMsg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form id={formId} onSubmit={handleSubmit} className="space-y-4 py-1">
        {/* 1. Menu Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Pilih Menu <span className="text-destructive">*</span>
          </label>
          <Select value={selectedMenuId} onValueChange={setSelectedMenuId}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="-- Pilih menu makanan / minuman --" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {menuList.map((m) => (
                <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                  {m.nama} (Stok: {m.stokBerjalan} {m.satuan || 'PCS'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Stock Preview */}
        {selectedMenu && (
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border text-xs">
            <div>
              <span className="text-muted-foreground">Stok Berjalan:</span>
              <div className="font-semibold text-sm tabular-nums">
                {stokSistem} {selectedMenu.satuan || 'PCS'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">HPP per Unit:</span>
              <div className="font-semibold text-sm text-foreground tabular-nums">
                Rp {hpp.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        )}

        {/* 2. Qty Rusak */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-foreground">
              Jumlah Rusak / Basi <span className="text-destructive">*</span>
            </label>
            {selectedMenu && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                Maksimal: {stokSistem}
              </span>
            )}
          </div>
          <Input
            type="number"
            min={1}
            max={stokSistem > 0 ? stokSistem : 1}
            value={qtyRusak}
            onChange={(e) => {
              const val = e.target.value
              setQtyRusak(val === '' ? '' : parseInt(val, 10))
            }}
            placeholder="Jumlah item yang rusak"
            className="text-sm font-semibold tabular-nums"
            disabled={!selectedMenu || stokSistem <= 0}
          />
          {selectedMenu && stokSistem <= 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Stok menu ini sudah 0, tidak ada barang yang dapat dikurangi.
            </p>
          )}
        </div>

        {/* 3. Estimasi Kerugian */}
        {selectedMenu && qty > 0 && (
          <div className="flex justify-between items-center p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs">
            <span className="font-medium text-destructive">
              Estimasi Nilai Kerugian:
            </span>
            <span className="font-bold text-destructive font-mono text-sm tabular-nums">
              Rp {totalKerugian.toLocaleString('id-ID')}
            </span>
          </div>
        )}

        {/* 4. Kategori Penyebab */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Penyebab Kerusakan <span className="text-destructive">*</span>
          </label>
          <Select value={kategori} onValueChange={setKategori}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Pilih penyebab" />
            </SelectTrigger>
            <SelectContent>
              {KATEGORI_KERUSAKAN.map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 5. Nomor Bukti */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Nomor Referensi Bukti
          </label>
          <Input
            value={referensiId}
            onChange={(e) => setReferensiId(e.target.value)}
            className="font-mono text-xs"
          />
        </div>

        {/* 6. Catatan Detail */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Catatan / Kronologi Kejadian (Opsional)
          </label>
          <Textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Misal: Ditemukan basi saat cek lemari es pagi hari..."
            rows={2}
            className="text-xs resize-none"
          />
        </div>
      </form>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button
          type="submit"
          form={formId}
          disabled={
            isSubmitting ||
            !selectedMenu ||
            qty <= 0 ||
            qty > stokSistem ||
            stokSistem <= 0
          }
          variant="destructive"
          className="text-white font-semibold"
        >
          {isSubmitting ? 'Menyimpan...' : 'Catat Barang Rusak'}
        </Button>
      </DialogFooter>
    </>
  )
}

export function BarangRusakModal({
  open,
  onOpenChange,
  menuList,
  hppMap,
  onSuccess,
}: BarangRusakModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Pencatatan Barang Rusak / Basi Harian
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pencatatan Barang Rusak / Basi Harian
          </DialogDescription>
        </DialogHeader>

        {open && (
          <BarangRusakFormContent
            menuList={menuList}
            hppMap={hppMap}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
