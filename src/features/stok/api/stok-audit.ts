import { createClientAuditLogger } from '@/lib/client-audit'

export type StokAuditAction =
  | 'STOK_EXPORT_CSV'
  | 'STOK_EXPORT_PDF'
  | 'STOK_MUTASI_VIEW'

export interface StokAuditEvent {
  action: StokAuditAction
  menuId?: number | null
  detail?: Record<string, unknown>
  timestamp: string
}

const stokAuditLogger = createClientAuditLogger<StokAuditEvent>(50)

/**
 * Mencatat audit event keamanan sisi klien untuk akses dan ekspor data stok / mutasi finansial
 * (OWASP A09:2025 / NIST AU-02 & DE.AE-02).
 */
export async function logStokAuditEvent(
  event: Omit<StokAuditEvent, 'timestamp'>
): Promise<void> {
  stokAuditLogger.log(event)
}

/**
 * Ambil daftar audit log stok di memori klien (untuk keperluan inspeksi & pengujian)
 */
export function getStokAuditLogs(): StokAuditEvent[] {
  return stokAuditLogger.getLogs()
}

/**
 * Bersihkan buffer audit log
 */
export function clearStokAuditLogs(): void {
  stokAuditLogger.clear()
}
