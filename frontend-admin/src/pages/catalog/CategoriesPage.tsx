import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Hash, Image as ImageIcon, X } from 'lucide-react'
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
import { Select } from '@/components/ui/Select'
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Category } from '@/types/models'

interface CategoryForm {
  name: string
  description: string
  parentId: string
}

const DEFAULT_FORM: CategoryForm = { name: '', description: '', parentId: '' }

export function CategoriesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CategoryForm>(DEFAULT_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-categories', page, debouncedSearch],
    queryFn: () => catalogService.listCategories({ page, search: debouncedSearch }),
    enabled: isAuthenticated,
  })

  function openCreate() {
    setEditTarget(null)
    setForm(DEFAULT_FORM)
    setImageFile(null)
    setImagePreview(null)
    setShowCreate(true)
  }

  function openEdit(cat: Category) {
    setEditTarget(cat)
    setForm({ name: cat.name, description: cat.description ?? '', parentId: cat.parent?.id ?? '' })
    setImageFile(null)
    setImagePreview(cat.image ?? null)
    setShowCreate(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function buildPayload(): FormData | Partial<Category> {
    if (imageFile) {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      if (form.description.trim()) fd.append('description', form.description.trim())
      if (form.parentId) fd.append('parent', form.parentId)
      fd.append('image', imageFile)
      return fd
    }
    return {
      name: form.name.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.parentId ? { parent: form.parentId as never } : { parent: null as never }),
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload()
      return editTarget
        ? catalogService.updateCategory(String(editTarget.id), payload)
        : catalogService.createCategory(payload)
    },
    onSuccess: () => {
      toast({ title: editTarget ? 'Category updated' : 'Category created', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-categories'] })
      setShowCreate(false)
    },
    onError: () => toast({ title: `Failed to ${editTarget ? 'update' : 'create'} category`, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pk: string) => catalogService.deleteCategory(pk),
    onSuccess: () => {
      toast({ title: 'Category deleted', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-categories'] })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to delete category', variant: 'destructive' }),
  })

  const columns: Column<Category>[] = [
    {
      key: 'name', header: 'Category',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img src={row.image} alt={row.name} className="h-8 w-8 rounded-lg object-cover border border-border" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-subtle"><Hash className="h-4 w-4 text-text-muted" /></div>
          )}
          <div>
            <span className="font-medium text-text-primary">{row.name}</span>
            {row.parent && <p className="text-xs text-text-muted">under {row.parent.name}</p>}
          </div>
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', render: (row) => <span className="font-mono text-xs text-text-muted">{row.slug}</span> },
    { key: 'description', header: 'Description', render: (row) => <span className="text-sm text-text-muted line-clamp-1">{row.description ?? '—'}</span> },
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
  // Build flat parent options from current page (exclude the category being edited)
  const parentOptions = data?.results.filter((c) => c.id !== editTarget?.id) ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Categories</h1>
          <p className="text-sm text-text-muted">{data?.count ?? 0} total categories</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add category</Button>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search categories…" className="w-64" />

      <div className="admin-surface overflow-hidden">
        <DataTable
          columns={columns} data={data?.results ?? []}
          isLoading={isLoading} error={error ? 'Failed to load categories.' : null} onRetry={refetch}
          rowKey={(r) => r.id} emptyTitle="No categories" emptyAction={{ label: 'Add category', onClick: openCreate }}
        />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={editTarget ? 'Edit category' : 'New category'} size="md">
        <div className="space-y-4">
          {/* Image upload */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">Category image</p>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="h-28 w-full rounded-xl border border-border object-cover" />
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    type="button"
                    className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-primary shadow-sm hover:bg-primary-light"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Replace
                  </button>
                  {imageFile && (
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-surface shadow-sm hover:bg-danger-subtle"
                      onClick={() => { setImageFile(null); setImagePreview(editTarget?.image ?? null) }}
                    >
                      <X className="h-3.5 w-3.5 text-danger" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-text-muted hover:border-primary hover:text-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Click to upload image</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
          </div>

          <FormField label="Name" htmlFor="cat-name" required>
            <Input id="cat-name" autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Electronics" />
          </FormField>

          <FormField label="Description" htmlFor="cat-desc">
            <Textarea id="cat-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description (optional)" rows={3} />
          </FormField>

          <FormField label="Parent category" htmlFor="cat-parent" hint="Leave empty for a top-level category.">
            <Select id="cat-parent" value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
              <option value="">— No parent (top-level) —</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button isLoading={saveMutation.isPending} onClick={() => saveMutation.mutate()} disabled={!form.name.trim()}>
              {editTarget ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))}
        title="Delete category?" description={`"${deleteTarget?.name}" and all its data will be deleted.`}
        confirmLabel="Delete" isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
