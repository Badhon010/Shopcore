import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Pencil, Image as ImageIcon,
  Eye, EyeOff, ArrowUp, ArrowDown,
} from 'lucide-react'
import { catalogService } from '@/services/api/catalog.service'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/feedback/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Banner } from '@/types/models'

interface BannerForm {
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
  is_active: boolean
}

const DEFAULT_FORM: BannerForm = {
  title: '',
  subtitle: '',
  cta_text: '',
  cta_link: '',
  is_active: true,
}

// ── Sortable banner card ──────────────────────────────────────────────────────
interface SortableBannerCardProps {
  banner: Banner
  onEdit: (b: Banner) => void
  onDelete: (b: Banner) => void
  onToggleActive: (b: Banner) => void
  onMove: (b: Banner, dir: -1 | 1) => void
  isTogglingId: string | null
  isFirst: boolean
  isLast: boolean
}

function SortableBannerCard({
  banner,
  onEdit,
  onDelete,
  onToggleActive,
  onMove,
  isTogglingId,
  isFirst,
  isLast,
}: SortableBannerCardProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm"
    >
      {/* Drag handle */}
      <div className="flex shrink-0 flex-col gap-1">
        <IconButton
          icon={<ArrowUp />}
          label="Move up"
          size="sm"
          className="text-text-muted hover:bg-background-subtle"
          disabled={isFirst}
          onClick={() => onMove(banner, -1)}
        />
        <IconButton
          icon={<ArrowDown />}
          label="Move down"
          size="sm"
          className="text-text-muted hover:bg-background-subtle"
          disabled={isLast}
          onClick={() => onMove(banner, 1)}
        />
      </div>

      {/* Banner image */}
      {banner.image ? (
        <img
          src={banner.image}
          alt={banner.title}
          className="h-14 w-24 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-background-subtle">
          <ImageIcon className="h-5 w-5 text-text-muted" />
        </div>
      )}

      {/* Text info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text-primary">{banner.title}</p>
        {banner.subtitle && (
          <p className="truncate text-xs text-text-muted">{banner.subtitle}</p>
        )}
        {banner.cta_text && (
          <p className="mt-0.5 text-xs text-text-muted">
            CTA: <span className="text-text-secondary">{banner.cta_text}</span>
          </p>
        )}
      </div>

      {/* Status badge */}
      <Badge variant={banner.is_active ? 'success' : 'default'} className="shrink-0">
        {banner.is_active ? 'Active' : 'Inactive'}
      </Badge>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          icon={banner.is_active ? <EyeOff /> : <Eye />}
          label={banner.is_active ? 'Deactivate' : 'Activate'}
          size="sm"
          className={
            banner.is_active
              ? 'text-text-muted hover:bg-warning-subtle hover:text-warning'
              : 'text-text-muted hover:bg-success-subtle hover:text-success'
          }
          disabled={isTogglingId === String(banner.id)}
          onClick={() => onToggleActive(banner)}
        />
        <IconButton
          icon={<Pencil />}
          label="Edit"
          size="sm"
          className="text-text-muted hover:bg-background-subtle"
          onClick={() => onEdit(banner)}
        />
        <IconButton
          icon={<Trash2 />}
          label="Delete"
          size="sm"
          className="text-danger hover:bg-danger-subtle"
          onClick={() => onDelete(banner)}
        />
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function BannersPage() {
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const [editTarget, setEditTarget] = useState<Banner | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<BannerForm>(DEFAULT_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [titleError, setTitleError] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  // Local ordering state so drag is instant without waiting for server
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-banners', page],
    queryFn: () => catalogService.listBanners({ page }),
    enabled: isAuthenticated,
  })

  // Derive displayed banners: apply local ordering if user has dragged
  const serverBanners = data?.results ?? []
  const displayedBanners = localOrder
    ? localOrder
        .map((id) => serverBanners.find((b) => String(b.id) === id))
        .filter((b): b is Banner => b !== undefined)
    : serverBanners

  // Reset localOrder when server data changes (after mutations)
  function openCreate() {
    setEditTarget(null)
    setForm(DEFAULT_FORM)
    setImageFile(null)
    setImagePreview(null)
    setTitleError('')
    setModalOpen(true)
  }

  function openEdit(banner: Banner) {
    setEditTarget(banner)
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      cta_text: banner.cta_text ?? '',
      cta_link: banner.cta_link ?? '',
      is_active: banner.is_active,
    })
    setImageFile(null)
    setImagePreview(banner.image ?? null)
    setTitleError('')
    setModalOpen(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(editTarget?.image ?? null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Drag end: update display_order on server ──────────────────────────────
  function persistOrder(newIds: string[]) {
    setLocalOrder(newIds)

    // Patch each banner whose display_order changed
    newIds.forEach((id, idx) => {
      const banner = serverBanners.find((b) => String(b.id) === id)
      if (banner && banner.display_order !== idx) {
        catalogService
          .updateBanner(id, { display_order: idx } as Partial<Banner>)
          .catch(() => {
            toast({ title: 'Failed to save order', variant: 'destructive' })
          })
      }
    })

    // Refresh after a short delay so the server order is reflected
    setTimeout(() => {
      void qc.invalidateQueries({ queryKey: ['admin-banners'] })
      setLocalOrder(null)
    }, 1200)
  }

  function handleMove(banner: Banner, dir: -1 | 1) {
    const ids = displayedBanners.map((b) => String(b.id))
    const index = ids.indexOf(String(banner.id))
    const nextIndex = index + dir
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return

    const newIds = [...ids]
    const moved = newIds.splice(index, 1)[0]
    if (!moved) return
    newIds.splice(nextIndex, 0, moved)
    persistOrder(newIds)
  }

  // ── Toggle active ─────────────────────────────────────────────────────────
  function handleToggleActive(banner: Banner) {
    const id = String(banner.id)
    setTogglingId(id)
    catalogService
      .updateBanner(id, { is_active: !banner.is_active } as Partial<Banner>)
      .then(() => {
        toast({
          title: banner.is_active ? 'Banner deactivated' : 'Banner activated',
          variant: 'success',
        })
        void qc.invalidateQueries({ queryKey: ['admin-banners'] })
      })
      .catch(() => toast({ title: 'Failed to update banner', variant: 'destructive' }))
      .finally(() => setTogglingId(null))
  }

  // ── Save (create / edit) ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.title.trim()) {
        setTitleError('Title is required')
        return Promise.reject(new Error('validation'))
      }
      setTitleError('')

      const fd = new FormData()
      fd.append('title', form.title.trim())
      if (form.subtitle.trim()) fd.append('subtitle', form.subtitle.trim())
      if (form.cta_text.trim()) fd.append('cta_text', form.cta_text.trim())
      if (form.cta_link.trim()) fd.append('cta_link', form.cta_link.trim())
      fd.append('is_active', String(form.is_active))
      if (imageFile) fd.append('image', imageFile)

      return editTarget
        ? catalogService.updateBanner(String(editTarget.id), fd)
        : catalogService.createBanner(fd)
    },
    onSuccess: () => {
      toast({ title: editTarget ? 'Banner updated' : 'Banner created', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-banners'] })
      setLocalOrder(null)
      setModalOpen(false)
    },
    onError: (err) => {
      if ((err as Error).message === 'validation') return
      toast({ title: 'Failed to save banner', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (pk: string) => catalogService.deleteBanner(pk),
    onSuccess: () => {
      toast({ title: 'Banner deleted', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-banners'] })
      setLocalOrder(null)
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete banner', variant: 'destructive' }),
  })

  const totalPages = Math.ceil((data?.count ?? 0) / 20)
  const canSave = form.title.trim().length > 0 && (!editTarget ? !!imageFile : true)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Banners</h1>
          <p className="text-sm text-text-muted">
            {data?.count ?? 0} banners · use arrows to reorder
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add banner
        </Button>
      </div>

      {/* ── Sortable banner list ────────────────────────────── */}
      <div className="admin-surface p-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-text-muted">Failed to load banners.</p>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !error && displayedBanners.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ImageIcon className="h-8 w-8 text-text-muted" />
            <div>
              <p className="font-medium text-text-primary">No banners yet</p>
              <p className="text-sm text-text-muted">
                Add a banner to display promotions on your storefront.
              </p>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add banner
            </Button>
          </div>
        )}

        {!isLoading && !error && displayedBanners.length > 0 && (
          <div className="space-y-2">
            {displayedBanners.map((banner, index) => (
              <SortableBannerCard
                key={banner.id}
                banner={banner}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggleActive={handleToggleActive}
                onMove={handleMove}
                isTogglingId={togglingId}
                isFirst={index === 0}
                isLast={index === displayedBanners.length - 1}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex justify-end border-t border-border pt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* ── Create / Edit modal ─────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit banner' : 'New banner'}
        size="md"
      >
        <div className="space-y-4">
          {/* Image upload */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">
              Banner image{' '}
              {!editTarget && <span className="text-danger" aria-hidden>*</span>}
            </p>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-36 w-full rounded-xl border border-border object-cover"
                />
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    type="button"
                    className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-primary shadow-sm hover:bg-primary-light transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Replace
                  </button>
                  {imageFile && (
                    <button
                      type="button"
                      className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-danger shadow-sm hover:bg-danger-subtle transition-colors"
                      onClick={clearImage}
                    >
                      Undo
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-text-muted transition-colors hover:border-primary hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-6 w-6" />
                <span className="text-sm font-medium">Click to upload image</span>
                <span className="text-xs">JPEG, PNG, WebP · max 10 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <FormField label="Title" error={titleError} required>
            <Input
              value={form.title}
              onChange={(e) => {
                setForm((f) => ({ ...f, title: e.target.value }))
                if (e.target.value.trim()) setTitleError('')
              }}
              placeholder="Summer Sale"
              autoFocus
              error={!!titleError}
            />
          </FormField>

          <FormField label="Subtitle">
            <Input
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Up to 50% off selected items"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Button text">
              <Input
                value={form.cta_text}
                onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))}
                placeholder="Shop now"
              />
            </FormField>
            <FormField label="Button link">
              <Input
                value={form.cta_link}
                onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))}
                placeholder="/catalog/products"
              />
            </FormField>
          </div>

          <FormField label="Visibility">
            <label className="flex cursor-pointer items-center gap-2 pt-1">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-primary"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <span className="text-sm text-text-primary">Active (shown on store)</span>
            </label>
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={saveMutation.isPending}
              disabled={!canSave}
              onClick={() => saveMutation.mutate()}
            >
              {editTarget ? 'Update banner' : 'Create banner'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))}
        title="Delete banner?"
        description="This banner will be removed from your store immediately."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
