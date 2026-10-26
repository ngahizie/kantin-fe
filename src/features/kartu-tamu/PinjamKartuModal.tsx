import { useState, useEffect } from 'react'
import {
  UserCheck,
  RefreshCw,
  AlertCircle,
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
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api-client'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/formatters'
import type { KartuTamuMock } from '@/mocks/mock-data'
import type { KartuTamuSlipData } from './KartuTamuSlipModal'
import { useAuthStore } from '@/stores/auth-store'
import { saveTopupTransaction } from '@/features/tu/saldo-storage'

const PRESET_NOMINALS = [0, 20000, 50000, 100000]
const MAX_SALDO_KARTU_TAMU = 500000

interface PinjamKartuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kartu: KartuTamuMock | null
  onPinjamSuccess: (
    kartuId: number,
    labelPemegang: string,
    saldoBaru: number
  ) => void
  onShowSlip: (data: KartuTamuSlipData) => void
}

export function PinjamKartuModal({
  open,
  onOpenChange,
  kartu,
  onPinjamSuccess,
  onShowSlip,
}: PinjamKartuModalProps) {
  const [namaTamu, setNamaTamu] = useState('')
  const [nominal, setNominal] = useState('0')
  const [namaPenyetor, setNamaPenyetor] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setNamaTamu('')
      setNominal('0')
      setNamaPenyetor('')
    }
  }, [open])

  if (!kartu) return null

  const nominalNum = Math.max(0, Number(nominal) || 0)
  const isExceedingLimit = nominalNum > MAX_SALDO_KARTU_TAMU
  const effectivePenyetor = namaPenyetor.trim() || namaTamu.trim() || 'Tamu Langsung'
  const isValidSubmit =
    namaTamu.trim().length > 0 &&
    !isExceedingLimit &&
    (nominalNum === 0 || effectivePenyetor.length > 0)

  const handleClose = () => {
    setNamaTamu('')
    setNominal('0')
    setNamaPenyetor('')
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidSubmit) return

    setIsSubmitting(true)
    const cleanedNama = namaTamu.trim()
    const penyetor = effectivePenyetor

    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const seq = Math.floor(1000 + Math.random() * 9000)
    const refNo = `KT-PINJAM-${dateCode}-${seq}`

    try {
      // 1. Update data kartu di backend: beri label pemegang dan aktifkan kartu
      try {
        await apiClient.put(`/api/kartu-tamu/${kartu.id}`, {
          nomorKartu: kartu.nomor_kartu,
          rfidUid: kartu.uid,
          labelPemegang: cleanedNama,
          catatan: cleanedNama,
          aktif: true,
        })
      } catch {
        // Fallback simulasi frontend jika backend error
      }

      const currentAuthUser = useAuthStore.getState().auth.user
      const petugasNama =
        currentAuthUser?.nama || 'Wibisana Bama (Petugas TU)'
      const petugasId = currentAuthUser?.userId
        ? Number(currentAuthUser.userId)
        : 2

      // 2. Jika tamu menyetor saldo awal > 0, jalankan top-up
      let saldoAkhir = kartu.saldo
      if (nominalNum > 0) {
        try {
          const res = await apiClient.post('/api/saldo/topup', {
            subjekTipe: 'KARTU_TAMU',
            subjekId: kartu.id,
            nominal: nominalNum,
            penyetor: penyetor,
            referensiId: refNo,
          })
          const resData = res.data?.data
          saldoAkhir = resData?.saldoSetelah ?? resData?.saldo_baru ?? (kartu.saldo + nominalNum)
        } catch {
          saldoAkhir = kartu.saldo + nominalNum
        }

        // Simpan transaksi top-up awal ke riwayat & rincian setoran kas TU
        saveTopupTransaction({
          id: refNo,
          waktu: new Date().toISOString(),
          subjek_tipe: 'KARTU_TAMU',
          subjek_nama: cleanedNama,
          subjek_info: `Kartu: ${kartu.nomor_kartu}`,
          nominal: nominalNum,
          penyetor: penyetor,
          referensi_id: refNo,
          tanggal: new Date().toISOString().slice(0, 10),
          petugas_id: petugasId,
        })
      }

      // 3. Callback ke halaman parent untuk update state kartu menjadi ACTIVE
      onPinjamSuccess(kartu.id, cleanedNama, saldoAkhir)

      toast.success(
        `Kartu ${kartu.nomor_kartu} berhasil dipinjamkan!`,
        {
          description: `Diserahkan kepada ${cleanedNama} dengan saldo ${formatRupiah(saldoAkhir)}`,
        }
      )

      // 4. Buka slip peminjaman kartu tamu
      onShowSlip({
        type: 'PINJAM',
        ref_no: refNo,
        waktu: new Date().toISOString(),
        petugas_nama: petugasNama,
        nomor_kartu: kartu.nomor_kartu,
        uid: kartu.uid,
        label_pemegang: cleanedNama,
        nominal: nominalNum,
        saldo_awal: kartu.saldo,
        saldo_baru: saldoAkhir,
        nama_penyetor: penyetor,
      })

      handleClose()
    } catch {
      toast.error('Gagal memproses peminjaman kartu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md sm:rounded-2xl border-0 shadow-2xl'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'>
              <UserCheck className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold'>
                Pinjamkan Kartu Tamu
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Aktifkan kartu yang tersedia untuk dipinjamkan kepada pengunjung / tamu
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Info Kartu */}
        <div className='flex items-center justify-between p-3.5 bg-muted/60 rounded-xl'>
          <div className='space-y-0.5'>
            <div className='flex items-center gap-2'>
              <span className='font-mono font-bold text-foreground text-sm'>
                {kartu.nomor_kartu}
              </span>
              <Badge
                variant='secondary'
                className='border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold'
              >
                SIAP DIPINJAMKAN
              </Badge>
            </div>
            <p className='text-xs font-mono text-muted-foreground'>
              UID: {kartu.uid}
            </p>
          </div>
          <div className='text-right'>
            <span className='text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block'>
              Status
            </span>
            <span className='text-xs font-medium text-foreground'>Tersedia</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4 pt-1'>
          {/* Identitas / Nama Tamu */}
          <div className='space-y-1.5'>
            <Label htmlFor='nama-tamu' className='text-xs font-semibold'>
              Nama / Identitas Pengunjung <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='nama-tamu'
              placeholder='Contoh: Bpk. Ahmad (Tamu Seminar) / Guru Magang'
              value={namaTamu}
              onChange={(e) => setNamaTamu(e.target.value)}
              className='h-10 text-sm'
              autoFocus
              required
            />
            <p className='text-[11px] text-muted-foreground'>
              Nama ini akan tampil pada kasir dan bukti struk transaksi
            </p>
          </div>

          {/* Preset Saldo Awal */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Top-up Saldo Awal (Opsional)
              </Label>
              <span className='text-[11px] text-muted-foreground'>
                Maks: {formatRupiah(MAX_SALDO_KARTU_TAMU)}
              </span>
            </div>
            <div className='grid grid-cols-4 gap-2'>
              {PRESET_NOMINALS.map((preset) => (
                <Button
                  key={preset}
                  type='button'
                  variant={nominalNum === preset ? 'default' : 'secondary'}
                  className={`h-9 text-xs font-semibold ${
                    nominalNum === preset
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-muted/80 hover:bg-muted text-foreground'
                  }`}
                  onClick={() => setNominal(String(preset))}
                >
                  {preset === 0 ? 'Tanpa Saldo' : formatRupiah(preset)}
                </Button>
              ))}
            </div>
          </div>

          {/* Input Nominal Bebas */}
          <div className='space-y-1.5'>
            <Label htmlFor='nominal-awal' className='text-xs font-medium text-muted-foreground'>
              Atau Input Nominal Bebas (Rp)
            </Label>
            <Input
              id='nominal-awal'
              type='number'
              min='0'
              step='1000'
              placeholder='0'
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              className='h-10 font-mono text-sm'
            />
            {isExceedingLimit && (
              <p className='text-xs text-destructive flex items-center gap-1'>
                <AlertCircle className='h-3 w-3' />
                Saldo melebihi batas maksimal {formatRupiah(MAX_SALDO_KARTU_TAMU)}
              </p>
            )}
          </div>

          {/* Nama Penyetor (hanya jika ada top-up) */}
          {nominalNum > 0 && (
            <div className='space-y-1.5 pt-1'>
              <Label htmlFor='penyetor-awal' className='text-xs font-semibold'>
                Nama Penyetor Uang Tunai
              </Label>
              <Input
                id='penyetor-awal'
                placeholder={namaTamu.trim() || 'Tamu Langsung'}
                value={namaPenyetor}
                onChange={(e) => setNamaPenyetor(e.target.value)}
                className='h-10 text-sm'
              />
            </div>
          )}

          {/* Preview Ringkasan */}
          <div className='p-3.5 bg-muted/60 border-0 rounded-xl space-y-1.5'>
            <div className='font-semibold text-xs text-foreground'>
              Ringkasan Peminjaman:
            </div>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>Penerima Kartu:</span>
              <span className='font-medium text-foreground'>
                {namaTamu.trim() || '(Masukkan nama tamu)'}
              </span>
            </div>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>Saldo Aktif Pertama:</span>
              <span className='font-mono font-bold text-foreground'>
                {formatRupiah(nominalNum)}
              </span>
            </div>
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={handleClose}
              disabled={isSubmitting}
              className='border-0 bg-muted/80 hover:bg-muted text-foreground shadow-none'
            >
              Batal
            </Button>
            <Button
              type='submit'
              disabled={!isValidSubmit || isSubmitting}
              className='bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5'
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className='h-4 w-4 animate-spin' />
                  Menyimpan...
                </>
              ) : (
                <>
                  <UserCheck className='h-4 w-4' />
                  Pinjamkan & Serahkan Kartu
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
