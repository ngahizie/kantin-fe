import { createClientAuditLogger } from '@/lib/client-audit'

type KategoriAuditAction =
  | 'KATEGORI_CREATE'
  | 'KATEGORI_UPDATE'
  | 'KATEGORI_TOGGLE_STATUS'
  | 'KATEGORI_DELETE'
  | 'KATEGORI_DELETE_BLOCKED'

interface KategoriAuditEvent {
  action: KategoriAuditAction
  kategoriId?: number | null
  kategoriNama?: string
  detail?: Record<string, unknown>
  timestamp: string
}

const kategoriAuditLogger = createClientAuditLogger<KategoriAuditEvent>(50)

/**
 * Mencatat audit event keamanan sisi klien untuk mutasi kategori, perubahan status aktif/nonaktif,
 * dan penghapusan kategori (OWASP A09:2025 / NIST AU-02 & DE.AE-02).
 */
export async function logKategoriAuditEvent(
  event: Omit<KategoriAuditEvent, 'timestamp'>
): Promise<void> {
  kategoriAuditLogger.log(event)
}

/**
 * Ambil daftar audit log kategori di memori klien (untuk keperluan inspeksi & pengujian)
 */
export function getKategoriAuditLogs(): KategoriAuditEvent[] {
  return kategoriAuditLogger.getLogs()
}

/**
 * Bersihkan buffer audit log
 */
export function clearKategoriAuditLogs(): void {
  kategoriAuditLogger.clear()
}
