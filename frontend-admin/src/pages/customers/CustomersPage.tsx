import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { customersService, type BulkAction } from '@/services/api/customers.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/utils/format'
import type { User } from '@/types/models'

export function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<BulkAction | ''>('')
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const debouncedSearch = useDebounce(search)
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-customers', page, debouncedSearch],
    queryFn: () => customersService.listCustomers({ page, search: debouncedSearch }),
    enabled: isAuthenticated,
  })

  const bulkMutation = useMutation({
    mutationFn: () => customersService.bulkAction(bulkAction as BulkAction, Array.from(selected)),
    onSuccess: (res) => {
      toast({ title: `${res.updated} user(s) updated`, variant: 'success' })
      if (res.errors.length > 0) {
        toast({ title: `${res.errors.length} error(s) — check console`, variant: 'destructive' })
        console.warn('Bulk action errors:', res.errors)
      }
      setSelected(new Set())
      setBulkAction('')
      setBulkConfirm(false)
      void qc.invalidateQueries({ queryKey: ['admin-customers'] })
    },
    onError: () => {
      toast({ title: 'Bulk action failed', variant: 'destructive' })
      setBulkConfirm(false)
    },
  })

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    const rows = data?.results ?? []
    if (selected.size === rows.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((r) => r.id)))
    }
  }

  const columns: Column<User>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          className="rounded border-border"
          checked={selected.size > 0 && selected.size === (data?.results.length ?? 0)}
          onChange={toggleAll}
          aria-label="Select all"
        />
      ),
      width: '40px',
      render: (row) => (
        <input
          type="checkbox"
          className="rounded border-border"
          checked={selected.has(row.id)}
          onChange={() => toggleRow(row.id)}
          aria-label={`Select ${row.email}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'name', header: 'Customer',
      render: (row) => (
        <button
          className="flex items-center gap-3 text-left hover:underline"
          onClick={() => navigate(`/customers/${row.id}`)}
        >
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
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
          {row.is_staff && <Badge variant="info">Staff</Badge>}
        </div>
      ),
    },
    {
      key: 'verified', header: 'Email',
      render: (row) => (
        <Badge variant={row.is_email_verified ? 'success' : 'warning'}>
          {row.is_email_verified ? 'Verified' : 'Unverified'}
        </Badge>
      ),
    },
    {
      key: 'joined', header: 'Joined',
      render: (row) => <span className="text-text-muted">{formatDate(row.date_joined ?? '')}</span>,
    },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)
  const BULK_ACTION_LABELS: Record<BulkAction, string> = {
    activate: 'Activate',
    deactivate: 'Deactivate',
    promote_staff: 'Promote to staff',
    remove_staff: 'Remove staff',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Customers</h1>
          <p className="text-sm text-text-muted">{data?.count ?? 0} total customers</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search name or email…"
          className="w-64"
        />
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">{selected.size} selected</span>
            <Select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as BulkAction | '')}
              className="w-44 text-sm"
            >
              <option value="">Bulk action…</option>
              {(Object.keys(BULK_ACTION_LABELS) as BulkAction[]).map((a) => (
                <option key={a} value={a}>{BULK_ACTION_LABELS[a]}</option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!bulkAction}
              onClick={() => setBulkConfirm(true)}
            >
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="admin-surface overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          error={error ? 'Failed to load customers.' : null}
          onRetry={refetch}
          rowKey={(r) => r.id}
          emptyTitle="No customers found"
          emptyDescription="Customers appear here once users register an account."
          emptyIcon={<Users />}
        />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        onConfirm={() => bulkMutation.mutate()}
        title={`${BULK_ACTION_LABELS[bulkAction as BulkAction] ?? 'Apply action'} to ${selected.size} user(s)?`}
        description="This action will be applied to all selected users immediately."
        confirmLabel="Apply"
        isLoading={bulkMutation.isPending}
      />
    </div>
  )
}
