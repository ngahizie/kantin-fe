import { useState, useEffect, useRef, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2,
  Save,
  Upload,
  Image as ImageIcon,
  Barcode,
  X,
  Boxes,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { formatNumber } from '@/lib/formatters'
import { katalogApi } from './api/katalog-api'
import { stokApi } from '@/features/stok/api/stok-api'
import {
  menuFormSchema,
  type MenuFormValues,
  type MenuItem,
  type KategoriItem,
  type SatuanType,
} from './types'

interface MenuFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedMenu?: MenuItem | null
  kategoriList: KategoriItem[]
  onSuccess: () => void
}

const SATUAN_OPTIONS: { value: SatuanType; label: string }[] = [
  { value: 'PCS', label: 'Pcs / Buah / Bungkus' },
  { value: 'PORSI', label: 'Porsi (Makanan Olahan)' },
  { value: 'BOTOL', label: 'Botol / Gelas Kemasan' },
]

function generateReferensiId(prefix: string): string {
  const ts = Date.now()
  return `${prefix}-${ts}`.slice(0, 60)
}

export function MenuFormModal({
  open,
  onOpenChange,
  selectedMenu,
  kategoriList,
  onSuccess,
}: MenuFormModalProps) {
  const isEditing = Boolean(selectedMenu)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Filter kategori aktif, atau sertakan kategori yang sedang dipakai jika sedang mengedit menu
  const activeKategori = useMemo(
    () =>
      kategoriList.filter(
        (k) =>
          (k.isActive !== false && k.aktif !== false) ||
          (selectedMenu && k.id === selectedMenu.kategoriId)
      ),
    [kategoriList, selectedMenu]
  )
  const defaultKategoriId = activeKategori[0]?.id || 1

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      nama: '',
      kodeBarcode: '',
      kategoriId: defaultKategoriId,
      hargaJual: 0,
      satuan: 'PCS',
      stokMinimum: 5,
      fotoUrl: '',
      aktif: true,
    },
  })

  const { isSubmitting } = form.formState
  const watchedFotoUrl = useWatch({ control: form.control, name: 'fotoUrl' })
  const watchedStokMinimum = useWatch({ control: form.control, name: 'stokMinimum' })
  const previewUrl = watchedFotoUrl || ''

  // State untuk mutasi stok fisik terintegrasi
  const [currentStok, setCurrentStok] = useState<number>(0)
  const [loadingStok, setLoadingStok] = useState(false)
  const [aksiStok, setAksiStok] = useState<'NONE' | 'MASUK' | 'OPNAME' | 'RUSAK'>('NONE')
  const [qtyMasuk, setQtyMasuk] = useState<number | ''>('')
  const [hargaBeliMasuk, setHargaBeliMasuk] = useState<number | ''>('')
  const [alasanMasuk, setAlasanMasuk] = useState('')
  const [qtyOpnameFisik, setQtyOpnameFisik] = useState<number | ''>('')
  const [alasanOpname, setAlasanOpname] = useState('')
  const [qtyRusak, setQtyRusak] = useState<number | ''>('')
  const [alasanRusak, setAlasanRusak] = useState('')

  // Reset state mutasi saat menu atau status buka modal berubah
  const [prevMenuId, setPrevMenuId] = useState<number | null | undefined>(undefined)
  const currentMenuId = open ? (selectedMenu?.id ?? 0) : null
  if (currentMenuId !== prevMenuId) {
    setPrevMenuId(currentMenuId)
    setAksiStok('NONE')
    setQtyMasuk('')
    setHargaBeliMasuk('')
    setAlasanMasuk('')
    setAlasanOpname('')
    setQtyRusak('')
    setAlasanRusak('')
    const initialStok = Number(selectedMenu?.stokBerjalan) || 0
    setCurrentStok(initialStok)
    setQtyOpnameFisik(initialStok)
  }

  // Sinkronisasi data form saat modal dibuka
  useEffect(() => {
    if (open) {
      if (selectedMenu) {
        form.reset({
          nama: selectedMenu.nama,
          kodeBarcode: selectedMenu.kodeBarcode || '',
          kategoriId: selectedMenu.kategoriId || defaultKategoriId,
          hargaJual: selectedMenu.hargaJual,
          satuan: (selectedMenu.satuan?.toUpperCase() as SatuanType) || 'PCS',
          stokMinimum: selectedMenu.stokMinimum ?? 5,
          fotoUrl: selectedMenu.fotoUrl || '',
          aktif: selectedMenu.aktif !== false,
        })

        let active = true
        void (async () => {
          try {
            setLoadingStok(true)
            const res = await stokApi.getStokMenu(selectedMenu.id)
            if (active && res) {
              const liveStok = Number(res.stok) || 0
              setCurrentStok(liveStok)
              setQtyOpnameFisik(liveStok)
            }
          } catch {
            // Abaikan error jaringan, gunakan fallback selectedMenu.stokBerjalan
          } finally {
            if (active) {
              setLoadingStok(false)
            }
          }
        })()

        return () => {
          active = false
        }
      } else {
        form.reset({
          nama: '',
          kodeBarcode: '',
          kategoriId: defaultKategoriId,
          hargaJual: 0,
          satuan: 'PCS',
          stokMinimum: 5,
          fotoUrl: '',
          aktif: true,
        })
      }
    }
  }, [open, selectedMenu, defaultKategoriId, form])

  // Handle upload file gambar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa format gambar (JPG, PNG, WEBP)')
      return
    }

    // Validasi ukuran file (maksimal 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2 MB')
      return
    }

    try {
      setIsUploading(true)
      const res = await katalogApi.uploadFoto(file, 'menu')
      const finalUrl = res.url || res.path
      form.setValue('fotoUrl', finalUrl, { shouldValidate: true })
      toast.success('Foto produk berhasil diunggah')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message = error.response?.data?.message || error.message || 'Gagal mengunggah foto produk'
      toast.error(message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = () => {
    form.setValue('fotoUrl', '', { shouldValidate: true })
  }

  async function onSubmit(values: MenuFormValues) {
    try {
      // Validasi mutasi stok jika dipilih (khusus saat edit menu)
      if (isEditing && selectedMenu) {
        if (aksiStok === 'MASUK') {
          if (typeof qtyMasuk !== 'number' || qtyMasuk <= 0) {
            toast.error('Jumlah barang masuk harus lebih dari 0')
            return
          }
          if (!alasanMasuk || alasanMasuk.trim().length < 3) {
            toast.error('Alasan barang masuk wajib diisi (minimal 3 karakter)')
            return
          }
        } else if (aksiStok === 'OPNAME') {
          if (typeof qtyOpnameFisik !== 'number' || qtyOpnameFisik < 0) {
            toast.error('Stok fisik opname tidak boleh kosong atau negatif')
            return
          }
          if (!alasanOpname || alasanOpname.trim().length < 3) {
            toast.error('Alasan penyesuaian opname fisik wajib diisi (minimal 3 karakter)')
            return
          }
        } else if (aksiStok === 'RUSAK') {
          if (typeof qtyRusak !== 'number' || qtyRusak <= 0) {
            toast.error('Jumlah barang rusak harus lebih dari 0')
            return
          }
          if (qtyRusak > currentStok) {
            toast.error(`Jumlah barang rusak (${qtyRusak}) melebihi stok tersedia (${currentStok})`)
            return
          }
          if (!alasanRusak || alasanRusak.trim().length < 3) {
            toast.error('Alasan barang rusak/basi wajib diisi (minimal 3 karakter)')
            return
          }
        }
      }

      // Pastikan harga jual murni integer rupiah
      const payload: MenuFormValues = {
        ...values,
        kodeBarcode: (values.kodeBarcode ?? '').trim(),
        hargaJual: Math.round(Number(values.hargaJual)),
        stokMinimum: Math.round(Number(values.stokMinimum)),
        aktif: Boolean(values.aktif),
      }

      if (isEditing && selectedMenu) {
        await katalogApi.updateMenu(selectedMenu.id, payload)

        // Jalankan mutasi stok jika ada aksi penyesuaian yang dipilih
        if (aksiStok === 'MASUK') {
          const referensiId = generateReferensiId('BM')
          await stokApi.catatBarangMasuk({
            menuId: selectedMenu.id,
            qty: Number(qtyMasuk),
            hargaBeliPerUnit: Number(hargaBeliMasuk) || 0,
            referensiId,
            alasan: alasanMasuk.trim() || undefined,
          })
          toast.success(`Menu "${payload.nama}" diperbarui & stok bertambah +${qtyMasuk}`)
        } else if (aksiStok === 'OPNAME') {
          const referensiId = generateReferensiId('OPN')
          await stokApi.sesuaikanOpname({
            menuId: selectedMenu.id,
            qtyFisik: Number(qtyOpnameFisik),
            alasan: alasanOpname.trim(),
            referensiId,
          })
          toast.success(`Menu "${payload.nama}" diperbarui & stok disesuaikan ke ${qtyOpnameFisik}`)
        } else if (aksiStok === 'RUSAK') {
          const referensiId = generateReferensiId('RSK')
          await stokApi.catatBarangRusak({
            menuId: selectedMenu.id,
            qtyRusak: Number(qtyRusak),
            stokSistem: currentStok,
            alasan: alasanRusak.trim(),
            referensiId,
          })
          toast.success(`Menu "${payload.nama}" diperbarui & dicatat ${qtyRusak} barang rusak`)
        } else {
          toast.success(`Menu "${payload.nama}" berhasil diperbarui`)
        }
      } else {
        await katalogApi.createMenu(payload)
        toast.success(`Menu "${payload.nama}" berhasil ditambahkan`)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message = error.response?.data?.message || error.message || 'Gagal menyimpan menu'
      if (message.toLowerCase().includes('barcode')) {
        form.setError('kodeBarcode', { message })
      }
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>{isEditing ? 'Ubah Menu Kantin' : 'Tambah Menu Baru'}</DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              {isEditing
                ? 'Perbarui detail nama, kode barcode, kategori, harga jual rupiah, dan batas stok minimum.'
                : 'Lengkapi informasi menu baru untuk ditampilkan pada kasir POS.'}
            </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-1'>
            {/* Foto Produk Section */}
            <div className='rounded-xl border border-border bg-muted/30 p-3 space-y-3'>
              <Label className='text-xs font-semibold text-foreground flex items-center justify-between'>
                <span>Foto Produk</span>
                <span className='text-[11px] font-normal text-muted-foreground'>
                  Format JPG, PNG, WEBP (Maks 2MB)
                </span>
              </Label>

              <div className='flex items-center gap-4'>
                <div className='relative size-20 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 group'>
                  {previewUrl ? (
                    <>
                      <img
                        src={katalogApi.getImageUrl(previewUrl)}
                        alt='Preview Produk'
                        className='size-full object-cover'
                        onError={(e) => {
                          // Fallback jika error render URL
                          ;(e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'
                        }}
                      />
                      <button
                        type='button'
                        onClick={handleRemovePhoto}
                        className='absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                        title='Hapus Foto'
                      >
                        <X className='size-5' />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className='size-7 text-muted-foreground/40' />
                  )}
                </div>

                <div className='space-y-1.5 flex-1'>
                  <div className='flex items-center gap-2'>
                    <input
                      type='file'
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept='image/*'
                      className='hidden'
                      disabled={isUploading || isSubmitting}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='gap-1.5 text-xs'
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isSubmitting}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className='size-3.5 animate-spin' />
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Upload className='size-3.5' />
                          <span>Pilih & Unggah Foto</span>
                        </>
                      )}
                    </Button>
                    {previewUrl && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={handleRemovePhoto}
                        className='text-xs text-destructive hover:text-destructive'
                      >
                        Hapus
                      </Button>
                    )}
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Foto akan ditampilkan pada kartu menu di layar kasir untuk mempermudah identifikasi.
                  </p>
                </div>
              </div>
            </div>

            {/* Nama Menu */}
            <FormField
              control={form.control}
              name='nama'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Nama Menu <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Contoh: Nasi Goreng Spesial, Es Teh Manis'
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Kode Barcode (Opsional) */}
            <FormField
              control={form.control}
              name='kodeBarcode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>Kode Barcode (Opsional)</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Barcode className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        placeholder='Scan atau ketik kode barcode produk (mis. 8996001300112)'
                        {...field}
                        value={field.value ?? ''}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                          }
                        }}
                        disabled={isSubmitting}
                        className='pl-9'
                      />
                    </div>
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Kosongkan jika menu tidak memiliki barcode kemasan.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Kategori & Satuan (2 Kolom) */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='kategoriId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Kategori <span className='text-destructive'>*</span>
                    </FormLabel>
                    <Select
                      value={String(field.value || '')}
                      onValueChange={(val) => field.onChange(Number(val))}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Pilih Kategori' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeKategori.map((k) => (
                          <SelectItem key={k.id} value={String(k.id)}>
                            {k.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='satuan'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Satuan Penjualan <span className='text-destructive'>*</span>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Pilih Satuan' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SATUAN_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Harga Jual (Rupiah Otomatis) & Stok Minimum (2 Kolom) */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='hargaJual'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Harga Jual (Rp) <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <span className='absolute left-3 top-2 text-sm font-semibold text-muted-foreground'>
                          Rp
                        </span>
                        <Input
                          type='text'
                          inputMode='numeric'
                          className='pl-10 font-medium tabular-nums'
                          placeholder='0'
                          value={field.value ? formatNumber(field.value) : ''}
                          onChange={(e) => {
                            // Hapus semua karakter non-angka
                            const cleanNumber = e.target.value.replace(/\D/g, '')
                            field.onChange(cleanNumber ? parseInt(cleanNumber, 10) : 0)
                          }}
                          disabled={isSubmitting}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className='text-xs'>
                      Tersimpan sebagai integer rupiah murni tanpa desimal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='stokMinimum'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>Ambang Stok Minimum</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        placeholder='5'
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        disabled={isSubmitting}
                        className='tabular-nums'
                      />
                    </FormControl>
                    <FormDescription className='text-xs'>
                      Peringatan restock jika stok berjalan ≤ angka ini.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Kelola Penyesuaian Stok Terintegrasi (Khusus Edit Menu) */}
            {isEditing && selectedMenu && (
              <div className='rounded-xl border border-border bg-muted/20 p-3 space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Boxes className='size-4 text-primary' />
                    <span className='text-xs font-semibold uppercase tracking-wider text-foreground'>
                      Kelola Penyesuaian Stok
                    </span>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-xs text-muted-foreground'>Stok Saat Ini:</span>
                    <Badge
                      variant={currentStok <= (watchedStokMinimum ?? 5) ? 'destructive' : 'secondary'}
                      className='tabular-nums font-semibold text-xs py-0.5'
                    >
                      {loadingStok ? 'Memuat...' : `${currentStok} unit`}
                    </Badge>
                  </div>
                </div>

                {/* Tombol Pilihan Aksi Mutasi */}
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                  <button
                    type='button'
                    onClick={() => setAksiStok('NONE')}
                    className={`h-8 px-2 text-xs rounded-md border font-medium text-center transition-all flex items-center justify-center ${
                      aksiStok === 'NONE'
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'border-border bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    Tanpa Mutasi
                  </button>
                  <button
                    type='button'
                    onClick={() => setAksiStok('MASUK')}
                    className={`h-8 px-2 text-xs rounded-md border font-medium text-center transition-all flex items-center justify-center ${
                      aksiStok === 'MASUK'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs font-semibold'
                        : 'border-border bg-background hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 text-muted-foreground dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300'
                    }`}
                  >
                    Barang Masuk
                  </button>
                  <button
                    type='button'
                    onClick={() => setAksiStok('OPNAME')}
                    className={`h-8 px-2 text-xs rounded-md border font-medium text-center transition-all flex items-center justify-center ${
                      aksiStok === 'OPNAME'
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs font-semibold'
                        : 'border-border bg-background hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 text-muted-foreground dark:hover:bg-blue-950/30 dark:hover:text-blue-300'
                    }`}
                  >
                    Stok Opname
                  </button>
                  <button
                    type='button'
                    onClick={() => setAksiStok('RUSAK')}
                    className={`h-8 px-2 text-xs rounded-md border font-medium text-center transition-all flex items-center justify-center ${
                      aksiStok === 'RUSAK'
                        ? 'border-rose-600 bg-rose-600 text-white shadow-xs font-semibold'
                        : 'border-border bg-background hover:border-rose-300 hover:bg-rose-50/60 hover:text-rose-700 text-muted-foreground dark:hover:bg-rose-950/30 dark:hover:text-rose-300'
                    }`}
                  >
                    Barang Rusak
                  </button>
                </div>

                {/* Form Input Dinamis Berdasarkan Aksi yang Dipilih */}
                {aksiStok === 'MASUK' && (
                  <div className='space-y-3 rounded-lg border border-emerald-200/90 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/60 p-3.5'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-emerald-900 dark:text-emerald-200'>
                          Jumlah Barang Masuk <span className='text-destructive'>*</span>
                        </Label>
                        <Input
                          type='number'
                          min={1}
                          placeholder='Contoh: 10'
                          value={qtyMasuk}
                          onChange={(e) =>
                            setQtyMasuk(
                              e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0)
                            )
                          }
                          disabled={isSubmitting}
                          className='bg-background tabular-nums'
                        />
                      </div>
                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-emerald-900 dark:text-emerald-200'>
                          Harga Beli per Unit (Rp, Opsional)
                        </Label>
                        <Input
                          type='number'
                          min={0}
                          placeholder='Contoh: 5000'
                          value={hargaBeliMasuk}
                          onChange={(e) =>
                            setHargaBeliMasuk(
                              e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0)
                            )
                          }
                          disabled={isSubmitting}
                          className='bg-background tabular-nums'
                        />
                      </div>
                    </div>
                    <div className='space-y-1.5'>
                      <Label className='text-xs font-semibold text-emerald-900 dark:text-emerald-200'>
                        Alasan / Keterangan Restock <span className='text-destructive'>*</span>
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder='Contoh: Pembelian stok baru dari Toko Grosir Jaya'
                        value={alasanMasuk}
                        onChange={(e) => setAlasanMasuk(e.target.value)}
                        disabled={isSubmitting}
                        className='bg-background text-xs'
                      />
                    </div>
                    {typeof qtyMasuk === 'number' && qtyMasuk > 0 && (
                      <div className='text-xs text-emerald-800 dark:text-emerald-300 font-medium bg-emerald-100/50 dark:bg-emerald-900/30 p-2 rounded-md'>
                        Estimasi stok setelah restock: {currentStok} + {qtyMasuk} ={' '}
                        <span className='font-bold'>{currentStok + qtyMasuk} unit</span>
                      </div>
                    )}
                  </div>
                )}

                {aksiStok === 'OPNAME' && (
                  <div className='space-y-3 rounded-lg border border-blue-200/90 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/60 p-3.5'>
                    <div className='space-y-1.5'>
                      <Label className='text-xs font-semibold text-blue-900 dark:text-blue-200'>
                        Hasil Hitung Stok Fisik Aktual <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        type='number'
                        min={0}
                        placeholder='Contoh: 25'
                        value={qtyOpnameFisik}
                        onChange={(e) =>
                          setQtyOpnameFisik(
                            e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0)
                          )
                        }
                        disabled={isSubmitting}
                        className='bg-background tabular-nums'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label className='text-xs font-semibold text-blue-900 dark:text-blue-200'>
                        Alasan Penyesuaian Fisik (Opname) <span className='text-destructive'>*</span>
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder='Contoh: Penyesuaian hasil audit fisik rutin mingguan'
                        value={alasanOpname}
                        onChange={(e) => setAlasanOpname(e.target.value)}
                        disabled={isSubmitting}
                        className='bg-background text-xs'
                      />
                    </div>
                    {typeof qtyOpnameFisik === 'number' && (
                      <div className='text-xs text-blue-800 dark:text-blue-300 font-medium bg-blue-100/50 dark:bg-blue-900/30 p-2 rounded-md'>
                        Stok berjalan ({currentStok}) akan disesuaikan menjadi{' '}
                        <span className='font-bold'>{qtyOpnameFisik} unit</span> (Selisih:{' '}
                        {qtyOpnameFisik - currentStok >= 0
                          ? `+${qtyOpnameFisik - currentStok}`
                          : qtyOpnameFisik - currentStok}{' '}
                        unit)
                      </div>
                    )}
                  </div>
                )}

                {aksiStok === 'RUSAK' && (
                  <div className='space-y-3 rounded-lg border border-rose-200/90 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/60 p-3.5'>
                    <div className='space-y-1.5'>
                      <Label className='text-xs font-semibold text-rose-900 dark:text-rose-200'>
                        Jumlah Barang Rusak / Kadaluarsa <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        type='number'
                        min={1}
                        max={currentStok}
                        placeholder='Contoh: 3'
                        value={qtyRusak}
                        onChange={(e) =>
                          setQtyRusak(
                            e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0)
                          )
                        }
                        disabled={isSubmitting}
                        className='bg-background tabular-nums'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label className='text-xs font-semibold text-rose-900 dark:text-rose-200'>
                        Alasan Kerusakan / Basi <span className='text-destructive'>*</span>
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder='Contoh: Kemasan bocor saat pengiriman / melewati batas kadaluarsa'
                        value={alasanRusak}
                        onChange={(e) => setAlasanRusak(e.target.value)}
                        disabled={isSubmitting}
                        className='bg-background text-xs'
                      />
                    </div>
                    {typeof qtyRusak === 'number' && qtyRusak > 0 && (
                      <div className='text-xs text-rose-800 dark:text-rose-300 font-medium bg-rose-100/50 dark:bg-rose-900/30 p-2 rounded-md'>
                        Stok saat ini ({currentStok}) akan dikurangi {qtyRusak} unit menjadi{' '}
                        <span className='font-bold'>{Math.max(0, currentStok - qtyRusak)} unit</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className='pt-3 sm:justify-end gap-2 sm:gap-2.5'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type='submit'
                disabled={isSubmitting}
                className='gap-1.5 font-semibold'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='size-4 animate-spin' />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className='size-4' />
                    <span>{isEditing ? 'Simpan Perubahan' : 'Buat Menu'}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
