import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, RotateCcw, Trash2, MessageSquare } from 'lucide-react'
import { contactService } from '@/services/api/contact.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime } from '@/utils/format'
import type { ContactMessage } from '@/types/models'

const STATUS_VARIANT = { NEW: 'info', IN_PROGRESS: 'warning', RESOLVED: 'success' } as const
const STATUS_LABEL: Record<string, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
}

export function ContactPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null)
  const [viewTarget, setViewTarget] = useState<ContactMessage | null>(null)
  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-contact', page, debouncedSearch, statusFilter],
    queryFn: () => contactService.listMessages({
      page,
      search: debouncedSearch || undefined,
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    enabled: isAuthenticated,
  })

  const resolveMutation = useMutation({
    mutationFn: (pk: string) => contactService.resolveMessage(pk),
    onSuccess: () => {
      toast({ title: 'Message resolved', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-contact'] })
    },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  })

  const markNewMutation = useMutation({
    mutationFn: (pk: string) => contactService.markNew(pk),
    onSuccess: () => {
      toast({ title: 'Message reopened', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-contact'] })
    },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pk: string) => contactService.deleteMessage(pk),
    onSuccess: () => {
      toast({ title: 'Message deleted', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-contact'] })
      setDeleteTarget(null)
      setViewTarget(null)
    },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  })

  const columns: Column<ContactMessage>[] = [
    {
      key: 'from',
      header: 'From',
      render: (row) => (
        <button className="text-left hover:underline" onClick={() => setViewTarget(row)}>
          <p className="font-medium text-text-primary">{row.name}</p>
          <p className="text-xs text-text-muted">{row.email}</p>
        </button>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => (
        <p className="max-w-xs truncate text-text-secondary">{row.subject ?? '(no subject)'}</p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? 'default'}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: 'received',
      header: 'Received',
      render: (row) => (
        <span className="text-text-muted">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === 'NEW' || row.status === 'IN_PROGRESS' ? (
            <IconButton
              icon={<CheckCircle />}
              label="Mark resolved"
              size="sm"
              className="text-success hover:bg-success-subtle"
              onClick={() => resolveMutation.mutate(String(row.id))}
            />
          ) : (
            <IconButton
              icon={<RotateCcw />}
              label="Reopen"
              size="sm"
              className="text-warning hover:bg-warning-subtle"
              onClick={() => markNewMutation.mutate(String(row.id))}
            />
          )}
          <IconButton
            icon={<Trash2 />}
            label="Delete"
            size="sm"
            className="text-danger hover:bg-danger-subtle"
            onClick={() => setDeleteTarget(row)}
          />
        </div>
      ),
    },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Contact messages</h1>
        <p className="text-sm text-text-muted">{data?.count ?? 0} messages</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search messages…"
          className="w-64"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
        </Select>
      </div>

      <div className="admin-surface overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          error={error ? 'Failed to load messages.' : null}
          onRetry={refetch}
          rowKey={(r) => r.id}
          emptyTitle="No messages"
          emptyDescription="All contact form submissions appear here."
          emptyIcon={<MessageSquare />}
        />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Message detail modal */}
      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.subject ?? '(no subject)'}
        size="md"
      >
        {viewTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-text-muted">From</p>
                <p className="font-medium text-text-primary">{viewTarget.name}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Email</p>
                <p className="text-text-secondary">{viewTarget.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-text-muted">Received</p>
                <p className="text-text-secondary">{formatDateTime(viewTarget.created_at)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background-subtle p-4">
              <p className="whitespace-pre-wrap text-sm text-text-primary">{viewTarget.message}</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Badge
                variant={STATUS_VARIANT[viewTarget.status] ?? 'default'}
              >
                {STATUS_LABEL[viewTarget.status] ?? viewTarget.status}
              </Badge>
              <div className="flex gap-2">
                <IconButton
                  icon={<Trash2 />}
                  label="Delete message"
                  className="text-danger hover:bg-danger-subtle"
                  onClick={() => setDeleteTarget(viewTarget)}
                />
                {viewTarget.status === 'RESOLVED' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      markNewMutation.mutate(String(viewTarget.id))
                      setViewTarget(null)
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reopen
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      resolveMutation.mutate(String(viewTarget.id))
                      setViewTarget(null)
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Mark resolved
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))}
        title="Delete message?"
        description="This contact message will be permanently deleted."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
