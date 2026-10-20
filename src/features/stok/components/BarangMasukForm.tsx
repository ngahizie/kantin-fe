import { useState, useId } from 'react'
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  Calendar,
  Building2,
  Hash,
  Calculator,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRupiah, formatNumber } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MenuItem } from '@/features/katalog/types'
import { stokApi } from '../api/stok-api'
import { simulasiBarangMasuk } from '../utils/hpp-calculator'
import { HppSimulationBadge } from './HppSimulationBadge'

interface ItemRowState {
  rowId: string
  menuId: number | ''
  qty: number
  hargaBeliPerUnit: number
}

interface BarangMasukFormProps {
  menus: MenuItem[]
  onSuccess?: () => void
}

function generateNoFaktur(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `BM-${yyyy}${mm}${dd}-${rand}`
}

export function BarangMasukForm({ menus, onSuccess }: BarangMasukFormProps) {
  const formId = useId()
  const today = new Date().toISOString().split('T')[0]

  // Header State
  const [tanggal, setTanggal] = useState(today)
  const [referensiId, setReferensiId] = useState(generateNoFaktur())
  const [namaPemasok, setNamaPemasok] = useState('')
  const [notaFile, setNotaFile] = useState<File | null>(null)
  const [notaPreview, setNotaPreview] = useState<string | null>(null)

  // Dynamic Rows State
  const [rows, setRows] = useState<ItemRowState[]>([
    {
      rowId: 'row-1',
      menuId: '',
      qty: 1,
      hargaBeliPerUnit: 0,
    },
  ])

  const [submitting, setSubmitting] = useState(false)

  // Add Row
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        rowId: `row-${crypto.randomUUID()}`,
        menuId: '',
        qty: 1,
        hargaBeliPerUnit: 0,
      },
    ])
  }

  // Remove Row
  const handleRemoveRow = (rowId: string) => {
    if (rows.length === 1) {
      toast.warning('Minimal harus ada 1 barang dalam formulir')
      return
    }
    setRows((prev) => prev.filter((r) => r.rowId !== rowId))
  }

  // Update Row
  const handleRowChange = (
    rowId: string,
    field: keyof Omit<ItemRowState, 'rowId'>,
    value: unknown
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r
        return {
          ...r,
          [field]: value,
        }
      })
    )
  }

  // Handle Foto Nota Upload
  const handleNotaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WEBP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }

    setNotaFile(file)
    const previewUrl = URL.createObjectURL(file)
    setNotaPreview(previewUrl)
  }

  const handleRemoveNota = () => {
    if (notaPreview) {
      URL.revokeObjectURL(notaPreview)
    }
    setNotaFile(null)
    setNotaPreview(null)
  }

  // Kalkulasi Ringkasan
  const totalBiaya = rows.reduce((sum, r) => {
    return sum + (Number(r.qty) || 0) * (Number(r.hargaBeliPerUnit) || 0)
  }, 0)

  const totalQty = rows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0)

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!referensiId.trim()) {
      toast.error('Nomor Bukti / Faktur wajib diisi')
      return
    }

    // Validasi baris item
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.menuId) {
        toast.error(`Pilih menu untuk baris ke-${i + 1}`)
        return
      }
      if (!row.qty || row.qty <= 0) {
        toast.error(`Qty masuk untuk baris ke-${i + 1} harus lebih dari 0`)
        return
      }
      if (row.hargaBeliPerUnit < 0) {
        toast.error(`Harga beli baris ke-${i + 1} tidak boleh negatif`)
        return
      }
    }

    try {
      setSubmitting(true)

      if (notaFile) {
        try {
          const uploadRes = await stokApi.uploadNota(notaFile)
          const uploadedNotaUrl = uploadRes.url || uploadRes.path
          void uploadedNotaUrl
        } catch {
          // Tetap lanjutkan restock walau upload nota gagal
        }
      }

      // Catat barang masuk ke backend
      const payloadItems = rows.map((r) => ({
        menuId: Number(r.menuId),
        qty: Number(r.qty),
        hargaBeliPerUnit: Number(r.hargaBeliPerUnit),
      }))

      await stokApi.catatBarangMasukBatch(payloadItems, referensiId.trim())

      toast.success(
        `Berhasil mencatat barang masuk untuk ${rows.length} item (${formatNumber(totalQty)} unit)!`
      )

      // Reset form
      setReferensiId(generateNoFaktur())
      setNamaPemasok('')
      handleRemoveNota()
      setRows([
        {
          rowId: 'row-reset-1',
          menuId: '',
          qty: 1,
          hargaBeliPerUnit: 0,
        },
      ])

      onSuccess?.()
    } catch (err: unknown) {
      const error = err as {
        message?: string
        response?: { data?: { message?: string } }
      }
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Gagal mencatat barang masuk. Periksa koneksi ke server.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {/* Kartu Header Faktur / Nota */}
      <Card className='border-0 bg-muted/60 dark:bg-muted/25'>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 text-base font-semibold'>
            <FileText className='h-4 w-4 text-primary' />
            Informasi Pembelian & Faktur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            {/* Tanggal */}
            <div className='space-y-1.5'>
              <Label
                htmlFor={`${formId}-tanggal`}
                className='flex items-center gap-1.5 text-xs'
              >
                <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                Tanggal Pembelian
              </Label>
              <Input
                id={`${formId}-tanggal`}
                type='date'
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className='bg-background'
                required
              />
            </div>

            {/* Nomor Bukti / Faktur */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label
                  htmlFor={`${formId}-ref`}
                  className='flex items-center gap-1.5 text-xs'
                >
                  <Hash className='h-3.5 w-3.5 text-muted-foreground' />
                  No. Bukti / Faktur <span className='text-destructive'>*</span>
                </Label>
                <button
                  type='button'
                  onClick={() => setReferensiId(generateNoFaktur())}
                  className='text-[11px] text-primary hover:underline'
                >
                  Acak No. Bukti
                </button>
              </div>
              <Input
                id={`${formId}-ref`}
                placeholder='Contoh: BM-20261006-0001'
                value={referensiId}
                onChange={(e) => setReferensiId(e.target.value)}
                className='bg-background font-mono'
                required
              />
            </div>

            {/* Nama Pemasok / Supplier */}
            <div className='space-y-1.5'>
              <Label
                htmlFor={`${formId}-pemasok`}
                className='flex items-center gap-1.5 text-xs'
              >
                <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                Pemasok / Supplier (Opsional)
              </Label>
              <Input
                id={`${formId}-pemasok`}
                placeholder='Contoh: CV Sumber Makmur'
                value={namaPemasok}
                onChange={(e) => setNamaPemasok(e.target.value)}
                className='bg-background'
              />
            </div>
          </div>

          {/* Upload Nota Foto */}
          <div className='mt-4 flex flex-wrap items-center gap-4 border-t border-border/40 pt-4'>
            <div className='flex items-center gap-2'>
              <Label
                htmlFor={`${formId}-nota`}
                className='inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-accent'
              >
                <Upload className='h-3.5 w-3.5 text-primary' />
                <span>Upload Foto Nota / Faktur</span>
              </Label>
              <Input
                id={`${formId}-nota`}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={handleNotaChange}
              />
              <span className='text-xs text-muted-foreground'>
                {notaFile ? notaFile.name : 'Format JPG/PNG/WEBP (Maks 5MB)'}
              </span>
            </div>

            {notaPreview && (
              <div className='relative inline-flex items-center gap-2 rounded-lg border bg-background p-1'>
                <img
                  src={notaPreview}
                  alt='Preview Nota'
                  className='h-12 w-12 rounded object-cover'
                />
                <button
                  type='button'
                  onClick={handleRemoveNota}
                  className='rounded-full p-1 text-destructive hover:bg-destructive/10'
                  title='Hapus foto'
                >
                  <X className='h-4 w-4' />
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabel Multi-Item Restock */}
      <Card className='border-0 bg-muted/60 dark:bg-muted/25'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <div>
            <CardTitle className='flex items-center gap-2 text-base font-semibold'>
              <Calculator className='h-4 w-4 text-primary' />
              Daftar Barang Masuk (Multi-Item)
            </CardTitle>
          </div>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={handleAddRow}
            className='flex items-center gap-1.5 text-xs border-0 bg-background hover:bg-accent'
          >
            <Plus className='h-3.5 w-3.5' />
            Tambah Baris Menu
          </Button>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/90'>
                  <TableHead className='w-12 text-center text-xs'>No</TableHead>
                  <TableHead className='min-w-[240px] text-xs'>
                    Pilih Menu Katalog
                  </TableHead>
                  <TableHead className='w-32 text-xs'>Qty Masuk</TableHead>
                  <TableHead className='w-44 text-xs'>
                    Harga Beli / Unit
                  </TableHead>
                  <TableHead className='w-36 text-right text-xs'>
                    Subtotal
                  </TableHead>
                  <TableHead className='min-w-[240px] text-xs'>
                    Estimasi HPP Baru
                  </TableHead>
                  <TableHead className='w-12 text-center text-xs'>
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const selectedMenu = menus.find(
                    (m) => m.id === Number(row.menuId)
                  )
                  const subtotal =
                    (Number(row.qty) || 0) * (Number(row.hargaBeliPerUnit) || 0)

                  // Simulasi HPP jika menu dipilih
                  const simulasi = selectedMenu
                    ? simulasiBarangMasuk(
                        selectedMenu.stokBerjalan || 0,
                        // Asumsi HPP awal jika belum ada data HPP
                        Math.round(selectedMenu.hargaJual * 0.7),
                        Number(row.qty) || 0,
                        Number(row.hargaBeliPerUnit) || 0
                      )
                    : null

                  return (
                    <TableRow key={row.rowId} className='hover:bg-muted/20'>
                      <TableCell className='text-center text-xs font-medium text-muted-foreground'>
                        {idx + 1}
                      </TableCell>

                      {/* Dropdown Menu */}
                      <TableCell>
                        <Select
                          value={row.menuId ? String(row.menuId) : ''}
                          onValueChange={(val) =>
                            handleRowChange(row.rowId, 'menuId', Number(val))
                          }
                        >
                          <SelectTrigger className='w-full text-xs bg-background'>
                            <SelectValue placeholder='-- Pilih Menu --' />
                          </SelectTrigger>
                          <SelectContent className='max-h-60'>
                            {menus.map((m) => (
                              <SelectItem
                                key={m.id}
                                value={String(m.id)}
                                className='text-xs'
                              >
                                <div className='flex w-full items-center justify-between gap-4'>
                                  <span className='font-medium'>{m.nama}</span>
                                  <span className='text-[11px] text-muted-foreground'>
                                    Stok: {formatNumber(m.stokBerjalan)}{' '}
                                    {m.satuan}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Input Qty */}
                      <TableCell>
                        <Input
                          type='number'
                          min='1'
                          step='1'
                          className='h-8 text-right text-xs bg-background'
                          value={row.qty || ''}
                          onChange={(e) =>
                            handleRowChange(
                              row.rowId,
                              'qty',
                              Math.max(1, parseInt(e.target.value) || 0)
                            )
                          }
                        />
                      </TableCell>

                      {/* Input Harga Beli */}
                      <TableCell>
                        <div className='relative'>
                          <span className='absolute top-2 left-2.5 text-[11px] font-semibold text-muted-foreground'>
                            Rp
                          </span>
                          <Input
                            type='number'
                            min='0'
                            step='100'
                            className='h-8 pl-8 text-right text-xs bg-background'
                            value={row.hargaBeliPerUnit || ''}
                            onChange={(e) =>
                              handleRowChange(
                                row.rowId,
                                'hargaBeliPerUnit',
                                Math.max(0, parseInt(e.target.value) || 0)
                              )
                            }
                            placeholder='0'
                          />
                        </div>
                      </TableCell>

                      {/* Subtotal */}
                      <TableCell className='text-right text-xs font-semibold'>
                        {formatRupiah(subtotal)}
                      </TableCell>

                      {/* Estimasi HPP Preview */}
                      <TableCell>
                        {simulasi ? (
                          <HppSimulationBadge simulasi={simulasi} compact />
                        ) : (
                          <span className='text-[11px] text-muted-foreground italic'>
                            Pilih menu untuk melihat estimasi
                          </span>
                        )}
                      </TableCell>

                      {/* Delete Row Button */}
                      <TableCell className='text-center'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() => handleRemoveRow(row.rowId)}
                          disabled={rows.length === 1}
                          className='h-7 w-7 text-destructive hover:bg-destructive/10'
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Footer Ringkasan Biaya */}
          <div className='flex flex-col items-center justify-between gap-4 border-t border-border/40 bg-muted/40 p-4 sm:flex-row'>
            <div className='flex items-center gap-6 text-xs'>
              <div>
                <span className='text-muted-foreground'>Total Item: </span>
                <span className='font-bold text-foreground'>
                  {rows.length} barang
                </span>
              </div>
              <div>
                <span className='text-muted-foreground'>
                  Total Jumlah Qty:{' '}
                </span>
                <span className='font-bold text-foreground'>
                  {formatNumber(totalQty)} unit
                </span>
              </div>
              <div>
                <span className='text-muted-foreground'>
                  Total Biaya Pembelian:{' '}
                </span>
                <span className='text-sm font-bold text-primary sm:text-base'>
                  {formatRupiah(totalBiaya)}
                </span>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                type='submit'
                disabled={submitting || rows.length === 0}
                className='gap-2 text-xs'
              >
                {submitting ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    Menyimpan Stok...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='h-3.5 w-3.5' />
                    Simpan Barang Masuk
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
