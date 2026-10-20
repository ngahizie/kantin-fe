import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
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
import { katalogApi } from './api/katalog-api'
import {
  kategoriFormSchema,
  type KategoriFormValues,
  type KategoriItem,
} from './types'

interface KategoriFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedKategori?: KategoriItem | null
  onSuccess: () => void
}

export function KategoriFormModal({
  open,
  onOpenChange,
  selectedKategori,
  onSuccess,
}: KategoriFormModalProps) {
  const isEditing = Boolean(selectedKategori)

  const form = useForm<KategoriFormValues>({
    resolver: zodResolver(kategoriFormSchema),
    defaultValues: {
      nama: '',
      urutan: 0,
    },
  })

  const { isSubmitting } = form.formState

  // Sinkronisasi data saat modal dibuka untuk mode edit
  useEffect(() => {
    if (open) {
      if (selectedKategori) {
        form.reset({
          nama: selectedKategori.nama,
          urutan: selectedKategori.urutan || 0,
        })
      } else {
        form.reset({
          nama: '',
          urutan: 0,
        })
      }
    }
  }, [open, selectedKategori, form])

  async function onSubmit(values: KategoriFormValues) {
    try {
      if (isEditing && selectedKategori) {
        await katalogApi.updateKategori(selectedKategori.id, values)
        toast.success(`Kategori "${values.nama}" berhasil diperbarui`)
      } else {
        await katalogApi.createKategori(values)
        toast.success(`Kategori "${values.nama}" berhasil ditambahkan`)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message = error.response?.data?.message || error.message || 'Gagal menyimpan kategori'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md border-none rounded-2xl shadow-none bg-card'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>
            {isEditing ? 'Ubah Kategori Menu' : 'Tambah Kategori Baru'}
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            {isEditing
              ? 'Perbarui informasi kategori menu kantin sekolah.'
              : 'Tambahkan kategori baru untuk mengelompokkan makanan, minuman, dan snack.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-2'>
            <FormField
              control={form.control}
              name='nama'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Nama Kategori <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Contoh: Makanan Berat, Minuman Dingin'
                      {...field}
                      disabled={isSubmitting}
                      autoFocus
                      className='h-10 border-none bg-muted/60 dark:bg-muted/40 shadow-none rounded-xl focus-visible:bg-muted focus-visible:ring-0 text-sm'
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Maksimal 100 karakter. Digunakan untuk filter di kasir dan back office.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='urutan'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>Urutan Tampil</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      placeholder='0'
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      disabled={isSubmitting}
                      className='h-10 border-none bg-muted/60 dark:bg-muted/40 shadow-none rounded-xl focus-visible:bg-muted focus-visible:ring-0 text-sm tabular-nums'
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Angka lebih kecil akan tampil lebih awal pada tab kategori kasir.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='pt-2 sm:justify-end gap-2'>
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
                    <span>{isEditing ? 'Simpan Perubahan' : 'Buat Kategori'}</span>
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
