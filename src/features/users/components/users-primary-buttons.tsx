import { MailPlus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUsers } from './users-provider'

export function UsersPrimaryButtons() {
  const { setOpen } = useUsers()
  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='gap-1.5'
        onClick={() => setOpen('invite')}
      >
        <MailPlus className='size-4' />
        <span>Undang Pengguna</span>
      </Button>
      <Button className='gap-1.5' onClick={() => setOpen('add')}>
        <UserPlus className='size-4' />
        <span>Tambah Pengguna</span>
      </Button>
    </div>
  )
}
