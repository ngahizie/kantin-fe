import { useState, useId } from 'react'
import {
  MOCK_SISWA,
  MOCK_KARTU_TAMU,
  type KartuSiswaMock,
  type KartuTamuMock,
} from '@/mocks/mock-data'
import {
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  User,
  CreditCard,
  FileCheck2,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import apiClient from '@/lib/api-client'
import { formatRupiah } from '@/lib/formatters'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
  SubjekTipe,
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
  onSuccess?: (created: MutasiKoreksiItem) => void
}

interface FormContentProps {
  initialTransaction?: TransaksiSesiTutupItem | null
  initialSiswa?: KartuSiswaMock | null
  students: KartuSiswaMock[]
  cards: KartuTamuMock[]
  onSuccess?: (created: MutasiKoreksiItem) => void
  onCancel: () => void
}

function KoreksiMutasiFormContent({
  initialTransaction,
  initialSiswa,
  students,
  cards,
  onSuccess,
  onCancel,
}: FormContentProps) {
  const { auth } = useAuthStore()
  const bendaharaNama = auth.user?.nama || 'Siti Rahma (Bendahara)'

  const [subjekTipe, setSubjekTipe] = useState<SubjekTipe>(
    initialTransaction ? initialTransaction.subjek_tipe : 'SISWA'
  )

  const [selectedSubjekId, setSelectedSubjekId] = useState<string>(() => {
    if (initialTransaction) return initialTransaction.subjek_id.toString()
    if (initialSiswa) return initialSiswa.siswa_id.toString()
    return students[0]?.siswa_id.toString() || '101'
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

  // Currently selected subject details
  const selectedStudent = students.find(
    (s) => s.siswa_id === Number(selectedSubjekId)
  )
  const selectedCard = cards.find((c) => c.id === Number(selectedSubjekId))

  const subjekNama =
    subjekTipe === 'SISWA'
      ? selectedStudent?.nama || '-'
      : selectedCard?.label_pemegang ||
        `Kartu ${selectedCard?.nomor_kartu || '-'}`
  const subjekInfo =
    subjekTipe === 'SISWA'
      ? `${selectedStudent?.kelas || '-'} (NIS: ${selectedStudent?.nis || '-'})`
      : `Kartu: ${selectedCard?.nomor_kartu || '-'}`
  const saldoSaatIni =
    subjekTipe === 'SISWA'
      ? selectedStudent?.saldo || 0
      : selectedCard?.saldo || 0

  const nominalNum = Number(nominalStr) || 0
  const saldoSetelah =
    arah === 'DEBIT' ? saldoSaatIni - nominalNum : saldoSaatIni + nominalNum
  const isSaldoMinus = arah === 'DEBIT' && nominalNum > saldoSaatIni

  const isValidSubmit =
    Boolean(selectedSubjekId) &&
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
        subjekTipe,
        subjekId: Number(selectedSubjekId),
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
        subjek_tipe: subjekTipe,
        subjek_id: Number(selectedSubjekId),
        subjek_nama: subjekNama,
        subjek_info: subjekInfo,
        jenis_koreksi: jenisKoreksi,
        arah,
        nominal: nominalNum,
        saldo_sebelum: saldoSaatIni,
        saldo_setelah: saldoSetelah,
        alasan: alasan.trim(),
        bendahara_id: 10,
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
      {/* Header Audit Notice */}
      <Alert className='border-amber-500/30 bg-amber-500/10 py-2.5 text-xs text-amber-900 dark:text-amber-200'>
        <Lock className='h-4 w-4 text-amber-600 dark:text-amber-400' />
        <AlertTitle className='text-xs font-semibold'>
          Otoritas Koreksi Bendahara
        </AlertTitle>
        <AlertDescription className='mt-0.5 text-xs'>
          Sesuai aturan akuntansi ledger append-only, sistem{' '}
          <strong>tidak pernah menghapus atau mengubah baris lama</strong>.
          Koreksi akan dicatat sebagai{' '}
          <strong>baris mutasi pembalik baru</strong> dengan alasan audit.
        </AlertDescription>
      </Alert>

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
          <Label className='text-xs font-semibold'>Jenis Masalah Koreksi</Label>
          <Select
            value={jenisKoreksi}
            onValueChange={(val) => setJenisKoreksi(val as JenisKoreksi)}
          >
            <SelectTrigger className='text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='SALAH_INPUT_TOPUP' className='text-xs'>
                Salah Input Top-up Tunai TU
              </SelectItem>
              <SelectItem value='PEMBALIK_TRANSAKSI_KASIR' className='text-xs'>
                Pembalik Transaksi Kasir (Sesi Ditutup)
              </SelectItem>
              <SelectItem value='PENYESUAIAN_AUDIT' className='text-xs'>
                Penyesuaian Audit Saldo Ledger
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pemilihan Subjek (Siswa / Kartu Tamu) */}
      <div className='space-y-3 rounded-lg border bg-muted/20 p-3.5'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs font-semibold'>
            Pilih Subjek Pemilik Saldo:
          </Label>
          <RadioGroup
            value={subjekTipe}
            onValueChange={(val) => {
              setSubjekTipe(val as SubjekTipe)
              if (val === 'SISWA') {
                setSelectedSubjekId(students[0]?.siswa_id.toString() || '')
              } else {
                setSelectedSubjekId(cards[0]?.id.toString() || '')
              }
            }}
            className='flex items-center gap-4'
          >
            <div className='flex items-center space-x-1.5'>
              <RadioGroupItem value='SISWA' id='subjek-siswa' />
              <Label
                htmlFor='subjek-siswa'
                className='flex cursor-pointer items-center gap-1 text-xs font-normal'
              >
                <User className='h-3.5 w-3.5' /> Siswa
              </Label>
            </div>
            <div className='flex items-center space-x-1.5'>
              <RadioGroupItem value='KARTU_TAMU' id='subjek-kartu-tamu' />
              <Label
                htmlFor='subjek-kartu-tamu'
                className='flex cursor-pointer items-center gap-1 text-xs font-normal'
              >
                <CreditCard className='h-3.5 w-3.5' /> Kartu Tamu
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Select Box Subjek */}
        {subjekTipe === 'SISWA' ? (
          <Select value={selectedSubjekId} onValueChange={setSelectedSubjekId}>
            <SelectTrigger className='text-xs'>
              <SelectValue placeholder='Pilih Siswa...' />
            </SelectTrigger>
            <SelectContent className='max-h-60'>
              {students.map((s) => (
                <SelectItem
                  key={s.siswa_id}
                  value={s.siswa_id.toString()}
                  className='text-xs'
                >
                  {s.nama} — {s.kelas} (Saldo: {formatRupiah(s.saldo)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={selectedSubjekId} onValueChange={setSelectedSubjekId}>
            <SelectTrigger className='text-xs'>
              <SelectValue placeholder='Pilih Kartu Tamu...' />
            </SelectTrigger>
            <SelectContent className='max-h-60'>
              {cards.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.id.toString()}
                  className='text-xs'
                >
                  {c.nomor_kartu}{' '}
                  {c.label_pemegang ? `(${c.label_pemegang})` : ''} — Saldo:{' '}
                  {formatRupiah(c.saldo)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Detail Subjek Card */}
        <div className='flex items-center justify-between rounded-md border bg-background p-2.5 text-xs'>
          <div>
            <span className='font-semibold text-foreground'>{subjekNama}</span>
            <p className='text-[11px] text-muted-foreground'>{subjekInfo}</p>
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
            Arah Mutasi Koreksi Saldo:
          </Label>
          <div className='grid grid-cols-2 gap-3'>
            <div
              onClick={() => setArah('DEBIT')}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-all ${
                arah === 'DEBIT'
                  ? 'border-destructive bg-destructive/10 text-destructive ring-1 ring-destructive/30'
                  : 'hover:bg-muted/40'
              }`}
            >
              <ArrowDownRight className='mt-0.5 h-4 w-4 text-destructive' />
              <div>
                <span className='block text-xs font-bold'>
                  DEBIT (Kurangi Saldo)
                </span>
                <span className='mt-0.5 block text-[11px] leading-tight text-muted-foreground'>
                  Untuk pembatalan kelebihan top-up atau pengurangan saldo
                  keliru.
                </span>
              </div>
            </div>

            <div
              onClick={() => setArah('KREDIT')}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-all ${
                arah === 'KREDIT'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'hover:bg-muted/40'
              }`}
            >
              <ArrowUpRight className='mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400' />
              <div>
                <span className='block text-xs font-bold'>
                  KREDIT (Tambah Saldo)
                </span>
                <span className='mt-0.5 block text-[11px] leading-tight text-muted-foreground'>
                  Untuk pembalik transaksi salah potong sesi lampau atau top-up
                  kurang catat.
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
                  variant='outline'
                  size='sm'
                  onClick={() => setNominalStr(amt.toString())}
                  className='h-6 px-1.5 font-mono text-[10px]'
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
      <div className='space-y-2 rounded-lg border bg-muted/30 p-3'>
        <span className='block text-xs font-semibold text-muted-foreground'>
          Proyeksi Dampak Saldo Ledger:
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
              Mutasi:
            </span>
            <Badge
              variant='outline'
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
              Koreksi debit melebihi saldo berjalan! Saldo
              tidak boleh minus dalam kondisi apa pun.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Alasan Audit Koreksi (Wajib) */}
      <div className='space-y-1.5'>
        <Label htmlFor={alasanInputId} className='text-xs font-semibold'>
          Alasan Audit Koreksi{' '}
          <span className='text-destructive'>* (Wajib Diisi Lengkap)</span>
        </Label>
        <Textarea
          id={alasanInputId}
          rows={2}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder='Contoh: Pembalik transaksi belanja TRX-9012 pada sesi #98 yang ditutup karena tap ganda saat kasir ramai'
          className='resize-none text-xs'
          required
        />
        <p className='text-[10px] text-muted-foreground'>
          Alasan audit akan terekam permanen dalam Audit Log Keuangan Sekolah.
        </p>
      </div>

      {/* Checkbox Persetujuan Bendahara */}
      <div className='flex items-start space-x-2 border-t pt-1'>
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
          Saya ({bendaharaNama}) mengonfirmasi kebenaran data audit mutasi
          pembalik ini dan bertanggung jawab atas perubahan ledger saldo.
        </Label>
      </div>

      <DialogFooter className='gap-2 pt-2 sm:space-x-0'>
        <Button
          type='button'
          variant='outline'
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
  onSuccess,
}: KoreksiMutasiModalProps) {
  const [students] = useState<KartuSiswaMock[]>(MOCK_SISWA)
  const [cards] = useState<KartuTamuMock[]>(MOCK_KARTU_TAMU)

  const formKey = `${initialTransaction?.id || 'new'}-${initialSiswa?.siswa_id || 'none'}-${open ? 'open' : 'closed'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[620px]'>
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
            cards={cards}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
