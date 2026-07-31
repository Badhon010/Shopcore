import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Package, SlidersHorizontal, Settings2, History } from 'lucide-react'
import { inventoryService } from '@/services/api/inventory.service'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useDebounce } from '@/utils/useDebounce'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime } from '@/utils/format'
import type { StockItem } from '@/types/models'
import type { ApiError } from '@/types/api'

export function InventoryPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [warehouseFilter, setWarehouseFilter] = useState('')

  // Adjust modal
  const [adjustTarget, setAdjustTarget] = useState<StockItem | null>(null)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  // Threshold modal
  const [thresholdTarget, setThresholdTarget] = useState<StockItem | null>(null)
  const [thresholdValue, setThresholdValue] = useState('')

  // Movements modal
  const [movementsTarget, setMovementsTarget] = useState<StockItem | null>(null)
  const [movementsPage, setMovementsPage] = useState(1)

  // Restock modal
  const [restockTarget, setRestockTarget] = useState<StockItem | null>(null)
  const [restockQty, setRestockQty] = useState('')

  const debouncedSearch = useDebounce(search)
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryService.listWarehouses(),
    staleTime: 10 * 60_000,
    enabled: isAuthenticated,
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', page, debouncedSearch, lowStockOnly, warehouseFilter],
    queryFn: () =>
      inventoryService.listStock({
        page,
        search: debouncedSearch,
        low_stock_only: lowStockOnly || undefined,
        warehouse: warehouseFilter || undefined,
      }),
    enabled: isAuthenticated,
  })

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements', movementsTarget?.id, movementsPage],
    queryFn: () =>
      inventoryService.getMovements(String(movementsTarget!.id), { page: movementsPage }),
    enabled: isAuthenticated && !!movementsTarget,
  })

  const adjustMutation = useMutation({
    mutationFn: ({ pk, delta, reason }: { pk: string; delta: number; reason?: string }) =>
      inventoryService.adjust(pk, { quantity_delta: delta, reason }),
    onSuccess: () => {
      toast({ title: 'Stock adjusted', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['inventory'] })
      setAdjustTarget(null)
    },
    onError: (err) => {
      const apiErr = err as unknown as ApiError
      toast({ title: 'Adjustment failed', description: apiErr.message, variant: 'destructive' })
    },
  })

  const thresholdMutation = useMutation({
    mutationFn: ({ pk, threshold }: { pk: string; threshold: number }) =>
      inventoryService.updateThreshold(pk, threshold),
    onSuccess: () => {
      toast({ title: 'Threshold updated', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['inventory'] })
      setThresholdTarget(null)
    },
    onError: () => toast({ title: 'Failed to update threshold', variant: 'destructive' }),
  })

  const restockMutation = useMutation({
    mutationFn: ({ pk, quantity }: { pk: string; quantity: number }) =>
      inventoryService.restock(pk, quantity),
    onSuccess: () => {
      toast({ title: 'Stock restocked', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['inventory'] })
      setRestockTarget(null)
      setRestockQty('')
    },
    onError: (err) => {
      const apiErr = err as unknown as ApiError
      toast({ title: 'Restock failed', description: apiErr.message, variant: 'destructive' })
    },
  })

  const columns: Column<StockItem>[] = [
    {
      key: 'product',
      header: 'Product / SKU',
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.product_name}</p>
          <p className="font-mono text-xs text-text-muted">{row.variant_sku}</p>
        </div>
      ),
    },
    {
      key: 'on_hand',
      header: 'On hand',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.is_out_of_stock ? (
            <Badge variant="danger">Out of stock</Badge>
          ) : row.is_low_stock ? (
            <Badge variant="warning">{row.quantity_on_hand}</Badge>
          ) : (
            <span className="font-medium text-text-primary">{row.quantity_on_hand}</span>
          )}
        </div>
      ),
    },
    {
      key: 'reserved',
      header: 'Reserved',
      align: 'right',
      render: (row) => <span className="text-text-muted">{row.quantity_reserved}</span>,
    },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-text-secondary">{row.quantity_available}</span>
      ),
    },
    {
      key: 'threshold',
      header: 'Alert at',
      align: 'right',
      render: (row) => <span className="text-text-muted">{row.low_stock_threshold}</span>,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (row) => <span className="text-text-secondary">{row.warehouse_name ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={<SlidersHorizontal />}
            label="Adjust stock"
            size="sm"
            className="text-primary hover:bg-primary-light"
            onClick={() => {
              setAdjustTarget(row)
              setAdjustDelta('')
              setAdjustReason('')
            }}
          />
          <IconButton
            icon={<Settings2 />}
            label="Set low-stock threshold"
            size="sm"
            className="text-text-muted hover:bg-background-subtle"
            onClick={() => {
              setThresholdTarget(row)
              setThresholdValue(String(row.low_stock_threshold))
            }}
          />
          <IconButton
            icon={<Package />}
            label="Restock"
            size="sm"
            className="text-success hover:bg-success-subtle"
            onClick={() => {
              setRestockTarget(row)
              setRestockQty('')
            }}
          />
          <IconButton
            icon={<History />}
            label="Movement history"
            size="sm"
            className="text-text-muted hover:bg-background-subtle"
            onClick={() => {
              setMovementsTarget(row)
              setMovementsPage(1)
            }}
          />
        </div>
      ),
    },
  ]

  const totalPages = Math.ceil((data?.count ?? 0) / 20)
  const movementsTotalPages = Math.ceil((movements?.count ?? 0) / 20)

  const adjustDeltaNum = parseInt(adjustDelta)
  const adjustValid = adjustDelta !== '' && !isNaN(adjustDeltaNum) && adjustDeltaNum !== 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Inventory</h1>
        <p className="text-sm text-text-muted">{data?.count ?? 0} SKUs tracked</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search SKU or product…"
          className="w-64"
        />
        {warehousesData && warehousesData.length > 0 && (
          <select
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={warehouseFilter}
            onChange={(e) => {
              setWarehouseFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All warehouses</option>
            {warehousesData.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name}
              </option>
            ))}
          </select>
        )}
        <Button
          variant={lowStockOnly ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setLowStockOnly((p) => !p)
            setPage(1)
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Low stock only
        </Button>
      </div>

      <div className="admin-surface overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          error={error ? 'Failed to load inventory.' : null}
          onRetry={refetch}
          rowKey={(r) => r.variant_sku}
          emptyTitle="No inventory items"
          emptyDescription="Stock items appear here once products with variants are created."
        />
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-border p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* ── Adjust stock modal ─────────────────────────────── */}
      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust stock — ${adjustTarget?.product_name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background-subtle p-3 text-sm">
            <p className="text-text-secondary">
              On hand:{' '}
              <strong className="text-text-primary">{adjustTarget?.quantity_on_hand}</strong>
              {'  ·  '}Available:{' '}
              <strong className="text-text-primary">{adjustTarget?.quantity_available}</strong>
            </p>
          </div>
          <FormField
            label="Quantity delta"
            hint="Positive to add stock (e.g. +50). Negative to remove (e.g. -10)."
            required
          >
            <Input
              type="number"
              placeholder="e.g. 50 or -10"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
              autoFocus
            />
          </FormField>
          <FormField label="Reason (optional)">
            <Input
              placeholder="e.g. Supplier delivery, Damaged goods…"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setAdjustTarget(null)}>
              Cancel
            </Button>
            <Button
              isLoading={adjustMutation.isPending}
              disabled={!adjustValid}
              onClick={() =>
                adjustTarget &&
                adjustMutation.mutate({
                  pk: String(adjustTarget.id),
                  delta: adjustDeltaNum,
                  reason: adjustReason.trim() || undefined,
                })
              }
            >
              Save adjustment
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Threshold modal ────────────────────────────────── */}
      <Modal
        open={!!thresholdTarget}
        onClose={() => setThresholdTarget(null)}
        title={`Low-stock threshold — ${thresholdTarget?.product_name}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            A warning badge appears on this SKU when quantity on hand drops to or below this
            number.
          </p>
          <FormField label="Alert threshold" required>
            <Input
              type="number"
              min="0"
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              autoFocus
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setThresholdTarget(null)}>
              Cancel
            </Button>
            <Button
              isLoading={thresholdMutation.isPending}
              disabled={thresholdValue === '' || parseInt(thresholdValue) < 0}
              onClick={() =>
                thresholdTarget &&
                thresholdMutation.mutate({
                  pk: String(thresholdTarget.id),
                  threshold: parseInt(thresholdValue),
                })
              }
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Restock modal ──────────────────────────────────── */}
      <Modal
        open={!!restockTarget}
        onClose={() => setRestockTarget(null)}
        title={`Restock — ${restockTarget?.product_name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background-subtle p-3 text-sm">
            <p className="text-text-secondary">
              Current on hand:{' '}
              <strong className="text-text-primary">{restockTarget?.quantity_on_hand}</strong>
            </p>
          </div>
          <FormField
            label="Quantity to add"
            hint="Sets quantity to add as a positive restock (e.g. 100)."
            required
          >
            <Input
              type="number"
              min="1"
              placeholder="e.g. 100"
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              autoFocus
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setRestockTarget(null)}>
              Cancel
            </Button>
            <Button
              isLoading={restockMutation.isPending}
              disabled={restockQty === '' || parseInt(restockQty) < 1}
              onClick={() =>
                restockTarget &&
                restockMutation.mutate({
                  pk: String(restockTarget.id),
                  quantity: parseInt(restockQty),
                })
              }
            >
              Restock
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Movement history modal ─────────────────────────── */}
      <Modal
        open={!!movementsTarget}
        onClose={() => setMovementsTarget(null)}
        title={`Movement history — ${movementsTarget?.product_name}`}
        size="lg"
      >
        <div className="space-y-3">
          {movementsLoading ? (
            <div className="py-10 text-center text-sm text-text-muted">Loading…</div>
          ) : !movements?.results.length ? (
            <div className="py-10 text-center text-sm text-text-muted">
              No movement history for this SKU.
            </div>
          ) : (
            <div className="divide-y divide-border-light overflow-hidden rounded-xl border border-border">
              {movements.results.map((mv) => (
                <div key={mv.id} className="flex items-start justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">
                      <span
                        className={mv.quantity_delta > 0 ? 'text-success' : 'text-danger'}
                      >
                        {mv.quantity_delta > 0 ? '+' : ''}
                        {mv.quantity_delta}
                      </span>
                      {mv.reason ? (
                        <span className="ml-1.5 font-normal text-text-secondary">
                          — {mv.reason}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {mv.quantity_before} → {mv.quantity_after}
                      {mv.created_by ? ` · ${mv.created_by}` : ''}
                      {' · '}
                      {formatDateTime(mv.created_at)}
                    </p>
                  </div>
                  <Badge variant={mv.quantity_delta > 0 ? 'success' : 'danger'}>
                    {mv.movement_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {movementsTotalPages > 1 && (
            <div className="flex justify-end pt-1">
              <Pagination
                page={movementsPage}
                totalPages={movementsTotalPages}
                onPageChange={setMovementsPage}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
