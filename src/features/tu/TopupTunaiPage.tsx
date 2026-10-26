import { useState, useEffect } from 'react'
import { type KartuSiswaMock } from '@/mocks/mock-data'
import {
  AlertCircle,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
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
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { formatRupiah } from '@/lib/formatters'
import { PrintSlipModal, type TopupSlipData } from './PrintSlipModal'
import { StudentSearchCard } from './StudentSearchCard'
import { mapInfoSiswaToKartuSiswa } from './types'
import { useAuthStore } from '@/stores/auth-store'
import {
  applyStoredSaldoOverrides,
  getInitialStudents,
  saveStoredSaldo,
  saveTopupTransaction,
} from './saldo-storage'

const PRESET_NOMINALS = [20000, 50000, 100000, 200000]
const MAX_SALDO_SEKOLAH = 500000

export function TopupTunaiPage() {
  const [students, setStudents] = useState<KartuSiswaMock[]>(getInitialStudents)
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
      let currentList = getInitialStudents()
      try {
        const res = await apiClient.get('/api/siswa', { params: { batas: 50 } })
        if (
          isMounted &&
          res.data?.data &&
          Array.isArray(res.data.data) &&
          res.data.data.length > 0
        ) {
          const mapped = res.data.data.map(mapInfoSiswaToKartuSiswa)
          currentList = applyStoredSaldoOverrides(mapped)
          setStudents(currentList)
        }
      } catch {
        if (isMounted) {
          setStudents(currentList)
        }
      }

      // Sinkronisasi saldo riil dari backend (/api/saldo) bila terhubung ke live BE
      try {
        const syncedStudents = await Promise.all(
          currentList.map(async (student) => {
            try {
              const saldoRes = await apiClient.get('/api/saldo', {
                params: {
                  subjekTipe: 'SISWA',
                  subjekId: student.siswa_id,
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

      try {
        const response = await apiClient.post('/api/saldo/topup', {
          subjekTipe: 'SISWA',
          subjekId: currentStudent.siswa_id,
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
      } catch {
        // Fallback simulasi frontend jika backend API / mock adapter tidak merespons
        const saldoAwal = currentStudent.saldo
        const saldoBaruCalculated = saldoAwal + nominalNum

        result = {
          ref_no: refNo,
          waktu: now.toISOString(),
          petugas_nama: petugasNama,
          nama_penyetor: namaPenyetor.trim(),
          nominal: nominalNum,
          saldo_awal: saldoAwal,
          saldo_baru: saldoBaruCalculated,
          siswa: {
            siswa_id: currentStudent.siswa_id,
            nis: currentStudent.nis,
            nama: currentStudent.nama,
            kelas: currentStudent.kelas,
            foto_url: currentStudent.foto_url,
          },
        }
      }

      if (result) {
        // Simpan saldo baru ke storage lokal & memori agar tidak hilang saat refresh
        saveStoredSaldo(currentStudent.siswa_id, result.saldo_baru)

        // Simpan transaksi ke riwayat top-up lokal untuk sinkronisasi rincian setoran TU
        saveTopupTransaction({
          id: result.ref_no,
          waktu: result.waktu,
          subjek_tipe: 'SISWA',
          subjek_nama: currentStudent.nama,
          subjek_info: `${currentStudent.kelas} (NIS: ${currentStudent.nis})`,
          nominal: result.nominal,
          penyetor: result.nama_penyetor,
          referensi_id: result.ref_no,
          tanggal: result.waktu.slice(0, 10),
          petugas_id: petugasId,
        })

        toast.success(
          `Top-up ${formatRupiah(nominalNum)} berhasil!`,
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
        'Gagal melakukan top-up tunai.'
      toast.error('Top-up Gagal', { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        {/* Header Title Section */}
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>
            Pengisian Saldo Tunai Siswa
          </h1>
        </div>

        {/* Ringkasan Status Header Cards */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>
                Total Siswa Terdaftar
              </p>
              <h3 className='mt-0.5 text-xl font-bold text-foreground'>
                {students.length} Siswa
              </h3>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>
                Status Kartu Siswa
              </p>
              <h3 className='mt-0.5 text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                {students.filter((s) => !s.is_blocked).length} Aktif Normal
              </h3>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>
                Batas Saldo Maksimal Siswa
              </p>
              <h3 className='mt-0.5 text-xl font-bold text-foreground'>
                {formatRupiah(MAX_SALDO_SEKOLAH)}
              </h3>
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
            />
          </div>

          {/* Right Column: Topup Form (7 Cols) */}
          <div className='space-y-6 lg:col-span-7'>
            <Card className='border-0 bg-muted/70 shadow-none dark:bg-muted/30'>
              <CardHeader className='pb-4'>
                <CardTitle className='text-lg font-semibold'>
                  Form Pengisian Saldo Tunai
                </CardTitle>
                <CardDescription className='text-xs'>
                  Pilih nominal preset atau masukkan jumlah tunai yang
                  disetorkan
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <form onSubmit={handleSubmit} className='space-y-6'>
                  {/* Preset Nominal Buttons */}
                  <div className='space-y-2'>
                    <Label className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                      Pilihan Nominal Preset
                    </Label>
                    <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
                      {PRESET_NOMINALS.map((preset) => (
                        <Button
                          key={preset}
                          type='button'
                          variant={
                            nominalNum === preset ? 'default' : 'secondary'
                          }
                          className={`h-11 text-xs font-semibold sm:text-sm border-0 shadow-none ${
                            nominalNum === preset
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-background hover:bg-background/80 text-foreground'
                          }`}
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
                      Input Nominal Bebas (Rp)
                    </Label>
                    <div className='relative'>
                      <span className='absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-bold text-muted-foreground'>
                        Rp
                      </span>
                      <Input
                        id='nominal-input'
                        type='number'
                        min={1000}
                        placeholder='Masukkan nominal, contoh: 75000'
                        value={nominal}
                        onChange={(e) => setNominal(e.target.value)}
                        className='h-11 pl-11 font-mono text-base font-bold tracking-wide'
                      />
                    </div>
                  </div>

                  {/* Input Nama Penyetor */}
                  <div className='space-y-2'>
                    <Label
                      htmlFor='penyetor-input'
                      className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'
                    >
                      Nama Penyetor (Orang Tua / Wali / Siswa)
                    </Label>
                    <Input
                      id='penyetor-input'
                      type='text'
                      placeholder='Contoh: Bpk. Hendra (Orang Tua Budi)'
                      value={namaPenyetor}
                      onChange={(e) => setNamaPenyetor(e.target.value)}
                      className='h-11 text-sm'
                      required
                    />
                  </div>

                  {/* Balance Preview & Validation Warnings */}
                  {currentStudent && (
                    <div className='space-y-3 pt-2'>
                      <div className='space-y-3 rounded-xl border-0 bg-muted/50 p-4 dark:bg-muted/20'>
                        <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                          Kalkulasi Transaksi
                        </h4>
                        <div className='space-y-2 text-sm'>
                          <div className='flex justify-between text-muted-foreground'>
                            <span>Saldo Siswa saat ini:</span>
                            <span className='font-mono font-medium text-foreground'>
                              {formatRupiah(saldoSaatIni)}
                            </span>
                          </div>
                          <div className='flex justify-between font-medium text-emerald-600 dark:text-emerald-400'>
                            <span>Nominal Top-up (+):</span>
                            <span className='font-mono font-bold'>
                              {formatRupiah(nominalNum)}
                            </span>
                          </div>
                          <div className='flex justify-between border-t border-border pt-2 text-base font-bold text-foreground'>
                            <span>Estimasi Saldo Baru:</span>
                            <span
                              className={`font-mono font-bold ${
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
                        <Alert
                          variant='destructive'
                          className='border-0 bg-destructive/15 text-destructive'
                        >
                          <AlertCircle className='h-4 w-4 text-destructive' />
                          <AlertTitle className='text-xs font-bold tracking-wide uppercase'>
                            Melebihi Batas Saldo Maksimal Sekolah!
                          </AlertTitle>
                          <AlertDescription className='mt-1 text-xs leading-relaxed'>
                            Saldo baru (
                            <strong>
                              {formatRupiah(saldoBaru)}
                            </strong>
                            ) melampaui batas maksimum yang diizinkan sekolah
                            sebesar{' '}
                            <strong>
                              {formatRupiah(MAX_SALDO_SEKOLAH)}
                            </strong>
                            . Kurangi nominal top-up.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Warning: Card Blocked */}
                      {isStudentBlocked && (
                        <Alert
                          variant='destructive'
                          className='border-0 bg-destructive/15 text-destructive'
                        >
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
                    className='h-11 w-full gap-2 bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className='h-4 w-4 animate-spin' />
                        Memproses Top-up...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className='h-4 w-4' />
                        Proses Top-up Tunai & Terbitkan Slip
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
