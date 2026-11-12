import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api-client'
import {
  KATALOG_SYNC_CHANNEL_NAME,
  KATALOG_SYNC_STORAGE_KEY,
  getLatestKatalogChangeId,
  notifyKatalogChanged,
  subscribeKatalogChanges,
  type KatalogChangeNotification,
} from '@/lib/katalog-sync'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import { stokApi } from '@/features/stok/api/stok-api'
import { kasirApi } from '@/features/kasir/api/kasir-api'

describe('katalog-sync event bus & lintas tab', () => {
  beforeEach(() => {
    localStorage.removeItem(KATALOG_SYNC_STORAGE_KEY)
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.removeItem(KATALOG_SYNC_STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it('mengirim notifikasi lokal dalam tab dan menyimpan id perubahan terbaru di storage', () => {
    const received: KatalogChangeNotification[] = []
    const unsubscribe = subscribeKatalogChanges((evt) => {
      received.push(evt)
    })

    try {
      const emitted = notifyKatalogChanged('menu')

      expect(received).toHaveLength(1)
      expect(received[0].id).toBe(emitted.id)
      expect(received[0].reason).toBe('menu')
      expect(received[0].isCrossTab).toBe(false)
      expect(getLatestKatalogChangeId()).toBe(emitted.id)
    } finally {
      unsubscribe()
    }
  })

  it('menerima pesan BroadcastChannel dari tab lain dan mendeduplikasi storage event dengan id yang sama', async () => {
    const received: KatalogChangeNotification[] = []
    const unsubscribe = subscribeKatalogChanges((evt) => {
      received.push(evt)
    })
    const remoteChannel = new BroadcastChannel(KATALOG_SYNC_CHANNEL_NAME)

    try {
      const remoteEvent = {
        id: 'remote-evt-1',
        reason: 'kasir' as const,
        sourceTabId: 'tab-kasir-terpisah',
        timestamp: Date.now(),
      }

      remoteChannel.postMessage(remoteEvent)

      await vi.waitFor(() => {
        expect(received).toHaveLength(1)
      })

      expect(received[0]).toMatchObject({
        id: 'remote-evt-1',
        reason: 'kasir',
        sourceTabId: 'tab-kasir-terpisah',
        isCrossTab: true,
      })

      // Simulasi fallback StorageEvent untuk id event yang sama tidak boleh memicu panggilan kedua
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: KATALOG_SYNC_STORAGE_KEY,
          newValue: JSON.stringify(remoteEvent),
        })
      )

      expect(received).toHaveLength(1)
    } finally {
      remoteChannel.close()
      unsubscribe()
    }
  })

  it('mendukung fallback storage event lintas tab jika BroadcastChannel tidak mengirim', () => {
    const received: KatalogChangeNotification[] = []
    const unsubscribe = subscribeKatalogChanges((evt) => {
      received.push(evt)
    })

    try {
      const fallbackEvent = {
        id: 'storage-evt-1',
        reason: 'stok' as const,
        sourceTabId: 'tab-stok-terpisah',
        timestamp: Date.now(),
      }

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: KATALOG_SYNC_STORAGE_KEY,
          newValue: JSON.stringify(fallbackEvent),
        })
      )

      expect(received).toHaveLength(1)
      expect(received[0]).toMatchObject({
        id: 'storage-evt-1',
        reason: 'stok',
        isCrossTab: true,
      })
    } finally {
      unsubscribe()
    }
  })

  it('mengabaikan pesan lintas tab palsu yang berasal dari tab sendiri atau payload tidak valid', async () => {
    const received: KatalogChangeNotification[] = []
    const unsubscribe = subscribeKatalogChanges((evt) => {
      received.push(evt)
    })
    const remoteChannel = new BroadcastChannel(KATALOG_SYNC_CHANNEL_NAME)

    try {
      const ownEvent = notifyKatalogChanged('kategori')
      expect(received).toHaveLength(1)

      // Simulasi pantulan id/sourceTabId milik sendiri lewat BroadcastChannel / storage
      remoteChannel.postMessage(ownEvent)
      remoteChannel.postMessage({ invalid: true })
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: KATALOG_SYNC_STORAGE_KEY,
          newValue: 'bukan-json',
        })
      )

      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(received).toHaveLength(1)
    } finally {
      remoteChannel.close()
      unsubscribe()
    }
  })
})

describe('Emisi katalog-sync pada mutasi API', () => {
  afterEach(() => {
    localStorage.removeItem(KATALOG_SYNC_STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it('memancarkan event saat katalogApi, stokApi, dan kasirApi berhasil memutasi data (batch stok hanya 1x)', async () => {
    const events: string[] = []
    const unsubscribe = subscribeKatalogChanges((evt) => {
      events.push(evt.reason)
    })

    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        data: {
          id: 99,
          transaksiId: 99,
          total: 5000,
          pembeli: { nama: 'Siswa Uji', saldoSisa: 10000 },
        },
      },
    })
    vi.spyOn(apiClient, 'put').mockResolvedValue({
      data: { data: { id: 1, nama: 'Kategori Uji', urutan: 1, aktif: true } },
    })
    vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { data: null } })

    try {
      await katalogApi.createKategori({ nama: 'Minuman', urutan: 1, aktif: true })
      await katalogApi.updateKategori(1, { nama: 'Minuman Baru', urutan: 1, aktif: true })
      await katalogApi.deleteKategori(1)

      await stokApi.catatBarangMasuk({
        menuId: 1,
        qty: 5,
        hargaBeliPerUnit: 3000,
        referensiId: 'BM-1',
      })
      await stokApi.catatBarangMasukBatch(
        [
          { menuId: 1, qty: 2, hargaBeliPerUnit: 3000 },
          { menuId: 2, qty: 3, hargaBeliPerUnit: 4000 },
          { menuId: 3, qty: 4, hargaBeliPerUnit: 5000 },
        ],
        'BM-BATCH-1'
      )
      await stokApi.catatBarangMasukPembalik({
        mutasiId: 10,
        qty: 1,
        alasan: 'Koreksi',
        referensiId: 'REV-1',
      })
      await stokApi.sesuaikanOpname({
        menuId: 1,
        qtyFisik: 10,
        alasan: 'Opname',
        referensiId: 'OPN-1',
      })
      await stokApi.catatBarangRusak({
        menuId: 1,
        qtyRusak: 1,
        stokSistem: 10,
        alasan: 'Rusak',
        referensiId: 'BR-1',
      })

      await kasirApi.prosesTap({
        rfidUid: 'CARD-01',
        items: [{ menuId: 1, qty: 1 }],
        idempotencyKey: 'idemp-1',
      })
      await kasirApi.refundTransaksi(99, 'Salah input', 'TRX-001')

      expect(events).toEqual([
        'kategori',
        'kategori',
        'kategori',
        'stok',
        'stok', // batch 3 item tetap memancarkan tepat 1x sinyal
        'stok',
        'stok',
        'stok',
        'kasir',
        'kasir',
      ])
    } finally {
      unsubscribe()
    }
  })

  it('tidak memancarkan event perubahan jika request mutasi gagal', async () => {
    const events: string[] = []
    const unsubscribe = subscribeKatalogChanges((evt) => {
      events.push(evt.reason)
    })

    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Network Error'))
    vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Validation Error'))
    vi.spyOn(apiClient, 'delete').mockRejectedValue(new Error('Forbidden'))

    try {
      await expect(
        katalogApi.createMenu({
          nama: 'Gagal',
          kodeBarcode: '',
          kategoriId: 1,
          hargaJual: 5000,
          satuan: 'PCS',
          stokMinimum: 1,
          fotoUrl: '',
          aktif: true,
        })
      ).rejects.toThrow()
      await expect(katalogApi.deleteMenu(1)).rejects.toThrow()
      await expect(
        kasirApi.prosesTap({
          rfidUid: 'CARD-01',
          items: [{ menuId: 1, qty: 1 }],
          idempotencyKey: 'idemp-fail',
        })
      ).rejects.toThrow()

      expect(events).toHaveLength(0)
    } finally {
      unsubscribe()
    }
  })
})
