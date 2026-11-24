import { createClientAuditLogger } from '@/lib/client-audit'

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

const kasirAuditLogger = createClientAuditLogger<KasirAuditEvent>(50)

/**
 * Mencatat audit event keamanan sisi klien untuk insiden transaksi gagal,
 * selisih uang fisik, dan pembatalan transaksi (OWASP A09:2025 / NIST DE.AE-02 & DE.CM-01).
 */
export async function logKasirAuditEvent(
  event: Omit<KasirAuditEvent, 'timestamp'>
): Promise<void> {
  kasirAuditLogger.log(event)
}

/**
 * Ambil daftar audit log kasir di memori klien (untuk keperluan inspeksi & pengujian)
 */
export function getKasirAuditLogs(): KasirAuditEvent[] {
  return kasirAuditLogger.getLogs()
}

/**
 * Bersihkan buffer audit log
 */
export function clearKasirAuditLogs(): void {
  kasirAuditLogger.clear()
}
