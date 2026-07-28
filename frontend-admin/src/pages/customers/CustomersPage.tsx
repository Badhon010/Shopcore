import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { customersService } from '@/services/api/customers.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useDebounce } from '@/utils/useDebounce'
import { formatDate } from '@/utils/format'
import type { User } from '@/types/models'

export function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-customers', page, debouncedSearch],
    queryFn: () => customersService.listCustomers({ page, search: debouncedSearch }),
  })

  const columns: Column<User>[] = [
    {
      key: 'name', header: 'Customer',
      render: (row) => (
        <button className="flex items-center gap-3 text-left hover:underline" onClick={() => navigate(`/customers/${row.id}`)}>
          <Avatar name={row.full_name || row.email} size="md" />
          <div>
            <p className="font-medium text-text-primary">{row.full_name || '—'}</p>
            <p className="text-xs text-text-muted">{row.email}</p>
          </div>
        </button>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    { key: 'joined', header: 'Joined', render: (row) => <span className="text-text-muted">{formatDate(row.date_joined ?? '')}</span> },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Customers</h1>
        <p className="text-sm text-text-muted">{data?.count ?? 0} total customers</p>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search name or email…" className="w-64" />

      <div className="admin-surface overflow-hidden">
        <DataTable columns={columns} data={data?.results ?? []} isLoading={isLoading} error={error ? 'Failed to load customers.' : null} onRetry={refetch} rowKey={(r) => r.id} emptyTitle="No customers found" />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
