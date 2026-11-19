import apiClient from '@/lib/api-client'

export type KategoriAuditAction =
  | 'KATEGORI_CREATE'
  | 'KATEGORI_UPDATE'
  | 'KATEGORI_TOGGLE_STATUS'
  | 'KATEGORI_DELETE'
  | 'KATEGORI_DELETE_BLOCKED'

export interface KategoriAuditEvent {
  action: KategoriAuditAction
  kategoriId?: number | null
  kategoriNama?: string
  detail?: Record<string, unknown>
  timestamp: string
}

const clientAuditBuffer: KategoriAuditEvent[] = []
const MAX_BUFFER_SIZE = 50

/**
 * Mencatat audit event keamanan sisi klien untuk mutasi kategori, perubahan status aktif/nonaktif,
 * dan penghapusan kategori (OWASP A09:2025 / NIST AU-02 & DE.AE-02).
 */
export async function logKategoriAuditEvent(
  event: Omit<KategoriAuditEvent, 'timestamp'>
): Promise<void> {
  const auditEntry: KategoriAuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  }

  clientAuditBuffer.push(auditEntry)
  if (clientAuditBuffer.length > MAX_BUFFER_SIZE) {
    clientAuditBuffer.shift()
  }

  try {
    // Kirim telemetri audit log ke backend secara asinkron (fail-safe)
    await apiClient.post('/api/katalog/audit', auditEntry).catch(() => {
      // Abaikan galat jaringan agar tidak memblokir antarmuka katalog
    })
  } catch {
    // Tangani kemungkinan pengecualian jaringan
  }
}

/**
 * Ambil daftar audit log kategori di memori klien (untuk keperluan inspeksi & pengujian)
 */
export function getKategoriAuditLogs(): KategoriAuditEvent[] {
  return [...clientAuditBuffer]
}

/**
 * Bersihkan buffer audit log
 */
export function clearKategoriAuditLogs(): void {
  clientAuditBuffer.length = 0
}
