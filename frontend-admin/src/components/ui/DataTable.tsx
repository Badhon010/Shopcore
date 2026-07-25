import { cn } from '@/utils/cn'
import { Skeleton } from '@/components/feedback/Skeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  skeletonRows?: number
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  keyExtractor: (row: T) => string | number
  onRowClick?: (row: T) => void
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  skeletonRows = 5,
  emptyIcon,
  emptyTitle = 'No results',
  emptyDescription,
  keyExtractor,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'border-b border-border bg-bg-subtle px-4 py-3 text-overline font-semibold uppercase tracking-wide text-text-muted first:rounded-tl-md last:rounded-tr-md',
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: skeletonRows }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {columns.map((col) => (
                    <td key={col.key} className="border-b border-border px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            : data.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center">
                    <EmptyState
                      icon={emptyIcon}
                      title={emptyTitle}
                      description={emptyDescription}
                      className="border-0 shadow-none"
                    />
                  </td>
                </tr>
              )
              : data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-bg-subtle'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'border-b border-border px-4 py-3.5 text-body-sm text-text-primary',
                        col.className
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
