import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Store, Cpu, Save, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  titikKasirFormSchema,
  type TitikKasir,
  type TitikKasirFormValues,
} from './types'

interface TitikKasirFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: TitikKasir | null
  onSubmit: (values: TitikKasirFormValues) => Promise<void>
  isSubmitting?: boolean
}

export const TitikKasirFormModal: React.FC<TitikKasirFormModalProps> = ({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting = false,
}) => {
  const isEdit = Boolean(initialData)

  const form = useForm<TitikKasirFormValues>({
    resolver: zodResolver(titikKasirFormSchema),
    defaultValues: {
      nama: '',
      kode: '',
      aktif: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          nama: initialData.nama,
          kode: initialData.kode,
          aktif: initialData.aktif,
        })
      } else {
        form.reset({
          nama: '',
          kode: '',
          aktif: true,
        })
      }
    }
  }, [open, initialData, form])

  const handleSubmit = async (values: TitikKasirFormValues) => {
    await onSubmit({
      ...values,
      kode: values.kode.toUpperCase(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2.5'>
            <Store className='h-5 w-5 text-primary shrink-0' />
            <div>
              <DialogTitle className='text-lg font-bold'>
                {isEdit ? 'Edit Titik Kasir' : 'Tambah Titik Kasir Baru'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                {isEdit
                  ? 'Perbarui data perangkat titik kasir operasional sekolah.'
                  : 'Daftarkan perangkat tablet/PC kasir baru untuk melayani transaksi kantin.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4 py-2'
          >
            {/* Field Nama Titik Kasir */}
            <FormField
              control={form.control}
              name='nama'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Nama Titik Kasir <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Store className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        placeholder='Contoh: Kasir 1 - Kantin Utama'
                        className='pl-9 text-sm'
                        disabled={isSubmitting}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription className='text-[11px] text-muted-foreground'>
                    Nama identitas titik kasir yang mudah dikenali oleh petugas.
                  </FormDescription>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            {/* Field Kode Perangkat */}
            <FormField
              control={form.control}
              name='kode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Kode Perangkat / POS ID{' '}
                    <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Cpu className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        placeholder='Contoh: POS-01 / KASIR-UTAMA'
                        className='pl-9 font-mono text-sm uppercase'
                        disabled={isSubmitting}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </div>
                  </FormControl>
                  <FormDescription className='text-[11px] text-muted-foreground'>
                    Kode unik pengenal perangkat di database backend (maks. 30
                    karakter).
                  </FormDescription>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            {/* Field Status Aktif */}
            <FormField
              control={form.control}
              name='aktif'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border border-border bg-muted/30 p-3'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-xs font-semibold'>
                      Status Operasional Aktif
                    </FormLabel>
                    <FormDescription className='text-[11px] text-muted-foreground'>
                      Bila dinonaktifkan, titik kasir ini tidak dapat dipilih
                      oleh petugas di layar POS.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type='submit' disabled={isSubmitting} className='gap-2'>
                {isSubmitting ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4' />
                    <span>{isEdit ? 'Simpan Perubahan' : 'Buat Titik Kasir'}</span>
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

export default TitikKasirFormModal
