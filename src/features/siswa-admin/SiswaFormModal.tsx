import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, CreditCard, Upload, Image as ImageIcon, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { useRfidScanner } from '@/hooks/useRfidScanner'
import { getErrorMessage } from '@/lib/validation-error'
import { siswaAdminApi } from './api/siswa-admin-api'
import {
  siswaFormSchema,
  type SiswaFormValues,
  type SiswaManajemenItem,
} from './types'

interface SiswaFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedSiswa: SiswaManajemenItem | null
  onSaved: (saved: SiswaManajemenItem) => void
}

const DEFAULT_VALUES: SiswaFormValues = {
  nis: '',
  nisn: '',
  nama: '',
  kelas: '',
  fotoUrl: '',
  rfidUid: '',
  nomorKartu: '',
  namaOrangTua: '',
  teleponOrangTua: '',
  hubunganOrangTua: '',
}

export function SiswaFormModal({
  open,
  onOpenChange,
  selectedSiswa,
  onSaved,
}: SiswaFormModalProps) {
  const isEditing = Boolean(selectedSiswa)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<SiswaFormValues>({
    resolver: zodResolver(siswaFormSchema),
    mode: 'onTouched',
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    if (selectedSiswa) {
      form.reset({
        nis: selectedSiswa.nis ?? '',
        nisn: selectedSiswa.nisn ?? '',
        nama: selectedSiswa.nama ?? '',
        kelas: selectedSiswa.kelas ?? '',
        fotoUrl: selectedSiswa.fotoUrl ?? '',
        rfidUid: selectedSiswa.rfidUid ?? '',
        nomorKartu: selectedSiswa.nomorKartu ?? '',
        namaOrangTua: selectedSiswa.namaOrangTua ?? '',
        teleponOrangTua: selectedSiswa.teleponOrangTua ?? '',
        hubunganOrangTua:
          selectedSiswa.hubunganOrangTua === 'AYAH' ||
          selectedSiswa.hubunganOrangTua === 'IBU' ||
          selectedSiswa.hubunganOrangTua === 'WALI'
            ? selectedSiswa.hubunganOrangTua
            : '',
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, selectedSiswa, form])

  useRfidScanner({
    enabled: open,
    onScan: (uid) => {
      form.setValue('rfidUid', uid, { shouldDirty: true, shouldValidate: true })
      toast.info(`UID RFID ${uid} terisi ke formulir. Periksa data lalu klik Simpan.`)
    },
  })

  const fotoUrl = useWatch({ control: form.control, name: 'fotoUrl' })
  const previewUrl = siswaAdminApi.getFotoUrl(fotoUrl)

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setIsUploading(true)
    try {
      const uploaded = await siswaAdminApi.uploadFotoSiswa(file)
      const nilaiUrl = uploaded.path || uploaded.url
      form.setValue('fotoUrl', nilaiUrl, { shouldDirty: true, shouldValidate: true })
      toast.success('Foto siswa berhasil diunggah')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengunggah foto siswa'))
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = async (values: SiswaFormValues) => {
    const payload = {
      nis: values.nis.trim(),
      nisn: values.nisn?.trim() || undefined,
      nama: values.nama.trim(),
      kelas: values.kelas?.trim() || undefined,
      fotoUrl: values.fotoUrl?.trim() || undefined,
      rfidUid: values.rfidUid?.trim() ? values.rfidUid.trim().toUpperCase() : undefined,
      nomorKartu: values.nomorKartu?.trim() || undefined,
      namaOrangTua: values.namaOrangTua?.trim() || undefined,
      teleponOrangTua: values.teleponOrangTua?.trim() || undefined,
      hubunganOrangTua: values.hubunganOrangTua || undefined,
    }

    try {
      const saved = selectedSiswa
        ? await siswaAdminApi.update(selectedSiswa.siswaId, payload)
        : await siswaAdminApi.create(payload)
      toast.success(
        selectedSiswa
          ? `Data siswa ${saved.nama} berhasil diperbarui`
          : `Siswa ${saved.nama} berhasil ditambahkan (saldo awal Rp 0)`
      )
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan data siswa'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Data Siswa Sementara' : 'Tambah Siswa & Kartu RFID Baru'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Perbarui identitas siswa, kontak wali, atau kartu RFID aktif.'
              : 'Siswa baru otomatis dimulai dengan saldo Rp 0. Top-up saldo dilakukan oleh TU.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5' noValidate>
            <fieldset className='space-y-3 rounded-lg border p-3.5'>
              <legend className='px-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Identitas Siswa
              </legend>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='nis'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        NIS <span className='text-destructive' aria-hidden='true'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='Contoh: 2026001'
                          inputMode='numeric'
                          autoCorrect='off'
                          autoCapitalize='none'
                          spellCheck={false}
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='nisn'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NISN</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='Opsional, mis. 0088123456'
                          inputMode='numeric'
                          autoCorrect='off'
                          autoCapitalize='none'
                          spellCheck={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                <div className='sm:col-span-2'>
                  <FormField
                    control={form.control}
                    name='nama'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nama Lengkap <span className='text-destructive' aria-hidden='true'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='Nama lengkap siswa'
                            autoComplete='name'
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name='kelas'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kelas</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder='Mis. X IPA 1' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='fotoUrl'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto Siswa (Opsional)</FormLabel>
                    <div className='flex flex-wrap items-center gap-3'>
                      {previewUrl ? (
                        <div className='relative size-14 shrink-0 overflow-hidden rounded-lg border bg-muted'>
                          <img
                            src={previewUrl}
                            alt='Pratinjau foto siswa'
                            className='size-full object-cover'
                          />
                          <button
                            type='button'
                            onClick={() => form.setValue('fotoUrl', '', { shouldDirty: true })}
                            className='absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 text-muted-foreground hover:text-foreground'
                            aria-label='Hapus foto'
                          >
                            <X className='size-3' />
                          </button>
                        </div>
                      ) : (
                        <div className='flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground'>
                          <ImageIcon className='size-5' />
                        </div>
                      )}

                      <div className='flex flex-1 flex-col gap-2'>
                        <div className='flex gap-2'>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder='Path storage atau URL foto https://...'
                              autoCorrect='off'
                              autoCapitalize='none'
                              spellCheck={false}
                            />
                          </FormControl>
                          <input
                            ref={fileInputRef}
                            type='file'
                            accept='image/jpeg,image/png,image/webp'
                            className='hidden'
                            onChange={handleUploadFoto}
                          />
                          <Button
                            type='button'
                            variant='outline'
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {isUploading ? (
                              <Loader2 className='size-4 animate-spin' />
                            ) : (
                              <Upload className='size-4' />
                            )}
                            <span className='ml-1.5'>Unggah</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <fieldset className='space-y-3 rounded-lg border p-3.5'>
              <legend className='px-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Orang Tua / Wali (Opsional)
              </legend>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                <FormField
                  control={form.control}
                  name='namaOrangTua'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Wali</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder='Mis. Ahmad Santoso' autoComplete='name' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='teleponOrangTua'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. HP / WhatsApp</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='0812xxxxxxxx'
                          inputMode='tel'
                          autoComplete='tel'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='hubunganOrangTua'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hubungan</FormLabel>
                      <Select
                        value={field.value || 'NONE'}
                        onValueChange={(val) =>
                          field.onChange(val === 'NONE' ? '' : val)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Pilih hubungan' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='NONE'>- Tidak ditentukan -</SelectItem>
                          <SelectItem value='AYAH'>Ayah</SelectItem>
                          <SelectItem value='IBU'>Ibu</SelectItem>
                          <SelectItem value='WALI'>Wali</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>

            <fieldset className='space-y-3 rounded-lg border p-3.5'>
              <legend className='px-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Kartu RFID (Opsional)
              </legend>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='rfidUid'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <CreditCard className='size-3.5 text-muted-foreground' />
                        UID RFID
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='Tap kartu di USB reader atau ketik UID'
                          autoCorrect='off'
                          autoCapitalize='none'
                          spellCheck={false}
                        />
                      </FormControl>
                      <FormDescription>
                        Tap kartu ke reader USB mengisi kolom otomatis tanpa auto-submit.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='nomorKartu'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Cetak Kartu</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='Mis. K-2026-001'
                          autoCorrect='off'
                          autoCapitalize='none'
                          spellCheck={false}
                        />
                      </FormControl>
                      <FormDescription>
                        Nomor tercetak fisik pada kartu (opsional).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type='submit' disabled={form.formState.isSubmitting || isUploading}>
                {form.formState.isSubmitting && (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                )}
                {isEditing ? 'Simpan Perubahan' : 'Simpan Siswa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
