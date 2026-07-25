import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Star, Plus, Pencil, Trash2 } from 'lucide-react'
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
import type { Brand } from '@/types/models'
import type { ApiError } from '@/types/api'

const brandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
})
type BrandFormData = z.infer<typeof brandSchema>

export function BrandsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-brands', page, search],
    queryFn: () => catalogService.getBrands({ page, page_size: 20, search: search || undefined }),
  })

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: '', slug: '', description: '' },
  })

  const openAdd = () => { setEditing(null); form.reset(); setModalOpen(true) }
  const openEdit = (b: Brand) => {
    setEditing(b)
    form.reset({ name: b.name, slug: b.slug, description: b.description ?? '' })
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (d: BrandFormData) =>
      editing ? catalogService.updateBrand(editing.id, d) : catalogService.createBrand(d),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-brands'] })
      toast({ title: editing ? 'Brand updated' : 'Brand created', variant: 'success' })
      setModalOpen(false)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => catalogService.deleteBrand(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-brands'] })
      toast({ title: 'Brand deleted', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const columns: Column<Brand>[] = [
    {
      key: 'logo',
      header: 'Logo',
      headerClassName: 'w-14',
      cell: (b) =>
        b.logo ? (
          <img src={b.logo} alt={b.name} className="h-10 w-10 rounded-md object-contain" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-subtle text-body-sm font-bold text-text-muted">
            {b.name.charAt(0).toUpperCase()}
          </div>
        ),
    },
    {
      key: 'name',
      header: 'Brand',
      cell: (b) => <span className="font-medium text-text-primary">{b.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      cell: (b) => <span className="font-mono text-body-sm text-text-muted">{b.slug}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-28',
      cell: (b) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); openEdit(b) }} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-subtle" onClick={(e) => { e.stopPropagation(); setDeleteTarget(b) }} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-text-primary">Brands</h1>
          <p className="mt-0.5 text-body-sm text-text-secondary">{data?.count ?? 0} brands</p>
        </div>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4" aria-hidden /> Add Brand</Button>
      </div>

      <Card noPadding>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <SearchBar
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onClear={() => { setSearch(''); setPage(1) }}
            placeholder="Search brands…"
            containerClassName="w-full max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          keyExtractor={(b) => b.id}
          emptyIcon={Star}
          emptyTitle="No brands yet"
          emptyDescription="Add your first brand."
        />
        {data && data.count > 20 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Edit Brand' : 'Add Brand'} size="md">
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <FormField label="Name" required error={form.formState.errors.name?.message}>
            {(id, errorId) => <Input id={id} errorId={errorId} error={!!form.formState.errors.name} placeholder="Brand name" {...form.register('name')} />}
          </FormField>
          <FormField label="Slug" helperText="Auto-generated if left blank">
            {(id) => <Input id={id} placeholder="brand-slug" {...form.register('slug')} />}
          </FormField>
          <FormField label="Description">
            {(id) => <Textarea id={id} placeholder="Optional description…" rows={3} {...form.register('description')} />}
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" isLoading={saveMutation.isPending} loadingText="Saving…">{editing ? 'Save Changes' : 'Create Brand'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Brand"
        description={`Delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
