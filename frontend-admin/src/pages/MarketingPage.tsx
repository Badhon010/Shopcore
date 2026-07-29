import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Trash2, Users, Mail, Plus, Download, Copy } from 'lucide-react'
import { newsletterService } from '@/services/api/newsletter.service'
import { exportsService } from '@/services/api/exports.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Tabs } from '@/components/ui/Tabs'
import { StatCard } from '@/components/ui/StatCard'
import { StatCardSkeleton } from '@/components/feedback/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/utils/format'
import type { NewsletterCampaign, NewsletterSubscriber } from '@/types/models'

const CAMPAIGN_STATUS_VARIANT = {
  SENT: 'success', DRAFT: 'warning', SCHEDULED: 'info', FAILED: 'danger',
} as const

const DEFAULT_CAMPAIGN_FORM = { subject: '', body: '' }

export function MarketingPage() {
  const [tab, setTab] = useState('campaigns')
  const [deleteCampaign, setDeleteCampaign] = useState<NewsletterCampaign | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [campaignForm, setCampaignForm] = useState(DEFAULT_CAMPAIGN_FORM)
  const [isExporting, setIsExporting] = useState(false)
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

  const createMutation = useMutation({
    mutationFn: () =>
      newsletterService.createCampaign({ subject: campaignForm.subject, body: campaignForm.body }),
    onSuccess: () => {
      toast({ title: 'Campaign created', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] })
      setShowCreate(false)
      setCampaignForm(DEFAULT_CAMPAIGN_FORM)
    },
    onError: () => toast({ title: 'Failed to create campaign', variant: 'destructive' }),
  })

  const sendMutation = useMutation({
    mutationFn: (pk: string) => newsletterService.sendCampaign(pk),
    onSuccess: () => {
      toast({ title: 'Campaign sent', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] })
    },
    onError: () => toast({ title: 'Failed to send campaign', variant: 'destructive' }),
  })

  const duplicateMutation = useMutation({
    mutationFn: (pk: string) => newsletterService.duplicateCampaign(pk),
    onSuccess: () => {
      toast({ title: 'Campaign duplicated', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] })
    },
    onError: () => toast({ title: 'Failed to duplicate campaign', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pk: string) => newsletterService.deleteCampaign(pk),
    onSuccess: () => {
      toast({ title: 'Campaign deleted', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] })
      setDeleteCampaign(null)
    },
    onError: () => toast({ title: 'Failed to delete campaign', variant: 'destructive' }),
  })

  async function handleExportSubscribers() {
    setIsExporting(true)
    try {
      await exportsService.exportSubscribers('csv')
      toast({ title: 'Export downloaded', variant: 'success' })
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  const campaignColumns: Column<NewsletterCampaign>[] = [
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => <p className="font-medium text-text-primary">{row.subject}</p>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={CAMPAIGN_STATUS_VARIANT[row.status as keyof typeof CAMPAIGN_STATUS_VARIANT] ?? 'default'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'sent_at',
      header: 'Sent',
      render: (row) => (
        <span className="text-text-muted">{row.sent_at ? formatDate(row.sent_at) : '—'}</span>
      ),
    },
    {
      key: 'opens',
      header: 'Opens',
      align: 'right',
      render: (row) => (
        <span className="text-text-secondary">
          {row.open_count ?? 0}
          {row.open_rate != null ? (
            <span className="ml-1 text-xs text-text-muted">({row.open_rate}%)</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === 'DRAFT' && (
            <IconButton
              icon={<Send />}
              label="Send now"
              size="sm"
              className="text-primary hover:bg-primary-light"
              onClick={() => sendMutation.mutate(String(row.id))}
            />
          )}
          <IconButton
            icon={<Copy />}
            label="Duplicate"
            size="sm"
            className="text-text-muted hover:bg-background-subtle"
            onClick={() => duplicateMutation.mutate(String(row.id))}
          />
          <IconButton
            icon={<Trash2 />}
            label="Delete"
            size="sm"
            className="text-danger hover:bg-danger-subtle"
            onClick={() => setDeleteCampaign(row)}
          />
        </div>
      ),
    },
  ]

  const subscriberColumns: Column<NewsletterSubscriber>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="font-medium text-text-primary">{row.email}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'default'}>
          {row.is_active ? 'Subscribed' : 'Unsubscribed'}
        </Badge>
      ),
    },
    {
      key: 'joined',
      header: 'Subscribed',
      render: (row) => <span className="text-text-muted">{formatDate(row.subscribed_at)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Marketing</h1>
          <p className="text-sm text-text-muted">Newsletter campaigns and subscribers</p>
        </div>
        <Button
          onClick={() => {
            setShowCreate(true)
            setCampaignForm(DEFAULT_CAMPAIGN_FORM)
          }}
        >
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total subscribers" value={stats?.total_subscribers ?? '—'} icon={<Users />} />
            <StatCard label="Active subscribers" value={stats?.active_subscribers ?? '—'} icon={<Mail />} />
            <StatCard
              label="Avg open rate"
              value={stats?.avg_open_rate != null ? `${stats.avg_open_rate}%` : '—'}
              icon={<Mail />}
            />
          </>
        )}
      </div>

      <Tabs
        tabs={[
          { value: 'campaigns', label: 'Campaigns' },
          { value: 'subscribers', label: 'Subscribers' },
        ]}
        value={tab}
        onValueChange={setTab}
      />

      {tab === 'campaigns' && (
        <div className="admin-surface overflow-hidden">
          <DataTable
            columns={campaignColumns}
            data={campaigns?.results ?? []}
            isLoading={campaignsLoading}
            rowKey={(r) => r.id}
            emptyTitle="No campaigns yet"
            emptyDescription="Create your first campaign to get started."
          />
        </div>
      )}

      {tab === 'subscribers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              {subscribers?.count ?? 0} subscribers
            </p>
            <Button
              variant="secondary"
              size="sm"
              isLoading={isExporting}
              onClick={() => void handleExportSubscribers()}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
          <div className="admin-surface overflow-hidden">
            <DataTable
              columns={subscriberColumns}
              data={subscribers?.results ?? []}
              isLoading={subscribersLoading}
              rowKey={(r) => r.id}
              emptyTitle="No subscribers yet"
              emptyDescription="Subscribers appear here after they sign up from your store."
            />
          </div>
        </div>
      )}

      {/* Create campaign modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New campaign" size="md">
        <div className="space-y-4">
          <FormField label="Subject line" required>
            <Input
              value={campaignForm.subject}
              onChange={(e) => setCampaignForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Your email subject…"
              autoFocus
            />
          </FormField>
          <FormField label="Body" required>
            <Textarea
              value={campaignForm.body}
              onChange={(e) => setCampaignForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Write your campaign content here…"
              rows={8}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              isLoading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              disabled={!campaignForm.subject.trim() || !campaignForm.body.trim()}
            >
              Save as draft
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteCampaign}
        onClose={() => setDeleteCampaign(null)}
        onConfirm={() => deleteCampaign && deleteMutation.mutate(String(deleteCampaign.id))}
        title="Delete campaign?"
        description="This campaign and its stats will be permanently deleted."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
