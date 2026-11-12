import { useState, useEffect } from 'react'
import { type KartuSiswaMock } from '@/types/kantin'
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Users,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { formatRupiah } from '@/lib/formatters'
import { PrintSlipModal, type TopupSlipData } from './PrintSlipModal'
import { StudentSearchCard } from './StudentSearchCard'
import { mapInfoSiswaToKartuSiswa } from './types'
import { useAuthStore } from '@/stores/auth-store'
import {
  applyStoredSaldoOverrides,
  saveStoredSaldo,
  saveTopupTransaction,
} from './saldo-storage'

const PRESET_NOMINALS = [20000, 50000, 100000, 200000]
const MAX_SALDO_SEKOLAH = 500000

export function TopupTunaiPage() {
  const [students, setStudents] = useState<KartuSiswaMock[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<KartuSiswaMock | null>(
    null
  )
  const [nominal, setNominal] = useState<string>('')
  const [namaPenyetor, setNamaPenyetor] = useState<string>('Orang Tua / Wali')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [slipData, setSlipData] = useState<TopupSlipData | null>(null)
  const [isSlipOpen, setIsSlipOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadStudents = async () => {
      setIsLoadingStudents(true)
      let currentList: KartuSiswaMock[] = []
      try {
        const res = await apiClient.get('/api/siswa', { params: { batas: 50 } })
        if (
          isMounted &&
          res.data?.data &&
          Array.isArray(res.data.data)
        ) {
          const mapped = res.data.data.map(mapInfoSiswaToKartuSiswa)
          currentList = applyStoredSaldoOverrides(mapped)
          setStudents(currentList)
        }
      } catch {
        if (isMounted) {
          setStudents([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingStudents(false)
        }
      }

      if (currentList.length === 0) return

      // Sinkronisasi saldo riil dari backend (/api/saldo) bila terhubung ke live BE
      try {
        const syncedStudents = await Promise.all(
          currentList.map(async (student) => {
            try {
              const saldoRes = await apiClient.get('/api/saldo', {
                params: {
                  siswaId: student.siswa_id,
                },
              })
              const liveSaldo = saldoRes.data?.data?.saldo
              // Hanya perbarui saldo jika liveSaldo dari backend bernilai > 0.
              // Jika liveSaldo === 0 namun siswa memiliki saldo tersimpan (> 0),
              // pertahankan saldo lokal (agar tidak ter-reset ke 0 pada akun TU sekolah 2 / multi-tenant).
              if (typeof liveSaldo === 'number' && liveSaldo > 0) {
                saveStoredSaldo(student.siswa_id, liveSaldo)
                return { ...student, saldo: liveSaldo }
              }
            } catch {
              // Jika query saldo belum ada di database, pertahankan saldo lokal
            }
            return student
          })
        )

        if (isMounted) {
          setStudents(syncedStudents)
        }
      } catch {
        // Abaikan jika live query saldo gagal
      }
    }
    void loadStudents()
    return () => {
      isMounted = false
    }
  }, [])

  // Keep selected student object updated if list changes
  const currentStudent = selectedStudent
    ? students.find((s) => s.siswa_id === selectedStudent.siswa_id) ||
      selectedStudent
    : null

  const nominalNum = Number(nominal) || 0
  const saldoSaatIni = currentStudent?.saldo || 0
  const saldoBaru = saldoSaatIni + nominalNum
  const isExceedingLimit = saldoBaru > MAX_SALDO_SEKOLAH
  const isStudentBlocked = currentStudent?.is_blocked ?? false

  const isValidSubmit =
    currentStudent !== null &&
    !isStudentBlocked &&
    nominalNum > 0 &&
    !isExceedingLimit &&
    namaPenyetor.trim().length > 0

  const handleSelectPreset = (amount: number) => {
    setNominal(amount.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentStudent || !isValidSubmit) return

    setIsSubmitting(true)
    try {
      let result: TopupSlipData | null = null

      const currentUser = useAuthStore.getState().auth.user
      const petugasNama = currentUser?.nama || 'Petugas TU'
      const petugasId = currentUser?.userId ? Number(currentUser.userId) : 2

      const now = new Date()
      const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '')
      const randomSeq = Math.floor(1000 + Math.random() * 9000)
      const refNo = `TU-TOPUP-${dateCode}-${randomSeq}`

      const response = await apiClient.post('/api/saldo/topup', {
        subjekTipe: 'SISWA',
        siswaId: currentStudent.siswa_id,
        nominal: nominalNum,
        penyetor: namaPenyetor.trim(),
        referensiId: refNo,
      })
      const resData = response.data?.data
      const saldoAwal = resData?.saldoSebelum ?? currentStudent.saldo
      const saldoBaruRes = resData?.saldoSetelah ?? saldoAwal + nominalNum

      result = {
        ref_no: refNo,
        waktu: resData?.waktu || now.toISOString(),
        petugas_nama: petugasNama,
        nama_penyetor: namaPenyetor.trim(),
        nominal: nominalNum,
        saldo_awal: saldoAwal,
        saldo_baru: saldoBaruRes,
        siswa: {
          siswa_id: currentStudent.siswa_id,
          nis: currentStudent.nis,
          nama: currentStudent.nama,
          kelas: currentStudent.kelas,
          foto_url: currentStudent.foto_url,
        },
      }

      if (result) {
        // Simpan saldo baru ke storage lokal & memori agar tidak hilang saat refresh
        saveStoredSaldo(currentStudent.siswa_id, result.saldo_baru)

        // Simpan transaksi ke riwayat top-up lokal untuk sinkronisasi rincian setoran TU
        saveTopupTransaction({
          id: result.ref_no,
          waktu: result.waktu,
          siswa_nama: currentStudent.nama,
          siswa_info: `${currentStudent.kelas} (NIS: ${currentStudent.nis})`,
          nominal: result.nominal,
          penyetor: result.nama_penyetor,
          referensi_id: result.ref_no,
          tanggal: result.waktu.slice(0, 10),
          petugas_id: petugasId,
        })

        toast.success(
          `Isi saldo ${formatRupiah(nominalNum)} berhasil!`,
          {
            description: `Saldo baru ${currentStudent.nama}: ${formatRupiah(result.saldo_baru)}`,
          }
        )

        // Update saldo lokal di UI
        setStudents((prev) =>
          prev.map((s) =>
            s.siswa_id === currentStudent!.siswa_id
              ? { ...s, saldo: result!.saldo_baru }
              : s
          )
        )
        setSelectedStudent((prev) =>
          prev ? { ...prev, saldo: result!.saldo_baru } : null
        )

        // Set slip & buka modal
        setSlipData(result)
        setIsSlipOpen(true)

        // Reset nominal
        setNominal('')
      }
    } catch (err: unknown) {
      const errorResponse = err as {
        response?: { data?: { message?: string } }
      }
      const message =
        errorResponse?.response?.data?.message ||
        'Gagal mengisi saldo tunai.'
      toast.error('Pengisian Saldo Gagal', { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Layanan TU' title='Isi Saldo Tunai Siswa' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Header Title Section */}
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>
            Isi Saldo Siswa
          </h1>
        </div>

        {/* Ringkasan Status Header Cards */}
        <div className='grid gap-4 sm:grid-cols-3'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Total Siswa Terdaftar
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400'>
                <Users className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {students.length} Siswa
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Data akun kartu jajan siswa aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Status Kartu Siswa
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400'>
                <ShieldCheck className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums'>
                {students.filter((s) => !s.is_blocked).length} Aktif Normal
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Siap melakukan transaksi di kantin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Batas Saldo Maksimal
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400'>
                <Wallet className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {formatRupiah(MAX_SALDO_SEKOLAH)}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Plafon saldo maksimal per kartu siswa
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 items-start gap-6 lg:grid-cols-12'>
          {/* Left Column: Student Search Card (5 Cols) */}
          <div className='space-y-6 lg:col-span-5'>
            <StudentSearchCard
              students={students}
              selectedStudent={currentStudent}
              onSelectStudent={setSelectedStudent}
              isLoading={isLoadingStudents}
            />
          </div>

          {/* Right Column: Topup Form (7 Cols) */}
          <div className='space-y-6 lg:col-span-7'>
            <Card>
              <CardHeader className='pb-4'>
                <CardTitle className='text-lg font-semibold'>
                  Form Pengisian Saldo Tunai
                </CardTitle>
                <CardDescription className='text-xs'>
                  Pilih nominal cepat atau masukkan jumlah uang yang disetorkan
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <form onSubmit={handleSubmit} className='space-y-6'>
                  {/* Preset Nominal Buttons */}
                  <div className='space-y-2'>
                    <Label className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                      Pilihan Cepat Nominal
                    </Label>
                    <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
                      {PRESET_NOMINALS.map((preset) => (
                        <Button
                          key={preset}
                          type='button'
                          variant={
                            nominalNum === preset ? 'default' : 'outline'
                          }
                          className='h-10 text-xs font-semibold tabular-nums sm:text-sm'
                          onClick={() => handleSelectPreset(preset)}
                        >
                          {formatRupiah(preset)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Input Nominal Bebas */}
                  <div className='space-y-2'>
                    <Label
                      htmlFor='nominal-input'
                      className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'
                    >
                      Jumlah Saldo yang Diisi (Rp)
                    </Label>
                    <div className='relative'>
                      <span className='absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-muted-foreground'>
                        Rp
                      </span>
                      <Input
                        id='nominal-input'
                        type='number'
                        min={1000}
                        placeholder='Masukkan nominal, contoh: 75000'
                        value={nominal}
                        onChange={(e) => setNominal(e.target.value)}
                        className='pl-10 font-mono text-sm font-semibold tabular-nums'
                      />
                    </div>
                  </div>

                  {/* Input Nama Penyetor */}
                  <div className='space-y-2'>
                    <Label
                      htmlFor='penyetor-input'
                      className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'
                    >
                      Nama Penyerah Uang (Orang Tua / Wali / Siswa)
                    </Label>
                    <Input
                      id='penyetor-input'
                      type='text'
                      placeholder='Contoh: Bpk. Hendra (Orang Tua Budi)'
                      value={namaPenyetor}
                      onChange={(e) => setNamaPenyetor(e.target.value)}
                      required
                    />
                  </div>

                  {/* Balance Preview & Validation Warnings */}
                  {currentStudent && (
                    <div className='space-y-3 pt-2'>
                      <div className='space-y-3 rounded-xl border border-border bg-muted/30 p-4'>
                        <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                          Ringkasan Perubahan Saldo
                        </h4>
                        <div className='space-y-2 text-sm'>
                          <div className='flex justify-between text-muted-foreground'>
                            <span>Saldo saat ini:</span>
                            <span className='font-mono font-medium text-foreground tabular-nums'>
                              {formatRupiah(saldoSaatIni)}
                            </span>
                          </div>
                          <div className='flex justify-between font-medium text-emerald-600 dark:text-emerald-400'>
                            <span>Jumlah Isi Saldo (+):</span>
                            <span className='font-mono font-bold tabular-nums'>
                              {formatRupiah(nominalNum)}
                            </span>
                          </div>
                          <div className='flex justify-between border-t border-border pt-2 text-base font-bold text-foreground'>
                            <span>Total Saldo Menjadi:</span>
                            <span
                              className={`font-mono font-bold tabular-nums ${
                                isExceedingLimit
                                  ? 'text-destructive'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {formatRupiah(saldoBaru)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Warning: Exceeding Max Balance */}
                      {isExceedingLimit && (
                        <Alert variant='destructive'>
                          <AlertCircle className='h-4 w-4' />
                          <AlertTitle className='text-xs font-bold tracking-wide uppercase'>
                            Melebihi Batas Saldo Maksimal Sekolah!
                          </AlertTitle>
                          <AlertDescription className='mt-1 text-xs leading-relaxed'>
                            Saldo baru (
                            <strong className='tabular-nums'>
                              {formatRupiah(saldoBaru)}
                            </strong>
                            ) melampaui batas maksimum yang diizinkan sekolah
                            sebesar{' '}
                            <strong className='tabular-nums'>
                              {formatRupiah(MAX_SALDO_SEKOLAH)}
                            </strong>
                            . Kurangi jumlah pengisian saldo.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Warning: Card Blocked */}
                      {isStudentBlocked && (
                        <Alert variant='destructive'>
                          <AlertCircle className='h-4 w-4' />
                          <AlertTitle className='text-xs font-bold tracking-wide uppercase'>
                            Kartu Siswa Diblokir!
                          </AlertTitle>
                          <AlertDescription className='mt-1 text-xs'>
                            Kartu siswa ini dalam status diblokir. Buka blokir
                            terlebih dahulu sebelum mengisi saldo.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Action Submit Button */}
                  <Button
                    type='submit'
                    disabled={!isValidSubmit || isSubmitting}
                    className='h-10 w-full gap-2 text-sm font-semibold'
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Menyimpan Transaksi...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className='h-4 w-4' />
                        Simpan & Cetak Bukti Penerimaan
                        <ArrowRight className='ml-auto h-4 w-4' />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>

      {/* Slip Modal */}
      <PrintSlipModal
        open={isSlipOpen}
        onOpenChange={setIsSlipOpen}
        slipData={slipData}
      />
    </>
  )
}
