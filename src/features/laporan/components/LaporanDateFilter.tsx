import { useState } from 'react'
import { Calendar as CalendarIcon, Check, ChevronDown, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/formatters'
import type { LaporanFilterParams } from '../types'
import {
  ALL_TIME_PARAMS,
  formatYmd,
  startOfDayIso,
  nextDayStartIso,
} from './date-filter-utils'

export type DateFilterPreset =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'CUSTOM_DAY'
  | 'CUSTOM_RANGE'

export interface LaporanDateFilterProps {
  initialPreset?: DateFilterPreset
  onChange: (params: LaporanFilterParams, label: string) => void
  className?: string
  align?: 'start' | 'end' | 'center'
}

export function LaporanDateFilter({
  initialPreset = 'ALL',
  onChange,
  className,
  align = 'start',
}: LaporanDateFilterProps) {
  const [open, setOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<DateFilterPreset>(initialPreset)
  const [activeLabel, setActiveLabel] = useState<string>('Semua Waktu')

  // State untuk Pilih Hari Tertentu (lazy initializer agar bebas dari impure render)
  const [singleDateInput, setSingleDateInput] = useState<string>(() => formatYmd(new Date()))

  // State untuk Rentang Tanggal (lazy initializer)
  const [rangeStartInput, setRangeStartInput] = useState<string>(() =>
    formatYmd(new Date(Date.now() - 6 * 86400000))
  )
  const [rangeEndInput, setRangeEndInput] = useState<string>(() => formatYmd(new Date()))

  const handleSelectPreset = (preset: DateFilterPreset) => {
    const today = new Date()
    const todayYmd = formatYmd(today)

    setSelectedPreset(preset)

    if (preset === 'ALL') {
      setActiveLabel('Semua Waktu')
      onChange(ALL_TIME_PARAMS, 'Semua Waktu')
      setOpen(false)
      return
    }

    if (preset === 'TODAY') {
      const label = `Hari Ini (${formatDate(today)})`
      setActiveLabel(label)
      onChange({ tanggal: todayYmd }, label)
      setOpen(false)
      return
    }

    if (preset === 'YESTERDAY') {
      const yest = new Date(Date.now() - 86400000)
      const yestYmd = formatYmd(yest)
      const label = `Kemarin (${formatDate(yest)})`
      setActiveLabel(label)
      onChange({ tanggal: yestYmd }, label)
      setOpen(false)
      return
    }

    if (preset === 'LAST_7_DAYS') {
      const d7 = new Date(Date.now() - 6 * 86400000)
      const label = '7 Hari Terakhir'
      setActiveLabel(label)
      onChange(
        {
          dari: startOfDayIso(formatYmd(d7)),
          sampai: nextDayStartIso(todayYmd),
        },
        label
      )
      setOpen(false)
      return
    }

    if (preset === 'LAST_30_DAYS') {
      const d30 = new Date(Date.now() - 29 * 86400000)
      const label = '30 Hari Terakhir'
      setActiveLabel(label)
      onChange(
        {
          dari: startOfDayIso(formatYmd(d30)),
          sampai: nextDayStartIso(todayYmd),
        },
        label
      )
      setOpen(false)
      return
    }

    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const monthName = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
      }).format(today)
      const label = `Bulan Ini (${monthName})`
      setActiveLabel(label)
      onChange(
        {
          dari: startOfDayIso(formatYmd(firstDay)),
          sampai: nextDayStartIso(formatYmd(lastDay)),
        },
        label
      )
      setOpen(false)
      return
    }
  }

  const handleApplySingleDate = () => {
    if (!singleDateInput) return
    setSelectedPreset('CUSTOM_DAY')
    const label = `Hari: ${formatDate(singleDateInput)}`
    setActiveLabel(label)
    onChange({ tanggal: singleDateInput }, label)
    setOpen(false)
  }

  const handleApplyRange = () => {
    if (!rangeStartInput || !rangeEndInput) return
    if (rangeStartInput > rangeEndInput) {
      toast.error('Rentang tanggal tidak valid', {
        description: 'Tanggal awal tidak boleh melebihi tanggal akhir.',
      })
      return
    }
    setSelectedPreset('CUSTOM_RANGE')
    const label = `${formatDate(rangeStartInput)} – ${formatDate(rangeEndInput)}`
    setActiveLabel(label)
    onChange(
      {
        dari: startOfDayIso(rangeStartInput),
        sampai: nextDayStartIso(rangeEndInput),
      },
      label
    )
    setOpen(false)
  }

  const handleReset = () => {
    handleSelectPreset('ALL')
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-9 gap-2 border-dashed font-normal ${
              selectedPreset !== 'ALL'
                ? 'border-primary/60 bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium">{activeLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align={align}
          className="w-84 space-y-4 rounded-xl border bg-card p-4 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Filter Tanggal / Waktu
            </div>
            {selectedPreset !== 'ALL' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>

          {/* Preset Cepat */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase">
              Pilihan Cepat
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { preset: 'ALL' as const, label: 'Semua Waktu' },
                { preset: 'TODAY' as const, label: 'Hari Ini' },
                { preset: 'YESTERDAY' as const, label: 'Kemarin' },
                { preset: 'LAST_7_DAYS' as const, label: '7 Hari Terakhir' },
                { preset: 'LAST_30_DAYS' as const, label: '30 Hari Terakhir' },
                { preset: 'THIS_MONTH' as const, label: 'Bulan Ini' },
              ].map((item) => (
                <Button
                  key={item.preset}
                  variant={selectedPreset === item.preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSelectPreset(item.preset)}
                  className={`h-8 justify-between text-xs font-normal ${
                    selectedPreset === item.preset ? 'font-semibold' : ''
                  }`}
                >
                  <span>{item.label}</span>
                  {selectedPreset === item.preset && <Check className="h-3.5 w-3.5 shrink-0" />}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            {/* Pilih Hari Spesifik */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Pilih Satu Hari Tertentu
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={singleDateInput}
                  onChange={(e) => setSingleDateInput(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleApplySingleDate}
                  className="h-8 shrink-0 text-xs px-2.5"
                >
                  Pilih
                </Button>
              </div>
            </div>

            {/* Rentang Tanggal Kustom */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Rentang Tanggal (Dari – Sampai)
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Dari</span>
                  <Input
                    type="date"
                    value={rangeStartInput}
                    onChange={(e) => setRangeStartInput(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Sampai</span>
                  <Input
                    type="date"
                    value={rangeEndInput}
                    onChange={(e) => setRangeEndInput(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleApplyRange}
                className="h-8 w-full text-xs mt-1"
              >
                Terapkan Rentang Tanggal
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Tombol Clear cepat bila filter bukan Semua Waktu */}
      {selectedPreset !== 'ALL' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          title="Kembali ke Semua Waktu"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
      )}
    </div>
  )
}
