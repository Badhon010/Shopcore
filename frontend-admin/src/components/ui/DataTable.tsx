import { type ReactNode, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { TableSkeleton } from '@/components/feedback/Skeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
  onSort?: (key: string, dir: 'asc' | 'desc') => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  className?: string
  rowKey?: (row: T) => string | number
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  emptyTitle = 'No results',
  emptyDescription,
  emptyAction,
  onSort,
  sortKey,
  sortDir,
  className,
  rowKey,
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const activeSortKey = sortKey ?? localSort?.key
  const activeSortDir = sortDir ?? localSort?.dir ?? 'asc'

  function handleSort(key: string) {
    const nextDir = activeSortKey === key && activeSortDir === 'asc' ? 'desc' : 'asc'
    if (onSort) {
      onSort(key, nextDir)
    } else {
      setLocalSort({ key, dir: nextDir })
    }
  }

  if (isLoading) return <TableSkeleton rows={8} cols={columns.length} />
  if (error) return <ErrorState description={error} onRetry={onRetry} />

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-muted',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  col.sortable && 'cursor-pointer select-none hover:text-text-primary'
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    activeSortKey === col.key ? (
                      activeSortDir === 'asc'
                        ? <ChevronUp className="h-3 w-3 text-primary" />
                        : <ChevronDown className="h-3 w-3 text-primary" />
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-40" />
                    )
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                className="border-b border-border-light transition-colors last:border-0 hover:bg-bg-subtle/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-sm text-text-primary',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
