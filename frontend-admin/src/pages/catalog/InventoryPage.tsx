import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PackageSearch, RefreshCw } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Tabs } from '@/components/ui/Tabs'
import { StatCard } from '@/components/ui/StatCard'
import { inventoryService } from '@/services/api/inventory.service'
import { useToast } from '@/contexts/ToastContext'
import { formatDateTime } from '@/utils/format'
import type { StockItem } from '@/types/models'
import type { ApiError } from '@/types/api'

const restockSchema = z.object({
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  reference: z.string().optional(),
  note: z.string().optional(),
})
type RestockFormData = z.infer<typeof restockSchema>

const TABS = [
  { value: 'all', label: 'All Stock' },
  { value: 'low', label: 'Low Stock' },
]

export function InventoryPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [restockTarget, setRestockTarget] = useState<StockItem | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stock', page, search, tab],
    queryFn: () =>
      inventoryService.getStock({
        page,
        page_size: 20,
        search: search || undefined,
        is_low_stock: tab === 'low' ? true : undefined,
      }),
  })

  const lowStockQuery = useQuery({
    queryKey: ['admin-low-stock-count'],
    queryFn: () => inventoryService.getStock({ is_low_stock: true, page_size: 1 }),
    staleTime: 30_000,
  })

  const form = useForm<RestockFormData>({
    resolver: zodResolver(restockSchema),
    defaultValues: { quantity: 1, reference: '', note: '' },
  })

  const restockMutation = useMutation({
    mutationFn: (d: RestockFormData) =>
      inventoryService.restock(restockTarget!.id, d.quantity, d.reference, d.note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-stock'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-low-stock-count'] })
      toast({ title: 'Stock updated', variant: 'success' })
      setRestockTarget(null)
      form.reset()
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const columns: Column<StockItem>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (s) => <span className="font-medium text-text-primary">{s.product_name}</span>,
    },
    {
      key: 'sku',
      header: 'SKU',
      cell: (s) => <span className="font-mono text-body-sm text-text-muted">{s.variant_sku}</span>,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      cell: (s) => <span className="text-text-secondary">{s.warehouse_name}</span>,
    },
    {
      key: 'onhand',
      header: 'On Hand',
      cell: (s) => <span className="font-medium text-text-primary">{s.quantity_on_hand}</span>,
    },
    {
      key: 'reserved',
      header: 'Reserved',
      cell: (s) => <span className="text-text-secondary">{s.quantity_reserved}</span>,
    },
    {
      key: 'available',
      header: 'Available',
      cell: (s) => <span className="font-semibold text-text-primary">{s.quantity_available}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <Badge variant={s.is_low_stock ? 'danger' : 'success'} dot>
          {s.is_low_stock ? 'Low Stock' : 'In Stock'}
        </Badge>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (s) => <span className="text-body-sm text-text-muted">{formatDateTime(s.updated_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-24',
      cell: (s) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setRestockTarget(s); form.reset({ quantity: 1, reference: '', note: '' }) }}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Restock
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-text-primary">Inventory</h1>
          <p className="mt-0.5 text-body-sm text-text-secondary">Manage stock levels across warehouses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total SKUs"
          value={(data?.count ?? 0).toLocaleString()}
          icon={PackageSearch}
          isLoading={isLoading}
        />
        <StatCard
          title="Low Stock Items"
          value={(lowStockQuery.data?.count ?? 0).toLocaleString()}
          icon={PackageSearch}
          variant={lowStockQuery.data && lowStockQuery.data.count > 0 ? 'warning' : 'default'}
          isLoading={lowStockQuery.isLoading}
        />
      </div>

      <Card noPadding>
        <div className="border-b border-border">
          <Tabs tabs={TABS} value={tab} onChange={(v) => { setTab(v); setPage(1) }} className="px-4" />
        </div>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <SearchBar
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onClear={() => { setSearch(''); setPage(1) }}
            placeholder="Search by product or SKU…"
            containerClassName="w-full max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          keyExtractor={(s) => s.id}
          emptyIcon={PackageSearch}
          emptyTitle={tab === 'low' ? 'No low-stock items' : 'No stock items found'}
          emptyDescription={tab === 'low' ? 'All items are well-stocked.' : 'Stock items appear here once products have variants.'}
        />
        {data && data.count > 20 && (
          <div className="border-t border-border px-4 py-4">
            <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal
        open={!!restockTarget}
        onOpenChange={(o) => { if (!o) setRestockTarget(null) }}
        title={`Restock: ${restockTarget?.product_name}`}
        description={`SKU: ${restockTarget?.variant_sku} — Current available: ${restockTarget?.quantity_available}`}
        size="sm"
      >
        <form onSubmit={form.handleSubmit((d) => restockMutation.mutate(d))} className="space-y-4">
          <FormField label="Quantity to Add" required error={form.formState.errors.quantity?.message}>
            {(id, errorId) => (
              <Input id={id} errorId={errorId} error={!!form.formState.errors.quantity} type="number" min="1" {...form.register('quantity')} />
            )}
          </FormField>
          <FormField label="Reference">
            {(id) => <Input id={id} placeholder="e.g. PO-2024-001" {...form.register('reference')} />}
          </FormField>
          <FormField label="Note">
            {(id) => <Textarea id={id} placeholder="Optional note…" rows={2} {...form.register('note')} />}
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setRestockTarget(null)}>Cancel</Button>
            <Button type="submit" size="sm" isLoading={restockMutation.isPending} loadingText="Restocking…">Confirm Restock</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
