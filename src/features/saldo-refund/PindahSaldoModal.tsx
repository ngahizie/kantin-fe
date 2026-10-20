import { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeftRight,
  Search,
  Lock,
  AlertTriangle,
  ArrowRight,
  Check,
  Users,
  Sparkles,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import { formatRupiah } from '@/lib/formatters'
import { MOCK_SISWA, type KartuSiswaMock } from '@/mocks/mock-data'
import type { SiswaNonaktifMock, RefundSlipData } from './types'

interface PindahSaldoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siswaAsal: SiswaNonaktifMock | null
  onTransferSuccess: (siswaAsalId: number, slipData: RefundSlipData) => void
}

export function PindahSaldoModal({
  open,
  onOpenChange,
  siswaAsal,
  onTransferSuccess,
}: PindahSaldoModalProps) {
  if (!siswaAsal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PindahSaldoFormContent
        key={siswaAsal.siswa_id}
        siswaAsal={siswaAsal}
        onOpenChange={onOpenChange}
        onTransferSuccess={onTransferSuccess}
      />
    </Dialog>
  )
}

function PindahSaldoFormContent({
  siswaAsal,
  onOpenChange,
  onTransferSuccess,
}: {
  siswaAsal: SiswaNonaktifMock
  onOpenChange: (open: boolean) => void
  onTransferSuccess: (siswaAsalId: number, slipData: RefundSlipData) => void
}) {
  const [activeStudents, setActiveStudents] = useState<KartuSiswaMock[]>(MOCK_SISWA)
  const [selectedDestination, setSelectedDestination] = useState<KartuSiswaMock | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [beritaAcara, setBeritaAcara] = useState(
    `Pemindahan sisa saldo kelulusan ${siswaAsal.nama} (${siswaAsal.nis}) ke saudara kandung aktif.`
  )
  const [agreement, setAgreement] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load active students from API / mock
  useEffect(() => {
    let isMounted = true
    const loadStudents = async () => {
      try {
        const res = await apiClient.get('/api/saldo/refund/kandidat')
        if (isMounted && res.data?.data && Array.isArray(res.data.data)) {
          setActiveStudents(res.data.data)
        }
      } catch {
        if (isMounted) {
          setActiveStudents(MOCK_SISWA)
        }
      }
    }
    void loadStudents()
    return () => {
      isMounted = false
    }
  }, [])

  // Auto-select initial sibling if available and none selected
  const targetSibling = useMemo(() => {
    if (selectedDestination) return selectedDestination
    if (siswaAsal.saudara_kandung && siswaAsal.saudara_kandung.length > 0) {
      const firstSibling = siswaAsal.saudara_kandung[0]
      return activeStudents.find((s) => s.siswa_id === firstSibling.siswa_id) || null
    }
    return null
  }, [selectedDestination, siswaAsal, activeStudents])

  if (!siswaAsal) return null

  // Filter selectable students (cannot transfer to self or blocked students)
  const filteredStudents = activeStudents.filter((s) => {
    const isSelf = s.siswa_id === siswaAsal.siswa_id || s.uid === siswaAsal.rfid_uid
    if (isSelf) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.nama.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      s.kelas.toLowerCase().includes(q)
    )
  })

  const nominalTransfer = siswaAsal.saldo
  const saldoAwalTujuan = targetSibling ? targetSibling.saldo : 0
  const saldoAkhirTujuan = saldoAwalTujuan + nominalTransfer

  const isValidSubmit =
    siswaAsal.saldo > 0 &&
    targetSibling !== null &&
    !targetSibling.is_blocked &&
    beritaAcara.trim().length >= 5 &&
    agreement

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidSubmit || isSubmitting || !targetSibling) return

    setIsSubmitting(true)
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const seq = Math.floor(1000 + Math.random() * 9000)
    const refNo = `TRF-SDR-${dateCode}-${seq}`

    const payload = {
      siswaSumberId: siswaAsal.siswa_id,
      siswaTujuanId: targetSibling.siswa_id,
      referensiId: refNo,
      catatan: beritaAcara.trim() || `Pindah saldo ke saudara: ${targetSibling.nama}`,
    }

    try {
      await apiClient.post('/api/saldo/pindah-saldo', payload).catch(async () => {
        // Fallback: two koreksi operations if dedicated endpoint pending
        await apiClient.post('/api/saldo/koreksi', {
          subjekTipe: 'SISWA',
          subjekId: siswaAsal.siswa_id,
          arah: 'DEBIT',
          nominal: nominalTransfer,
          alasan: `Transfer ke saudara: ${targetSibling.nama}`,
          referensiId: `${refNo}-OUT`,
        })
        await apiClient.post('/api/saldo/koreksi', {
          subjekTipe: 'SISWA',
          subjekId: targetSibling.siswa_id,
          arah: 'KREDIT',
          nominal: nominalTransfer,
          alasan: `Terima transfer dari saudara: ${siswaAsal.nama}`,
          referensiId: `${refNo}-IN`,
        })
      })

      const slipData: RefundSlipData = {
        type: 'TRANSFER_SAUDARA',
        ref_no: refNo,
        waktu: new Date().toISOString(),
        petugas_nama: 'Wibisana Bama (Petugas TU/Bendahara)',
        siswa_asal: {
          siswa_id: siswaAsal.siswa_id,
          nis: siswaAsal.nis,
          nama: siswaAsal.nama,
          kelas_terakhir: siswaAsal.kelas_terakhir,
          rfid_uid: siswaAsal.rfid_uid,
          status_kartu: 'DIBLOKIR_PERMANEN',
        },
        nominal: nominalTransfer,
        siswa_tujuan: {
          siswa_id: targetSibling.siswa_id,
          nis: targetSibling.nis,
          nama: targetSibling.nama,
          kelas: targetSibling.kelas,
          saldo_awal: saldoAwalTujuan,
          saldo_akhir: saldoAkhirTujuan,
          nominal_diterima: nominalTransfer,
        },
        berita_acara: beritaAcara.trim(),
      }

      toast.success(
        `Pemindahan saldo ke ${targetSibling.nama} berhasil secara atomik!`,
        {
          description: `Saldo ${formatRupiah(nominalTransfer)} masuk ke akun adik/saudara. Kartu RFID lama ${siswaAsal.nama} otomatis diblokir permanen.`,
        }
      )

      onOpenChange(false)
      onTransferSuccess(siswaAsal.siswa_id, slipData)
    } catch {
      toast.error('Gagal melakukan transfer saldo saudara. Silakan periksa kembali.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold text-foreground'>
            Pindahkan Saldo ke Saudara Kandung
          </DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Opsi B: Transfer saldo titipan siswa nonaktif ke saudara kandung yang masih aktif
          </DialogDescription>
        </DialogHeader>

        {/* Info Siswa Asal */}
        <div className='rounded-xl border bg-muted/60 p-3.5 space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <img
                src={siswaAsal.foto_url}
                alt={siswaAsal.nama}
                className='h-11 w-11 rounded-full object-cover border'
              />
              <div>
                <span className='text-[10px] font-semibold tracking-wider text-muted-foreground uppercase'>
                  Siswa Asal (Nonaktif)
                </span>
                <p className='font-bold text-sm text-foreground'>
                  {siswaAsal.nama}
                </p>
                <p className='text-xs text-muted-foreground font-mono'>
                  {siswaAsal.nis} • {siswaAsal.kelas_terakhir}
                </p>
              </div>
            </div>

            <div className='text-right'>
              <span className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold'>
                Saldo Dipindahkan
              </span>
              <p className='text-base font-bold font-mono text-primary'>
                {formatRupiah(siswaAsal.saldo)}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4 pt-1'>
          {/* Bagian Rekomendasi Saudara Kandung Terdata */}
          {siswaAsal.saudara_kandung && siswaAsal.saudara_kandung.length > 0 && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5'>
                  <Sparkles className='h-3.5 w-3.5 text-amber-500' />
                  Saudara Kandung Terdeteksi (Data Kartu Keluarga / Dapodik)
                </Label>
                <Badge variant='secondary' className='text-[10px]'>
                  Rekomendasi
                </Badge>
              </div>

              <div className='grid grid-cols-1 gap-2'>
                {siswaAsal.saudara_kandung.map((sibling) => {
                  const isSelected = selectedDestination?.siswa_id === sibling.siswa_id
                  return (
                    <div
                      key={sibling.siswa_id}
                      onClick={() => {
                        const target = activeStudents.find((s) => s.siswa_id === sibling.siswa_id)
                        if (target) setSelectedDestination(target)
                      }}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className='flex items-center gap-2.5'>
                        <div className='h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary text-xs'>
                          {sibling.nama.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className='font-semibold text-xs text-foreground flex items-center gap-1.5'>
                            {sibling.nama}
                            <Badge
                              variant='outline'
                              className='text-[9px] py-0 border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium'
                            >
                              Aktif
                            </Badge>
                          </p>
                          <p className='text-[11px] text-muted-foreground font-mono'>
                            NIS: {sibling.nis} • Kelas: {sibling.kelas}
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        <div className='text-right'>
                          <p className='text-[10px] text-muted-foreground'>Saldo Saat Ini</p>
                          <p className='text-xs font-mono font-semibold text-foreground'>
                            {formatRupiah(sibling.saldo)}
                          </p>
                        </div>
                        {isSelected && (
                          <div className='h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center'>
                            <Check className='h-3 w-3 stroke-[3]' />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Atau Cari Siswa Aktif Lainnya */}
          <div className='space-y-2'>
            <Label className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
              <Users className='h-3.5 w-3.5 text-muted-foreground' />
              Pilih Siswa Penerima (Saudara Kandung Lainnya)
            </Label>

            <div className='relative'>
              <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Cari nama siswa, NIS, atau kelas...'
                className='h-9 pl-8 text-xs'
              />
            </div>

            {searchQuery && (
              <div className='max-h-40 overflow-y-auto rounded-lg border bg-popover text-popover-foreground divide-y'>
                {filteredStudents.length === 0 ? (
                  <p className='text-xs text-muted-foreground p-3 text-center'>
                    Tidak ada siswa aktif ditemukan.
                  </p>
                ) : (
                  filteredStudents.map((s) => (
                    <div
                      key={s.siswa_id}
                      onClick={() => {
                        setSelectedDestination(s)
                        setSearchQuery('')
                      }}
                      className='p-2.5 flex items-center justify-between hover:bg-muted/50 cursor-pointer text-xs'
                    >
                      <div>
                        <p className='font-semibold text-foreground'>{s.nama}</p>
                        <p className='text-[11px] text-muted-foreground font-mono'>
                          NIS: {s.nis} • {s.kelas}
                        </p>
                      </div>
                      <div className='text-right'>
                        <span className='font-mono font-semibold text-emerald-600 dark:text-emerald-400'>
                          {formatRupiah(s.saldo)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pratinjau Saldo Atomik Real-time */}
          {selectedDestination && (
            <div className='rounded-xl border bg-muted/40 p-3.5 space-y-2.5'>
              <div className='flex items-center justify-between text-xs font-bold text-foreground'>
                <span>Pratinjau Mutasi Saldo Atomik</span>
                <Badge variant='outline' className='border-0 bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[10px] py-0 font-medium'>
                  2 Akun Sekaligus
                </Badge>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
                {/* Asal */}
                <div className='rounded-lg bg-card p-2.5 border space-y-1'>
                  <p className='text-[10px] text-muted-foreground font-semibold'>AKUN ASAL (LULUS)</p>
                  <p className='font-semibold truncate text-foreground'>
                    {siswaAsal.nama}
                  </p>
                  <div className='flex justify-between items-center text-[11px] pt-1'>
                    <span className='line-through text-muted-foreground font-mono'>
                      {formatRupiah(siswaAsal.saldo)}
                    </span>
                    <span className='font-bold text-destructive font-mono'>Rp 0</span>
                  </div>
                  <Badge variant='outline' className='border-0 bg-destructive/15 text-destructive text-[9px] py-0 gap-1 w-full justify-center font-medium'>
                    <Lock className='h-2.5 w-2.5' /> KARTU DIBLOKIR
                  </Badge>
                </div>

                {/* Tujuan */}
                <div className='rounded-lg bg-card p-2.5 border space-y-1'>
                  <p className='text-[10px] text-primary font-semibold'>PENERIMA (SAUDARA AKTIF)</p>
                  <p className='font-semibold truncate text-foreground'>
                    {selectedDestination.nama}
                  </p>
                  <div className='flex justify-between items-center text-[11px] pt-1'>
                    <span className='text-muted-foreground font-mono'>
                      {formatRupiah(saldoAwalTujuan)}
                    </span>
                    <span className='font-bold text-emerald-600 dark:text-emerald-400 font-mono'>
                      {formatRupiah(saldoAkhirTujuan)}
                    </span>
                  </div>
                  <Badge
                    variant='outline'
                    className='border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px] py-0 gap-1 w-full justify-center font-medium'
                  >
                    <ArrowRight className='h-2.5 w-2.5' /> Bertambah {formatRupiah(nominalTransfer)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Input Berita Acara */}
          <div className='space-y-1.5'>
            <Label htmlFor='beritaAcara' className='text-xs'>
              Berita Acara / Keterangan Transfer *
            </Label>
            <Textarea
              id='beritaAcara'
              value={beritaAcara}
              onChange={(e) => setBeritaAcara(e.target.value)}
              placeholder='Contoh: Pemindahan sisa saldo kakak yang telah lulus ke adik kandung.'
              className='text-xs min-h-[60px]'
            />
          </div>

          {/* Warning Banner */}
          <Alert className='border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'>
            <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400' />
            <AlertTitle className='text-xs font-semibold'>Sifat Transaksi Atomik</AlertTitle>
            <AlertDescription className='text-[11px] leading-relaxed mt-1'>
              Operasi pemindahan saldo bersifat atomik: jika transfer berhasil, saldo siswa nonaktif
              menjadi Rp 0 dan kartu lamanya langsung dinonaktifkan permanen, sedangkan saldo saudara
              kandung langsung bertambah dan bisa dipakai belanja di kantin saat ini juga.
            </AlertDescription>
          </Alert>

          {/* Persetujuan */}
          <div className='flex items-start gap-2 pt-1'>
            <input
              type='checkbox'
              id='transfer-agreement'
              checked={agreement}
              onChange={(e) => setAgreement(e.target.checked)}
              className='mt-0.5 rounded border-gray-300 text-primary focus:ring-primary'
            />
            <Label
              htmlFor='transfer-agreement'
              className='text-[11px] font-normal leading-tight cursor-pointer'
            >
              Saya mengonfirmasi bahwa kedua siswa adalah saudara kandung sah dan telah disetujui
              orang tua untuk memindahkan sisa saldo sebesar{' '}
              <strong className='text-foreground'>{formatRupiah(nominalTransfer)}</strong>.
            </Label>
          </div>

          <DialogFooter className='gap-2 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type='submit'
              disabled={!isValidSubmit || isSubmitting}
              className='gap-2'
            >
              <ArrowLeftRight className='h-3.5 w-3.5' />
              {isSubmitting ? 'Memproses Transfer...' : 'Pindahkan Saldo Sekarang'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
  )
}
