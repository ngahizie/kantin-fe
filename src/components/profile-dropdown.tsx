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
import { getRoleLabel } from '@/lib/role-utils'
import { useRoleStore } from '@/stores/use-role-store'
import { useAuthStore } from '@/stores/auth-store'

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
        <DropdownMenuContent className='w-64' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1'>
              <p
                className='text-sm leading-snug font-semibold text-foreground truncate'
                title={user?.nama ? `${displayUsername} (${user.nama})` : displayUsername}
              >
                {displayUsername}
              </p>
              <p
                className='text-xs leading-snug text-muted-foreground truncate'
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
