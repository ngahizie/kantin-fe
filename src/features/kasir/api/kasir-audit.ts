import apiClient from '@/lib/api-client'

export type KasirAuditAction =
  | 'TRANSAKSI_GAGAL'
  | 'TUTUP_SESI_SELISIH'
  | 'VOID_TRANSAKSI'

export interface KasirAuditEvent {
  action: KasirAuditAction
  titikKasirId?: number | null
  sesiId?: number | null
  detail: Record<string, unknown>
  timestamp: string
}

// In-memory buffer ringkas untuk audit trail sesi aktif kasir
const clientAuditBuffer: KasirAuditEvent[] = []
const MAX_BUFFER_SIZE = 50

/**
 * Mencatat audit event keamanan sisi klien untuk insiden transaksi gagal,
 * selisih uang fisik, dan pembatalan transaksi (OWASP A09:2025 / NIST DE.AE-02 & DE.CM-01).
 */
export async function logKasirAuditEvent(
  event: Omit<KasirAuditEvent, 'timestamp'>
): Promise<void> {
  const auditEntry: KasirAuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  }

  clientAuditBuffer.push(auditEntry)
  if (clientAuditBuffer.length > MAX_BUFFER_SIZE) {
    clientAuditBuffer.shift()
  }

  try {
    // Kirim telemetri audit log ke backend secara asinkron (fail-safe)
    await apiClient.post('/api/kasir/audit', auditEntry).catch(() => {
      // Abaikan galat jaringan agar tidak memblokir operasional kasir
    })
  } catch {
    // Tangani kemungkinan pengecualian jaringan
  }
}

/**
 * Ambil daftar audit log kasir di memori klien (untuk keperluan inspeksi & pengujian)
 */
export function getKasirAuditLogs(): KasirAuditEvent[] {
  return [...clientAuditBuffer]
}

/**
 * Bersihkan buffer audit log (misal saat pergantian sesi kasir)
 */
export function clearKasirAuditLogs(): void {
  clientAuditBuffer.length = 0
}
