import React, { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Store,
  Clock,
  ShieldCheck,
  Camera,
  Coins,
  Save,
  RotateCcw,
  Calendar,
  UserCheck,
  Loader2,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/formatters'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search as SearchHeader } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { usePengaturanStore } from '@/stores/usePengaturanStore'
import {
  pengaturanKantinSchema,
  type PengaturanKantinFormValues,
} from './types'

const DEFAULT_FORM_VALUES: PengaturanKantinFormValues = {
  namaKantin: 'Kantin Sehat SKOOLIA',
  jamTutupOtomatis: '23:59',
  konfirmasiManual: false,
  durasiFotoDetik: 3,
  minTopup: 5000,
  maksTopup: 500000,
  batasSaldoSiswa: 1000000,
  batasSaldoKartuTamu: 500000,
}

export const PengaturanKantinPage: React.FC = () => {
  const {
    pengaturan,
    fetchPengaturan,
    updatePengaturan,
    loadingPengaturan,
  } = usePengaturanStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewCountdown, setPreviewCountdown] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<PengaturanKantinFormValues>({
    resolver: zodResolver(pengaturanKantinSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  // Watch field values for dynamic previews
  const watchedDurasi = watch('durasiFotoDetik', 3)
  const watchedKonfirmasi = watch('konfirmasiManual', false)
  const watchedMinTopup = watch('minTopup', 5000)
  const watchedMaxTopup = watch('maksTopup', 500000)
  const watchedMaxSaldoSiswa = watch('batasSaldoSiswa', 1000000)
  const watchedMaxSaldoKartuTamu = watch('batasSaldoKartuTamu', 500000)

  // Muat data dari server saat mount
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const data = await fetchPengaturan()
        if (isMounted && data) {
          const jamShort = (data.jamTutupOtomatis || '23:59').substring(0, 5)
          reset({
            namaKantin: data.namaKantin,
            jamTutupOtomatis: jamShort,
            konfirmasiManual: data.konfirmasiManual,
            durasiFotoDetik: data.durasiFotoDetik,
            minTopup: data.minTopup,
            maksTopup: data.maksTopup,
            batasSaldoSiswa: data.batasSaldoSiswa,
            batasSaldoKartuTamu: data.batasSaldoKartuTamu,
          })
        }
      } catch {
        toast.error('Gagal memuat pengaturan operasional')
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [fetchPengaturan, reset])

  // Simulasi preview countdown foto
  const handleTestPreviewCountdown = useCallback(() => {
    setPreviewCountdown(watchedDurasi)
    const interval = setInterval(() => {
      setPreviewCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }, [watchedDurasi])

  // Submit Handler
  const onSubmit = async (values: PengaturanKantinFormValues) => {
    try {
      setIsSubmitting(true)
      const updated = await updatePengaturan(values)
      const jamShort = (updated.jamTutupOtomatis || '23:59').substring(0, 5)
      reset({
        namaKantin: updated.namaKantin,
        jamTutupOtomatis: jamShort,
        konfirmasiManual: updated.konfirmasiManual,
        durasiFotoDetik: updated.durasiFotoDetik,
        minTopup: updated.minTopup,
        maksTopup: updated.maksTopup,
        batasSaldoSiswa: updated.batasSaldoSiswa,
        batasSaldoKartuTamu: updated.batasSaldoKartuTamu,
      })
      toast.success(
        'Pengaturan operasional kantin berhasil disimpan dan tersinkronisasi ke klien kasir!'
      )
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } }
      const msg =
        errorObj.response?.data?.message ||
        'Gagal menyimpan konfigurasi ke backend kantin-be'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset to default preset
  const handleResetToDefault = () => {
    reset(DEFAULT_FORM_VALUES)
    toast.info('Formulir dikembalikan ke nilai bawaan standar SKOOLIA')
  }

  return (
    <>
      <Header>
        <SearchHeader className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed>
        <div className='flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6'>
          {/* Header Title & Nav Tabs */}
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h1 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
                Konfigurasi Operasional Kantin
              </h1>
            </div>

            {/* Quick Audit Info Badge */}
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className='hidden sm:flex items-center gap-1.5 py-1 px-2.5 text-xs font-mono text-muted-foreground border-0 shadow-none'
              >
                <Calendar className='h-3.5 w-3.5' />
                <span>
                  Update:{' '}
                  {pengaturan.updatedAt
                    ? new Date(pengaturan.updatedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Bawaan'}
                </span>
              </Badge>
            </div>
          </div>

          {/* Alert Sinkronisasi Real-Time */}
          <Alert className='border-0 shadow-none bg-primary/5 text-primary'>
            <AlertTitle className='text-xs font-bold text-foreground'>
              Sinkronisasi Otomatis ke Klien Kasir POS
            </AlertTitle>
            <AlertDescription className='text-xs text-muted-foreground'>
              Semua perubahan jam tutup otomatis, durasi tampil foto, dan langkah
              konfirmasi akan langsung berlaku pada sesi klien kasir dan tervalidasi di database backend kantin-be.
            </AlertDescription>
          </Alert>

          {/* Form Pengaturan */}
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
            <div className='grid gap-6 md:grid-cols-2'>
              {/* Card 1: Identitas & Jam Tutup Otomatis */}
              <Card className='border-0 bg-muted/60 dark:bg-muted/25 shadow-sm'>
                <CardHeader>
                  <div className='flex items-center gap-2.5'>
                    <Store className='h-5 w-5 text-primary shrink-0' />
                    <div>
                      <CardTitle className='text-base font-bold'>
                        Profil & Waktu Operasional
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        Nama kantin sekolah dan jadwal tutup kasir otomatis.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='space-y-4 pt-1'>
                  {/* Nama Kantin Sekolah */}
                  <div className='space-y-1.5'>
                    <Label
                      htmlFor='namaKantin'
                      className='text-xs font-semibold'
                    >
                      Nama Kantin Sekolah{' '}
                      <span className='text-destructive'>*</span>
                    </Label>
                    <div className='relative'>
                      <Store className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        id='namaKantin'
                        placeholder='Contoh: Kantin Sehat SKOOLIA'
                        className='pl-9 text-sm bg-background'
                        disabled={isSubmitting || loadingPengaturan}
                        {...register('namaKantin')}
                      />
                    </div>
                    {errors.namaKantin && (
                      <p className='text-xs text-destructive'>
                        {errors.namaKantin.message}
                      </p>
                    )}
                    <p className='text-[11px] text-muted-foreground'>
                      Nama ini ditampilkan pada struk cetak dan header layar
                      kasir.
                    </p>
                  </div>

                  {/* Jam Tutup Kasir Otomatis */}
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <Label
                        htmlFor='jamTutupOtomatis'
                        className='text-xs font-semibold'
                      >
                        Jam Tutup Kasir Otomatis{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Badge
                        variant='secondary'
                        className='border-0 bg-background font-mono text-[11px] text-muted-foreground'
                      >
                        Bawaan: 23:59
                      </Badge>
                    </div>
                    <div className='relative'>
                      <Clock className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        id='jamTutupOtomatis'
                        type='text'
                        placeholder='23:59'
                        className='pl-9 font-mono text-sm bg-background'
                        disabled={isSubmitting || loadingPengaturan}
                        {...register('jamTutupOtomatis')}
                      />
                    </div>
                    {errors.jamTutupOtomatis && (
                      <p className='text-xs text-destructive'>
                        {errors.jamTutupOtomatis.message}
                      </p>
                    )}
                    <p className='text-[11px] text-muted-foreground'>
                      Format <code>HH:mm</code> (24 jam). Sistem menutup sesi
                      secara otomatis pada jam yang ditentukan jika kasir belum
                      tutup manual.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Interaksi Kasir POS (Foto & Konfirmasi Manual) */}
              <Card className='border-0 bg-muted/60 dark:bg-muted/25 shadow-sm'>
                <CardHeader>
                  <div className='flex items-center gap-2.5'>
                    <Camera className='h-5 w-5 text-primary shrink-0' />
                    <div>
                      <CardTitle className='text-base font-bold'>
                        Interaksi Kasir POS & Foto
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        Verifikasi visual wajah siswa dan alur konfirmasi transaksi.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='space-y-4 pt-1'>
                  {/* Toggle Konfirmasi Manual */}
                  <div className='flex flex-row items-center justify-between py-1'>
                    <div className='space-y-0.5 pr-3'>
                      <div className='flex items-center gap-2'>
                        <Label
                          htmlFor='konfirmasiManual'
                          className='text-xs font-semibold cursor-pointer'
                        >
                          Langkah Konfirmasi Manual
                        </Label>
                        <Badge
                          variant={watchedKonfirmasi ? 'default' : 'secondary'}
                          className='text-[10px]'
                        >
                          {watchedKonfirmasi ? 'Aktif' : 'Nonaktif (Default)'}
                        </Badge>
                      </div>
                      <p className='text-[11px] text-muted-foreground'>
                        Petugas kasir wajib menekan "Konfirmasi" sebelum transaksi
                        tercatat. Nonaktifkan untuk 1-tap checkout cepat.
                      </p>
                    </div>
                    <Controller
                      name='konfirmasiManual'
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id='konfirmasiManual'
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting || loadingPengaturan}
                        />
                      )}
                    />
                  </div>

                  {/* Durasi Tampil Foto Siswa */}
                  <div className='space-y-2 py-1'>
                    <div className='flex items-center justify-between'>
                      <Label
                        htmlFor='durasiFotoDetik'
                        className='text-xs font-semibold'
                      >
                        Durasi Tampil Foto Siswa
                      </Label>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={handleTestPreviewCountdown}
                        className='h-6 px-1.5 text-[10px]'
                        title='Uji coba hitung mundur foto'
                      >
                        <Eye className='h-3 w-3 mr-1' /> Tes Hitung Mundur
                      </Button>
                    </div>

                    <div className='flex items-center gap-3'>
                      <Input
                        id='durasiFotoDetik'
                        type='number'
                        min={1}
                        max={30}
                        className='h-9 font-mono text-sm w-24 bg-background'
                        disabled={isSubmitting || loadingPengaturan}
                        {...register('durasiFotoDetik', {
                          valueAsNumber: true,
                        })}
                      />
                      <div className='flex-1 text-[11px] text-muted-foreground'>
                        Lama foto siswa tampil di layar kasir untuk verifikasi
                        visual wajah (default 3 detik, min. 1 s/d 30 detik).
                      </div>
                    </div>

                    {errors.durasiFotoDetik && (
                      <p className='text-xs text-destructive'>
                        {errors.durasiFotoDetik.message}
                      </p>
                    )}

                    {/* Preview Simulasi Countdown jika diuji */}
                    {previewCountdown !== null && (
                      <div className='mt-2 flex items-center justify-center gap-2 rounded-md bg-emerald-500/10 p-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                        <Clock className='h-4 w-4 animate-pulse' />
                        <span>
                          Simulasi modal foto kasir menutup otomatis dalam:{' '}
                          <strong className='font-mono text-sm'>
                            {previewCountdown}s
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Batas Plafon Top-Up Siswa */}
              <Card className='border-0 bg-muted/60 dark:bg-muted/25 shadow-sm'>
                <CardHeader>
                  <div className='flex items-center gap-2.5'>
                    <Coins className='h-5 w-5 text-primary shrink-0' />
                    <div>
                      <CardTitle className='text-base font-bold'>
                        Batas Transaksi Top-Up
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        Batas minimum dan maksimum pengisian saldo per transaksi di TU.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='space-y-4 pt-1'>
                  {/* Min Top-up */}
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <Label htmlFor='minTopup' className='text-xs font-semibold'>
                        Batas Minimum Sekali Top-Up
                      </Label>
                      <span className='font-mono text-xs font-bold text-muted-foreground'>
                        {formatRupiah(watchedMinTopup || 0)}
                      </span>
                    </div>
                    <Input
                      id='minTopup'
                      type='number'
                      step={1000}
                      min={1000}
                      placeholder='5000'
                      className='font-mono text-sm bg-background'
                      disabled={isSubmitting || loadingPengaturan}
                      {...register('minTopup', { valueAsNumber: true })}
                    />
                    {errors.minTopup && (
                      <p className='text-xs text-destructive'>
                        {errors.minTopup.message}
                      </p>
                    )}
                    <p className='text-[11px] text-muted-foreground'>
                      Nominal paling kecil yang diizinkan saat petugas TU memproses isi saldo.
                    </p>
                  </div>

                  {/* Max Top-up */}
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <Label htmlFor='maksTopup' className='text-xs font-semibold'>
                        Batas Maksimum Sekali Top-Up
                      </Label>
                      <span className='font-mono text-xs font-bold text-muted-foreground'>
                        {formatRupiah(watchedMaxTopup || 0)}
                      </span>
                    </div>
                    <Input
                      id='maksTopup'
                      type='number'
                      step={10000}
                      min={1000}
                      placeholder='500000'
                      className='font-mono text-sm bg-background'
                      disabled={isSubmitting || loadingPengaturan}
                      {...register('maksTopup', { valueAsNumber: true })}
                    />
                    {errors.maksTopup && (
                      <p className='text-xs text-destructive'>
                        {errors.maksTopup.message}
                      </p>
                    )}
                    <p className='text-[11px] text-muted-foreground'>
                      Nominal tertinggi yang diizinkan untuk sekali transaksi top-up tunai.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Batas Saldo Maksimum */}
              <Card className='border-0 bg-muted/60 dark:bg-muted/25 shadow-sm'>
                <CardHeader>
                  <div className='flex items-center gap-2.5'>
                    <ShieldCheck className='h-5 w-5 text-primary shrink-0' />
                    <div>
                      <CardTitle className='text-base font-bold'>
                        Batas Maksimal Saldo Tersimpan
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        Plafon saldo digital yang boleh mengendap di kartu siswa & tamu.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='space-y-4 pt-1'>
                  {/* Max Saldo Siswa */}
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <Label
                        htmlFor='batasSaldoSiswa'
                        className='text-xs font-semibold'
                      >
                        Batas Saldo Maksimum Siswa
                      </Label>
                      <span className='font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400'>
                        {formatRupiah(watchedMaxSaldoSiswa || 0)}
                      </span>
                    </div>
                    <Input
                      id='batasSaldoSiswa'
                      type='number'
                      step={50000}
                      min={10000}
                      placeholder='1000000'
                      className='font-mono text-sm bg-background'
                      disabled={isSubmitting || loadingPengaturan}
                      {...register('batasSaldoSiswa', { valueAsNumber: true })}
                    />
                    {errors.batasSaldoSiswa && (
                      <p className='text-xs text-destructive'>
                        {errors.batasSaldoSiswa.message}
                      </p>
                    )}
                    <p className='text-[11px] text-muted-foreground'>
                      Maksimal akumulasi saldo di kartu RFID siswa.
                    </p>
                  </div>

                  {/* Max Saldo Kartu Tamu */}
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <Label
                        htmlFor='batasSaldoKartuTamu'
                        className='text-xs font-semibold'
                      >
                        Batas Saldo Maksimum Kartu Tamu
                      </Label>
                      <span className='font-mono text-xs font-bold text-amber-600 dark:text-amber-400'>
                        {formatRupiah(watchedMaxSaldoKartuTamu || 0)}
                      </span>
                    </div>
                    <Input
                      id='batasSaldoKartuTamu'
                      type='number'
                      step={50000}
                      min={10000}
                      placeholder='500000'
                      className='font-mono text-sm bg-background'
                      disabled={isSubmitting || loadingPengaturan}
                      {...register('batasSaldoKartuTamu', { valueAsNumber: true })}
                    />
                    {errors.batasSaldoKartuTamu && (
                      <p className='text-xs text-destructive'>
                        {errors.batasSaldoKartuTamu.message}
                      </p>
                    )}
                    <p className='text-[11px] text-muted-foreground'>
                      Maksimal saldo pada Kartu Tamu untuk guru tamu, vendor, atau staf sementara.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Action Footer */}
            <Card className='border-0 bg-muted/60 dark:bg-muted/25 shadow-sm'>
              <CardFooter className='flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <UserCheck className='h-4 w-4 text-emerald-600' />
                  <span>
                    Aktor Pengubah:{' '}
                    <strong>{pengaturan.updatedBy || 'Admin Sekolah'}</strong>
                  </span>
                </div>

                <div className='flex items-center gap-2.5 w-full sm:w-auto'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={handleResetToDefault}
                    disabled={isSubmitting || loadingPengaturan}
                    className='h-9 flex-1 sm:flex-initial text-xs gap-1.5'
                  >
                    <RotateCcw className='h-3.5 w-3.5' />
                    <span>Kembalikan Default</span>
                  </Button>

                  <Button
                    type='submit'
                    size='sm'
                    disabled={isSubmitting || loadingPengaturan || !isDirty}
                    className='h-9 flex-1 sm:flex-initial text-xs gap-1.5 font-semibold'
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className='h-4 w-4' />
                        <span>Simpan Pengaturan</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </form>
        </div>
      </Main>
    </>
  )
}

export default PengaturanKantinPage
