import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, CreditCard, ExternalLink } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { paymentsService } from '@/services/api/payments.service'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce } from '@/utils/useDebounce'
import { formatDateTime } from '@/utils/format'
import type { ManualPaymentSubmission } from '@/types/models'
import type { ApiError } from '@/types/api'

const STATUS_VARIANT = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger',
} as const

const PAGE_SIZE = 20

export function PaymentSubmissionsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [reviewTarget, setReviewTarget] = useState<ManualPaymentSubmission | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const debouncedOrder = useDebounce(orderSearch)
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payment-submissions', page, statusFilter, debouncedOrder],
    queryFn: () => paymentsService.listSubmissions({
      page,
      page_size: PAGE_SIZE,
      status: statusFilter || undefined,
      order_number: debouncedOrder || undefined,
    }),
    enabled: isAuthenticated,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-payment-submissions'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
  }

  const reviewMutation = useMutation({
    mutationFn: ({ pk, approve }: { pk: string; approve: boolean }) =>
      paymentsService.reviewSubmission(pk, { approve, admin_note: adminNote || undefined }),
    onSuccess: (_data, vars) => {
      toast({ title: vars.approve ? 'Payment approved — order marked paid' : 'Payment rejected', variant: vars.approve ? 'success' : 'default' })
      invalidate()
      setReviewTarget(null)
      setAdminNote('')
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE)

  const columns: Column<ManualPaymentSubmission>[] = [
    {
      key: 'order', header: 'Order',
      render: (s) => (
        <button
          className="text-left hover:underline"
          onClick={() => navigate(`/orders/${s.order_number}`)}
        >
          <p className="font-medium text-primary">#{s.order_number}</p>
          <p className="text-xs text-text-muted">{formatDateTime(s.created_at)}</p>
        </button>
      ),
    },
    {
      key: 'customer', header: 'Customer',
      render: (s) => <span className="text-text-secondary">{s.customer_email ?? 'Guest'}</span>,
    },
    {
      key: 'method', header: 'Method',
      render: (s) => (
        <div>
          <p className="text-sm text-text-primary">{s.method_name ?? '—'}</p>
          {s.method_provider && <p className="text-xs text-text-muted font-mono">{s.method_provider}</p>}
        </div>
      ),
    },
    {
      key: 'reference', header: 'Reference',
      render: (s) => <span className="font-mono text-sm text-text-primary">{s.reference_number}</span>,
    },
    {
      key: 'receipt', header: 'Receipt',
      render: (s) => (
        s.receipt_url
          ? <a href={s.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /> View</a>
          : <span className="text-xs text-text-muted">—</span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (s) => <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>,
    },
    {
      key: 'actions', header: '', width: '110px', align: 'right',
      render: (s) => (
        s.status === 'PENDING' ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost" size="icon-sm" aria-label="Approve"
              className="text-success hover:bg-success-subtle"
              onClick={(e) => { e.stopPropagation(); setReviewTarget(s) }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon-sm" aria-label="Reject"
              className="text-danger hover:bg-danger-subtle"
              onClick={(e) => { e.stopPropagation(); setReviewTarget(s); setAdminNote('Rejected: ') }}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Payment Submissions</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Manual payments (bank transfer, bKash, Nagad, Rocket) awaiting verification.
        </p>
      </div>

      <Card padding="none">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="w-44"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
          <Input
            value={orderSearch}
            onChange={(e) => { setOrderSearch(e.target.value); setPage(1) }}
            placeholder="Filter by order number…"
            className="w-56"
          />
        </div>

        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          rowKey={(s) => s.id}
          emptyTitle="No payment submissions"
          emptyDescription="Customer manual-payment submissions will appear here for verification."
          emptyIcon={<CreditCard />}
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-4 text-sm text-text-muted">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </Card>

      {/* Review modal */}
      <Modal
        open={!!reviewTarget}
        onClose={() => { setReviewTarget(null); setAdminNote('') }}
        title="Review payment submission"
        description={reviewTarget ? `Order #${reviewTarget.order_number} · ${reviewTarget.method_name ?? 'Manual'} · ${reviewTarget.reference_number}` : undefined}
      >
        {reviewTarget && (
          <div className="space-y-4">
            {reviewTarget.receipt_url && (
              <div className="rounded-lg bg-background-subtle p-3">
                <a
                  href={reviewTarget.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" /> Open receipt image
                </a>
              </div>
            )}
            <FormField label="Admin note" htmlFor="review-note" hint="Optional — visible to the customer">
              <Input id="review-note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="e.g. Verified against bank statement" />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={() => { setReviewTarget(null); setAdminNote('') }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                isLoading={reviewMutation.isPending}
                onClick={() => reviewTarget && reviewMutation.mutate({ pk: String(reviewTarget.id), approve: false })}
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button
                size="sm"
                isLoading={reviewMutation.isPending}
                onClick={() => reviewTarget && reviewMutation.mutate({ pk: String(reviewTarget.id), approve: true })}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve &amp; mark paid
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
