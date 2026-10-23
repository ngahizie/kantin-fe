import type { KartuSiswaMock } from '@/mocks/mock-data'

export interface TransaksiTopupDetail {
  id: string | number
  waktu: string
  subjek_tipe: 'SISWA' | 'KARTU_TAMU'
  subjek_nama: string
  subjek_info: string
  nominal: number
  penyetor: string
  referensi_id: string
}

export interface SetoranKasItem {
  id: string
  tanggal: string
  petugas_id: number
  petugas_nama: string
  petugas_nip?: string
  total_transaksi: number
  total_topup_siswa: number
  total_topup_kartu_tamu: number
  total_sistem: number
  uang_fisik: number | null
  selisih: number | null
  status: 'MENUNGGU_KONFIRMASI' | 'TERKONFIRMASI'
  catatan?: string
  bendahara_id?: number | null
  bendahara_nama?: string | null
  konfirmasi_pada?: string | null
  rincian_transaksi: TransaksiTopupDetail[]
}

export interface KonfirmasiSetoranPayload {
  id: string
  uang_fisik: number
  catatan?: string
  bendahara_nama?: string
}

export interface RawRekapTu {
  id?: string | number | null
  tanggal?: string | null
  petugasId?: number | null
  petugas_id?: number | null
  petugasNama?: string | null
  petugas_nama?: string | null
  petugasNip?: string | null
  petugas_nip?: string | null
  totalTopup?: number | null
  total_sistem?: number | null
  totalSistem?: number | null
  total_transaksi?: number | null
  totalTransaksi?: number | null
  total_topup_siswa?: number | null
  totalTopupSiswa?: number | null
  total_topup_kartu_tamu?: number | null
  totalTopupKartuTamu?: number | null
  jumlahDisetor?: number | null
  uang_fisik?: number | null
  selisih?: number | null
  referensiId?: string | null
  referensi_id?: string | null
  status?: string | null
  catatan?: string | null
  bendaharaId?: number | null
  bendahara_id?: number | null
  bendaharaNama?: string | null
  bendahara_nama?: string | null
  konfirmasiPada?: string | null
  konfirmasi_pada?: string | null
  waktu?: string | null
  rincianTransaksi?: TransaksiTopupDetail[] | null
  rincian_transaksi?: TransaksiTopupDetail[] | null
  [key: string]: unknown
}

const KNOWN_PETUGAS_MAP: Record<number, { nama: string; nip?: string }> = {
  1: { nama: 'Andika Pratama (Petugas TU 1)', nip: '198805122011011002' },
  2: { nama: 'Sri Wahyuni (Petugas TU)', nip: '199203152018012003' },
}

export function mapRekapSetoranTuItem(
  raw: RawRekapTu | null | undefined,
  fallbackDate?: string
): SetoranKasItem {
  if (!raw) {
    return {
      id: `SETOR-${(fallbackDate || '').replace(/-/g, '')}-unknown`,
      tanggal: fallbackDate || new Date().toISOString().slice(0, 10),
      petugas_id: 0,
      petugas_nama: 'Petugas Tidak Diketahui',
      total_transaksi: 0,
      total_topup_siswa: 0,
      total_topup_kartu_tamu: 0,
      total_sistem: 0,
      uang_fisik: null,
      selisih: null,
      status: 'MENUNGGU_KONFIRMASI',
      rincian_transaksi: [],
    }
  }

  // Jika sudah merupakan format lengkap SetoranKasItem (misal mock data)
  if (
    raw.petugas_nama &&
    raw.id &&
    raw.total_sistem !== undefined &&
    raw.status
  ) {
    return raw as unknown as SetoranKasItem
  }

  const petugasId = Number(raw.petugasId ?? raw.petugas_id ?? 1)
  const tanggal = String(
    raw.tanggal ||
      fallbackDate ||
      new Date().toLocaleDateString('en-CA')
  )
  const totalTopup = Number(
    raw.totalTopup ?? raw.total_sistem ?? raw.totalSistem ?? 0
  )
  const jumlahDisetor =
    raw.jumlahDisetor !== undefined && raw.jumlahDisetor !== null
      ? Number(raw.jumlahDisetor)
      : raw.uang_fisik !== undefined && raw.uang_fisik !== null
        ? Number(raw.uang_fisik)
        : null

  const isConfirmed = Boolean(
    raw.referensiId ||
      raw.referensi_id ||
      (jumlahDisetor !== null && jumlahDisetor > 0) ||
      raw.status === 'TERKONFIRMASI'
  )

  let selisih: number | null = null
  if (jumlahDisetor !== null) {
    selisih = jumlahDisetor - totalTopup
  } else if (raw.selisih !== undefined && raw.selisih !== null) {
    // Di BE: selisih = totalTopup - jumlahDisetor (positif = kurang)
    // Di FE: selisih = uang_fisik - total_sistem (negatif = kurang)
    selisih = -Number(raw.selisih)
  }

  const id = String(
    raw.id ||
      raw.referensiId ||
      raw.referensi_id ||
      `SETOR-${tanggal.replace(/-/g, '')}-${petugasId}`
  )

  const knownPetugas = KNOWN_PETUGAS_MAP[petugasId]
  const petugasNama = String(
    raw.petugas_nama ||
      raw.petugasNama ||
      knownPetugas?.nama ||
      `Petugas Loket TU #${petugasId}`
  )

  const petugasNip =
    (raw.petugas_nip ||
      raw.petugasNip ||
      knownPetugas?.nip) ||
    undefined

  return {
    id,
    tanggal,
    petugas_id: petugasId,
    petugas_nama: petugasNama,
    petugas_nip: petugasNip || undefined,
    total_transaksi: Number(
      raw.total_transaksi ??
        raw.totalTransaksi ??
        (Array.isArray(raw.rincian_transaksi)
          ? raw.rincian_transaksi.length
          : Array.isArray(raw.rincianTransaksi)
            ? raw.rincianTransaksi.length
            : 1)
    ),
    total_topup_siswa: Number(
      raw.total_topup_siswa ?? raw.totalTopupSiswa ?? totalTopup
    ),
    total_topup_kartu_tamu: Number(
      raw.total_topup_kartu_tamu ?? raw.totalTopupKartuTamu ?? 0
    ),
    total_sistem: totalTopup,
    uang_fisik: isConfirmed ? (jumlahDisetor ?? totalTopup) : null,
    selisih: isConfirmed ? (selisih ?? 0) : null,
    status: isConfirmed ? 'TERKONFIRMASI' : 'MENUNGGU_KONFIRMASI',
    catatan:
      (raw.catatan ||
      (isConfirmed
        ? selisih === 0
          ? 'Uang fisik pas sesuai total sistem'
          : `Selisih kas ${selisih !== null && selisih < 0 ? 'kurang' : 'lebih'} dicatat dalam berita acara`
        : undefined)) || undefined,
    bendahara_id:
      raw.bendahara_id != null
        ? Number(raw.bendahara_id)
        : raw.bendaharaId != null
          ? Number(raw.bendaharaId)
          : isConfirmed
            ? 10
            : null,
    bendahara_nama:
      (raw.bendahara_nama ||
      raw.bendaharaNama ||
      (isConfirmed ? 'Bendahara Sekolah' : null)) || null,
    konfirmasi_pada:
      (raw.konfirmasi_pada || raw.konfirmasiPada || raw.waktu || null) || null,
    rincian_transaksi: Array.isArray(raw.rincian_transaksi)
      ? raw.rincian_transaksi
      : Array.isArray(raw.rincianTransaksi)
        ? raw.rincianTransaksi
        : [],
  }
}


export interface RawInfoSiswa {
  siswaId?: number | string
  siswa_id?: number | string
  id?: number | string
  subjekId?: number | string
  subjek_id?: number | string
  nis?: string
  nama?: string
  kelas?: string
  saldo?: number | string
  tidakAktif?: boolean
  tidak_aktif?: boolean
  uid?: string
  rfidUid?: string
  rfid_uid?: string
  fotoUrl?: string
  foto_url?: string
  limitHarian?: number | string
  limit_harian?: number | string
  belanjaHariIni?: number | string
  belanja_hari_ini?: number | string
  isBlocked?: boolean
  is_blocked?: boolean
  parentName?: string
  parent_name?: string
  parentPhone?: string
  parent_phone?: string
}

/**
 * Memetakan respons pencarian siswa backend (/api/siswa atau InfoSiswa)
 * ke bentuk KartuSiswaMock yang digunakan oleh komponen UI StudentSearchCard dan TopupTunaiPage.
 */
export function mapInfoSiswaToKartuSiswa(
  raw: RawInfoSiswa | null | undefined
): KartuSiswaMock {
  if (!raw) {
    return {
      siswa_id: 0,
      uid: 'UID-UNKNOWN',
      nis: '',
      nama: 'Siswa Tidak Diketahui',
      kelas: '-',
      foto_url: '',
      saldo: 0,
      limit_harian: 50000,
      belanja_hari_ini: 0,
      is_blocked: false,
    }
  }

  const siswaId = Number(
    raw.siswaId ?? raw.siswa_id ?? raw.id ?? raw.subjekId ?? raw.subjek_id ?? 0
  )
  const nis = String(raw.nis ?? '')
  const isBlocked = Boolean(
    raw.isBlocked ?? raw.is_blocked ?? raw.tidakAktif ?? raw.tidak_aktif ?? false
  )

  return {
    siswa_id: siswaId,
    uid:
      raw.uid ||
      raw.rfidUid ||
      raw.rfid_uid ||
      (nis ? `UID-${nis}` : `UID-${siswaId}`),
    nis,
    nama: raw.nama ? String(raw.nama) : `Siswa #${siswaId}`,
    kelas: raw.kelas ? String(raw.kelas) : '-',
    foto_url: raw.foto_url || raw.fotoUrl || '',
    saldo: Number(raw.saldo ?? 0),
    limit_harian: Number(raw.limit_harian ?? raw.limitHarian ?? 50000),
    belanja_hari_ini: Number(raw.belanja_hari_ini ?? raw.belanjaHariIni ?? 0),
    is_blocked: isBlocked,
    parent_name: raw.parent_name || raw.parentName,
    parent_phone: raw.parent_phone || raw.parentPhone,
  }
}
