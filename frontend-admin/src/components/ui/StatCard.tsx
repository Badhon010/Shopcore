import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: number   // percentage change, positive = up
  suffix?: string
  className?: string
}

export function StatCard({ label, value, icon, trend, suffix, className }: StatCardProps) {
  const hasTrend = trend !== undefined && trend !== null
  const isUp = hasTrend && trend >= 0

  return (
    <div className={cn('admin-surface p-5', className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </div>
        )}
      </div>

      <p className="text-2xl font-bold tracking-tight text-text-primary">
        {value === '—' || value === null || value === undefined ? '—' : value}
        {suffix && <span className="ml-1 text-sm font-normal text-text-muted">{suffix}</span>}
      </p>

      {hasTrend && (
        <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', isUp ? 'text-success' : 'text-danger')}>
          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          <span>{isUp ? '+' : ''}{trend.toFixed(1)}% vs last period</span>
        </div>
      )}
    </div>
  )
}
