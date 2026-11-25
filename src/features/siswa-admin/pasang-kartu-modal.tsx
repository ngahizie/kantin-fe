import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreditCard, Loader2, Radio, Unlink } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
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
import { useRfidScanner } from '@/hooks/use-rfid-scanner'
import { getErrorMessage } from '@/lib/validation-error'
import { siswaAdminApi } from './api/siswa-admin-api'
import {
  pasangKartuSchema,
  type PasangKartuFormValues,
  type SiswaManajemenItem,
} from './types'

interface PasangKartuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siswa: SiswaManajemenItem | null
  onSaved: (updated: SiswaManajemenItem) => void
}

export function PasangKartuModal({
  open,
  onOpenChange,
  siswa,
  onSaved,
}: PasangKartuModalProps) {
  const [isDeactivating, setIsDeactivating] = useState(false)

  const form = useForm<PasangKartuFormValues>({
    resolver: zodResolver(pasangKartuSchema),
    mode: 'onTouched',
    defaultValues: {
      rfidUid: '',
      nomorKartu: '',
    },
  })

  useEffect(() => {
    if (!open || !siswa) return
    form.reset({
      rfidUid: siswa.rfidUid ?? '',
      nomorKartu: siswa.nomorKartu ?? '',
    })
  }, [open, siswa, form])

  useRfidScanner({
    enabled: open && Boolean(siswa),
    onScan: (uid) => {
      form.setValue('rfidUid', uid, { shouldDirty: true, shouldValidate: true })
      toast.info(`UID kartu ${uid} terdeteksi. Klik Simpan Kartu untuk menerapkan.`)
    },
  })

  const onSubmit = async (values: PasangKartuFormValues) => {
    if (!siswa) return
    try {
      const updated = await siswaAdminApi.aturKartu(siswa.siswaId, {
        rfidUid: values.rfidUid.trim().toUpperCase(),
        nomorKartu: values.nomorKartu?.trim() || undefined,
        nonaktifkanKartu: false,
      })
      toast.success(`Kartu RFID untuk ${updated.nama} berhasil diperbarui`)
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan kartu RFID siswa'))
    }
  }

  const handleLepasKartu = async () => {
    if (!siswa) return
    setIsDeactivating(true)
    try {
      const updated = await siswaAdminApi.aturKartu(siswa.siswaId, {
        nonaktifkanKartu: true,
      })
      toast.success(`Kartu RFID milik ${updated.nama} dinonaktifkan`)
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menonaktifkan kartu RFID'))
    } finally {
      setIsDeactivating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Kelola Kartu RFID Siswa</DialogTitle>
          <DialogDescription>
            {siswa ? `${siswa.nama} (NIS ${siswa.nis})` : 'Pilih siswa'}
          </DialogDescription>
        </DialogHeader>

        {siswa && (
          <div className='rounded-lg border bg-muted/40 p-3 text-xs'>
            <div className='flex items-center justify-between gap-2'>
              <span className='font-medium text-muted-foreground'>Kartu Aktif Saat Ini</span>
              {siswa.rfidUid ? (
                <Badge variant='secondary' className='font-mono'>
                  {siswa.rfidUid}
                </Badge>
              ) : (
                <Badge variant='outline'>Belum Ada Kartu</Badge>
              )}
            </div>
            <p className='mt-2 flex items-center gap-1.5 text-muted-foreground'>
              <Radio className='size-3.5 text-emerald-600' />
              Siap menerima tap USB RFID reader — kartu lama otomatis dinonaktifkan saat diganti.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4' noValidate>
            <FormField
              control={form.control}
              name='rfidUid'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='flex items-center gap-1.5'>
                    <CreditCard className='size-3.5 text-muted-foreground' />
                    UID RFID Baru <span className='text-destructive' aria-hidden='true'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='Tap kartu atau ketik UID (4-50 karakter)'
                      autoCorrect='off'
                      autoCapitalize='none'
                      spellCheck={false}
                      required
                    />
                  </FormControl>
                  <FormDescription>
                    Mengetik manual tidak akan mengirim formulir secara otomatis.
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
                  <FormLabel>Nomor Cetak Kartu (Opsional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='Mis. K-2026-001'
                      autoCorrect='off'
                      autoCapitalize='none'
                      spellCheck={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='flex-col gap-2 sm:flex-row sm:justify-between'>
              {siswa?.rfidUid ? (
                <Button
                  type='button'
                  variant='outline'
                  className='text-destructive hover:text-destructive'
                  disabled={isDeactivating || form.formState.isSubmitting}
                  onClick={handleLepasKartu}
                >
                  {isDeactivating ? (
                    <Loader2 className='mr-1.5 size-4 animate-spin' />
                  ) : (
                    <Unlink className='mr-1.5 size-4' />
                  )}
                  Lepas Kartu
                </Button>
              ) : (
                <span />
              )}

              <div className='flex justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                >
                  Batal
                </Button>
                <Button
                  type='submit'
                  disabled={form.formState.isSubmitting || isDeactivating}
                >
                  {form.formState.isSubmitting && (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  )}
                  Simpan Kartu
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
