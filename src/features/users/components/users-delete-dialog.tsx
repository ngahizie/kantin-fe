'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type User } from '../data/schema'

type UserDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: UserDeleteDialogProps) {
  const [value, setValue] = useState('')

  const handleDelete = () => {
    if (value.trim() !== currentRow.username) return

    onOpenChange(false)
    showSubmittedData(currentRow, 'Pengguna berikut telah dihapus:')
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='users-delete-form'
      disabled={value.trim() !== currentRow.username}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Hapus Pengguna
        </span>
      }
      desc={
        <form
          id='users-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            Apakah Anda yakin ingin menghapus{' '}
            <span className='font-bold'>{currentRow.username}</span>?
            <br />
            Tindakan ini akan menghapus permanen pengguna dengan peran{' '}
            <span className='font-bold'>
              {currentRow.role.toUpperCase()}
            </span>{' '}
            dari sistem dan tidak dapat dibatalkan.
          </p>

          <Label className='my-2 flex flex-col items-start gap-1.5'>
            <span>Username:</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Masukkan username untuk konfirmasi penghapusan.'
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
