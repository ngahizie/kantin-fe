export type UserRole =
  | 'admin'
  | 'pengelola'
  | 'tu'
  | 'bendahara'
  | 'kasir'
  | 'kepsek'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin Sekolah',
  kepsek: 'Kepala Sekolah',
  pengelola: 'Pengelola Kantin',
  tu: 'Petugas TU',
  bendahara: 'Bendahara Sekolah',
  kasir: 'Petugas Kasir POS',
}

const VALID_ROLES: readonly UserRole[] = [
  'kasir',
  'pengelola',
  'tu',
  'bendahara',
  'kepsek',
  'admin',
]

const BACKEND_ROLE_MAPPINGS: ReadonlyArray<{
  backendRole: string
  role: UserRole
}> = [
  { backendRole: 'ROLE_ADMIN', role: 'admin' },
  { backendRole: 'ROLE_PENGELOLA_KANTIN', role: 'pengelola' },
  { backendRole: 'ROLE_PETUGAS_KANTIN', role: 'kasir' },
  { backendRole: 'ROLE_TU_SEKOLAH', role: 'tu' },
  { backendRole: 'ROLE_BENDAHARA', role: 'bendahara' },
  { backendRole: 'ROLE_KEPSEK', role: 'kepsek' },
]

const LABEL_MATCH_ORDER: ReadonlyArray<{
  backendRole: string
  role: UserRole
  usernameHint?: string
}> = [
  { backendRole: 'ROLE_KEPSEK', role: 'kepsek', usernameHint: 'kepsek' },
  { backendRole: 'ROLE_BENDAHARA', role: 'bendahara', usernameHint: 'bendahara' },
  { backendRole: 'ROLE_TU_SEKOLAH', role: 'tu', usernameHint: 'tu' },
  { backendRole: 'ROLE_PETUGAS_KANTIN', role: 'kasir', usernameHint: 'kasir' },
  { backendRole: 'ROLE_PENGELOLA_KANTIN', role: 'pengelola', usernameHint: 'pengelola' },
  { backendRole: 'ROLE_ADMIN', role: 'admin' },
]

/**
 * Memetakan array peran backend (`ROLE_*`) atau `currentRole` menjadi `UserRole` aplikasi.
 */
export function resolveUserRole(roles?: string[], currentRole?: string): UserRole {
  if (currentRole && VALID_ROLES.includes(currentRole as UserRole)) {
    return currentRole as UserRole
  }
  if (roles && roles.length > 0) {
    const matched = BACKEND_ROLE_MAPPINGS.find(({ backendRole }) =>
      roles.includes(backendRole)
    )
    if (matched) return matched.role
  }
  throw new Error('Akun Anda tidak memiliki peran operasional yang valid.')
}

/**
 * Menghasilkan label peran yang ramah pengguna dari role aktif, daftar peran backend, atau username.
 */
export function getRoleLabel(
  role?: string,
  roles?: string[],
  usernameOrEmail?: string
): string {
  const norm = (usernameOrEmail || '').toLowerCase()
  const matched = LABEL_MATCH_ORDER.find(
    ({ backendRole, role: candidate, usernameHint }) =>
      Boolean(roles?.includes(backendRole)) ||
      role === candidate ||
      Boolean(usernameHint && norm.includes(usernameHint))
  )
  if (matched) {
    return ROLE_LABELS[matched.role]
  }
  return role && role in ROLE_LABELS
    ? ROLE_LABELS[role as UserRole]
    : 'Staf Kantin'
}
