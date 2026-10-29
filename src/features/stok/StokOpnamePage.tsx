import { useState, useEffect } from 'react'
import {
  Trash2,
  History,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import type { MenuItem, KategoriItem } from '@/features/katalog/types'
import { stokApi } from './api/stok-api'
import { OpnameInputTable } from './components/OpnameInputTable'
import { BarangRusakPage } from './BarangRusakPage'
import { BarangRusakModal } from './components/BarangRusakModal'
import { RiwayatOpnameTable } from './components/RiwayatOpnameTable'
import type { RiwayatStokItem } from './types'

export function StokOpnamePage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'rusak' | 'riwayat'>('audit')
  const [menuList, setMenuList] = useState<MenuItem[]>([])
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([])
  const [riwayatList, setRiwayatList] = useState<RiwayatStokItem[]>([])
  const [hppMap, setHppMap] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isQuickDamageModalOpen, setIsQuickDamageModalOpen] = useState(false)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [menus, kategoris, riwayatRes] = await Promise.all([
        katalogApi.getMenuList(undefined, true),
        katalogApi.getKategoriList(),
        stokApi.getRiwayatStok({ ukuran: 100 }).catch(() => ({
          items: [],
          total: 0,
          halaman: 0,
          ukuran: 100,
          totalHalaman: 0,
        })),
      ])

      const hppObj: Record<number, number> = {}
      await Promise.all(
        menus.map(async (m) => {
          try {
            const stokDetail = await stokApi.getStokMenu(m.id)
            hppObj[m.id] = stokDetail.hpp || Math.round(m.hargaJual * 0.7)
          } catch {
            hppObj[m.id] = Math.round(m.hargaJual * 0.7)
          }
        })
      )

      setMenuList(menus)
      setKategoriList(kategoris)
      setRiwayatList(riwayatRes.items || [])
      setHppMap(hppObj)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gagal memuat data stok opname'
      toast.error('Gagal Memuat Data', { description: msg })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [menus, kategoris, riwayatRes] = await Promise.all([
          katalogApi.getMenuList(undefined, true),
          katalogApi.getKategoriList(),
          stokApi.getRiwayatStok({ ukuran: 100 }).catch(() => ({
            items: [],
            total: 0,
            halaman: 0,
            ukuran: 100,
            totalHalaman: 0,
          })),
        ])
        if (!isMounted) return

        const hppObj: Record<number, number> = {}
        await Promise.all(
          menus.map(async (m) => {
            try {
              const stokDetail = await stokApi.getStokMenu(m.id)
              hppObj[m.id] = stokDetail.hpp || Math.round(m.hargaJual * 0.7)
            } catch {
              hppObj[m.id] = Math.round(m.hargaJual * 0.7)
            }
          })
        )
        if (!isMounted) return

        setMenuList(menus)
        setKategoriList(kategoris)
        setRiwayatList(riwayatRes.items || [])
        setHppMap(hppObj)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg =
          err instanceof Error ? err.message : 'Gagal memuat data stok opname'
        toast.error('Gagal Memuat Data', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void init()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <>
      <Header fixed>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Manajemen Stok
            </span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-medium">Stok Opname & Rusak</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      <Main className="space-y-6">
        {/* Page Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Stok Opname Fisik & Barang Rusak
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsQuickDamageModalOpen(true)}
              className="h-8 gap-1.5 text-xs text-white font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Catat Barang Rusak
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'audit' | 'rusak' | 'riwayat')}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60">
            <TabsTrigger value="audit" className="text-xs flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Audit Stok Fisik
            </TabsTrigger>
            <TabsTrigger value="rusak" className="text-xs flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Barang Rusak Harian
            </TabsTrigger>
            <TabsTrigger value="riwayat" className="text-xs flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Riwayat Audit
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Audit Stok Fisik */}
          <TabsContent value="audit" className="space-y-4 focus-visible:outline-none">
            <OpnameInputTable
              menuList={menuList}
              kategoriList={kategoriList}
              hppMap={hppMap}
              isLoading={isLoading}
              onSuccess={loadData}
            />
          </TabsContent>

          {/* Tab 2: Barang Rusak Harian */}
          <TabsContent value="rusak" className="space-y-4 focus-visible:outline-none">
            <BarangRusakPage
              riwayatList={riwayatList}
              isLoading={isLoading}
              onRefresh={loadData}
            />
          </TabsContent>

          {/* Tab 3: Riwayat Mutasi Opname */}
          <TabsContent value="riwayat" className="space-y-4 focus-visible:outline-none">
            <RiwayatOpnameTable
              riwayatList={riwayatList}
              isLoading={isLoading}
              onRefresh={loadData}
            />
          </TabsContent>
        </Tabs>
      </Main>

      {/* Quick Damage Modal */}
      <BarangRusakModal
        open={isQuickDamageModalOpen}
        onOpenChange={setIsQuickDamageModalOpen}
        menuList={menuList}
        hppMap={hppMap}
        onSuccess={loadData}
      />
    </>
  )
}
