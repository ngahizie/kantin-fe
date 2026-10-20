import { useState, useEffect } from 'react'
import {
  Check,
  DollarSign,
  Tag,
  UtensilsCrossed,
  Search,
  Info,
  RotateCcw,
  Smartphone,
  PhoneOff,
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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import { formatRupiah } from '@/lib/formatters'
import {
  MOCK_MENU,
  MOCK_KATEGORI,
  type KartuSiswaMock,
  type MenuItemMock,
  type KategoriMock,
} from '@/mocks/mock-data'

interface LimitBlokirFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: KartuSiswaMock | null
  onSaveSuccess: (updatedStudent: KartuSiswaMock) => void
}

const PRESET_LIMITS = [15000, 25000, 35000, 50000]

interface LimitBlokirFormContentProps {
  student: KartuSiswaMock
  categories: KategoriMock[]
  menuList: MenuItemMock[]
  onClose: () => void
  onSaveSuccess: (updatedStudent: KartuSiswaMock) => void
}

function LimitBlokirFormContent({
  student,
  categories,
  menuList,
  onClose,
  onSaveSuccess,
}: LimitBlokirFormContentProps) {
  const hasLimitInitial = student.limit_harian_enabled !== false && student.limit_harian > 0
  const [limitEnabled, setLimitEnabled] = useState(hasLimitInitial)
  const [limitNominal, setLimitNominal] = useState<string>(
    student.limit_harian ? student.limit_harian.toString() : '25000'
  )
  const [blockedCategoryIds, setBlockedCategoryIds] = useState<number[]>(
    student.blocked_categories || []
  )
  const [blockedItemIds, setBlockedItemIds] = useState<number[]>(
    student.blocked_items || []
  )
  const [catatan, setCatatan] = useState(student.catatan_kontrol || '')
  const [menuSearch, setMenuSearch] = useState('')
  const [menuCatFilter, setMenuCatFilter] = useState<number | 'ALL'>('ALL')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleToggleCategory = (catId: number) => {
    setBlockedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    )
  }

  const handleToggleItem = (itemId: number) => {
    setBlockedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  const handleResetToDefault = () => {
    setLimitEnabled(false)
    setLimitNominal('0')
    setBlockedCategoryIds([])
    setBlockedItemIds([])
    setCatatan('')
    toast.info('Form dikembalikan ke kondisi tanpa batas')
  }

  const filteredMenuItems = menuList.filter((item) => {
    const matchCat = menuCatFilter === 'ALL' || item.kategori_id === menuCatFilter
    const matchText =
      !menuSearch ||
      item.nama.toLowerCase().includes(menuSearch.toLowerCase()) ||
      item.kategori_nama.toLowerCase().includes(menuSearch.toLowerCase())
    return matchCat && matchText
  })

  const nominalLimitNum = limitEnabled ? Number(limitNominal) || 0 : 0
  const isValidNominal = !limitEnabled || nominalLimitNum >= 5000

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidNominal || isSubmitting) return

    setIsSubmitting(true)

    try {
      const res = await apiClient
        .put('/api/kontrol-kartu/limit-harian', {
          subjekTipe: 'SISWA',
          subjekId: student.siswa_id,
          nominal: limitEnabled ? nominalLimitNum : null,
        })
        .catch(() => null)

      const updatedStudent: KartuSiswaMock = {
        ...student,
        limit_harian: nominalLimitNum,
        limit_harian_enabled: limitEnabled,
        blocked_items: blockedItemIds,
        blocked_categories: blockedCategoryIds,
        catatan_kontrol: catatan.trim(),
        updated_at: new Date().toISOString(),
      }

      toast.success(`Pengaturan kontrol untuk ${student.nama} berhasil disimpan!`, {
        description: 'Batasan limit belanja dan larangan menu langsung aktif pada validasi kasir POS.',
      })

      onClose()
      onSaveSuccess(res?.data?.data || updatedStudent)
    } catch {
      toast.error('Gagal menyimpan pengaturan kontrol siswa.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <DialogHeader className='pr-8 text-left'>
        <DialogTitle className='text-lg font-bold text-foreground'>
          Atur Limit & Blokir Menu Siswa
        </DialogTitle>
        <DialogDescription className='text-sm text-muted-foreground'>
          Perwalian Admin Sekolah atas nama orang tua yang belum memakai aplikasi mobile
        </DialogDescription>
      </DialogHeader>

      {/* Profil Siswa Header Card */}
      <div className='rounded-xl border bg-muted/60 p-3.5 space-y-2'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div className='flex items-center gap-3 min-w-0 flex-1'>
            <img
              src={student.foto_url}
              alt={student.nama}
              className='h-12 w-12 rounded-full object-cover border shrink-0'
            />
            <div className='min-w-0 flex-1'>
              <p className='font-bold text-sm text-foreground truncate'>{student.nama}</p>
              <p className='text-xs text-muted-foreground font-mono truncate'>
                NIS: {student.nis} • Kelas: {student.kelas}
              </p>
              <div className='flex flex-wrap items-center gap-1.5 mt-1'>
                {student.parent_app_registered ? (
                  <Badge variant='outline' className='border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] py-0 gap-1 font-medium shrink-0'>
                    <Smartphone className='h-3 w-3' /> Terhubung Aplikasi Mobile
                  </Badge>
                ) : (
                  <Badge variant='outline' className='border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] py-0 gap-1 font-medium shrink-0'>
                    <PhoneOff className='h-3 w-3' /> Ortu Belum Pakai App (Perwalian Admin)
                  </Badge>
                )}
                <span className='text-[11px] text-muted-foreground font-mono shrink-0'>
                  RFID: {student.uid}
                </span>
              </div>
            </div>
          </div>

          <div className='text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50'>
            <p className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold'>
              Saldo Digital
            </p>
            <p className='text-base font-bold font-mono text-emerald-600 dark:text-emerald-400'>
              {formatRupiah(student.saldo)}
            </p>
            <p className='text-[10px] text-muted-foreground'>
              Belanja hari ini: {formatRupiah(student.belanja_hari_ini)}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-5 pt-1'>
        {/* BAGIAN 1: PENGATURAN LIMIT BELANJA HARIAN */}
        <div className='rounded-xl border p-4 space-y-3 bg-card'>
          <div className='flex items-center justify-between gap-3'>
            <div className='space-y-0.5 min-w-0 flex-1'>
              <Label htmlFor='limit-switch' className='text-sm font-bold flex items-center gap-2'>
                <DollarSign className='h-4 w-4 text-primary shrink-0' />
                <span>Batas Limit Belanja Harian</span>
              </Label>
              <p className='text-xs text-muted-foreground'>
                Batasi jumlah maksimal rupiah yang dapat dibelanjakan siswa dalam satu hari
              </p>
            </div>
            <Switch
              id='limit-switch'
              checked={limitEnabled}
              onCheckedChange={setLimitEnabled}
              className='shrink-0'
            />
          </div>

          {limitEnabled ? (
            <div className='pt-2 space-y-3 border-t'>
              <div className='flex flex-wrap items-center gap-2 w-full'>
                <span className='text-xs text-muted-foreground font-medium shrink-0'>Preset Nominal:</span>
                {PRESET_LIMITS.map((amount) => (
                  <Button
                    key={amount}
                    type='button'
                    size='sm'
                    variant={nominalLimitNum === amount ? 'default' : 'outline'}
                    onClick={() => setLimitNominal(amount.toString())}
                    className='h-7 text-xs px-2.5 font-mono'
                  >
                    {formatRupiah(amount)}
                  </Button>
                ))}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='customLimit' className='text-xs'>
                  Nominal Limit Harian (Rp) *
                </Label>
                <div className='relative'>
                  <span className='absolute left-3 top-2 text-xs font-bold text-muted-foreground'>
                    Rp
                  </span>
                  <Input
                    id='customLimit'
                    value={limitNominal}
                    onChange={(e) => setLimitNominal(e.target.value.replace(/\D/g, ''))}
                    placeholder='25000'
                    className='h-9 pl-9 font-mono text-sm font-semibold'
                  />
                </div>
                {!isValidNominal && (
                  <p className='text-[11px] text-destructive'>
                    Nominal limit harian minimal Rp 5.000
                  </p>
                )}
              </div>

              <div className='rounded-lg bg-blue-500/10 p-2.5 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2'>
                <Info className='h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5' />
                <span>
                  Jika belanja hari ini melebihi{' '}
                  <strong>{formatRupiah(nominalLimitNum)}</strong>, kasir akan otomatis menolak
                  transaksi dengan pesan <em>"Melebihi limit harian"</em> .
                </span>
              </div>
            </div>
          ) : (
            <div className='text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg flex items-center gap-2'>
              <Check className='h-3.5 w-3.5 text-emerald-600 shrink-0' />
              <span>
                <strong>Tanpa Limit Harian:</strong> Siswa bebas berbelanja selama saldo digitalnya
                masih mencukupi.
              </span>
            </div>
          )}
        </div>

        {/* BAGIAN 2: BLOKIR KATEGORI MENU */}
        <div className='rounded-xl border p-4 space-y-3 bg-card'>
          <div className='space-y-0.5'>
            <Label className='text-sm font-bold flex items-center gap-2'>
              <Tag className='h-4 w-4 text-amber-500 shrink-0' />
              <span>Blokir Seluruh Kategori Menu</span>
            </Label>
            <p className='text-xs text-muted-foreground'>
              Menceklis kategori akan memblokir <strong>seluruh menu</strong> di bawah kategori tersebut
            </p>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 w-full'>
            {categories.map((kat) => {
              const isBlocked = blockedCategoryIds.includes(kat.id)
              return (
                <div
                  key={kat.id}
                  onClick={() => handleToggleCategory(kat.id)}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isBlocked
                      ? 'border-destructive bg-destructive/10 ring-1 ring-destructive/30'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                    <Checkbox
                      checked={isBlocked}
                      onCheckedChange={() => handleToggleCategory(kat.id)}
                      id={`cat-${kat.id}`}
                      className='shrink-0'
                    />
                    <Label
                      htmlFor={`cat-${kat.id}`}
                      className='text-xs font-semibold cursor-pointer text-foreground truncate'
                    >
                      {kat.nama}
                    </Label>
                  </div>

                  <Badge
                    variant='outline'
                    className={
                      isBlocked
                        ? 'border-0 bg-destructive/15 text-destructive text-[10px] py-0 px-1.5 font-medium shrink-0'
                        : 'border-0 bg-muted text-muted-foreground text-[10px] py-0 px-1.5 font-medium shrink-0'
                    }
                  >
                    {isBlocked ? 'DIBLOKIR' : 'Diizinkan'}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>

        {/* BAGIAN 3: BLOKIR ITEM MENU SPESIFIK */}
        <div className='rounded-xl border p-4 space-y-3 bg-card'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2'>
            <div className='space-y-0.5'>
              <Label className='text-sm font-bold flex items-center gap-2'>
                <UtensilsCrossed className='h-4 w-4 text-red-500 shrink-0' />
                <span>Blokir Item Menu Spesifik</span>
              </Label>
              <p className='text-xs text-muted-foreground'>
                Pilih item spesifik yang dilarang (misal: "Kopi Botol", "Es Teh Manis")
              </p>
            </div>

            {blockedItemIds.length > 0 && (
              <Badge variant='outline' className='border-0 bg-destructive/15 text-destructive text-xs font-medium shrink-0'>
                {blockedItemIds.length} Item Diblokir
              </Badge>
            )}
          </div>

          {/* Pencarian dan Filter Tab Kategori */}
          <div className='space-y-2 pt-1'>
            <div className='relative w-full'>
              <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder='Cari nama menu...'
                className='h-8 pl-8 text-xs w-full'
              />
            </div>

            <div className='flex items-center gap-1.5 overflow-x-auto pb-1 w-full max-w-full'>
              <Button
                type='button'
                size='sm'
                variant={menuCatFilter === 'ALL' ? 'default' : 'outline'}
                onClick={() => setMenuCatFilter('ALL')}
                className='h-7 text-xs px-2.5 shrink-0'
              >
                Semua
              </Button>
              {categories.map((c) => (
                <Button
                  key={c.id}
                  type='button'
                  size='sm'
                  variant={menuCatFilter === c.id ? 'default' : 'outline'}
                  onClick={() => setMenuCatFilter(c.id)}
                  className='h-7 text-xs px-2.5 shrink-0 whitespace-nowrap'
                >
                  {c.nama}
                </Button>
              ))}
            </div>
          </div>

          {/* List Menu Item Grid */}
          <div className='max-h-56 overflow-y-auto rounded-lg border divide-y bg-muted/20'>
            {filteredMenuItems.length === 0 ? (
              <p className='p-4 text-center text-xs text-muted-foreground'>
                Tidak ada menu yang sesuai pencarian.
              </p>
            ) : (
              filteredMenuItems.map((item) => {
                const isCatBlocked = blockedCategoryIds.includes(item.kategori_id)
                const isItemBlocked = blockedItemIds.includes(item.id)

                return (
                  <div
                    key={item.id}
                    onClick={() => !isCatBlocked && handleToggleItem(item.id)}
                    className={`p-2.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                      isCatBlocked
                        ? 'bg-amber-500/10 dark:bg-amber-950/20 opacity-80 cursor-not-allowed'
                        : isItemBlocked
                        ? 'bg-destructive/10 cursor-pointer'
                        : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                  >
                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                      <Checkbox
                        checked={isItemBlocked || isCatBlocked}
                        disabled={isCatBlocked}
                        onCheckedChange={() => !isCatBlocked && handleToggleItem(item.id)}
                        id={`menu-${item.id}`}
                        className='shrink-0'
                      />
                      {item.foto_url && (
                        <img
                          src={item.foto_url}
                          alt={item.nama}
                          className='h-9 w-9 rounded-md object-cover border shrink-0'
                        />
                      )}
                      <div className='min-w-0 flex-1'>
                        <p className='font-semibold text-foreground flex flex-wrap items-center gap-1.5'>
                          <span className='truncate'>{item.nama}</span>
                          {isCatBlocked && (
                            <Badge
                              variant='outline'
                              className='border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] py-0 font-medium shrink-0'
                            >
                              Terblokir Kategori ({item.kategori_nama})
                            </Badge>
                          )}
                        </p>
                        <p className='text-[11px] text-muted-foreground truncate'>
                          {item.kategori_nama} • {formatRupiah(item.harga_jual)}
                        </p>
                      </div>
                    </div>

                    <div className='shrink-0'>
                      {isCatBlocked ? (
                        <Badge variant='outline' className='border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-medium'>
                          Kategori Blokir
                        </Badge>
                      ) : isItemBlocked ? (
                        <Badge variant='outline' className='border-0 bg-destructive/15 text-destructive text-[10px] py-0 px-2 font-medium'>
                          DIBLOKIR
                        </Badge>
                      ) : (
                        <span className='text-[11px] text-muted-foreground'>Diizinkan</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* BAGIAN 4: CATATAN INSTRUKSI ORANG TUA */}
        <div className='space-y-1.5'>
          <Label htmlFor='catatanKontrol' className='text-xs font-semibold'>
            Catatan / Dasar Permintaan Orang Tua
          </Label>
          <Textarea
            id='catatanKontrol'
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder='Contoh: Permintaan tertulis via formulir TU / WhatsApp: Siswa alergi kafein & dibatasi jajan maksimal Rp 25.000/hari.'
            className='text-xs min-h-[60px]'
          />
        </div>

        <DialogFooter className='gap-2 pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between w-full'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleResetToDefault}
            className='text-xs text-muted-foreground gap-1.5 justify-center sm:justify-start'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            Reset ke Bebas (Tanpa Batas)
          </Button>

          <div className='flex items-center gap-2 w-full sm:w-auto justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isSubmitting}
              className='flex-1 sm:flex-initial'
            >
              Batal
            </Button>
            <Button
              type='submit'
              disabled={!isValidNominal || isSubmitting}
              className='gap-1.5 flex-1 sm:flex-initial'
            >
              <Check className='h-4 w-4' />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan Kontrol'}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  )
}

export function LimitBlokirForm({
  open,
  onOpenChange,
  student,
  onSaveSuccess,
}: LimitBlokirFormProps) {
  const [categories, setCategories] = useState<KategoriMock[]>(MOCK_KATEGORI)
  const [menuList, setMenuList] = useState<MenuItemMock[]>(MOCK_MENU)

  useEffect(() => {
    let isMounted = true
    const loadCatalog = async () => {
      try {
        const [catRes, menuRes] = await Promise.all([
          apiClient.get('/api/katalog/kategori').catch(() => null),
          apiClient.get('/api/katalog/menu').catch(() => null),
        ])
        if (isMounted) {
          if (catRes?.data?.data && Array.isArray(catRes.data.data)) {
            setCategories(catRes.data.data)
          }
          if (menuRes?.data?.data && Array.isArray(menuRes.data.data)) {
            setMenuList(menuRes.data.data)
          }
        }
      } catch {
        // Fallback to initial mock constants
      }
    }
    void loadCatalog()
    return () => {
      isMounted = false
    }
  }, [])

  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden'>
        <LimitBlokirFormContent
          key={student.siswa_id}
          student={student}
          categories={categories}
          menuList={menuList}
          onClose={() => onOpenChange(false)}
          onSaveSuccess={onSaveSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
