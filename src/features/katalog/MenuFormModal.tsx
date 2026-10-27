import { useState, useEffect, useRef, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2,
  Save,
  Upload,
  Image as ImageIcon,
  X,
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
  const previewUrl = watchedFotoUrl || ''

  // Sinkronisasi data awal saat modal dibuka
  useEffect(() => {
    if (open) {
      if (selectedMenu) {
        form.reset({
          nama: selectedMenu.nama,
          kategoriId: selectedMenu.kategoriId || defaultKategoriId,
          hargaJual: selectedMenu.hargaJual,
          satuan: (selectedMenu.satuan?.toUpperCase() as SatuanType) || 'PCS',
          stokMinimum: selectedMenu.stokMinimum ?? 5,
          fotoUrl: selectedMenu.fotoUrl || '',
          aktif: selectedMenu.aktif !== false,
        })
      } else {
        form.reset({
          nama: '',
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
      // Pastikan harga jual murni integer rupiah
      const payload: MenuFormValues = {
        ...values,
        hargaJual: Math.round(Number(values.hargaJual)),
        stokMinimum: Math.round(Number(values.stokMinimum)),
        aktif: Boolean(values.aktif),
      }

      if (isEditing && selectedMenu) {
        await katalogApi.updateMenu(selectedMenu.id, payload)
        toast.success(`Menu "${payload.nama}" berhasil diperbarui`)
      } else {
        await katalogApi.createMenu(payload)
        toast.success(`Menu "${payload.nama}" berhasil ditambahkan`)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message = error.response?.data?.message || error.message || 'Gagal menyimpan menu'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto border-none rounded-2xl shadow-none bg-card'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>{isEditing ? 'Ubah Menu Kantin' : 'Tambah Menu Baru'}</DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            {isEditing
              ? 'Perbarui detail nama, kategori, harga jual rupiah, dan batas stok minimum.'
              : 'Lengkapi informasi menu baru untuk ditampilkan pada kasir POS.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-1'>
            {/* Foto Produk Section */}
            <div className='rounded-xl border-none bg-muted/40 p-3 space-y-3'>
              <Label className='text-xs font-semibold text-foreground flex items-center justify-between'>
                <span>Foto Produk</span>
                <span className='text-[11px] font-normal text-muted-foreground'>
                  Format JPG, PNG, WEBP (Maks 2MB)
                </span>
              </Label>

              <div className='flex items-center gap-4'>
                <div className='relative size-20 rounded-xl border-none bg-background flex items-center justify-center overflow-hidden shrink-0 group'>
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
                      variant='secondary'
                      size='sm'
                      className='gap-1.5 text-xs border-none bg-background/80 dark:bg-background/20 text-foreground hover:bg-background rounded-xl shadow-none'
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
                      className='h-10 border-none bg-muted/60 dark:bg-muted/40 shadow-none rounded-xl focus-visible:bg-muted focus-visible:ring-0 text-sm'
                    />
                  </FormControl>
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
                        <SelectTrigger className='h-10 border-none bg-muted/60 dark:bg-muted/40 shadow-none rounded-xl focus:ring-0 focus-visible:ring-0 text-sm'>
                          <SelectValue placeholder='Pilih Kategori' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='border-none rounded-xl shadow-none'>
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
                        <SelectTrigger className='h-10 border-none bg-muted/60 dark:bg-muted/40 shadow-none rounded-xl focus:ring-0 focus-visible:ring-0 text-sm'>
                          <SelectValue placeholder='Pilih Satuan' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='border-none rounded-xl shadow-none'>
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
                        <span className='absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground'>
                          Rp
                        </span>
                        <Input
                          type='text'
                          inputMode='numeric'
                          className='h-10 pl-10 font-medium border-none bg-muted/60 dark:bg-muted/40 shadow-none rounded-xl focus-visible:bg-muted focus-visible:ring-0 text-sm'
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
                        className='h-10 border-none bg-muted/60 dark:bg-muted/40 shadow-none rounded-xl focus-visible:bg-muted focus-visible:ring-0 text-sm'
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

            {/* Toggle Status Aktif */}
            <div className='flex items-center justify-between rounded-xl border-none p-3 bg-muted/40'>
              <div className='space-y-0.5'>
                <Label className='text-xs font-semibold'>Status Aktif Menu</Label>
                <p className='text-xs text-muted-foreground'>
                  Menu nonaktif otomatis disembunyikan dari layar kasir POS.
                </p>
              </div>
              <Controller
                control={form.control}
                name='aktif'
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>

            <DialogFooter className='pt-3 sm:justify-end gap-2 sm:gap-2.5'>
              <Button
                type='button'
                variant='secondary'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className='border-none bg-muted/70 dark:bg-muted/30 text-foreground hover:bg-muted rounded-xl shadow-none'
              >
                Batal
              </Button>
              <Button
                type='submit'
                disabled={isSubmitting}
                className='gap-1.5 font-semibold border-none rounded-xl shadow-none'
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
