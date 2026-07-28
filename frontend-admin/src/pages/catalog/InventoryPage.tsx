import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { inventoryService } from '@/services/api/inventory.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import type { StockItem } from '@/types/models'

export function InventoryPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [restockTarget, setRestockTarget] = useState<StockItem | null>(null)
  const [restockQty, setRestockQty] = useState('0')
  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', page, debouncedSearch, lowStockOnly],
    queryFn: () => inventoryService.listStock({ page, search: debouncedSearch, low_stock_only: lowStockOnly || undefined }),
  })

  const restockMutation = useMutation({
    mutationFn: ({ pk, qty }: { pk: string; qty: number }) => inventoryService.restock(pk, qty),
    onSuccess: () => {
      toast({ title: 'Stock updated', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['inventory'] })
      setRestockTarget(null)
    },
    onError: () => toast({ title: 'Restock failed', variant: 'destructive' }),
  })

  const columns: Column<StockItem>[] = [
    { key: 'product', header: 'Product / SKU', render: (row) => <div><p className="font-medium text-text-primary">{row.product_name}</p><p className="text-xs text-text-muted font-mono">{row.sku}</p></div> },
    {
      key: 'qty', header: 'Quantity', align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.quantity === 0 ? (
            <Badge variant="danger">Out of stock</Badge>
          ) : row.quantity <= (row.low_stock_threshold ?? 5) ? (
            <Badge variant="warning">{row.quantity}</Badge>
          ) : (
            <span className="font-medium text-text-primary">{row.quantity}</span>
          )}
        </div>
      ),
    },
    { key: 'threshold', header: 'Low stock at', align: 'right', render: (row) => <span className="text-text-muted">{row.low_stock_threshold ?? 5}</span> },
    { key: 'warehouse', header: 'Warehouse', render: (row) => <span className="text-text-secondary">{row.warehouse ?? '—'}</span> },
    {
      key: 'actions', header: '', width: '80px', align: 'right',
      render: (row) => <Button size="sm" variant="secondary" onClick={() => { setRestockTarget(row); setRestockQty('0') }}><RefreshCw className="h-3.5 w-3.5" /> Restock</Button>,
    },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Inventory</h1>
        <p className="text-sm text-text-muted">{data?.count ?? 0} SKUs tracked</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search SKU or product…" className="w-64" />
        <Button variant={lowStockOnly ? 'primary' : 'secondary'} size="sm" onClick={() => { setLowStockOnly((p) => !p); setPage(1) }}>
          <AlertTriangle className="h-3.5 w-3.5" /> Low stock only
        </Button>
      </div>

      <div className="admin-surface overflow-hidden">
        <DataTable columns={columns} data={data?.results ?? []} isLoading={isLoading} error={error ? 'Failed to load inventory.' : null} onRetry={refetch} rowKey={(r) => r.sku} emptyTitle="No inventory items" />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal open={!!restockTarget} onClose={() => setRestockTarget(null)} title={`Restock: ${restockTarget?.product_name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Current quantity: <strong>{restockTarget?.quantity}</strong></p>
          <FormField label="Quantity to add" required>
            <Input type="number" min="1" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRestockTarget(null)}>Cancel</Button>
            <Button
              isLoading={restockMutation.isPending}
              disabled={!restockQty || parseInt(restockQty) <= 0}
              onClick={() => restockTarget && restockMutation.mutate({ pk: String(restockTarget.id), qty: parseInt(restockQty) })}
            >Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
