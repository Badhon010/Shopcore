import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Trash2, Users, Mail, Plus } from 'lucide-react'
import { newsletterService } from '@/services/api/newsletter.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Tabs, TabContent } from '@/components/ui/Tabs'
import { StatCard } from '@/components/ui/StatCard'
import { StatCardSkeleton } from '@/components/feedback/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/utils/format'
import type { NewsletterCampaign, NewsletterSubscriber } from '@/types/models'

const CAMPAIGN_STATUS_VARIANT = {
  SENT: 'success', DRAFT: 'warning', SCHEDULED: 'info', FAILED: 'danger',
} as const

export function MarketingPage() {
  const [tab, setTab] = useState('campaigns')
  const [deleteCampaign, setDeleteCampaign] = useState<NewsletterCampaign | null>(null)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: () => newsletterService.getStats(),
  })

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['newsletter-campaigns'],
    queryFn: () => newsletterService.listCampaigns({ page: 1 }),
  })

  const { data: subscribers, isLoading: subscribersLoading } = useQuery({
    queryKey: ['newsletter-subscribers'],
    queryFn: () => newsletterService.listSubscribers({ page: 1 }),
    enabled: tab === 'subscribers',
  })

  const sendMutation = useMutation({
    mutationFn: (pk: string) => newsletterService.sendCampaign(pk),
    onSuccess: () => { toast({ title: 'Campaign sent', variant: 'success' }); void qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] }) },
    onError: () => toast({ title: 'Failed to send campaign', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pk: string) => newsletterService.deleteCampaign(pk),
    onSuccess: () => { toast({ title: 'Campaign deleted', variant: 'success' }); void qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] }); setDeleteCampaign(null) },
    onError: () => toast({ title: 'Failed to delete campaign', variant: 'destructive' }),
  })

  const campaignColumns: Column<NewsletterCampaign>[] = [
    { key: 'subject', header: 'Subject', render: (row) => <p className="font-medium text-text-primary">{row.subject}</p> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={CAMPAIGN_STATUS_VARIANT[row.status as keyof typeof CAMPAIGN_STATUS_VARIANT] ?? 'default'}>{row.status}</Badge> },
    { key: 'sent_at', header: 'Sent', render: (row) => <span className="text-text-muted">{row.sent_at ? formatDate(row.sent_at) : '—'}</span> },
    { key: 'opens', header: 'Opens', align: 'right', render: (row) => <span className="text-text-secondary">{row.open_count ?? 0}</span> },
    {
      key: 'actions', header: '', width: '80px', align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === 'DRAFT' && <IconButton icon={<Send />} label="Send now" size="sm" className="text-primary hover:bg-primary-light" onClick={() => sendMutation.mutate(String(row.id))} />}
          <IconButton icon={<Trash2 />} label="Delete" size="sm" className="text-danger hover:bg-danger-subtle" onClick={() => setDeleteCampaign(row)} />
        </div>
      ),
    },
  ]

  const subscriberColumns: Column<NewsletterSubscriber>[] = [
    { key: 'email', header: 'Email', render: (row) => <span className="font-medium text-text-primary">{row.email}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Subscribed' : 'Unsubscribed'}</Badge> },
    { key: 'joined', header: 'Subscribed', render: (row) => <span className="text-text-muted">{formatDate(row.subscribed_at)}</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Marketing</h1>
          <p className="text-sm text-text-muted">Newsletter campaigns and subscribers</p>
        </div>
        <Button disabled><Plus className="h-4 w-4" /> New campaign</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total subscribers" value={stats?.total_subscribers ?? '—'} icon={<Users />} />
            <StatCard label="Active subscribers" value={stats?.active_subscribers ?? '—'} icon={<Mail />} />
            <StatCard label="Avg open rate" value={stats?.avg_open_rate ? `${stats.avg_open_rate}%` : '—'} icon={<Mail />} />
          </>
        )}
      </div>

      <Tabs
        tabs={[{ value: 'campaigns', label: 'Campaigns' }, { value: 'subscribers', label: 'Subscribers' }]}
        value={tab}
        onValueChange={setTab}
      />

      {tab === 'campaigns' && (
        <div className="admin-surface overflow-hidden">
          <DataTable columns={campaignColumns} data={campaigns?.results ?? []} isLoading={campaignsLoading} rowKey={(r) => r.id} emptyTitle="No campaigns yet" />
        </div>
      )}

      {tab === 'subscribers' && (
        <div className="admin-surface overflow-hidden">
          <DataTable columns={subscriberColumns} data={subscribers?.results ?? []} isLoading={subscribersLoading} rowKey={(r) => r.id} emptyTitle="No subscribers yet" />
        </div>
      )}

      <ConfirmDialog open={!!deleteCampaign} onClose={() => setDeleteCampaign(null)} onConfirm={() => deleteCampaign && deleteMutation.mutate(String(deleteCampaign.id))} title="Delete campaign?" description="This campaign and its stats will be permanently deleted." confirmLabel="Delete" isLoading={deleteMutation.isPending} />
    </div>
  )
}
