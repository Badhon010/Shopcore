import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Trash2, Megaphone, Plus, Send, Copy, Eye, Edit3,
  Users, TrendingUp, BarChart3, CheckCircle, Clock, AlertCircle,
  Search as SearchIcon, X, CalendarDays, MousePointerClick, type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { newsletterService, type CreateCampaignPayload } from '@/services/api/newsletter.service'
import { useToast } from '@/contexts/ToastContext'
import { formatDate, formatRelativeTime } from '@/utils/format'
import type { NewsletterSubscriber, NewsletterCampaign, CampaignStatus } from '@/types/models'
import type { ApiError } from '@/types/api'

// ─── Campaign status helpers ──────────────────────────────────────────────────
function campaignStatusBadge(status: CampaignStatus) {
  const map = {
    draft:   { label: 'Draft',   variant: 'default' as const,  Icon: Edit3 },
    sending: { label: 'Sending', variant: 'warning' as const,  Icon: Clock },
    sent:    { label: 'Sent',    variant: 'success' as const,  Icon: CheckCircle },
    failed:  { label: 'Failed',  variant: 'danger' as const,   Icon: AlertCircle },
  }
  return map[status] ?? map.draft
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({
  icon: Icon, label, value, sub,
}: { icon: LucideIcon; label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-xs">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
        <span className="text-caption text-text-muted">{label}</span>
      </div>
      <p className="text-heading-sm font-bold text-text-primary">{value}</p>
      {sub && <p className="text-caption text-text-muted">{sub}</p>}
    </div>
  )
}

// ─── Campaign form modal ──────────────────────────────────────────────────────
interface CampaignFormModalProps {
  initial?: NewsletterCampaign | null
  onClose: () => void
  onSave: (data: CreateCampaignPayload) => void
  isSaving: boolean
}
function CampaignFormModal({ initial, onClose, onSave, isSaving }: CampaignFormModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [previewText, setPreviewText] = useState(initial?.preview_text ?? '')
  const [htmlBody, setHtmlBody] = useState(initial?.html_body ?? '')
  const [plainBody, setPlainBody] = useState(initial?.plain_body ?? '')
  const [tab, setTab] = useState<'html' | 'plain'>('html')

  const isValid = title.trim() && subject.trim() && htmlBody.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-overlay/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light">
              <Megaphone className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <h2 className="text-body-md font-semibold text-text-primary">
              {initial ? 'Edit Campaign' : 'New Campaign'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-background-subtle hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="campaign-title" className="text-body-sm font-medium text-text-primary">
                Campaign title <span className="text-danger">*</span>
              </label>
              <input
                id="campaign-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. June Newsletter"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary focus:shadow-focus-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="campaign-subject" className="text-body-sm font-medium text-text-primary">
                Email subject <span className="text-danger">*</span>
              </label>
              <input
                id="campaign-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Our biggest sale of the year 🎉"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary focus:shadow-focus-ring"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="campaign-preview-text" className="text-body-sm font-medium text-text-primary">Preview text</label>
            <input
              id="campaign-preview-text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Short text shown in email clients before opening"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary focus:shadow-focus-ring"
            />
          </div>

          {/* Email body tabs */}
          <div className="space-y-2">
            <div className="flex gap-2 border-b border-border">
              {(['html', 'plain'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`pb-2 px-1 text-body-sm font-medium transition-colors border-b-2 -mb-px ${
                    tab === t
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
                >
                  {t === 'html' ? 'HTML Body' : 'Plain Text'}
                  {t === 'html' && <span className="ml-1 text-danger">*</span>}
                </button>
              ))}
            </div>
            {tab === 'html' ? (
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={10}
                placeholder="<p>Hello {{name}},</p><p>Here's what's new at ShopCore…</p>"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary focus:shadow-focus-ring"
              />
            ) : (
              <textarea
                value={plainBody}
                onChange={(e) => setPlainBody(e.target.value)}
                rows={10}
                placeholder="Plain-text fallback for email clients that don't render HTML."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary focus:shadow-focus-ring"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({ title, subject, preview_text: previewText, html_body: htmlBody, plain_body: plainBody })
            }
            disabled={!isValid || isSaving}
          >
            {isSaving ? 'Saving…' : initial ? 'Save changes' : 'Create campaign'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Campaign preview modal ───────────────────────────────────────────────────
function CampaignPreviewModal({ campaign, onClose }: { campaign: NewsletterCampaign; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-overlay/50 backdrop-blur-sm cursor-default" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-body-md font-semibold text-text-primary">{campaign.title}</h2>
            <p className="text-caption text-text-muted">Subject: {campaign.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-background-subtle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div
            className="prose prose-sm max-w-none text-text-primary"
            dangerouslySetInnerHTML={{ __html: campaign.html_body }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Tab = 'subscribers' | 'campaigns'

export function MarketingPage() {
  const [tab, setTab] = useState<Tab>('subscribers')

  // Subscribers state
  const [subPage, setSubPage] = useState(1)
  const [subSearch, setSubSearch] = useState('')
  const [subFilter, setSubFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<NewsletterSubscriber | null>(null)

  // Campaigns state
  const [campPage, setCampPage] = useState(1)
  const [campSearch, setCampSearch] = useState('')
  const [campFilter, setCampFilter] = useState('')
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [editCampaign, setEditCampaign] = useState<NewsletterCampaign | null>(null)
  const [previewCampaign, setPreviewCampaign] = useState<NewsletterCampaign | null>(null)
  const [sendTarget, setSendTarget] = useState<NewsletterCampaign | null>(null)
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<NewsletterCampaign | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ── Queries ─────────────────────────────────────────────────────────────────
  const statsQuery = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: () => newsletterService.getStats(),
    staleTime: 60_000,
  })

  const subscribersQuery = useQuery({
    queryKey: ['admin-subscribers', subPage, subSearch, subFilter],
    queryFn: () => newsletterService.getSubscribers({
      page: subPage,
      page_size: 20,
      search: subSearch || undefined,
      active: subFilter === 'all' ? undefined : subFilter === 'active',
    }),
    enabled: tab === 'subscribers',
  })

  const campaignsQuery = useQuery({
    queryKey: ['admin-campaigns', campPage, campSearch, campFilter],
    queryFn: () => newsletterService.getCampaigns({
      page: campPage,
      page_size: 15,
      search: campSearch || undefined,
      status: campFilter || undefined,
    }),
    enabled: tab === 'campaigns',
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const toggleSubscriberMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      newsletterService.toggleSubscriber(id, active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-subscribers'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({ title: 'Subscriber updated', variant: 'success' })
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const deleteSubscriberMutation = useMutation({
    mutationFn: (id: number) => newsletterService.deleteSubscriber(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-subscribers'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({ title: 'Subscriber removed', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const createCampaignMutation = useMutation({
    mutationFn: (data: CreateCampaignPayload) => newsletterService.createCampaign(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({ title: 'Campaign created', variant: 'success' })
      setShowCampaignForm(false)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCampaignPayload> }) =>
      newsletterService.updateCampaign(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      toast({ title: 'Campaign updated', variant: 'success' })
      setEditCampaign(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const sendCampaignMutation = useMutation({
    mutationFn: (id: number) => newsletterService.sendCampaign(id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({
        title: `Campaign sent to ${data.recipient_count} subscribers`,
        variant: 'success',
      })
      setSendTarget(null)
    },
    onError: (e: ApiError) => {
      toast({ title: e.message || 'Failed to send campaign', variant: 'error' })
      setSendTarget(null)
    },
  })

  const duplicateCampaignMutation = useMutation({
    mutationFn: (id: number) => newsletterService.duplicateCampaign(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      toast({ title: 'Campaign duplicated as draft', variant: 'success' })
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: number) => newsletterService.deleteCampaign(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({ title: 'Campaign deleted', variant: 'success' })
      setDeleteCampaignTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const ns = statsQuery.data

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-md font-bold text-text-primary">Marketing</h1>
        <p className="mt-0.5 text-body-sm text-text-muted">
          Manage newsletter subscribers and email campaigns
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatChip icon={Users}             label="Total"       value={ns?.total_subscribers.toLocaleString() ?? '—'} />
        <StatChip icon={CheckCircle}       label="Active"      value={ns?.active_subscribers.toLocaleString() ?? '—'} />
        <StatChip icon={CalendarDays}      label="This month"  value={ns?.new_this_month.toLocaleString() ?? '—'} />
        <StatChip icon={Mail}              label="Campaigns"   value={ns?.campaigns_sent.toLocaleString() ?? '—'} sub="sent" />
        <StatChip icon={BarChart3}         label="Open rate"   value={ns ? `${ns.avg_open_rate}%` : '—'} />
        <StatChip icon={MousePointerClick} label="Click rate"  value={ns ? `${ns.avg_click_rate}%` : '—'} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 rounded-xl border border-border bg-background p-1 w-fit">
        {(['subscribers', 'campaigns'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-body-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t === 'subscribers' ? <Users className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {/* ── Subscribers tab ─────────────────────────────────────────────────── */}
      {tab === 'subscribers' && (
        <Card noPadding>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <SearchBar
              value={subSearch}
              onChange={(e) => { setSubSearch(e.target.value); setSubPage(1) }}
              onClear={() => { setSubSearch(''); setSubPage(1) }}
              placeholder="Search subscribers…"
              containerClassName="w-full max-w-xs"
            />
            <Select
              value={subFilter}
              onChange={(e) => { setSubFilter(e.target.value); setSubPage(1) }}
              containerClassName="w-40"
              className="h-10"
            >
              <option value="all">All subscribers</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </Select>
            {subscribersQuery.data && (
              <span className="ml-auto text-caption text-text-muted">
                {subscribersQuery.data.count.toLocaleString()} subscribers
              </span>
            )}
          </div>

          {/* Table */}
          {subscribersQuery.isLoading ? (
            <div className="space-y-px p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-skeleton" />
              ))}
            </div>
          ) : subscribersQuery.data?.results.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-text-muted">
              <Mail className="h-8 w-8 opacity-30" />
              <p className="text-body-sm">No subscribers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-background-subtle">
                    {['Email', 'Status', 'Subscribed', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-muted ${h === 'Actions' ? 'w-28 text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subscribersQuery.data?.results.map((s: NewsletterSubscriber) => (
                    <tr key={s.id} className="transition-colors hover:bg-background-subtle/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light">
                            <Mail className="h-3.5 w-3.5 text-primary" aria-hidden />
                          </div>
                          <span className="text-body-sm font-medium text-text-primary">{s.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={s.active ? 'success' : 'danger'} dot>
                          {s.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-caption text-text-muted">
                        {formatRelativeTime(s.subscribed_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSubscriberMutation.mutate({ id: s.id, active: !s.active })}
                          >
                            {s.active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete"
                            className="text-danger hover:bg-danger-subtle"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {subscribersQuery.data && subscribersQuery.data.count > 20 && (
            <div className="border-t border-border px-5 py-4">
              <Pagination
                page={subPage}
                pageSize={20}
                total={subscribersQuery.data.count}
                onPageChange={setSubPage}
              />
            </div>
          )}
        </Card>
      )}

      {/* ── Campaigns tab ───────────────────────────────────────────────────── */}
      {tab === 'campaigns' && (
        <Card noPadding>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 w-full max-w-xs">
              <SearchIcon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <input
                value={campSearch}
                onChange={(e) => { setCampSearch(e.target.value); setCampPage(1) }}
                placeholder="Search campaigns…"
                className="flex-1 bg-transparent text-body-sm text-text-primary placeholder-text-muted outline-none"
              />
              {campSearch && (
                <button onClick={() => { setCampSearch(''); setCampPage(1) }}>
                  <X className="h-3.5 w-3.5 text-text-muted" />
                </button>
              )}
            </div>
            <Select
              value={campFilter}
              onChange={(e) => { setCampFilter(e.target.value); setCampPage(1) }}
              containerClassName="w-36"
              className="h-10"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </Select>
            <div className="ml-auto">
              <Button
                size="sm"
                onClick={() => setShowCampaignForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" /> New campaign
              </Button>
            </div>
          </div>

          {/* Campaign list */}
          {campaignsQuery.isLoading ? (
            <div className="space-y-px p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-skeleton" />
              ))}
            </div>
          ) : campaignsQuery.data?.results.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-text-muted">
              <Megaphone className="h-10 w-10 opacity-25" />
              <p className="text-body-sm font-medium">No campaigns yet</p>
              <Button size="sm" onClick={() => setShowCampaignForm(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Create your first campaign
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campaignsQuery.data?.results.map((c: NewsletterCampaign) => {
                const { label, variant, Icon } = campaignStatusBadge(c.status)
                return (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-background-subtle/40"
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light">
                      <Megaphone className="h-5 w-5 text-primary" aria-hidden />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body-sm font-semibold text-text-primary truncate">{c.title}</p>
                        <Badge variant={variant}>
                          <Icon className="mr-1 h-3 w-3" />{label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-caption text-text-muted truncate">
                        Subject: {c.subject}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-3 text-caption text-text-muted">
                        {c.status === 'sent' && (
                          <>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {c.recipient_count.toLocaleString()} recipients
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" /> {c.open_rate}% open
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" /> {c.click_rate}% click
                            </span>
                          </>
                        )}
                        <span>
                          {c.status === 'sent' && c.sent_at
                            ? `Sent ${formatDate(c.sent_at)}`
                            : `Created ${formatRelativeTime(c.created_at)}`}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Preview"
                        onClick={() => setPreviewCampaign(c)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {c.status === 'draft' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit"
                            onClick={() => setEditCampaign(c)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Send"
                            className="text-primary hover:bg-primary-light gap-1.5"
                            onClick={() => setSendTarget(c)}
                          >
                            <Send className="h-3.5 w-3.5" /> Send
                          </Button>
                        </>
                      )}
                      {c.status === 'sent' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Duplicate"
                          onClick={() => duplicateCampaignMutation.mutate(c.id)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete"
                        className="text-danger hover:bg-danger-subtle"
                        onClick={() => setDeleteCampaignTarget(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {campaignsQuery.data && campaignsQuery.data.count > 15 && (
            <div className="border-t border-border px-5 py-4">
              <Pagination
                page={campPage}
                pageSize={15}
                total={campaignsQuery.data.count}
                onPageChange={setCampPage}
              />
            </div>
          )}
        </Card>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Create campaign */}
      {showCampaignForm && (
        <CampaignFormModal
          onClose={() => setShowCampaignForm(false)}
          onSave={(data) => createCampaignMutation.mutate(data)}
          isSaving={createCampaignMutation.isPending}
        />
      )}

      {/* Edit campaign */}
      {editCampaign && (
        <CampaignFormModal
          initial={editCampaign}
          onClose={() => setEditCampaign(null)}
          onSave={(data) => updateCampaignMutation.mutate({ id: editCampaign.id, data })}
          isSaving={updateCampaignMutation.isPending}
        />
      )}

      {/* Preview campaign */}
      {previewCampaign && (
        <CampaignPreviewModal
          campaign={previewCampaign}
          onClose={() => setPreviewCampaign(null)}
        />
      )}

      {/* Confirm send */}
      <ConfirmDialog
        open={!!sendTarget}
        onOpenChange={(o) => !o && setSendTarget(null)}
        title="Send Campaign"
        description={`Send "${sendTarget?.title}" to all active subscribers? This action cannot be undone.`}
        confirmLabel="Send now"
        isLoading={sendCampaignMutation.isPending}
        onConfirm={() => sendTarget && sendCampaignMutation.mutate(sendTarget.id)}
      />

      {/* Confirm delete subscriber */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remove Subscriber"
        description={`Remove "${deleteTarget?.email}" from the newsletter? They will stop receiving emails.`}
        confirmLabel="Remove"
        isLoading={deleteSubscriberMutation.isPending}
        onConfirm={() => deleteTarget && deleteSubscriberMutation.mutate(deleteTarget.id)}
      />

      {/* Confirm delete campaign */}
      <ConfirmDialog
        open={!!deleteCampaignTarget}
        onOpenChange={(o) => !o && setDeleteCampaignTarget(null)}
        title="Delete Campaign"
        description={`Permanently delete "${deleteCampaignTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteCampaignMutation.isPending}
        onConfirm={() => deleteCampaignTarget && deleteCampaignMutation.mutate(deleteCampaignTarget.id)}
      />
    </div>
  )
}
