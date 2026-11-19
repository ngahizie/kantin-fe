/**
 * Cookie utility functions using manual document.cookie approach
 * Replaces js-cookie dependency for better consistency
 */

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue
  }
  return undefined
}

export interface SetCookieOptions {
  sameSite?: 'Lax' | 'Strict' | 'None'
  secure?: boolean
}

/**
 * Set a cookie with name, value, optional max age, and security flags (SameSite, Secure)
 */
export function setCookie(
  name: string,
  value: string,
  maxAge: number = DEFAULT_MAX_AGE,
  options?: SetCookieOptions
): void {
  if (typeof document === 'undefined') return

  const sameSite = options?.sameSite ?? 'Lax'
  const isSecure =
    options?.secure ??
    (typeof window !== 'undefined' && window.location.protocol === 'https:')
  const secureDirective = isSecure ? '; Secure' : ''

  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=${sameSite}${secureDirective}`
}

/**
 * Remove a cookie by setting its max age to 0
 */
export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return

  const isSecure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
  const secureDirective = isSecure ? '; Secure' : ''

  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secureDirective}`
}
