import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { ROLE_CONFIGS, useRoleStore, type UserRole } from '@/stores/useRoleStore'
import { useAuthStore } from '@/stores/auth-store'

// eslint-disable-next-line react-refresh/only-export-components
export function getRoleLabel(
  role?: string,
  roles?: string[],
  usernameOrEmail?: string
): string {
  const norm = (usernameOrEmail || '').toLowerCase()
  if (
    roles?.includes('ROLE_KEPSEK') ||
    role === 'kepsek' ||
    norm.includes('kepsek')
  ) {
    return 'Kepala Sekolah'
  }
  if (
    roles?.includes('ROLE_BENDAHARA') ||
    role === 'bendahara' ||
    norm.includes('bendahara')
  ) {
    return 'Bendahara Sekolah'
  }
  if (
    roles?.includes('ROLE_TU_SEKOLAH') ||
    role === 'tu' ||
    norm.includes('tu')
  ) {
    return 'Petugas TU'
  }
  if (
    roles?.includes('ROLE_PETUGAS_KANTIN') ||
    role === 'kasir' ||
    norm.includes('kasir')
  ) {
    return 'Petugas Kasir POS'
  }
  if (
    roles?.includes('ROLE_PENGELOLA_KANTIN') ||
    role === 'pengelola' ||
    norm.includes('pengelola')
  ) {
    return 'Pengelola Kantin'
  }
  if (roles?.includes('ROLE_ADMIN') || role === 'admin') {
    return 'Admin Sekolah'
  }
  return role && ROLE_CONFIGS[role as UserRole]
    ? ROLE_CONFIGS[role as UserRole].label
    : 'Staf Kantin'
}

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const { user } = useAuthStore().auth
  const {
    currentRole: fallbackRole,
    userEmail: fallbackEmail,
    userName: fallbackName,
  } = useRoleStore()

  // Username: tampilkan username akun login (misal: kepsek1, kasir10, bendahara10, dst)
  const displayUsername =
    user?.username ||
    user?.email ||
    fallbackEmail ||
    user?.nama ||
    fallbackName ||
    'Staf Kantin'

  // Role: tampilkan label peran akun (misal: Kepala Sekolah, Admin Sekolah, Petugas Kasir POS, dst)
  const userRole = getRoleLabel(
    user?.currentRole || fallbackRole,
    user?.roles,
    displayUsername
  )

  // Inisial avatar berdasarkan username
  const rawInitials = displayUsername
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const initials =
    rawInitials.length === 1 && displayUsername.length >= 2
      ? displayUsername.slice(0, 2).toUpperCase()
      : rawInitials || 'U'

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarImage src='/avatars/shadcn.jpg' alt={displayUsername} />
              <AvatarFallback className='bg-primary/10 text-primary font-semibold text-xs'>
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-64 border-0' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p
                className='text-sm leading-none font-semibold text-foreground truncate'
                title={user?.nama ? `${displayUsername} (${user.nama})` : displayUsername}
              >
                {displayUsername}
              </p>
              <p
                className='text-xs leading-none text-muted-foreground truncate'
                title={userRole}
              >
                {userRole}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant='destructive' onClick={() => setOpen(true)}>
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
