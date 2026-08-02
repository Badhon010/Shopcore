import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Download, Package, ShoppingCart, Users,
  Star, Mail, Archive,
} from 'lucide-react'
import { exportsService, type ExportFormat } from '@/services/api/exports.service'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/contexts/ToastContext'

interface ExportEntry {
  key: keyof typeof exportsService
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const EXPORTS: ExportEntry[] = [
  { key: 'exportProducts',   label: 'Products',     description: 'All products with status, pricing, and category', icon: Package },
  { key: 'exportOrders',     label: 'Orders',       description: 'All orders with status, totals, and customer email', icon: ShoppingCart },
  { key: 'exportCustomers',  label: 'Customers',    description: 'All registered customers with activity data', icon: Users },
  { key: 'exportSubscribers',label: 'Subscribers',  description: 'Newsletter subscriber list', icon: Mail },
  { key: 'exportReviews',    label: 'Reviews',      description: 'All product reviews with approval status', icon: Star },
  { key: 'exportInventory',  label: 'Inventory',    description: 'Current stock levels per SKU', icon: Archive },
]

function triggerDownload(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Delay revocation so the browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 150)
}

export function ExportsPage() {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const { toast } = useToast()
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  const exportMutation = useMutation({
    mutationFn: ({ key }: { key: keyof typeof exportsService }) =>
      exportsService[key](format),
    onSuccess: (blob, { key }) => {
      const label = EXPORTS.find((e) => e.key === key)?.label ?? 'export'
      triggerDownload(blob, `${label.toLowerCase()}_export.${format}`)
      toast({ title: `${label} exported`, variant: 'success' })
      setLoadingKey(null)
    },
    onError: () => {
      toast({ title: 'Export failed', variant: 'destructive' })
      setLoadingKey(null)
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Data Exports</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Download your store data as CSV or Excel for backup, analysis, or migration.
        </p>
      </div>

      {/* Format picker */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-secondary">Export format:</span>
        <Select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="w-32"
        >
          <option value="csv">CSV</option>
          <option value="xlsx">Excel</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map(({ key, label, description, icon: Icon }) => (
          <Card key={key} className="flex flex-col justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">{label}</p>
                <p className="mt-0.5 text-xs text-text-muted">{description}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-center"
              isLoading={loadingKey === key && exportMutation.isPending}
              onClick={() => {
                setLoadingKey(key)
                exportMutation.mutate({ key })
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Export {label}
            </Button>
          </Card>
        ))}
      </div>

      <p className="text-xs text-text-muted">
        Exports include all records regardless of current page/filter settings. Large datasets may take a few seconds to generate.
      </p>
    </div>
  )
}
