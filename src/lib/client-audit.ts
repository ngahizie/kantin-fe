/**
 * Factory buffer ringkas in-memory untuk mencatat audit event keamanan sisi klien
 * dengan batas ukuran maksimum agar memori tetap terkendali.
 */
export function createClientAuditLogger<TEvent extends { timestamp: string }>(
  maxBufferSize = 50
) {
  const buffer: TEvent[] = []

  return {
    log(event: Omit<TEvent, 'timestamp'>): TEvent {
      const entry = {
        ...event,
        timestamp: new Date().toISOString(),
      } as TEvent

      buffer.push(entry)
      if (buffer.length > maxBufferSize) {
        buffer.shift()
      }
      return entry
    },
    getLogs(): TEvent[] {
      return [...buffer]
    },
    clear(): void {
      buffer.length = 0
    },
  }
}
