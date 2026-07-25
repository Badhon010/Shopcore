import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { Avatar } from '@/components/ui/Avatar'
import { customersService } from '@/services/api/customers.service'
import { formatDate } from '@/utils/format'
import type { User } from '@/types/models'

export function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [staffFilter, setStaffFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search, staffFilter],
    queryFn: () =>
      customersService.getCustomers({
        page,
        page_size: 20,
        search: search || undefined,
        is_staff: staffFilter === '' ? undefined : staffFilter === 'staff',
      }),
  })

  const columns: Column<User>[] = [
    {
      key: 'avatar',
      header: 'Customer',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.full_name || u.email} size="sm" />
          <div>
            <p className="font-medium text-text-primary">{u.full_name || '—'}</p>
            <p className="text-caption text-text-muted">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (u) => <span className="text-body-sm text-text-secondary">{u.phone_number ?? '—'}</span>,
    },
    {
      key: 'badges',
      header: 'Roles',
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.is_staff && <Badge variant="info" size="sm">Staff</Badge>}
          {u.is_email_verified ? (
            <Badge variant="success" size="sm">Verified</Badge>
          ) : (
            <Badge variant="secondary" size="sm">Unverified</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (u) => <span className="text-body-sm text-text-muted">{formatDate(u.date_joined)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-lg font-bold text-text-primary">Customers</h1>
        <p className="mt-0.5 text-body-sm text-text-secondary">
          {data?.count ?? 0} registered accounts
        </p>
      </div>

      <Card noPadding>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchBar
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onClear={() => { setSearch(''); setPage(1) }}
            placeholder="Search by name or email…"
            containerClassName="w-full max-w-xs"
          />
          <Select
            value={staffFilter}
            onChange={(e) => { setStaffFilter(e.target.value); setPage(1) }}
            className="h-10 w-40"
          >
            <option value="">All accounts</option>
            <option value="customer">Customers only</option>
            <option value="staff">Staff only</option>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          keyExtractor={(u) => u.id}
          emptyIcon={Users}
          emptyTitle="No customers found"
          emptyDescription="Customers who register will appear here."
        />

        {data && data.count > 20 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
