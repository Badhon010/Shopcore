import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Trash2, Megaphone, Plus, Send, Copy, Eye, Edit3,
  Users, BarChart3, CheckCircle, Clock, AlertCircle,
  X, CalendarDays, MousePointerClick, type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { newsletterService } from '@/services/api/newsletter.service'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatRelativeTime } from '@/utils/format'
import type { NewsletterSubscriber, NewsletterCampaign, CampaignStatus } from '@/types/models'

// ─── Campaign status helpers ──────────────────────────────────────────────────
function campaignStatusConfig(status: CampaignStatus) {
  const map: Record<CampaignStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger'; Icon: LucideIcon }> = {
    draft:   { label: 'Draft',   variant: 'default', Icon: Edit3 },
    sending: { label: 'Sending', variant: 'warning', Icon: Clock },
    sent:    { label: 'Sent',    variant: 'success', Icon: CheckCircle },
    failed:  { label: 'Failed',  variant: 'danger',  Icon: AlertCircle },
  }
  return map[status] ?? map.draft
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-xs">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
        <span className="text-caption text-text-muted">{label}</span>
      </div>
      <p className="text-heading-sm font-bold text-text-primary">{value}</p>
    </div>
  )
}

// ─── Campaign form modal ──────────────────────────────────────────────────────
interface CampaignFormModalProps {
  initial?: NewsletterCampaign | null
  onClose: () => void
  onSave: (data: { title: string; subject: string; html_body: string }) => void
  isSaving: boolean
}
function CampaignFormModal({ initial, onClose, onSave, isSaving }: CampaignFormModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [htmlBody, setHtmlBody] = useState(initial?.html_body ?? '')

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
          <div className="space-y-1.5">
            <label htmlFor="campaign-title" className="text-body-sm font-medium text-text-primary">
              Campaign name <span className="text-danger">*</span>
            </label>
            <input
              id="campaign-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Sale 2026"
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
          <div className="space-y-1.5">
            <label htmlFor="campaign-body" className="text-body-sm font-medium text-text-primary">
              Email body (HTML) <span className="text-danger">*</span>
            </label>
            <textarea
              id="campaign-body"
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              rows={12}
              placeholder="<p>Hello,</p><p>Here's what's new at ShopCore…</p>"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-text-primary placeholder-text-muted outline-none transition-colors focus:border-primary focus:shadow-focus-ring"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSave({ title, subject, html_body: htmlBody })}
            disabled={!isValid || isSaving}
            isLoading={isSaving}
          >
            {initial ? 'Save changes' : 'Create campaign'}
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
            <h2 className="text-body-md font-semibold text-text-primary">Campaign Preview</h2>
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
  const { isAuthenticated } = useAuth()

  // ── Queries ─────────────────────────────────────────────────────────────────
  const statsQuery = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: () => newsletterService.getStats(),
    staleTime: 60_000,
    enabled: isAuthenticated,
  })

  const subscribersQuery = useQuery({
    queryKey: ['admin-subscribers', subPage, subSearch, subFilter],
    queryFn: () => newsletterService.listSubscribers({
      page: subPage,
      page_size: 20,
      search: subSearch || undefined,
      ...(subFilter !== 'all' && { active: subFilter === 'active' }),
    } as never),
    enabled: isAuthenticated && tab === 'subscribers',
  })

  const campaignsQuery = useQuery({
    queryKey: ['admin-campaigns', campPage, campSearch, campFilter],
    queryFn: () => newsletterService.listCampaigns({
      page: campPage,
      page_size: 15,
      search: campSearch || undefined,
      status: campFilter || undefined,
    } as never),
    enabled: isAuthenticated && tab === 'campaigns',
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const toggleSubscriberMutation = useMutation({
    mutationFn: ({ pk, active }: { pk: string; active: boolean }) =>
      newsletterService.updateSubscriber(pk, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-subscribers'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({ title: 'Subscriber updated', variant: 'success' })
    },
    onError: () => toast({ title: 'Failed to update subscriber', variant: 'destructive' }),
  })

  const deleteSubscriberMutation = useMutation({
    mutationFn: (pk: string) => newsletterService.deleteSubscriber(pk),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-subscribers'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({ title: 'Subscriber removed', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to remove subscriber', variant: 'destructive' }),
  })

  const createCampaignMutation = useMutation({
    mutationFn: (data: { title: string; subject: string; html_body: string }) => newsletterService.createCampaign(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({ title: 'Campaign created', variant: 'success' })
      setShowCampaignForm(false)
    },
    onError: () => toast({ title: 'Failed to create campaign', variant: 'destructive' }),
  })

  const updateCampaignMutation = useMutation({
    mutationFn: ({ pk, data }: { pk: string; data: { title: string; subject: string; html_body: string } }) =>
      newsletterService.updateCampaign(pk, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      toast({ title: 'Campaign updated', variant: 'success' })
      setEditCampaign(null)
    },
    onError: () => toast({ title: 'Failed to update campaign', variant: 'destructive' }),
  })

  const sendCampaignMutation = useMutation({
    mutationFn: (pk: string) => newsletterService.sendCampaign(pk),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({ title: 'Campaign sent', variant: 'success' })
      setSendTarget(null)
    },
    onError: () => {
      toast({ title: 'Failed to send campaign', variant: 'destructive' })
      setSendTarget(null)
    },
  })

  const duplicateCampaignMutation = useMutation({
    mutationFn: (pk: string) => newsletterService.duplicateCampaign(pk),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      toast({ title: 'Campaign duplicated as draft', variant: 'success' })
    },
    onError: () => toast({ title: 'Failed to duplicate campaign', variant: 'destructive' }),
  })

  const deleteCampaignMutation = useMutation({
    mutationFn: (pk: string) => newsletterService.deleteCampaign(pk),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      void queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] })
      toast({ title: 'Campaign deleted', variant: 'success' })
      setDeleteCampaignTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete campaign', variant: 'destructive' }),
  })

  const ns = statsQuery.data
  const subTotalPages = Math.ceil((subscribersQuery.data?.count ?? 0) / 20)
  const campTotalPages = Math.ceil((campaignsQuery.data?.count ?? 0) / 15)

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatChip icon={Users}        label="Total subscribers"  value={ns?.total_subscribers?.toLocaleString() ?? '—'} />
        <StatChip icon={CheckCircle}  label="Active"             value={ns?.active_subscribers?.toLocaleString() ?? '—'} />
        <StatChip icon={CalendarDays} label="Total campaigns"    value={ns?.total_campaigns?.toLocaleString() ?? '—'} />
        <StatChip icon={Mail}         label="Sent"               value={ns?.sent_campaigns?.toLocaleString() ?? '—'} />
        <StatChip icon={MousePointerClick} label="Avg open rate" value={ns?.avg_open_rate != null ? `${ns.avg_open_rate}%` : '—'} />
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
        <Card padding="none">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <SearchBar
              value={subSearch}
              onChange={(v) => { setSubSearch(v); setSubPage(1) }}
              placeholder="Search subscribers…"
              className="w-full max-w-xs"
            />
            <Select
              value={subFilter}
              onChange={(e) => { setSubFilter(e.target.value); setSubPage(1) }}
              className="w-40"
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
          ) : !subscribersQuery.data?.results.length ? (
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
                  {subscribersQuery.data.results.map((s: NewsletterSubscriber) => (
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
                        <Badge variant={s.active ? 'success' : 'danger'}>
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
                            onClick={() => toggleSubscriberMutation.mutate({ pk: String(s.id), active: !s.active })}
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
          {subTotalPages > 1 && (
            <div className="border-t border-border px-5 py-4 flex justify-end">
              <Pagination page={subPage} totalPages={subTotalPages} onPageChange={setSubPage} />
            </div>
          )}
        </Card>
      )}

      {/* ── Campaigns tab ───────────────────────────────────────────────────── */}
      {tab === 'campaigns' && (
        <Card padding="none">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <SearchBar
              value={campSearch}
              onChange={(v) => { setCampSearch(v); setCampPage(1) }}
              placeholder="Search campaigns…"
              className="w-full max-w-xs"
            />
            <Select
              value={campFilter}
              onChange={(e) => { setCampFilter(e.target.value); setCampPage(1) }}
              className="w-36"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="sending">Sending</option>
              <option value="failed">Failed</option>
            </Select>
            <div className="ml-auto">
              <Button
                size="sm"
                onClick={() => setShowCampaignForm(true)}
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
          ) : !campaignsQuery.data?.results.length ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-text-muted">
              <Megaphone className="h-10 w-10 opacity-25" />
              <p className="text-body-sm font-medium">No campaigns yet</p>
              <Button size="sm" onClick={() => setShowCampaignForm(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Create your first campaign
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campaignsQuery.data.results.map((c: NewsletterCampaign) => {
                const { label, variant, Icon } = campaignStatusConfig(c.status)
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
                        <p className="text-body-sm font-semibold text-text-primary truncate">{c.subject}</p>
                        <Badge variant={variant}>
                          <Icon className="mr-1 h-3 w-3" />{label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-caption text-text-muted">
                        {c.status === 'sent' && (
                          <>
                            {c.open_rate != null && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" /> {c.open_rate}% open
                              </span>
                            )}
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
                          onClick={() => duplicateCampaignMutation.mutate(String(c.id))}
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
          {campTotalPages > 1 && (
            <div className="border-t border-border px-5 py-4 flex justify-end">
              <Pagination page={campPage} totalPages={campTotalPages} onPageChange={setCampPage} />
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
          onSave={(data) => updateCampaignMutation.mutate({ pk: String(editCampaign.id), data })}
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
        onClose={() => setSendTarget(null)}
        title="Send Campaign"
        description={`Send "${sendTarget?.subject}" to all active subscribers? This action cannot be undone.`}
        confirmLabel="Send now"
        isLoading={sendCampaignMutation.isPending}
        onConfirm={() => sendTarget && sendCampaignMutation.mutate(String(sendTarget.id))}
      />

      {/* Confirm delete subscriber */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Subscriber"
        description={`Remove "${deleteTarget?.email}" from the newsletter? They will stop receiving emails.`}
        confirmLabel="Remove"
        isLoading={deleteSubscriberMutation.isPending}
        onConfirm={() => deleteTarget && deleteSubscriberMutation.mutate(String(deleteTarget.id))}
      />

      {/* Confirm delete campaign */}
      <ConfirmDialog
        open={!!deleteCampaignTarget}
        onClose={() => setDeleteCampaignTarget(null)}
        title="Delete Campaign"
        description={`Permanently delete "${deleteCampaignTarget?.subject}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteCampaignMutation.isPending}
        onConfirm={() => deleteCampaignTarget && deleteCampaignMutation.mutate(String(deleteCampaignTarget.id))}
      />
    </div>
  )
}
