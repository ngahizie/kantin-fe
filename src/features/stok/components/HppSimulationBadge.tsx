import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { formatRupiah, formatNumber } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SimulasiHppMasukResult } from '../utils/hpp-calculator'

interface HppSimulationBadgeProps {
  simulasi: SimulasiHppMasukResult
  compact?: boolean
}

export function HppSimulationBadge({
  simulasi,
  compact = false,
}: HppSimulationBadgeProps) {
  const {
    stokSebelum,
    stokSesudah,
    hppSebelum,
    hppSesudah,
    selisihHpp,
    totalBiayaMasuk,
    totalNilaiSesudah,
  } = simulasi

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className='flex cursor-help items-center gap-1.5'>
              <Badge
                variant={
                  selisihHpp > 0
                    ? 'default'
                    : selisihHpp < 0
                      ? 'secondary'
                      : 'outline'
                }
                className='flex items-center gap-1 px-2 py-0.5 text-xs font-medium'
              >
                {selisihHpp > 0 ? (
                  <TrendingUp className='h-3 w-3 text-emerald-400' />
                ) : selisihHpp < 0 ? (
                  <TrendingDown className='h-3 w-3 text-blue-400' />
                ) : (
                  <Minus className='h-3 w-3 text-muted-foreground' />
                )}
                <span>HPP: {formatRupiah(hppSesudah)}</span>
              </Badge>
              <Info className='h-3.5 w-3.5 text-muted-foreground hover:text-foreground' />
            </div>
          </TooltipTrigger>
          <TooltipContent className='max-w-xs space-y-1.5 p-3 text-xs'>
            <p className='border-b pb-1 text-sm font-semibold'>
              Estimasi Dampak Restock
            </p>
            <div className='grid grid-cols-2 gap-x-2 gap-y-1'>
              <span className='text-muted-foreground'>Stok Berjalan:</span>
              <span className='text-right font-medium'>
                {formatNumber(stokSebelum)} &rarr; {formatNumber(stokSesudah)}{' '}
                unit
              </span>
              <span className='text-muted-foreground'>HPP Berjalan:</span>
              <span className='text-right font-medium'>
                {formatRupiah(hppSebelum)} &rarr; {formatRupiah(hppSesudah)}
              </span>
              <span className='text-muted-foreground'>Perubahan HPP:</span>
              <span
                className={`text-right font-semibold ${
                  selisihHpp > 0
                    ? 'text-emerald-500'
                    : selisihHpp < 0
                      ? 'text-blue-500'
                      : 'text-muted-foreground'
                }`}
              >
                {selisihHpp > 0
                  ? `+${formatRupiah(selisihHpp)}`
                  : formatRupiah(selisihHpp)}
              </span>
              <span className='text-muted-foreground'>Biaya Masuk:</span>
              <span className='text-right font-medium'>
                {formatRupiah(totalBiayaMasuk)}
              </span>
              <span className='text-muted-foreground'>Nilai Persediaan:</span>
              <span className='text-right font-medium'>
                {formatRupiah(totalNilaiSesudah)}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className='space-y-1.5 rounded-lg border bg-card/60 p-2.5 text-xs'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-muted-foreground'>Stok Baru:</span>
        <span className='font-semibold text-foreground'>
          {formatNumber(stokSebelum)} &rarr;{' '}
          <span className='font-bold text-primary'>
            {formatNumber(stokSesudah)} unit
          </span>
        </span>
      </div>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-muted-foreground'>Estimasi HPP:</span>
        <span className='flex items-center gap-1 font-semibold text-foreground'>
          {formatRupiah(hppSebelum)} &rarr;{' '}
          <span className='font-bold text-primary'>
            {formatRupiah(hppSesudah)}
          </span>
          {selisihHpp !== 0 && (
            <span
              className={`text-[11px] font-normal ${
                selisihHpp > 0 ? 'text-emerald-500' : 'text-blue-500'
              }`}
            >
              (
              {selisihHpp > 0
                ? `+${formatRupiah(selisihHpp)}`
                : formatRupiah(selisihHpp)}
              )
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
