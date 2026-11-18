import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/lib/api-client'
import { setupMockAdapter } from '@/mocks/mock-adapter'
import { kasirApi } from '../api/kasir-api'
import {
  evaluateCashPayment,
  getQuickCashNominals,
  parseCashInput,
} from '../cash-payment'

describe('Kasir Bayar Tunai Kartu Tamu / Tanpa Kartu (Issue #165)', () => {
  describe('1. Kalkulasi & Validasi Pembayaran Tunai', () => {
    it('menerima pembayaran tunai pas dengan kembalian 0', () => {
      const res = evaluateCashPayment(15000, 15000)
      expect(res.isValid).toBe(true)
      expect(res.kembalian).toBe(0)
      expect(res.kekurangan).toBe(0)
      expect(res.errorMessage).toBeNull()
    })

    it('menghitung kembalian otomatis saat uang tunai lebih besar dari total', () => {
      const res = evaluateCashPayment(17000, 50000)
      expect(res.isValid).toBe(true)
      expect(res.kembalian).toBe(33000)
      expect(res.kekurangan).toBe(0)
      expect(res.errorMessage).toBeNull()
    })

    it('menolak saat uang tunai kurang dari total dengan pesan kekurangan yang jelas', () => {
      const res = evaluateCashPayment(25000, 20000)
      expect(res.isValid).toBe(false)
      expect(res.kembalian).toBe(0)
      expect(res.kekurangan).toBe(5000)
      expect(res.errorMessage).toMatch(/Uang tunai kurang/i)
      expect(res.errorMessage).toContain('5.000')
    })

    it('menolak saat keranjang kosong (total 0)', () => {
      const res = evaluateCashPayment(0, 10000)
      expect(res.isValid).toBe(false)
      expect(res.errorMessage).toBeTruthy()
    })

    it('mem-parsing string input uang dengan benar dan menyarankan nominal cepat', () => {
      expect(parseCashInput('Rp 50.000')).toBe(50000)
      expect(parseCashInput('')).toBe(0)
      expect(getQuickCashNominals(12000)).toEqual([12000, 20000, 50000, 100000])
      expect(getQuickCashNominals(0)).toEqual([])
    })
  })

  describe('2. Kontrak API & Payload kasirApi.prosesTap', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('mengirim metodeBayar TUNAI dan uangDiterima tanpa rfidUid, lalu mengembalikan kembalian', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          code: 200,
          data: {
            transaksiId: 901,
            nomorStruk: 'TRX-20261118-901',
            total: 15000,
            metodeBayar: 'TUNAI',
            uangDiterima: 20000,
            kembalian: 5000,
            waktu: '2026-11-18T10:00:00Z',
            pembeli: {
              nama: 'Tamu (Tunai)',
              sisa_saldo: 0,
            },
          },
        },
      })

      const result = await kasirApi.prosesTap({
        metodeBayar: 'TUNAI',
        uangDiterima: 20000,
        items: [{ menuId: 2, qty: 1 }],
        idempotencyKey: 'idemp-tunai-001',
        titikKasirId: 1,
      })

      expect(postSpy).toHaveBeenCalledWith(
        '/api/kasir/tap',
        expect.objectContaining({
          metodeBayar: 'TUNAI',
          uangDiterima: 20000,
          idempotencyKey: 'idemp-tunai-001',
          titikKasirId: 1,
        })
      )
      const sentPayload = postSpy.mock.calls[0][1] as Record<string, unknown>
      expect(sentPayload.rfidUid).toBeUndefined()
      expect(sentPayload.kartu_uid).toBeUndefined()

      expect(result.metodeBayar).toBe('TUNAI')
      expect(result.uangDiterima).toBe(20000)
      expect(result.kembalian).toBe(5000)
      expect(result.pembeli.sisa_saldo).toBe(0)
    })
  })

  describe('3. Alur Transaksi Tunai & Refund Tanpa Saldo (Mock Adapter)', () => {
    let testAxios: ReturnType<typeof axios.create>

    beforeEach(() => {
      testAxios = axios.create()
      setupMockAdapter(testAxios)
    })

    async function getAllStudentBalances(): Promise<Record<string, number>> {
      const res = await testAxios.get('/api/siswa')
      const rows = (res.data?.data || []) as Array<{
        uid?: string
        siswa_id?: number
        saldo: number
      }>
      const map: Record<string, number> = {}
      for (const r of rows) {
        map[String(r.uid || r.siswa_id)] = Number(r.saldo)
      }
      return map
    }

    async function getMenuStock(menuId: number): Promise<number> {
      const res = await testAxios.get('/api/katalog/menu')
      const rows = (res.data?.data || []) as Array<{
        id: number
        stokBerjalan?: number
        stok?: number
      }>
      const item = rows.find((m) => m.id === menuId)
      return Number(item?.stokBerjalan ?? item?.stok ?? 0)
    }

    it('tunai pas: sukses tanpa kartu, kembalian 0, saldo semua siswa tidak berubah', async () => {
      const saldoSebelum = await getAllStudentBalances()
      const stokSebelum = await getMenuStock(1) // Nasi Uduk Komplit Rp 12.000

      const res = await testAxios.post('/api/kasir/tap', {
        metodeBayar: 'TUNAI',
        uangDiterima: 12000,
        items: [{ menuId: 1, qty: 1 }],
        idempotencyKey: 'tunai-pas-1',
        titikKasirId: 1,
      })

      expect(res.status).toBe(200)
      expect(res.data.data.metodeBayar).toBe('TUNAI')
      expect(res.data.data.total).toBe(12000)
      expect(res.data.data.uangDiterima).toBe(12000)
      expect(res.data.data.kembalian).toBe(0)
      expect(res.data.data.pembeli.sisa_saldo).toBe(0)

      expect(await getMenuStock(1)).toBe(stokSebelum - 1)
      expect(await getAllStudentBalances()).toEqual(saldoSebelum)
    })

    it('tunai lebih: sukses tanpa kartu dengan kembalian otomatis yang tepat', async () => {
      const saldoSebelum = await getAllStudentBalances()

      const res = await testAxios.post('/api/kasir/tap', {
        metodeBayar: 'TUNAI',
        uangDiterima: 50000,
        items: [{ menuId: 2, qty: 1 }], // Nasi Goreng Ayam Rp 15.000
        idempotencyKey: 'tunai-lebih-1',
        titikKasirId: 1,
      })

      expect(res.status).toBe(200)
      expect(res.data.data.metodeBayar).toBe('TUNAI')
      expect(res.data.data.total).toBe(15000)
      expect(res.data.data.uangDiterima).toBe(50000)
      expect(res.data.data.kembalian).toBe(35000)
      expect(await getAllStudentBalances()).toEqual(saldoSebelum)
    })

    it('tunai kurang: ditolak HTTP 400 dengan pesan jelas dan stok tidak berkurang', async () => {
      const stokSebelum = await getMenuStock(2)

      await expect(
        testAxios.post('/api/kasir/tap', {
          metodeBayar: 'TUNAI',
          uangDiterima: 10000,
          items: [{ menuId: 2, qty: 1 }], // Rp 15.000
          idempotencyKey: 'tunai-kurang-1',
          titikKasirId: 1,
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            message: expect.stringMatching(/Uang tunai kurang/i),
            kekurangan: 5000,
          },
        },
      })

      expect(await getMenuStock(2)).toBe(stokSebelum)
    })

    it('metode SALDO dengan saldo kurang tetap mengembalikan pesan lama', async () => {
      // Siswa Cantika Kirana (UID 04D4E5F6A1): saldo Rp 65.000, tanpa limit harian
      await expect(
        testAxios.post('/api/kasir/tap', {
          metodeBayar: 'SALDO',
          rfidUid: '04D4E5F6A1',
          items: [{ menuId: 2, qty: 5 }], // 5 x Rp 15.000 = Rp 75.000 (> Rp 65.000)
          idempotencyKey: 'saldo-kurang-1',
          titikKasirId: 1,
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            message: expect.stringMatching(/Saldo kurang/i),
            kekurangan: 10000,
          },
        },
      })
    })

    it('refund transaksi tunai mengembalikan stok menu tetapi TIDAK menambah saldo siswa mana pun', async () => {
      const saldoAwal = await getAllStudentBalances()
      const stokAwal = await getMenuStock(1)

      const tapRes = await testAxios.post('/api/kasir/tap', {
        metodeBayar: 'TUNAI',
        uangDiterima: 20000,
        items: [{ menuId: 1, qty: 1 }], // Rp 12.000
        idempotencyKey: 'tunai-refund-1',
        titikKasirId: 1,
      })

      const trxId = tapRes.data.data.transaksiId as number
      const nomorStruk = tapRes.data.data.nomorStruk as string
      expect(await getMenuStock(1)).toBe(stokAwal - 1)

      const refundRes = await testAxios.post(
        `/api/kasir/transaksi/${trxId}/refund`,
        {
          alasan: 'Pembeli membatalkan',
          kodeStruk: nomorStruk,
        }
      )

      expect(refundRes.status).toBe(200)
      // Stok menu harus kembali ke semula
      expect(await getMenuStock(1)).toBe(stokAwal)
      // Saldo seluruh siswa tidak boleh bertambah (refund tunai tidak masuk saldo)
      expect(await getAllStudentBalances()).toEqual(saldoAwal)
    })
  })
})
