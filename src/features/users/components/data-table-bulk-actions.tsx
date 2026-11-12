import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2, UserX, UserCheck, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type User } from '../data/schema'
import { UsersMultiDeleteDialog } from './users-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkStatusChange = (status: 'active' | 'inactive') => {
    const selectedUsers = selectedRows.map((row) => row.original as User)
    toast.promise(sleep(2000), {
      loading: `${status === 'active' ? 'Mengaktifkan' : 'Menonaktifkan'} pengguna...`,
      success: () => {
        table.resetRowSelection()
        return `Berhasil ${status === 'active' ? 'mengaktifkan' : 'menonaktifkan'} ${selectedUsers.length} pengguna`
      },
      error: `Gagal ${status === 'active' ? 'mengaktifkan' : 'menonaktifkan'} pengguna`,
    })
    table.resetRowSelection()
  }

  const handleBulkInvite = () => {
    const selectedUsers = selectedRows.map((row) => row.original as User)
    toast.promise(sleep(2000), {
      loading: 'Mengirim undangan pengguna...',
      success: () => {
        table.resetRowSelection()
        return `Berhasil mengundang ${selectedUsers.length} pengguna`
      },
      error: 'Gagal mengundang pengguna',
    })
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='pengguna'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={handleBulkInvite}
              className='size-8'
              aria-label='Undang pengguna terpilih'
              title='Undang pengguna terpilih'
            >
              <Mail />
              <span className='sr-only'>Undang pengguna terpilih</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undang pengguna terpilih</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('active')}
              className='size-8'
              aria-label='Aktifkan pengguna terpilih'
              title='Aktifkan pengguna terpilih'
            >
              <UserCheck />
              <span className='sr-only'>Aktifkan pengguna terpilih</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Aktifkan pengguna terpilih</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('inactive')}
              className='size-8'
              aria-label='Nonaktifkan pengguna terpilih'
              title='Nonaktifkan pengguna terpilih'
            >
              <UserX />
              <span className='sr-only'>Nonaktifkan pengguna terpilih</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nonaktifkan pengguna terpilih</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label='Hapus pengguna terpilih'
              title='Hapus pengguna terpilih'
            >
              <Trash2 />
              <span className='sr-only'>Hapus pengguna terpilih</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Hapus pengguna terpilih</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <UsersMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
