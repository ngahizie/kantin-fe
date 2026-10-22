import { describe, expect, it } from 'vitest'
import { filterNavGroupsByRole } from './nav-utils'
import { sidebarData } from './data/sidebar-data'

describe('filterNavGroupsByRole', () => {
  it('restricts admin to dashboard, student control, system settings, and authorized reports (PRD §9.6)', () => {
    const result = filterNavGroupsByRole(sidebarData.navGroups, 'admin')
    const groupTitles = result.map((g) => g.title)

    // Admin hanya memiliki akses ke 3 grup ini, tidak memiliki akses ke katalog/stok dan layanan TU
    expect(groupTitles).toEqual([
      'Kasir & Ringkasan',
      'Saldo & Pengawasan',
      'Laporan & Pengaturan',
    ])
    expect(groupTitles).not.toContain('Katalog & Inventaris')
    expect(groupTitles).not.toContain('Layanan TU & Kartu')

    // Kasir POS tidak diakses admin
    const ringkasanGroup = result.find((g) => g.title === 'Kasir & Ringkasan')
    expect(ringkasanGroup?.items.map((i) => i.title)).toEqual(['Dashboard Ringkasan'])

    // Saldo & Pengawasan: Hanya Kontrol Siswa (Koreksi dan Refund adalah milik Bendahara)
    const saldoGroup = result.find((g) => g.title === 'Saldo & Pengawasan')
    expect(saldoGroup?.items.map((i) => i.title)).toEqual(['Kontrol Siswa'])

    // Laporan & Pengaturan: Pengaturan Kantin dan laporan yang diizinkan (tanpa Kerugian Stok)
    const laporanGroup = result.find((g) => g.title === 'Laporan & Pengaturan')
    expect(laporanGroup?.items.map((i) => i.title)).toContain('Pengaturan Kantin')
    const laporanMenu = laporanGroup?.items.find((i) => i.title === 'Laporan Keuangan')
    const subReportTitles = ('items' in (laporanMenu || {}) ? (laporanMenu as any).items : []).map(
      (s: any) => s.title
    )
    expect(subReportTitles).toContain('Rekonsiliasi Harian')
    expect(subReportTitles).toContain('Penjualan & Laba Kotor')
    expect(subReportTitles).toContain('Analisis Laba Kotor')
    expect(subReportTitles).toContain('Saldo Mengendap')
    expect(subReportTitles).toContain('Riwayat Belanja Siswa')
    expect(subReportTitles).not.toContain('Laporan Kerugian Stok')
  })

  it('restricts kasir role exclusively to Kasir POS', () => {
    const result = filterNavGroupsByRole(sidebarData.navGroups, 'kasir')
    expect(result.length).toBe(1)
    expect(result[0].title).toBe('Kasir & Ringkasan')

    const itemTitles = result[0].items.map((i) => i.title)
    expect(itemTitles).toEqual(['Kasir POS'])
    expect(itemTitles).not.toContain('Dashboard Ringkasan')
  })

  it('restricts pengelola role to catalog, stock, pos, and relevant operational reports', () => {
    const result = filterNavGroupsByRole(sidebarData.navGroups, 'pengelola')
    const groupTitles = result.map((g) => g.title)

    expect(groupTitles).toContain('Kasir & Ringkasan')
    expect(groupTitles).toContain('Katalog & Inventaris')
    expect(groupTitles).toContain('Laporan & Pengaturan')
    expect(groupTitles).not.toContain('Layanan TU & Kartu')
    expect(groupTitles).not.toContain('Saldo & Pengawasan')

    // Verifikasi laporan yang diizinkan untuk pengelola
    const laporanGroup = result.find((g) => g.title === 'Laporan & Pengaturan')
    const laporanMenu = laporanGroup?.items.find((i) => i.title === 'Laporan Keuangan')
    const subReportTitles = ('items' in (laporanMenu || {}) ? (laporanMenu as any).items : []).map(
      (s: any) => s.title
    )

    expect(subReportTitles).toContain('Penjualan & Laba Kotor')
    expect(subReportTitles).toContain('Analisis Laba Kotor')
    expect(subReportTitles).toContain('Laporan Kerugian Stok')
    expect(subReportTitles).not.toContain('Rekonsiliasi Harian')
    expect(subReportTitles).not.toContain('Saldo Mengendap')
    expect(subReportTitles).not.toContain('Riwayat Belanja Siswa')

    // Pengaturan kantin harus disembunyikan dari pengelola
    const settingMenu = laporanGroup?.items.find((i) => i.title === 'Pengaturan Kantin')
    expect(settingMenu).toBeUndefined()
  })

  it('restricts tu role to dashboard, Layanan TU & Kartu, and authorized student reports', () => {
    const result = filterNavGroupsByRole(sidebarData.navGroups, 'tu')
    const groupTitles = result.map((g) => g.title)

    expect(groupTitles).toEqual([
      'Kasir & Ringkasan',
      'Layanan TU & Kartu',
      'Laporan & Pengaturan',
    ])

    const tuGroup = result.find((g) => g.title === 'Layanan TU & Kartu')
    const tuItems = tuGroup?.items.map((i) => i.title)
    expect(tuItems).toContain('Top-up Tunai Siswa')
    expect(tuItems).toContain('Setoran Kas TU Harian')
    expect(tuItems).toContain('Manajemen Kartu Tamu')

    // TU tidak boleh melihat Kasir POS, inventaris, saldo koreksi
    const ringkasanGroup = result.find((g) => g.title === 'Kasir & Ringkasan')
    expect(ringkasanGroup?.items.map((i) => i.title)).toEqual(['Dashboard Ringkasan'])

    // Laporan yang boleh dilihat TU (Rekonsiliasi, Saldo Mengendap, Riwayat Belanja)
    const laporanGroup = result.find((g) => g.title === 'Laporan & Pengaturan')
    const laporanMenu = laporanGroup?.items.find((i) => i.title === 'Laporan Keuangan')
    const subReportTitles = ('items' in (laporanMenu || {}) ? (laporanMenu as any).items : []).map(
      (s: any) => s.title
    )
    expect(subReportTitles).toContain('Rekonsiliasi Harian')
    expect(subReportTitles).toContain('Saldo Mengendap')
    expect(subReportTitles).toContain('Riwayat Belanja Siswa')
    expect(subReportTitles).not.toContain('Penjualan & Laba Kotor')
  })

  it('allows bendahara financial oversight without POS, menu CRUD, parent controls, or system settings', () => {
    const result = filterNavGroupsByRole(sidebarData.navGroups, 'bendahara')
    const groupTitles = result.map((g) => g.title)

    expect(groupTitles).toContain('Kasir & Ringkasan')
    expect(groupTitles).toContain('Katalog & Inventaris')
    expect(groupTitles).toContain('Layanan TU & Kartu')
    expect(groupTitles).toContain('Saldo & Pengawasan')
    expect(groupTitles).toContain('Laporan & Pengaturan')

    // Pada Katalog & Inventaris: Hanya Manajemen Stok (baca opname/stok), Menu & Kategori tersembunyi
    const katalogGroup = result.find((g) => g.title === 'Katalog & Inventaris')
    const katalogItemTitles = katalogGroup?.items.map((i) => i.title)
    expect(katalogItemTitles).toEqual(['Manajemen Stok'])
    expect(katalogItemTitles).not.toContain('Katalog Menu')
    expect(katalogItemTitles).not.toContain('Kategori Menu')

    // Pada Saldo & Pengawasan: Koreksi & Refund tampil, Kontrol Siswa tersembunyi
    const saldoGroup = result.find((g) => g.title === 'Saldo & Pengawasan')
    const saldoItemTitles = saldoGroup?.items.map((i) => i.title)
    expect(saldoItemTitles).toContain('Mutasi Koreksi Bendahara')
    expect(saldoItemTitles).toContain('Refund Saldo Siswa')
    expect(saldoItemTitles).not.toContain('Kontrol Siswa')

    // Pengaturan Kantin tersembunyi
    const laporanGroup = result.find((g) => g.title === 'Laporan & Pengaturan')
    expect(laporanGroup?.items.find((i) => i.title === 'Pengaturan Kantin')).toBeUndefined()
  })

  it('restricts kepsek to executive monitoring and reporting', () => {
    const result = filterNavGroupsByRole(sidebarData.navGroups, 'kepsek')
    const groupTitles = result.map((g) => g.title)

    expect(groupTitles).toEqual([
      'Kasir & Ringkasan',
      'Saldo & Pengawasan',
      'Laporan & Pengaturan',
    ])

    // Kepsek tidak melihat Kasir POS, Inventaris, Layanan TU, Kontrol Siswa, atau Pengaturan
    expect(groupTitles).not.toContain('Katalog & Inventaris')
    expect(groupTitles).not.toContain('Layanan TU & Kartu')

    const saldoGroup = result.find((g) => g.title === 'Saldo & Pengawasan')
    expect(saldoGroup?.items.map((i) => i.title)).not.toContain('Kontrol Siswa')

    const laporanGroup = result.find((g) => g.title === 'Laporan & Pengaturan')
    const laporanMenu = laporanGroup?.items.find((i) => i.title === 'Laporan Keuangan')
    const subReportTitles = ('items' in (laporanMenu || {}) ? (laporanMenu as any).items : []).map(
      (s: any) => s.title
    )
    expect(subReportTitles).toContain('Rekonsiliasi Harian')
    expect(subReportTitles).toContain('Penjualan & Laba Kotor')
    expect(subReportTitles).toContain('Analisis Laba Kotor')
    expect(subReportTitles).toContain('Saldo Mengendap')
    expect(subReportTitles).toContain('Laporan Kerugian Stok')
    expect(subReportTitles).not.toContain('Riwayat Belanja Siswa')
  })
})
