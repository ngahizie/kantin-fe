import { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeftRight,
  Search,
  Lock,
  ArrowRight,
  Check,
  Users,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import apiClient from '@/lib/api-client'
import { formatRupiah } from '@/lib/formatters'
import { type KartuSiswaMock } from '@/types/kantin'
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
  const [activeStudents, setActiveStudents] = useState<KartuSiswaMock[]>([])
  const [selectedDestination, setSelectedDestination] = useState<KartuSiswaMock | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [beritaAcara, setBeritaAcara] = useState(
    `Pemindahan sisa saldo kelulusan ${siswaAsal.nama} (${siswaAsal.nis}) ke saudara kandung aktif.`
  )
  const [agreement, setAgreement] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load active students from API
  useEffect(() => {
    let isMounted = true
    const loadStudents = async () => {
      try {
        const [kandidatRes, siswaRes] = await Promise.allSettled([
          apiClient.get('/api/saldo/refund/kandidat', {
            params: { hanyaTidakAktif: false },
          }),
          apiClient.get('/api/siswa', { params: { batas: 50 } }),
        ])

        if (!isMounted) return

        const siswaInfoMap = new Map<number, Record<string, unknown>>()
        if (
          siswaRes.status === 'fulfilled' &&
          Array.isArray(siswaRes.value.data?.data)
        ) {
          for (const raw of siswaRes.value.data.data as Record<string, unknown>[]) {
            const sid = Number(raw.siswaId ?? raw.siswa_id ?? raw.id ?? 0)
            if (sid > 0) siswaInfoMap.set(sid, raw)
          }
        }

        const rawKandidat =
          kandidatRes.status === 'fulfilled' &&
          Array.isArray(kandidatRes.value.data?.data)
            ? (kandidatRes.value.data.data as Record<string, unknown>[])
            : []

        const isRich = rawKandidat.some((item) => item.nama && item.nis && item.uid)
        if (isRich) {
          setActiveStudents(rawKandidat as unknown as KartuSiswaMock[])
          return
        }

        const mapped: KartuSiswaMock[] = []
        const seenIds = new Set<number>()
        for (const item of rawKandidat) {
          const sid = Number(item.siswaId ?? item.siswa_id ?? 0)
          if (!sid) continue
          seenIds.add(sid)
          const info = siswaInfoMap.get(sid)
          const nis = String(item.nis ?? info?.nis ?? '')
          mapped.push({
            uid: String(info?.uid ?? info?.rfidUid ?? (nis ? `UID-${nis}` : `UID-${sid}`)),
            siswa_id: sid,
            nis,
            nama: String(item.nama ?? info?.nama ?? `Siswa #${sid}`),
            kelas: String(item.kelas ?? info?.kelas ?? '-'),
            foto_url: String(info?.fotoUrl ?? info?.foto_url ?? ''),
            saldo: Number(item.saldo ?? info?.saldo ?? 0),
            limit_harian: 0,
            belanja_hari_ini: 0,
            is_blocked: Boolean(info?.diblokir ?? item.tidakAktif),
          })
        }

        for (const [sid, info] of siswaInfoMap.entries()) {
          if (seenIds.has(sid) || info.tidakAktif || info.tidak_aktif) continue
          const nis = String(info.nis ?? '')
          mapped.push({
            uid: String(info.uid ?? info.rfidUid ?? (nis ? `UID-${nis}` : `UID-${sid}`)),
            siswa_id: sid,
            nis,
            nama: String(info.nama ?? `Siswa #${sid}`),
            kelas: String(info.kelas ?? '-'),
            foto_url: String(info.fotoUrl ?? info.foto_url ?? ''),
            saldo: Number(info.saldo ?? 0),
            limit_harian: 0,
            belanja_hari_ini: 0,
            is_blocked: Boolean(info.diblokir),
          })
        }

        setActiveStudents(mapped)
      } catch {
        if (isMounted) {
          setActiveStudents([])
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
      await apiClient.post('/api/saldo/pindah-saldo', payload)

      const currentUser = useAuthStore.getState().auth.user
      const petugasNama = currentUser?.nama || 'Petugas TU / Bendahara'

      const slipData: RefundSlipData = {
        type: 'TRANSFER_SAUDARA',
        ref_no: refNo,
        waktu: new Date().toISOString(),
        petugas_nama: petugasNama,
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
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Gagal melakukan transfer saldo saudara. Silakan periksa kembali.'
      toast.error(errorMsg)
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
        <div className='rounded-xl border border-border bg-muted/30 p-3.5 space-y-2'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-11 w-11 border border-border shrink-0'>
                <AvatarImage src={siswaAsal.foto_url} alt={siswaAsal.nama} />
                <AvatarFallback className='bg-primary/10 font-bold text-primary'>
                  {siswaAsal.nama.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className='text-[10px] font-semibold tracking-wider text-muted-foreground uppercase'>
                  Siswa Asal (Nonaktif)
                </span>
                <p className='font-bold text-sm text-foreground'>
                  {siswaAsal.nama}
                </p>
                <p className='text-xs text-muted-foreground font-mono tabular-nums'>
                  {siswaAsal.nis} • {siswaAsal.kelas_terakhir}
                </p>
              </div>
            </div>

            <div className='text-right'>
              <span className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold'>
                Saldo Dipindahkan
              </span>
              <p className='text-base font-bold font-mono text-primary tabular-nums'>
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
                <Label className='text-xs font-semibold text-foreground'>
                  Saudara Kandung Terdeteksi (Data Kartu Keluarga / Dapodik)
                </Label>
                <Badge
                  variant='outline'
                  className='rounded-full border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground'
                >
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
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:bg-muted/40 text-foreground'
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
                              className='rounded-full border-emerald-200 bg-emerald-50 px-2 py-0 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                            >
                              Aktif
                            </Badge>
                          </p>
                          <p className='text-[11px] text-muted-foreground font-mono tabular-nums'>
                            NIS: {sibling.nis} • Kelas: {sibling.kelas}
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        <div className='text-right'>
                          <p className='text-[10px] text-muted-foreground'>Saldo Saat Ini</p>
                          <p className='text-xs font-mono font-semibold text-foreground tabular-nums'>
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
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Cari nama siswa, NIS, atau kelas...'
                className='pl-8 text-xs'
              />
            </div>

            {searchQuery && (
              <div className='max-h-40 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-md divide-y divide-border'>
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
                        <p className='text-[11px] text-muted-foreground font-mono tabular-nums'>
                          NIS: {s.nis} • {s.kelas}
                        </p>
                      </div>
                      <div className='text-right'>
                        <span className='font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums'>
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
            <div className='rounded-xl border border-border bg-muted/30 p-4 space-y-3'>
              <div className='flex items-center justify-between text-xs font-bold text-foreground'>
                <span>Pratinjau Mutasi Saldo Atomik</span>
                <Badge
                  variant='outline'
                  className='rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                >
                  2 Akun Sekaligus
                </Badge>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
                {/* Asal */}
                <div className='rounded-xl bg-card p-3.5 border border-border space-y-2'>
                  <p className='text-[10px] text-muted-foreground font-semibold uppercase tracking-wider'>
                    AKUN ASAL (LULUS)
                  </p>
                  <p className='font-bold truncate text-foreground text-xs'>
                    {siswaAsal.nama}
                  </p>
                  <div className='flex justify-between items-center text-[11px] pt-1 tabular-nums'>
                    <span className='line-through text-muted-foreground font-mono'>
                      {formatRupiah(siswaAsal.saldo)}
                    </span>
                    <span className='font-bold text-destructive font-mono'>Rp 0</span>
                  </div>
                  <Badge
                    variant='outline'
                    className='rounded-full border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 text-[10px] py-0.5 gap-1 w-full justify-center font-medium'
                  >
                    <Lock className='h-2.5 w-2.5' /> KARTU DIBLOKIR
                  </Badge>
                </div>

                {/* Tujuan */}
                <div className='rounded-xl bg-card p-3.5 border border-border space-y-2'>
                  <p className='text-[10px] text-primary font-semibold uppercase tracking-wider'>
                    PENERIMA (SAUDARA AKTIF)
                  </p>
                  <p className='font-bold truncate text-foreground text-xs'>
                    {selectedDestination.nama}
                  </p>
                  <div className='flex justify-between items-center text-[11px] pt-1 tabular-nums'>
                    <span className='text-muted-foreground font-mono'>
                      {formatRupiah(saldoAwalTujuan)}
                    </span>
                    <span className='font-bold text-emerald-600 dark:text-emerald-400 font-mono'>
                      {formatRupiah(saldoAkhirTujuan)}
                    </span>
                  </div>
                  <Badge
                    variant='outline'
                    className='rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] py-0.5 gap-1 w-full justify-center font-medium tabular-nums'
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
              Berita Acara / Keterangan Transfer <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              id='beritaAcara'
              value={beritaAcara}
              onChange={(e) => setBeritaAcara(e.target.value)}
              placeholder='Contoh: Pemindahan sisa saldo kakak yang telah lulus ke adik kandung.'
              className='text-xs min-h-[60px]'
            />
          </div>

          {/* Ketentuan Pemindahan Saldo */}
          <div className='rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground'>
            Saldo asal menjadi <strong className='text-foreground'>Rp 0</strong> & kartu dinonaktifkan. Saldo penerima otomatis bertambah.
          </div>

          {/* Persetujuan */}
          <div className='flex items-center gap-2 pt-1'>
            <Checkbox
              id='transfer-agreement'
              checked={agreement}
              onCheckedChange={(checked) => setAgreement(checked === true)}
            />
            <Label
              htmlFor='transfer-agreement'
              className='text-xs font-normal cursor-pointer select-none tabular-nums'
            >
              Pemindahan saldo <strong className='text-foreground'>{formatRupiah(nominalTransfer)}</strong> telah disetujui orang tua/wali.
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
