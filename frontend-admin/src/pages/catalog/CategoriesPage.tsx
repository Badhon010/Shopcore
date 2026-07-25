import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { catalogService } from '@/services/api/catalog.service'
import { useToast } from '@/contexts/ToastContext'
import type { Category } from '@/types/models'
import type { ApiError } from '@/types/api'

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  display_order: z.coerce.number().default(0),
})
type CategoryFormData = z.infer<typeof categorySchema>

export function CategoriesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories', page, search],
    queryFn: () => catalogService.getCategories({ page, page_size: 20, search: search || undefined }),
  })

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '', description: '', display_order: 0 },
  })

  const openAdd = () => { setEditing(null); form.reset({ name: '', slug: '', description: '', display_order: 0 }); setModalOpen(true) }
  const openEdit = (cat: Category) => {
    setEditing(cat)
    form.reset({ name: cat.name, slug: cat.slug, description: cat.description ?? '', display_order: cat.display_order })
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (d: CategoryFormData) =>
      editing ? catalogService.updateCategory(editing.id, d) : catalogService.createCategory(d),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      toast({ title: editing ? 'Category updated' : 'Category created', variant: 'success' })
      setModalOpen(false)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => catalogService.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      toast({ title: 'Category deleted', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (c) => <span className="font-medium text-text-primary">{c.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      cell: (c) => <span className="font-mono text-body-sm text-text-muted">{c.slug}</span>,
    },
    {
      key: 'parent',
      header: 'Parent',
      cell: (c) => <span className="text-text-secondary">{c.parent ? String(c.parent) : '—'}</span>,
    },
    {
      key: 'order',
      header: 'Order',
      cell: (c) => <span className="text-text-secondary">{c.display_order}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-28',
      cell: (c) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); openEdit(c) }} aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-subtle hover:text-danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }} aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-text-primary">Categories</h1>
          <p className="mt-0.5 text-body-sm text-text-secondary">{data?.count ?? 0} categories</p>
        </div>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4" aria-hidden /> Add Category</Button>
      </div>

      <Card noPadding>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <SearchBar
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onClear={() => { setSearch(''); setPage(1) }}
            placeholder="Search categories…"
            containerClassName="w-full max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          keyExtractor={(c) => c.id}
          emptyIcon={Tag}
          emptyTitle="No categories"
          emptyDescription="Create your first category."
        />
        {data && data.count > 20 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Edit Category' : 'Add Category'} size="md">
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <FormField label="Name" required error={form.formState.errors.name?.message}>
            {(id, errorId) => (
              <Input id={id} errorId={errorId} error={!!form.formState.errors.name} placeholder="Category name" {...form.register('name')} />
            )}
          </FormField>
          <FormField label="Slug" helperText="Auto-generated if left blank">
            {(id) => <Input id={id} placeholder="category-slug" {...form.register('slug')} />}
          </FormField>
          <FormField label="Display Order">
            {(id) => <Input id={id} type="number" {...form.register('display_order')} />}
          </FormField>
          <FormField label="Description">
            {(id) => <Textarea id={id} placeholder="Optional description…" rows={3} {...form.register('description')} />}
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" isLoading={saveMutation.isPending} loadingText="Saving…">{editing ? 'Save Changes' : 'Create Category'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Category"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
