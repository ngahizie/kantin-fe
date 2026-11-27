import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastMocks.error,
    warning: toastMocks.warning,
  },
}))

import apiClient from './api-client'
import { SERVICE_UNAVAILABLE_MESSAGE, TIMEOUT_ERROR_MESSAGE } from './validation-error'

function invokeResponseErrorInterceptor(error: AxiosError): Promise<never> {
  const handlers = (
    apiClient.interceptors.response as unknown as {
      handlers: Array<{ rejected?: (err: AxiosError) => Promise<never> }>
    }
  ).handlers
  const active = handlers.find((h) => typeof h?.rejected === 'function')
  if (!active?.rejected) {
    throw new Error('Response error interceptor tidak ditemukan')
  }
  return active.rejected(error)
}

describe('apiClient BE #449 alignment (timeout & HTTP 503)', () => {
  beforeEach(() => {
    toastMocks.error.mockClear()
    toastMocks.warning.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('menggunakan default timeout 20000ms agar melampaui batas query normal BE #449', () => {
    expect(apiClient.defaults.timeout).toBe(20000)
  })

  it('meneruskan pesan aman HTTP 503 dari BE di mode produksi tanpa menimpanya', async () => {
    vi.stubEnv('DEV', false)

    const error = new AxiosError('Service Unavailable')
    error.config = {} as InternalAxiosRequestConfig
    error.response = {
      status: 503,
      data: {
        code: 503,
        status: 'LAYANAN SEDANG SIBUK',
        message: 'Server sedang sibuk: permintaan memakan waktu terlalu lama. Silakan ulangi.',
      },
    } as AxiosResponse

    await expect(invokeResponseErrorInterceptor(error)).rejects.toBe(error)

    expect(toastMocks.warning).toHaveBeenCalledTimes(1)
    expect(toastMocks.warning).toHaveBeenCalledWith(
      'Server sedang sibuk: permintaan memakan waktu terlalu lama. Silakan ulangi.'
    )
    expect(toastMocks.error).not.toHaveBeenCalled()
  })

  it('memakai fallback 503 ramah jika payload 503 berupa Blob mentah', async () => {
    vi.stubEnv('DEV', false)

    const error = new AxiosError('Request failed with status code 503')
    error.config = {} as InternalAxiosRequestConfig
    error.response = {
      status: 503,
      data: new Blob(['busy'], { type: 'application/json' }),
    } as AxiosResponse

    await expect(invokeResponseErrorInterceptor(error)).rejects.toBe(error)

    expect(toastMocks.warning).toHaveBeenCalledWith(SERVICE_UNAVAILABLE_MESSAGE)
  })

  it('tetap menyamarkan detail HTTP 500 di mode produksi dan menghormati skipToast', async () => {
    vi.stubEnv('DEV', false)

    const error500 = new AxiosError('Internal Server Error')
    error500.config = {} as InternalAxiosRequestConfig
    error500.response = {
      status: 500,
      data: { message: 'Detail internal' },
    } as AxiosResponse

    await expect(invokeResponseErrorInterceptor(error500)).rejects.toBe(error500)
    expect(toastMocks.error).toHaveBeenCalledWith(
      'Terjadi kendala pada server, silakan hubungi administrator'
    )

    toastMocks.warning.mockClear()
    const silent503 = new AxiosError('Busy', undefined, {
      skipToast: true,
    } as InternalAxiosRequestConfig)
    silent503.response = {
      status: 503,
      data: { message: 'Server sedang sibuk' },
    } as AxiosResponse

    await expect(invokeResponseErrorInterceptor(silent503)).rejects.toBe(silent503)
    expect(toastMocks.warning).not.toHaveBeenCalled()
  })

  it('menampilkan peringatan berbahasa Indonesia saat permintaan timeout', async () => {
    const timeoutErr = new AxiosError('timeout of 20000ms exceeded', 'ECONNABORTED')
    timeoutErr.config = {} as InternalAxiosRequestConfig

    await expect(invokeResponseErrorInterceptor(timeoutErr)).rejects.toBe(timeoutErr)
    expect(toastMocks.warning).toHaveBeenCalledWith(TIMEOUT_ERROR_MESSAGE)
  })
})
