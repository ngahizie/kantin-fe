import React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export interface DashboardStatCardProps {
  title: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  iconColorClass?: string
  badgeText?: string
  badgeColorClass?: string
  subtext?: string
  unit?: string
  href?: string
}

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColorClass = 'border-border bg-muted/50 text-muted-foreground',
  badgeText,
  badgeColorClass = 'text-muted-foreground font-semibold',
  subtext,
  unit,
  href,
}) => {
  const content = (
    <Card className={href ? 'hover:border-primary/40 transition-colors cursor-pointer' : ''}>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 leading-snug'>
          {title}
        </CardTitle>
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${iconColorClass}`}
        >
          <Icon className='size-4' />
        </div>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums flex items-baseline flex-wrap'>
          <span>{value}</span>
          {unit && (
            <span className='text-xs font-normal text-muted-foreground ms-1.5'>
              {unit}
            </span>
          )}
        </div>
        {(badgeText || subtext) && (
          <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-1'>
            {badgeText && (
              <span className={`inline-flex items-center shrink-0 ${badgeColorClass}`}>
                {badgeText}
              </span>
            )}
            {subtext && <span className='min-w-0 leading-normal'>{subtext}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link to={href} className='block text-inherit no-underline'>
        {content}
      </Link>
    )
  }

  return content
}
