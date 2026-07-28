import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
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
import type { Brand } from '@/types/models'

export function BrandsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<Brand | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [formName, setFormName] = useState('')
  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-brands', page, debouncedSearch],
    queryFn: () => catalogService.listBrands({ page, search: debouncedSearch }),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => catalogService.createBrand({ name }),
    onSuccess: () => {
      toast({ title: 'Brand created', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-brands'] })
      setShowCreate(false); setFormName('')
    },
    onError: () => toast({ title: 'Failed to create brand', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ pk, name }: { pk: string; name: string }) => catalogService.updateBrand(pk, { name }),
    onSuccess: () => {
      toast({ title: 'Brand updated', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-brands'] })
      setEditTarget(null)
    },
    onError: () => toast({ title: 'Failed to update brand', variant: 'destructive' }),
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
          <h1 className="text-lg font-semibold text-text-primary">Brands</h1>
          <p className="text-sm text-text-muted">{data?.count ?? 0} total brands</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setFormName('') }}><Plus className="h-4 w-4" /> Add brand</Button>
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New brand" size="sm">
        <div className="space-y-4">
          <FormField label="Name" required><Input autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} /></FormField>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button isLoading={createMutation.isPending} onClick={() => createMutation.mutate(formName)} disabled={!formName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit brand" size="sm">
        <div className="space-y-4">
          <FormField label="Name" required><Input autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} /></FormField>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button isLoading={updateMutation.isPending} onClick={() => editTarget && updateMutation.mutate({ pk: String(editTarget.id), name: formName })} disabled={!formName.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))} title="Delete brand?" description={`"${deleteTarget?.name}" will be deleted.`} confirmLabel="Delete" isLoading={deleteMutation.isPending} />
    </div>
  )
}
