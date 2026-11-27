import { AxiosError } from 'axios'

export const TIMEOUT_ERROR_MESSAGE =
  'Permintaan ke server melebihi batas waktu. Silakan ulangi.'

export const SERVICE_UNAVAILABLE_MESSAGE =
  'Server sedang sibuk sementara. Silakan ulangi beberapa saat lagi.'

/**
 * Deteksi apakah error berasal dari batas waktu permintaan HTTP klien (Axios timeout).
 */
export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as { code?: unknown; message?: unknown }
  if (errObj.code === 'ECONNABORTED' || errObj.code === 'ETIMEDOUT') {
    return true
  }
  if (typeof errObj.message === 'string') {
    const lower = errObj.message.toLowerCase()
    return /timeout of \d+ms exceeded/.test(lower) || lower === 'network timeout'
  }
  return false
}

/**
 * Ekstrak kode status HTTP dari error Axios atau objek respons serupa.
 */
export function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const errObj = error as { status?: unknown; response?: { status?: unknown } }
  if (typeof errObj.response?.status === 'number') {
    return errObj.response.status
  }
  if (typeof errObj.status === 'number') {
    return errObj.status
  }
  return undefined
}

/**
 * Deteksi respons HTTP 503 Service Unavailable (kontrak BE #449 saat database sibuk).
 */
export function isServiceUnavailableError(error: unknown): boolean {
  return getHttpStatus(error) === 503
}

interface BackendValidationResponse {
  code?: number
  message?: string
  timestamp?: string
  validation?: Record<string, unknown> | string[] | string | null
  errors?: Record<string, string> | Array<{ field?: string; defaultMessage?: string }>
}

interface ParsedValidationError {
  message: string
  fieldErrors: Record<string, string>
}

/**
 * Ekstrak pesan validasi per-field dari respons backend HTTP 400.
 * Menangani kasus di mana message masih generik ("ERROR MAPPING")
 * dan membaca perincian dari properti `validation`.
 */
export function extractValidationMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null

  const response = data as BackendValidationResponse

  // 1. Periksa properti validation
  if (response.validation) {
    if (typeof response.validation === 'string' && response.validation.trim().length > 0) {
      return response.validation.trim()
    }

    if (Array.isArray(response.validation)) {
      const messages = response.validation
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
      if (messages.length > 0) {
        return messages.join(', ')
      }
    } else if (typeof response.validation === 'object') {
      const entries = Object.entries(response.validation)
      if (entries.length > 0) {
        const messages = entries
          .map(([field, errorVal]) => {
            if (typeof errorVal === 'string') {
              return `${field}: ${errorVal}`
            }
            if (Array.isArray(errorVal)) {
              return `${field}: ${errorVal.join(', ')}`
            }
            if (errorVal && typeof errorVal === 'object') {
              return `${field}: ${JSON.stringify(errorVal)}`
            }
            return ''
          })
          .filter(Boolean)

        if (messages.length > 0) {
          return messages.join(', ')
        }
      }
    }
  }

  // 2. Periksa format errors alternatif (Spring validation standard)
  if (response.errors) {
    if (Array.isArray(response.errors)) {
      const msgs = response.errors
        .map((e) => (e.field && e.defaultMessage ? `${e.field}: ${e.defaultMessage}` : e.defaultMessage || ''))
        .filter(Boolean)
      if (msgs.length > 0) return msgs.join(', ')
    } else if (typeof response.errors === 'object') {
      const entries = Object.entries(response.errors)
      if (entries.length > 0) {
        return entries.map(([field, msg]) => `${field}: ${msg}`).join(', ')
      }
    }
  }

  // 3. Fallback ke message jika bukan pesan generik "ERROR MAPPING"
  if (response.message && response.message !== 'ERROR MAPPING') {
    return response.message
  }

  return null
}

/**
 * Parse respons error backend menjadi fieldErrors dictionary dan pesan gabungan yang jelas.
 */
export function parseBackendValidation(error: unknown): ParsedValidationError {
  const fieldErrors: Record<string, string> = {}

  let data: BackendValidationResponse | undefined
  if (error instanceof AxiosError) {
    data = error.response?.data as BackendValidationResponse | undefined
  } else if (error && typeof error === 'object' && 'response' in error) {
    const withResp = error as { response?: { data?: BackendValidationResponse } }
    data = withResp.response?.data
  } else if (error && typeof error === 'object') {
    data = error as BackendValidationResponse
  }

  if (data?.validation && typeof data.validation === 'object' && !Array.isArray(data.validation)) {
    for (const [key, val] of Object.entries(data.validation)) {
      if (typeof val === 'string') {
        fieldErrors[key] = val
      } else if (Array.isArray(val)) {
        fieldErrors[key] = val.join(', ')
      }
    }
  }

  if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    for (const [key, val] of Object.entries(data.errors)) {
      if (typeof val === 'string') {
        fieldErrors[key] = val
      }
    }
  }

  const extractedMsg = extractValidationMessage(data)
  const message =
    extractedMsg ||
    (data?.message && data.message !== 'ERROR MAPPING'
      ? data.message
      : error instanceof Error && error.message
      ? error.message
      : 'Data yang dikirim tidak valid')

  return {
    message,
    fieldErrors,
  }
}

/**
 * Mendapatkan pesan error paling representatif dari backend untuk toast / alert.
 */
export function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan sistem'): string {
  const isBlobData = (d: unknown): boolean =>
    typeof Blob !== 'undefined' && d instanceof Blob

  if (error instanceof AxiosError) {
    const data = isBlobData(error.response?.data) ? undefined : error.response?.data
    const valMsg = extractValidationMessage(data)
    if (valMsg) return valMsg
    if (data?.message && data.message !== 'ERROR MAPPING') return data.message
    if (data?.title) return String(data.title)
    if (isTimeoutError(error)) return TIMEOUT_ERROR_MESSAGE
    if (error.response?.status === 503) return SERVICE_UNAVAILABLE_MESSAGE
    if (error.message) return error.message
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const withResp = error as {
      response?: { status?: number; data?: BackendValidationResponse }
    }
    const data = isBlobData(withResp.response?.data) ? undefined : withResp.response?.data
    const valMsg = extractValidationMessage(data)
    if (valMsg) return valMsg
    if (data?.message && data.message !== 'ERROR MAPPING') {
      return data.message
    }
    if (withResp.response?.status === 503) {
      return SERVICE_UNAVAILABLE_MESSAGE
    }
  }

  if (isTimeoutError(error)) {
    return TIMEOUT_ERROR_MESSAGE
  }

  if (isServiceUnavailableError(error)) {
    return SERVICE_UNAVAILABLE_MESSAGE
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
