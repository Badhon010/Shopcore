import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, ToggleLeft, ToggleRight, Trash2, Megaphone } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Tabs, TabContent } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/feedback/EmptyState'
import { newsletterService } from '@/services/api/newsletter.service'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/utils/format'
import type { NewsletterSubscriber } from '@/types/models'
import type { ApiError } from '@/types/api'

const TABS = [
  { value: 'subscribers', label: 'Subscribers' },
  { value: 'campaigns', label: 'Campaigns' },
]

export function MarketingPage() {
  const [tab, setTab] = useState('subscribers')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<NewsletterSubscriber | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscribers', page, search, activeFilter],
    queryFn: () =>
      newsletterService.getSubscribers({
        page,
        page_size: 20,
        search: search || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      }),
    enabled: tab === 'subscribers',
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      newsletterService.toggleSubscriber(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscribers'] })
      toast({ title: 'Subscriber updated', variant: 'success' })
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => newsletterService.deleteSubscriber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscribers'] })
      toast({ title: 'Subscriber removed', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const columns: Column<NewsletterSubscriber>[] = [
    {
      key: 'email',
      header: 'Email',
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <span className="font-medium text-text-primary">{s.email}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <Badge variant={s.active ? 'success' : 'danger'} dot>
          {s.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'subscribed',
      header: 'Subscribed',
      cell: (s) => <span className="text-body-sm text-text-muted">{formatDate(s.subscribed_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-32',
      cell: (s) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={s.active ? 'Deactivate' : 'Activate'}
            onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: s.id, active: !s.active }) }}
            className={s.active ? 'text-warning hover:bg-warning-subtle' : 'text-success hover:bg-success-subtle'}
          >
            {s.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove"
            className="text-danger hover:bg-danger-subtle hover:text-danger"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-lg font-bold text-text-primary">Marketing</h1>
        <p className="mt-0.5 text-body-sm text-text-secondary">Manage newsletter subscribers and campaigns</p>
      </div>

      <Card noPadding>
        <div className="border-b border-border">
          <Tabs tabs={TABS} value={tab} onChange={setTab} className="px-4" />
        </div>

        <TabContent value="subscribers" activeValue={tab}>
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <SearchBar
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              onClear={() => { setSearch(''); setPage(1) }}
              placeholder="Search subscribers…"
              containerClassName="w-full max-w-xs"
            />
            <Select
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}
              className="h-10 w-40"
            >
              <option value="all">All subscribers</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </Select>
            {data && (
              <span className="ml-auto text-body-sm text-text-muted">
                {data.count.toLocaleString()} subscribers
              </span>
            )}
          </div>
          <DataTable
            columns={columns}
            data={data?.results ?? []}
            isLoading={isLoading}
            keyExtractor={(s) => s.id}
            emptyIcon={Mail}
            emptyTitle="No subscribers"
            emptyDescription="Newsletter subscribers will appear here."
          />
          {data && data.count > 20 && (
            <div className="border-t border-border px-4 py-4">
              <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />
            </div>
          )}
        </TabContent>

        <TabContent value="campaigns" activeValue={tab}>
          <div className="p-6">
            <EmptyState
              icon={Megaphone}
              title="Campaigns coming soon"
              description="Email campaign management will be available in a future update. For now, manage subscribers above."
              className="border-dashed"
            />
          </div>
        </TabContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remove Subscriber"
        description={`Remove "${deleteTarget?.email}" from the newsletter? They will stop receiving emails.`}
        confirmLabel="Remove"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
