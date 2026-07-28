import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Hash } from 'lucide-react'
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
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/utils/format'
import type { Category } from '@/types/models'

export function CategoriesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [formName, setFormName] = useState('')
  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-categories', page, debouncedSearch],
    queryFn: () => catalogService.listCategories({ page, search: debouncedSearch }),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => catalogService.createCategory({ name }),
    onSuccess: () => {
      toast({ title: 'Category created', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-categories'] })
      setShowCreate(false)
      setFormName('')
    },
    onError: () => toast({ title: 'Failed to create category', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ pk, name }: { pk: string; name: string }) => catalogService.updateCategory(pk, { name }),
    onSuccess: () => {
      toast({ title: 'Category updated', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-categories'] })
      setEditTarget(null)
    },
    onError: () => toast({ title: 'Failed to update category', variant: 'destructive' }),
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
          <span className="font-medium text-text-primary">{row.name}</span>
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', render: (row) => <span className="font-mono text-xs text-text-muted">{row.slug}</span> },
    { key: 'created', header: 'Created', render: (row) => <span className="text-text-muted">{formatDate(row.created_at)}</span> },
    {
      key: 'actions', header: '', width: '80px', align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton icon={<Pencil />} label="Edit" size="sm" onClick={() => { setEditTarget(row); setFormName(row.name) }} />
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
          <h1 className="text-lg font-semibold text-text-primary">Categories</h1>
          <p className="text-sm text-text-muted">{data?.count ?? 0} total categories</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setFormName('') }}><Plus className="h-4 w-4" /> Add category</Button>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search categories…" className="w-64" />

      <div className="admin-surface overflow-hidden">
        <DataTable
          columns={columns} data={data?.results ?? []}
          isLoading={isLoading} error={error ? 'Failed to load categories.' : null} onRetry={refetch}
          rowKey={(r) => r.id} emptyTitle="No categories" emptyAction={{ label: 'Add category', onClick: () => setShowCreate(true) }}
        />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New category" size="sm">
        <div className="space-y-4">
          <FormField label="Name" htmlFor="cat-name" required>
            <Input id="cat-name" autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Electronics" />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button isLoading={createMutation.isPending} onClick={() => createMutation.mutate(formName)} disabled={!formName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit category" size="sm">
        <div className="space-y-4">
          <FormField label="Name" htmlFor="cat-edit-name" required>
            <Input id="cat-edit-name" autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button isLoading={updateMutation.isPending} onClick={() => editTarget && updateMutation.mutate({ pk: String(editTarget.id), name: formName })} disabled={!formName.trim()}>Save</Button>
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
