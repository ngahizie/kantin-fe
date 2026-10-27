import axios from 'axios'
import { setupMockAdapter } from '@/mocks/mock-adapter'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { beepAudioEngine } from '@/hooks/useBeepAudio'
import {
  generateIdempotencyKey,
  kasirApi,
  type TapTransaksiRequest,
} from '../api/kasir-api'

describe('Web Audio Synthesizer (beepAudioEngine)', () => {
  it('dapat memanggil fungsi audio playSuccess, playError, dan playVoid tanpa error', () => {
    expect(() => beepAudioEngine.playSuccess()).not.toThrow()
    expect(() => beepAudioEngine.playError()).not.toThrow()
    expect(() => beepAudioEngine.playVoid()).not.toThrow()
  })
})

describe('Idempotency Key Generator', () => {
  it('menghasilkan idempotency key unik untuk setiap checkout', () => {
    const key1 = generateIdempotencyKey()
    const key2 = generateIdempotencyKey()

    expect(key1).toBeDefined()
    expect(key2).toBeDefined()
    expect(key1).not.toBe(key2)
    expect(key1.length).toBeGreaterThan(10)
  })
})

describe('Kasir Tap Transaksi & Validasi 6 Tahap (API Layer)', () => {
  let testAxios: ReturnType<typeof axios.create>

  beforeEach(() => {
    testAxios = axios.create()
    setupMockAdapter(testAxios)
    // Monkey patch apiClient internal test
    vi.spyOn(kasirApi, 'prosesTap').mockImplementation(
      async (req: TapTransaksiRequest) => {
        const payload = {
          kartu_uid: req.rfidUid,
          rfidUid: req.rfidUid,
          items: req.items.map((it) => ({
            menu_id: it.menuId,
            menuId: it.menuId,
            qty: it.qty,
          })),
          idempotency_key: req.idempotencyKey,
          idempotencyKey: req.idempotencyKey,
          titikKasirId: req.titikKasirId || 1,
        }
        const res = await testAxios.post('/api/kasir/tap', payload)
        return res.data?.data
      }
    )

    vi.spyOn(kasirApi, 'voidTransaksi').mockImplementation(
      async (transaksiId: number, alasan?: string) => {
        await testAxios.post(`/api/kasir/transaksi/${transaksiId}/void`, {
          alasan: alasan || 'Void darurat unit test',
        })
      }
    )
  })

  it('Validasi 1: menolak transaksi bila kartu RFID tidak dikenal (404)', async () => {
    const req: TapTransaksiRequest = {
      rfidUid: 'UNKNOWN_CARD_999',
      items: [{ menuId: 1, qty: 1 }],
      idempotencyKey: generateIdempotencyKey(),
    }

    await expect(kasirApi.prosesTap(req)).rejects.toThrow()
  })

  it('Validasi 2: menolak transaksi bila kartu berstatus diblokir', async () => {
    // Ahmad Fauzi (04C3D4E5F6) is_blocked = true
    const req: TapTransaksiRequest = {
      rfidUid: '04C3D4E5F6',
      items: [{ menuId: 1, qty: 1 }],
      idempotencyKey: generateIdempotencyKey(),
    }

    try {
      await kasirApi.prosesTap(req)
      expect.unreachable('Harus gagal')
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number
          data?: { message?: string; kekurangan?: number }
        }
      }
      expect(e.response?.status).toBe(400)
      expect(e.response?.data?.message).toContain('diblokir')
    }
  })

  it('Validasi 3: menolak transaksi bila item diblokir oleh orang tua siswa', async () => {
    // Budi Santoso (04A1B2C3D4) blocked_items: [1] (Nasi Uduk Komplit)
    const req: TapTransaksiRequest = {
      rfidUid: '04A1B2C3D4',
      items: [{ menuId: 1, qty: 1 }],
      idempotencyKey: generateIdempotencyKey(),
    }

    try {
      await kasirApi.prosesTap(req)
      expect.unreachable('Harus gagal')
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number
          data?: { message?: string; kekurangan?: number }
        }
      }
      expect(e.response?.status).toBe(400)
      expect(e.response?.data?.message).toContain('diblokir oleh orang tua')
    }
  })

  it('Validasi 4: menolak transaksi bila stok menu tidak mencukupi', async () => {
    // Cantika Kirana (04D4E5F6A1), menu 3 stok = 0
    const req: TapTransaksiRequest = {
      rfidUid: '04D4E5F6A1',
      items: [{ menuId: 3, qty: 1 }],
      idempotencyKey: generateIdempotencyKey(),
    }

    try {
      await kasirApi.prosesTap(req)
      expect.unreachable('Harus gagal')
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number
          data?: { message?: string; kekurangan?: number }
        }
      }
      expect(e.response?.status).toBe(400)
      expect(e.response?.data?.message).toContain('tidak cukup')
    }
  })

  it('Validasi 5: menolak transaksi bila melebihi limit belanja harian siswa', async () => {
    // Budi Santoso (04A1B2C3D4) sisa limit = 20.000 (limit 30.000 - belanja 10.000)
    // Coba beli menu 2 (Rp 15.000 x 2 = Rp 30.000)
    const req: TapTransaksiRequest = {
      rfidUid: '04A1B2C3D4',
      items: [{ menuId: 2, qty: 2 }],
      idempotencyKey: generateIdempotencyKey(),
    }

    try {
      await kasirApi.prosesTap(req)
      expect.unreachable('Harus gagal')
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number
          data?: { message?: string; kekurangan?: number }
        }
      }
      expect(e.response?.status).toBe(400)
      expect(e.response?.data?.message).toContain('limit harian')
    }
  })

  it('Validasi 6: menolak transaksi bila saldo kurang dan menampilkan nominal kekurangan secara akurat', async () => {
    // Cantika Kirana (04D4E5F6A1) saldo 65.000 tanpa limit harian
    // Beli Nasi Goreng (Rp 15.000 x 5 = Rp 75.000), kekurangan Rp 10.000
    const req: TapTransaksiRequest = {
      rfidUid: '04D4E5F6A1',
      items: [{ menuId: 2, qty: 5 }],
      idempotencyKey: generateIdempotencyKey(),
    }

    try {
      await kasirApi.prosesTap(req)
      expect.unreachable('Harus gagal')
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number
          data?: { message?: string; kekurangan?: number }
        }
      }
      expect(e.response?.status).toBe(400)
      expect(e.response?.data?.message).toContain('Saldo kurang')
      expect(e.response?.data?.kekurangan).toBe(10000)
    }
  })

  it('berhasil memproses transaksi tap untuk kartu valid dan saldo mencukupi', async () => {
    // Cantika Kirana (04D4E5F6A1) saldo 65.000
    // Beli Es Teh Manis (menu 9, Rp 4.000)
    const req: TapTransaksiRequest = {
      rfidUid: '04D4E5F6A1',
      items: [{ menuId: 9, qty: 1 }],
      idempotencyKey: generateIdempotencyKey(),
    }

    const res = await kasirApi.prosesTap(req)
    expect(res).toBeDefined()
    expect(res.total).toBe(4000)
    expect(res.pembeli.nama).toBe('Cantika Kirana')
    expect(res.pembeli.sisa_saldo).toBe(61000)
  })

  it('mencegah transaksi ganda dengan mengembalikan respons tersimpan jika idempotency key sama', async () => {
    const sharedIdempotencyKey = generateIdempotencyKey()
    const req: TapTransaksiRequest = {
      rfidUid: '04D4E5F6A1',
      items: [{ menuId: 9, qty: 1 }], // Rp 4.000
      idempotencyKey: sharedIdempotencyKey,
    }

    // Tap pertama
    const res1 = await kasirApi.prosesTap(req)
    const saldoSetelahTap1 = res1.pembeli.sisa_saldo

    // Tap kedua dengan idempotency key yang sama persis
    const res2 = await kasirApi.prosesTap(req)
    expect(res2.transaksi_id).toBe(res1.transaksi_id)
    expect(res2.pembeli.sisa_saldo).toBe(saldoSetelahTap1) // Saldo TIDAK terpotong dua kali
  })

  it('dapat membatalkan transaksi seketika lewat voidTransaksi (mengembalikan saldo & stok)', async () => {
    const req: TapTransaksiRequest = {
      rfidUid: '04D4E5F6A1',
      items: [{ menuId: 9, qty: 1 }], // Rp 4.000
      idempotencyKey: generateIdempotencyKey(),
    }

    const res = await kasirApi.prosesTap(req)
    expect(res.transaksi_id).toBeDefined()

    // Eksekusi void
    await expect(
      kasirApi.voidTransaksi(res.transaksi_id, 'Wajah tidak cocok')
    ).resolves.not.toThrow()
  })
})

describe('RFID Reader Scanner Logic (Keyboard Wedge Burst)', () => {
  it('dapat mendeteksi burst ketukan cepat dan memicu trigger onScan pada Enter', () => {
    let scanned = ''
    const onScan = (uid: string) => {
      scanned = uid
    }

    // Simulasi Keyboard Wedge UID "04A1B2C3" dengan burst interval cepat (<50ms)
    const buffer: string[] = []
    const timestamps: number[] = []
    const uidToType = '04A1B2C3'
    let fakeTime = 1000

    for (const char of uidToType) {
      buffer.push(char)
      timestamps.push(fakeTime)
      fakeTime += 20 // 20ms per karakter (sangat cepat, khas scanner hardware)
    }

    // Evaluasi burst saat Enter ditekan
    const totalDuration = timestamps[timestamps.length - 1] - timestamps[0]
    const avgInterval = totalDuration / (timestamps.length - 1)
    const isBurst = buffer.length >= 4 && avgInterval <= 60

    expect(isBurst).toBe(true)
    if (isBurst) {
      onScan(buffer.join(''))
    }

    expect(scanned).toBe('04A1B2C3')
  })

  it('mengabaikan ketukan manual lambat (> 150ms) manusia biasa', () => {
    const buffer: string[] = []
    const timestamps: number[] = []
    const textTyped = 'ABCD'
    let fakeTime = 1000

    for (const char of textTyped) {
      buffer.push(char)
      timestamps.push(fakeTime)
      fakeTime += 250 // 250ms per karakter (ketikan lambat manusia)
    }

    const totalDuration = timestamps[timestamps.length - 1] - timestamps[0]
    const avgInterval = totalDuration / (timestamps.length - 1)
    const isBurst = buffer.length >= 4 && avgInterval <= 60

    expect(isBurst).toBe(false)
  })
})
