import { useState } from 'react'
import type { KartuSiswaMock } from '@/mocks/mock-data'
import {
  Search,
  Radio,
  Check,
  ChevronsUpDown,
  AlertTriangle,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/formatters'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface StudentSearchCardProps {
  students: KartuSiswaMock[]
  selectedStudent: KartuSiswaMock | null
  onSelectStudent: (student: KartuSiswaMock | null) => void
  isLoading?: boolean
}

export function StudentSearchCard({
  students,
  selectedStudent,
  onSelectStudent,
  isLoading = false,
}: StudentSearchCardProps) {
  const [openCombobox, setOpenCombobox] = useState(false)
  const [rfidInput, setRfidInput] = useState('')
  const [rfidFeedback, setRfidFeedback] = useState<string | null>(null)

  const handleFindRfid = (uidToFind?: string) => {
    const targetUid = uidToFind || rfidInput.trim()
    if (!targetUid) return

    const found = students.find(
      (s) => s.uid.toLowerCase() === targetUid.toLowerCase()
    )
    if (found) {
      onSelectStudent(found)
      setRfidFeedback(`Kartu RFID terdeteksi: ${found.nama} (${found.nis})`)
      setRfidInput(found.uid)
    } else {
      setRfidFeedback(`RFID UID "${targetUid}" tidak terdaftar di sistem.`)
    }
  }

  return (
    <Card className='border border-border bg-card'>
      <CardHeader className='pb-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <CardTitle className='text-lg font-semibold'>
              Pencarian Data Siswa
            </CardTitle>
            <CardDescription className='text-xs'>
              Cari berdasarkan NIS, Nama Siswa, atau Tap Kartu RFID reader TU
            </CardDescription>
          </div>
          <Badge
            className='flex items-center gap-1.5 border-0 bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400'
          >
            <Radio className='h-3 w-3 animate-pulse text-blue-600 dark:text-blue-400' />
            RFID Reader Aktif
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Autocomplete Input Search */}
        <div className='space-y-2'>
          <label className='text-xs font-medium tracking-wider text-muted-foreground uppercase'>
            Autokomplit NIS / Nama Siswa
          </label>
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={openCombobox}
                className='h-11 w-full justify-between border-border text-left font-normal'
                disabled={isLoading}
              >
                {selectedStudent ? (
                  <span className='flex items-center gap-2 truncate text-foreground'>
                    <span className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground'>
                      {selectedStudent.nis}
                    </span>
                    <span className='font-medium text-foreground'>
                      {selectedStudent.nama} ({selectedStudent.kelas})
                    </span>
                  </span>
                ) : (
                  <span className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Search className='h-4 w-4' />
                    Ketik NIS atau Nama Siswa...
                  </span>
                )}
                <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className='w-[var(--radix-popover-trigger-width)] p-0'
              align='start'
            >
              <Command>
                <CommandInput placeholder='Cari NIS atau nama...' />
                <CommandList>
                  <CommandEmpty>Siswa tidak ditemukan.</CommandEmpty>
                  <CommandGroup heading='Daftar Siswa'>
                    {students.map((student) => (
                      <CommandItem
                        key={student.siswa_id}
                        value={`${student.nis} ${student.nama} ${student.kelas}`}
                        onSelect={() => {
                          onSelectStudent(student)
                          setOpenCombobox(false)
                        }}
                        className='flex cursor-pointer items-center justify-between py-2.5'
                      >
                        <div className='flex items-center gap-3'>
                          <Avatar className='h-8 w-8'>
                            <AvatarImage
                              src={student.foto_url}
                              alt={student.nama}
                            />
                            <AvatarFallback>
                              {student.nama.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className='text-sm leading-none font-medium text-foreground'>
                              {student.nama}
                            </p>
                            <p className='mt-0.5 text-xs text-muted-foreground'>
                              NIS: {student.nis} • {student.kelas}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                            {formatRupiah(student.saldo)}
                          </span>
                          {selectedStudent?.siswa_id === student.siswa_id && (
                            <Check className='h-4 w-4 text-primary' />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Input Scan RFID Reader TU */}
        <div className='space-y-2 rounded-xl border border-border bg-muted/40 p-3.5 dark:bg-muted/20'>
          <label className='text-xs font-medium text-foreground'>
            Scan atau Input UID Kartu RFID (Reader TU)
          </label>
          <div className='flex gap-2 pt-1'>
            <Input
              placeholder='Tempelkan kartu ke reader atau ketik UID...'
              value={rfidInput}
              onChange={(e) => setRfidInput(e.target.value)}
              className='h-9 bg-background font-mono text-xs'
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleFindRfid()
                }
              }}
            />
            <Button
              type='button'
              size='sm'
              variant='secondary'
              className='h-9 px-3 text-xs'
              onClick={() => handleFindRfid()}
            >
              Cari Kartu
            </Button>
          </div>

          {rfidFeedback && (
            <p className='pt-1 text-xs font-medium text-blue-600 dark:text-blue-400'>
              {rfidFeedback}
            </p>
          )}
        </div>

        {/* Selected Student Detail View */}
        {selectedStudent ? (
          <div className='space-y-4 rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/10'>
            <div className='flex items-start gap-4'>
              <Avatar className='h-16 w-16 border-2 border-background'>
                <AvatarImage
                  src={selectedStudent.foto_url}
                  alt={selectedStudent.nama}
                />
                <AvatarFallback className='bg-primary/10 text-lg font-bold text-primary'>
                  {selectedStudent.nama.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-2'>
                  <h3 className='truncate text-base font-bold text-foreground'>
                    {selectedStudent.nama}
                  </h3>
                  {selectedStudent.is_blocked ? (
                    <Badge
                      className='flex shrink-0 items-center gap-1 border-0 bg-destructive/15 text-xs font-medium text-destructive'
                    >
                      <AlertTriangle className='h-3 w-3' />
                      Kartu Diblokir
                    </Badge>
                  ) : (
                    <Badge
                      className='shrink-0 border-0 bg-emerald-500/15 text-xs font-medium text-emerald-700 dark:text-emerald-400'
                    >
                      Aktif Normal
                    </Badge>
                  )}
                </div>

                <div className='mt-2.5 grid grid-cols-2 gap-2 text-xs'>
                  <div>
                    <span className='text-muted-foreground'>NIS:</span>{' '}
                    <span className='font-mono font-semibold text-foreground'>
                      {selectedStudent.nis}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Kelas:</span>{' '}
                    <span className='font-medium text-foreground'>
                      {selectedStudent.kelas}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>UID RFID:</span>{' '}
                    <span className='font-mono text-muted-foreground'>
                      {selectedStudent.uid}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Limit Harian:</span>{' '}
                    <span className='font-medium text-foreground'>
                      {formatRupiah(selectedStudent.limit_harian)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex items-center justify-between rounded-lg border border-border bg-background p-3'>
              <span className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                Saldo Saat Ini
              </span>
              <span className='font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                {formatRupiah(selectedStudent.saldo)}
              </span>
            </div>
          </div>
        ) : (
          <div className='rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center'>
            <p className='text-sm font-medium text-muted-foreground'>
              Belum ada siswa terpilih
            </p>
            <p className='mt-1 text-xs text-muted-foreground/70'>
              Gunakan autokomplit NIS/Nama atau masukkan UID Kartu RFID di atas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
