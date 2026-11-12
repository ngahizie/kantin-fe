'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'

type UserMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

const CONFIRM_WORD = 'HAPUS'

export function UsersMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: UserMultiDeleteDialogProps<TData>) {
  const [value, setValue] = useState('')

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleDelete = () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`Harap ketik "${CONFIRM_WORD}" untuk konfirmasi.`)
      return
    }

    onOpenChange(false)

    toast.promise(sleep(2000), {
      loading: 'Menghapus pengguna...',
      success: () => {
        setValue('')
        table.resetRowSelection()
        return `Berhasil menghapus ${selectedRows.length} pengguna`
      },
      error: 'Gagal menghapus pengguna',
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='users-multi-delete-form'
      disabled={value.trim() !== CONFIRM_WORD}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Hapus {selectedRows.length} pengguna
        </span>
      }
      desc={
        <form
          id='users-multi-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            Apakah Anda yakin ingin menghapus pengguna terpilih? <br />
            Tindakan ini tidak dapat dibatalkan.
          </p>

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span className=''>Konfirmasi dengan mengetik "{CONFIRM_WORD}":</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Ketik "${CONFIRM_WORD}" untuk konfirmasi.`}
              autoFocus
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Peringatan!</AlertTitle>
            <AlertDescription>
              Harap berhati-hati, tindakan ini tidak dapat dikembalikan.
            </AlertDescription>
          </Alert>
        </form>
      }
      cancelBtnText='Batal'
      confirmText='Hapus'
      destructive
    />
  )
}
