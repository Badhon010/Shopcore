import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react'
import { catalogService } from '@/services/api/catalog.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/contexts/ToastContext'
import type { Banner } from '@/types/models'

export function BannersPage() {
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-banners', page],
    queryFn: () => catalogService.listBanners({ page }),
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
      key: 'image', header: 'Banner',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img src={row.image} alt={row.title} className="h-10 w-20 rounded-lg object-cover border border-border" />
          ) : (
            <div className="flex h-10 w-20 items-center justify-center rounded-lg bg-bg-subtle"><ImageIcon className="h-4 w-4 text-text-muted" /></div>
          )}
          <div>
            <p className="font-medium text-text-primary">{row.title}</p>
            {row.subtitle && <p className="text-xs text-text-muted">{row.subtitle}</p>}
          </div>
        </div>
      ),
    },
    { key: 'is_active', header: 'Status', render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'order', header: 'Order', align: 'right', render: (row) => <span className="text-text-muted">{row.display_order ?? '—'}</span> },
    {
      key: 'actions', header: '', width: '60px', align: 'right',
      render: (row) => <IconButton icon={<Trash2 />} label="Delete" size="sm" className="text-danger hover:bg-danger-subtle" onClick={() => setDeleteTarget(row)} />,
    },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Banners</h1>
          <p className="text-sm text-text-muted">{data?.count ?? 0} banners</p>
        </div>
        <Button disabled><Plus className="h-4 w-4" /> Add banner</Button>
      </div>

      <div className="admin-surface overflow-hidden">
        <DataTable columns={columns} data={data?.results ?? []} isLoading={isLoading} error={error ? 'Failed to load banners.' : null} onRetry={refetch} rowKey={(r) => r.id} emptyTitle="No banners" />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(String(deleteTarget.id))} title="Delete banner?" description="This banner will be removed from your store." confirmLabel="Delete" isLoading={deleteMutation.isPending} />
    </div>
  )
}
