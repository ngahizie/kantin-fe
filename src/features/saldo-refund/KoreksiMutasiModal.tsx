import { useState, useEffect, useId } from 'react'
import { type KartuSiswaMock } from '@/types/kantin'
import {
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  User,
  FileCheck2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import apiClient from '@/lib/api-client'
import { formatRupiah } from '@/lib/formatters'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
  JenisKoreksi,
  ArahMutasi,
  MutasiKoreksiItem,
  TransaksiSesiTutupItem,
} from './types'

interface KoreksiMutasiModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTransaction?: TransaksiSesiTutupItem | null
  initialSiswa?: KartuSiswaMock | null
  students?: KartuSiswaMock[]
  onSuccess?: (created: MutasiKoreksiItem) => void
}

interface FormContentProps {
  initialTransaction?: TransaksiSesiTutupItem | null
  initialSiswa?: KartuSiswaMock | null
  students: KartuSiswaMock[]
  onSuccess?: (created: MutasiKoreksiItem) => void
  onCancel: () => void
}

function KoreksiMutasiFormContent({
  initialTransaction,
  initialSiswa,
  students,
  onSuccess,
  onCancel,
}: FormContentProps) {
  const { auth } = useAuthStore()
  const bendaharaNama = auth.user?.nama || 'Bendahara'

  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(() => {
    if (initialTransaction) return initialTransaction.siswa_id.toString()
    if (initialSiswa) return initialSiswa.siswa_id.toString()
    return students[0]?.siswa_id.toString() || ''
  })

  const [jenisKoreksi, setJenisKoreksi] = useState<JenisKoreksi>(() => {
    if (initialTransaction) return 'PEMBALIK_TRANSAKSI_KASIR'
    return 'SALAH_INPUT_TOPUP'
  })

  const [arah, setArah] = useState<ArahMutasi>(() => {
    if (initialTransaction) return 'KREDIT'
    return 'DEBIT'
  })

  const [nominalStr, setNominalStr] = useState<string>(() => {
    if (initialTransaction) return initialTransaction.total.toString()
    return ''
  })

  const [alasan, setAlasan] = useState<string>(() => {
    if (initialTransaction) {
      return `Pembalik transaksi belanja ${initialTransaction.id} pada sesi #${initialTransaction.sesi_kasir_id} yang sudah ditutup (komplain / salah potong kasir)`
    }
    return ''
  })

  const [referensiId, setReferensiId] = useState<string>(() => {
    const now = new Date()
    const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `BA-KOR-${dateCode}-${rand}`
  })

  const [isAgreed, setIsAgreed] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Unique IDs for form accessibility
  const referensiInputId = useId()
  const nominalInputId = useId()
  const alasanInputId = useId()
  const agreementCheckboxId = useId()

  // Currently selected student details
  const selectedStudent = students.find(
    (s) => s.siswa_id === Number(selectedSiswaId)
  )

  const siswaNama =
    selectedStudent?.nama ||
    (initialTransaction && Number(selectedSiswaId) === initialTransaction.siswa_id
      ? initialTransaction.siswa_nama
      : '-')
  const siswaInfo =
    selectedStudent
      ? `${selectedStudent.kelas || '-'} (NIS: ${selectedStudent.nis || '-'})`
      : initialTransaction && Number(selectedSiswaId) === initialTransaction.siswa_id
        ? initialTransaction.siswa_info
        : '-'
  const saldoSaatIni = selectedStudent?.saldo || 0

  const nominalNum = Number(nominalStr) || 0
  const saldoSetelah =
    arah === 'DEBIT' ? saldoSaatIni - nominalNum : saldoSaatIni + nominalNum
  const isSaldoMinus = arah === 'DEBIT' && nominalNum > saldoSaatIni

  const isValidSubmit =
    Boolean(selectedSiswaId) &&
    nominalNum > 0 &&
    !isSaldoMinus &&
    alasan.trim().length >= 5 &&
    referensiId.trim().length > 0 &&
    isAgreed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidSubmit) {
      if (isSaldoMinus) {
        toast.error(
          'Koreksi DEBIT ditolak: Saldo berjalan tidak boleh menjadi minus!'
        )
      } else if (!isAgreed) {
        toast.error('Harap centang persetujuan otorisasi audit Bendahara!')
      }
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        subjekTipe: 'SISWA' as const,
        siswaId: Number(selectedSiswaId),
        arah,
        nominal: nominalNum,
        alasan: alasan.trim(),
        referensiId: referensiId.trim(),
        jenisKoreksi,
        transaksiTerkaitId: initialTransaction?.id,
      }

      const res = await apiClient.post('/api/saldo/koreksi', payload)

      const fallbackId = `KOR-${referensiId.trim()}`
      const newKoreksi: MutasiKoreksiItem = (res.data?.data
        ?.mutasi as MutasiKoreksiItem) || {
        id: fallbackId,
        referensi_id: referensiId.trim(),
        waktu: new Date().toISOString(),
        siswa_id: Number(selectedSiswaId),
        siswa_nama: siswaNama,
        siswa_info: siswaInfo,
        jenis_koreksi: jenisKoreksi,
        arah,
        nominal: nominalNum,
        saldo_sebelum: saldoSaatIni,
        saldo_setelah: saldoSetelah,
        alasan: alasan.trim(),
        bendahara_id: auth.user?.userId ? Number(auth.user.userId) : 0,
        bendahara_nama: bendaharaNama,
        transaksi_terkait_id: initialTransaction?.id,
        sesi_kasir_id: initialTransaction?.sesi_kasir_id,
      }

      toast.success(
        `Mutasi Koreksi ${arah === 'DEBIT' ? `DEBIT (-${formatRupiah(nominalNum)})` : `KREDIT (+${formatRupiah(nominalNum)})`} berhasil dicatat!`
      )

      onSuccess?.(newKoreksi)
      onCancel()
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Gagal mengeksekusi koreksi saldo'
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4 py-2'>

      {/* Nomor Berita Acara & Jenis Koreksi */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label htmlFor={referensiInputId} className='text-xs font-semibold'>
            No. Berita Acara / Referensi Audit{' '}
            <span className='text-destructive'>*</span>
          </Label>
          <Input
            id={referensiInputId}
            value={referensiId}
            onChange={(e) => setReferensiId(e.target.value)}
            placeholder='BA-KOR-YYYYMMDD-XXXX'
            className='font-mono text-xs'
            required
          />
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs font-semibold'>Jenis Masalah Penyesuaian</Label>
          <Select
            value={jenisKoreksi}
            onValueChange={(val) => setJenisKoreksi(val as JenisKoreksi)}
          >
            <SelectTrigger className='text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='SALAH_INPUT_TOPUP' className='text-xs'>
                Koreksi Kelebihan Isi Saldo TU
              </SelectItem>
              <SelectItem value='PEMBALIK_TRANSAKSI_KASIR' className='text-xs'>
                Pengembalian Akibat Salah Potong Kasir
              </SelectItem>
              <SelectItem value='PENYESUAIAN_AUDIT' className='text-xs'>
                Penyesuaian Selisih Catatan Pembukuan
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pemilihan Siswa Pemilik Saldo */}
      <div className='space-y-3 rounded-xl border-0 bg-muted/70 dark:bg-muted/30 p-3.5'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs font-semibold'>
            Pilih Siswa Pemilik Saldo:
          </Label>
          <span className='flex items-center gap-1 text-xs text-muted-foreground'>
            <User className='h-3.5 w-3.5' /> Siswa
          </span>
        </div>

        {/* Select Box Siswa */}
        <Select value={selectedSiswaId} onValueChange={setSelectedSiswaId}>
          <SelectTrigger className='text-xs'>
            <SelectValue placeholder='Pilih Siswa...' />
          </SelectTrigger>
          <SelectContent className='max-h-60'>
            {students.length === 0 ? (
              <SelectItem value='empty' disabled className='text-xs'>
                Belum ada data siswa
              </SelectItem>
            ) : (
              students.map((s) => (
                <SelectItem
                  key={s.siswa_id}
                  value={s.siswa_id.toString()}
                  className='text-xs'
                >
                  {s.nama} — {s.kelas} (Saldo: {formatRupiah(s.saldo)})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* Detail Siswa Card */}
        <div className='flex items-center justify-between rounded-lg border-0 bg-background/80 dark:bg-background/40 p-2.5 text-xs'>
          <div>
            <span className='font-semibold text-foreground'>{siswaNama}</span>
            <p className='text-[11px] text-muted-foreground'>{siswaInfo}</p>
          </div>
          <div className='text-right'>
            <span className='block text-[11px] text-muted-foreground'>
              Saldo Berjalan Saat Ini:
            </span>
            <span className='font-mono text-sm font-bold text-foreground'>
              {formatRupiah(saldoSaatIni)}
            </span>
          </div>
        </div>
      </div>

      {/* Arah Mutasi & Nominal Koreksi */}
      <div className='space-y-3'>
        <div className='space-y-1.5'>
          <Label className='text-xs font-semibold'>
            Arah Perubahan Saldo:
          </Label>
          <div className='grid grid-cols-2 gap-3'>
            <div
              onClick={() => setArah('DEBIT')}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border-0 p-3 transition-all select-none ${
                arah === 'DEBIT'
                  ? 'bg-destructive/15 text-destructive font-semibold'
                  : 'bg-muted/60 hover:bg-muted/80 text-foreground'
              }`}
            >
              <ArrowDownRight className='mt-0.5 h-4 w-4 text-destructive' />
              <div>
                <span className='block text-xs font-bold'>
                  Kurangi Saldo Siswa (-)
                </span>
                <span className='mt-0.5 block text-[11px] leading-tight text-muted-foreground'>
                  Untuk koreksi kelebihan isi saldo atau transaksi salah.
                </span>
              </div>
            </div>

            <div
              onClick={() => setArah('KREDIT')}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border-0 p-3 transition-all select-none ${
                arah === 'KREDIT'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'bg-muted/60 hover:bg-muted/80 text-foreground'
              }`}
            >
              <ArrowUpRight className='mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400' />
              <div>
                <span className='block text-xs font-bold'>
                  Tambah Saldo Siswa (+)
                </span>
                <span className='mt-0.5 block text-[11px] leading-tight text-muted-foreground'>
                  Untuk pengembalian saldo siswa karena kasir salah potong.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <Label htmlFor={nominalInputId} className='text-xs font-semibold'>
              Nominal Koreksi (Rupiah){' '}
              <span className='text-destructive'>*</span>
            </Label>
            <div className='flex items-center gap-1'>
              {[10000, 20000, 50000, 100000].map((amt) => (
                <Button
                  key={amt}
                  type='button'
                  variant='secondary'
                  size='sm'
                  onClick={() => setNominalStr(amt.toString())}
                  className='h-6 px-1.5 font-mono text-[10px] border-0'
                >
                  +{amt / 1000}k
                </Button>
              ))}
            </div>
          </div>
          <div className='relative'>
            <span className='absolute top-2.5 left-3 text-xs font-medium text-muted-foreground'>
              Rp
            </span>
            <Input
              id={nominalInputId}
              type='number'
              min='1'
              step='500'
              value={nominalStr}
              onChange={(e) => setNominalStr(e.target.value)}
              placeholder='0'
              className='pl-9 font-mono text-sm font-semibold'
              required
            />
          </div>
        </div>
      </div>

      {/* Visualisasi Proyeksi Dampak Saldo */}
      <div className='space-y-2 rounded-xl border-0 bg-muted/70 dark:bg-muted/30 p-3.5'>
        <span className='block text-xs font-semibold text-muted-foreground'>
          Perubahan Saldo:
        </span>
        <div className='flex items-center justify-between font-mono text-xs'>
          <div>
            <span className='block text-[10px] text-muted-foreground'>
              Saldo Awal:
            </span>
            <span className='font-semibold'>
              {formatRupiah(saldoSaatIni)}
            </span>
          </div>
          <div className='text-center'>
            <span className='block text-[10px] text-muted-foreground'>
              Perubahan:
            </span>
            <Badge
              variant='secondary'
              className={
                arah === 'DEBIT'
                  ? 'border-0 bg-destructive/15 text-[11px] text-destructive'
                  : 'border-0 bg-emerald-500/15 text-[11px] text-emerald-600 dark:text-emerald-400'
              }
            >
              {arah === 'DEBIT' ? '-' : '+'}{formatRupiah(nominalNum)}
            </Badge>
          </div>
          <div className='text-right'>
            <span className='block text-[10px] text-muted-foreground'>
              Saldo Akhir:
            </span>
            <span
              className={`text-sm font-bold ${
                isSaldoMinus ? 'text-destructive underline' : 'text-primary'
              }`}
            >
              {formatRupiah(saldoSetelah)}
            </span>
          </div>
        </div>

        {isSaldoMinus && (
          <Alert variant='destructive' className='py-2 text-xs'>
            <ShieldAlert className='h-3.5 w-3.5' />
            <AlertDescription className='text-xs'>
              Pengurangan saldo melebihi saldo saat ini! Saldo
              tidak boleh bernilai minus.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Alasan Audit Koreksi (Wajib) */}
      <div className='space-y-1.5'>
        <Label htmlFor={alasanInputId} className='text-xs font-semibold'>
          Alasan Penyesuaian Saldo{' '}
          <span className='text-destructive'>* (Wajib Diisi Jelas)</span>
        </Label>
        <Textarea
          id={alasanInputId}
          rows={2}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder='Contoh: Pengembalian saldo karena terpotong dua kali saat kasir ramai'
          className='resize-none text-xs'
          required
        />
        <p className='text-[10px] text-muted-foreground'>
          Keterangan penyesuaian akan tersimpan aman di buku besar sekolah.
        </p>
      </div>

      {/* Checkbox Persetujuan Bendahara */}
      <div className='flex items-start space-x-2 pt-2'>
        <input
          type='checkbox'
          id={agreementCheckboxId}
          checked={isAgreed}
          onChange={(e) => setIsAgreed(e.target.checked)}
          className='mt-1 h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary'
        />
        <Label
          htmlFor={agreementCheckboxId}
          className='cursor-pointer text-xs leading-tight text-muted-foreground'
        >
          Saya ({bendaharaNama}) menyatakan penyesuaian saldo ini telah diverifikasi dan disetujui sesuai aturan sekolah.
        </Label>
      </div>

      <DialogFooter className='gap-2 pt-2 sm:space-x-0'>
        <Button
          type='button'
          variant='secondary'
          className='border-0 bg-muted/80 shadow-none'
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button
          type='submit'
          disabled={!isValidSubmit || isSubmitting}
          className='gap-1.5'
        >
          <FileCheck2 className='h-4 w-4' />
          {isSubmitting ? 'Memproses Audit...' : 'Eksekusi Koreksi Saldo'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function KoreksiMutasiModal({
  open,
  onOpenChange,
  initialTransaction,
  initialSiswa,
  students: externalStudents,
  onSuccess,
}: KoreksiMutasiModalProps) {
  const [fetchedStudents, setFetchedStudents] = useState<KartuSiswaMock[]>([])

  useEffect(() => {
    if (!open || (externalStudents && externalStudents.length > 0)) return
    let isMounted = true
    const loadStudents = async () => {
      try {
        const res = await apiClient.get('/api/siswa', { params: { batas: 50 } })
        if (isMounted && Array.isArray(res.data?.data)) {
          const mapped: KartuSiswaMock[] = (
            res.data.data as Record<string, unknown>[]
          ).map((raw) => {
            const sid = Number(raw.siswaId ?? raw.siswa_id ?? raw.id ?? 0)
            const nis = String(raw.nis ?? '')
            return {
              uid: String(raw.uid ?? raw.rfidUid ?? (nis ? `UID-${nis}` : `UID-${sid}`)),
              siswa_id: sid,
              nis,
              nama: String(raw.nama ?? `Siswa #${sid}`),
              kelas: String(raw.kelas ?? '-'),
              foto_url: String(raw.fotoUrl ?? raw.foto_url ?? ''),
              saldo: Number(raw.saldo ?? 0),
              limit_harian: 0,
              belanja_hari_ini: 0,
              is_blocked: Boolean(raw.diblokir ?? raw.tidakAktif),
            }
          })
          setFetchedStudents(mapped)
        }
      } catch {
        if (isMounted) setFetchedStudents([])
      }
    }
    void loadStudents()
    return () => {
      isMounted = false
    }
  }, [open, externalStudents])

  const students =
    externalStudents && externalStudents.length > 0
      ? externalStudents
      : fetchedStudents

  const formKey = `${initialTransaction?.id || 'new'}-${initialSiswa?.siswa_id || 'none'}-${students.length}-${open ? 'open' : 'closed'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[620px] border-0 shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold text-foreground'>
            Mutasi Koreksi Bendahara
          </DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Koreksi salah input top-up tunai atau transaksi pada sesi kasir
            yang sudah ditutup.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <KoreksiMutasiFormContent
            key={formKey}
            initialTransaction={initialTransaction}
            initialSiswa={initialSiswa}
            students={students}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
