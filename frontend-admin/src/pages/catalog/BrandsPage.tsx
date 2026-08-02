import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tag, Image as ImageIcon, X } from 'lucide-react'
import { catalogService } from '@/services/api/catalog.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Brand } from '@/types/models'
import type { ApiError } from '@/types/api'

interface BrandForm {
  name: string
  description: string
}

const DEFAULT_FORM: BrandForm = { name: '', description: '' }

export function BrandsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<Brand | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<BrandForm>(DEFAULT_FORM)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-brands', page, debouncedSearch],
    queryFn: () => catalogService.listBrands({ page, search: debouncedSearch }),
    enabled: isAuthenticated,
  })

  function openCreate() {
    setEditTarget(null)
    setForm(DEFAULT_FORM)
    setLogoFile(null)
    setLogoPreview(null)
    setModalOpen(true)
  }

  function openEdit(brand: Brand) {
    setEditTarget(brand)
    setForm({ name: brand.name, description: brand.description ?? '' })
    setLogoFile(null)
    setLogoPreview(brand.logo ?? null)
    setModalOpen(true)
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function buildPayload(): FormData | Partial<Brand> {
    if (logoFile) {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      if (form.description.trim()) fd.append('description', form.description.trim())
      fd.append('logo', logoFile)
      return fd
    }
    return {
      name: form.name.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload()
      return editTarget
        ? catalogService.updateBrand(String(editTarget.id), payload)
        : catalogService.createBrand(payload)
    },
    onSuccess: () => {
      toast({ title: editTarget ? 'Brand updated' : 'Brand created', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-brands'] })
      setModalOpen(false)
    },
    onError: (err) => {
      const apiErr = err as unknown as ApiError
      toast({
        title: `Failed to ${editTarget ? 'update' : 'create'} brand`,
        description: apiErr.message,
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (pk: string) => catalogService.deleteBrand(pk),
    onSuccess: () => {
      toast({ title: 'Brand deleted', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-brands'] })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete brand', variant: 'destructive' }),
  })

  const columns: Column<Brand>[] = [
    {
      key: 'name', header: 'Brand',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.logo ? (
            <img src={row.logo} alt={row.name} className="h-8 w-8 rounded-lg object-contain border border-border bg-white p-1" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-subtle"><Tag className="h-4 w-4 text-text-muted" /></div>
          )}
          <div>
            <span className="font-medium text-text-primary">{row.name}</span>
            {row.description && <p className="text-xs text-text-muted line-clamp-1">{row.description}</p>}
          </div>
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', render: (row) => <span className="font-mono text-xs text-text-muted">{row.slug}</span> },
    {
      key: 'actions', header: '', width: '80px', align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton icon={<Pencil />} label="Edit" size="sm" onClick={() => openEdit(row)} />
          <IconButton icon={<Trash2 />} label="Delete" size="sm" className="text-danger hover:bg-danger-subtle" onClick={() => setDeleteTarget(row)} />
        </div>
      ),
    },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Brands</h1>
          <p className="text-sm text-text-muted">{data?.count ?? 0} total brands</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add brand</Button>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search brands…" className="w-64" />

      <div className="admin-surface overflow-hidden">
        <DataTable columns={columns} data={data?.results ?? []} isLoading={isLoading} error={error ? 'Failed to load brands.' : null} onRetry={refetch} rowKey={(r) => r.id} emptyTitle="No brands" />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit brand' : 'New brand'} size="md">
        <div className="space-y-4">
          {/* Logo upload */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">Logo</p>
            {logoPreview ? (
              <div className="relative flex items-center gap-3">
                <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-xl border border-border object-contain bg-white p-1" />
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="rounded-full bg-surface border border-border px-3 py-0.5 text-xs font-medium text-primary hover:bg-primary-light transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Replace
                  </button>
                  {logoFile && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-danger hover:underline"
                      onClick={() => { setLogoFile(null); setLogoPreview(editTarget?.logo ?? null) }}
                    >
                      <X className="h-3 w-3" /> Undo
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex h-20 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-text-muted hover:border-primary hover:text-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Click to upload logo</span>
                <span className="text-xs">PNG, JPEG, WebP</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
          </div>

          <FormField label="Name" htmlFor="brand-name" required>
            <Input id="brand-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Nike" />
          </FormField>

          <FormField label="Description" htmlFor="brand-desc">
            <Textarea id="brand-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief brand description (optional)" rows={3} />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button isLoading={saveMutation.isPending} onClick={() => saveMutation.mutate()} disabled={!form.name.trim()}>
              {editTarget ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))}
        title="Delete brand?" description={`"${deleteTarget?.name}" will be deleted.`}
        confirmLabel="Delete" isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
