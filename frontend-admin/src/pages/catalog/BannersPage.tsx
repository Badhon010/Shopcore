import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Image as ImageIcon } from 'lucide-react'
import { catalogService } from '@/services/api/catalog.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Banner } from '@/types/models'

interface BannerForm {
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
  display_order: string
  is_active: boolean
}

const DEFAULT_FORM: BannerForm = {
  title: '',
  subtitle: '',
  cta_text: '',
  cta_link: '',
  display_order: '0',
  is_active: true,
}

export function BannersPage() {
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const [editTarget, setEditTarget] = useState<Banner | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<BannerForm>(DEFAULT_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [titleError, setTitleError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-banners', page],
    queryFn: () => catalogService.listBanners({ page }),
    enabled: isAuthenticated,
  })

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
      display_order: String(banner.display_order ?? 0),
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
      fd.append('display_order', form.display_order || '0')
      fd.append('is_active', String(form.is_active))
      if (imageFile) fd.append('image', imageFile)

      return editTarget
        ? catalogService.updateBanner(String(editTarget.id), fd)
        : catalogService.createBanner(fd)
    },
    onSuccess: () => {
      toast({ title: editTarget ? 'Banner updated' : 'Banner created', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-banners'] })
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
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete banner', variant: 'destructive' }),
  })

  const columns: Column<Banner>[] = [
    {
      key: 'image',
      header: 'Banner',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img
              src={row.image}
              alt={row.title}
              className="h-10 w-20 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex h-10 w-20 items-center justify-center rounded-lg bg-background-subtle">
              <ImageIcon className="h-4 w-4 text-text-muted" />
            </div>
          )}
          <div>
            <p className="font-medium text-text-primary">{row.title}</p>
            {row.subtitle && <p className="text-xs text-text-muted">{row.subtitle}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'default'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      align: 'right',
      render: (row) => <span className="text-text-muted">{row.display_order ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={<Pencil />}
            label="Edit"
            size="sm"
            className="text-text-muted hover:bg-background-subtle"
            onClick={() => openEdit(row)}
          />
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
  const canSave = form.title.trim().length > 0 && (!editTarget ? !!imageFile : true)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Banners</h1>
          <p className="text-sm text-text-muted">{data?.count ?? 0} banners</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add banner
        </Button>
      </div>

      <div className="admin-surface overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          error={error ? 'Failed to load banners.' : null}
          onRetry={refetch}
          rowKey={(r) => r.id}
          emptyTitle="No banners"
          emptyDescription="Add a banner to display promotions on your storefront."
        />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
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

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Display order" hint="Lower numbers appear first.">
              <Input
                type="number"
                min="0"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
              />
            </FormField>
            <FormField label="Visibility">
              <label className="flex cursor-pointer items-center gap-2 pt-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <span className="text-sm text-text-primary">Active (shown on store)</span>
              </label>
            </FormField>
          </div>

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
