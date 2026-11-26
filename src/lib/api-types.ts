/**
 * Tipe standar envelope respons API untuk Kantin Cashless SKOOLIA
 */

export interface ApiResponse<T> {
  responseCode?: number
  code?: number
  status?: string
  message?: string
  total?: number
  showing?: number
  totalPages?: number
  currentPage?: number
  data: T
}

export type ApiEnvelope<T> = ApiResponse<T>
