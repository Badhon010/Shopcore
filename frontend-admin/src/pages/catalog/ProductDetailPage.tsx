import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Skeleton } from '@/components/feedback/Skeleton'
import { catalogService } from '@/services/api/catalog.service'
import { formatCurrency } from '@/utils/format'
import type { ProductStatus } from '@/types/models'

type BadgeVariant = 'secondary' | 'success' | 'danger'
const statusConfig: Record<ProductStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  ACTIVE: { label: 'Active', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'danger' },
}

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', slug],
    queryFn: () => catalogService.getProduct(slug!),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!product) return null

  const statusCfg = statusConfig[product.status]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/catalog/products')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Breadcrumbs items={[
          { label: 'Dashboard', to: '/' },
          { label: 'Products', to: '/catalog/products' },
          { label: product.name },
        ]} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-text-primary">{product.name}</h1>
          <div className="mt-1 flex items-center gap-3">
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            {product.is_featured && <Badge variant="accent">Featured</Badge>}
            {product.sku && (
              <span className="font-mono text-body-sm text-text-muted">{product.sku}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-heading-md font-bold text-text-primary">{formatCurrency(product.base_price)}</p>
          {product.compare_at_price && (
            <p className="text-body-sm text-text-muted line-through">{formatCurrency(product.compare_at_price)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Images */}
          <Card>
            <CardTitle>Images</CardTitle>
            {product.images?.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {product.images.map((img) => (
                  <img
                    key={img.id}
                    src={img.image}
                    alt={img.alt_text || product.name}
                    className="h-24 w-24 rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 flex h-24 items-center justify-center rounded-lg bg-bg-subtle">
                <Package className="h-8 w-8 text-text-muted" />
              </div>
            )}
          </Card>

          {/* Description */}
          {(product.description || product.short_description) && (
            <Card>
              <CardTitle>Description</CardTitle>
              {product.short_description && (
                <p className="mt-3 text-body-sm font-medium text-text-primary">{product.short_description}</p>
              )}
              {product.description && (
                <p className="mt-2 text-body-sm text-text-secondary whitespace-pre-line">{product.description}</p>
              )}
            </Card>
          )}

          {/* Variants */}
          {product.variants?.length > 0 && (
            <Card noPadding>
              <div className="px-6 py-5">
                <CardTitle>Variants</CardTitle>
              </div>
              <table className="w-full text-left text-body-sm border-t border-border">
                <thead>
                  <tr className="bg-bg-subtle">
                    <th className="px-6 py-3 text-overline font-semibold uppercase text-text-muted tracking-wide">SKU</th>
                    <th className="px-4 py-3 text-overline font-semibold uppercase text-text-muted tracking-wide">Name</th>
                    <th className="px-4 py-3 text-right text-overline font-semibold uppercase text-text-muted tracking-wide">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {product.variants.map((v) => (
                    <tr key={v.id}>
                      <td className="px-6 py-3 font-mono text-text-muted">{v.sku}</td>
                      <td className="px-4 py-3 text-text-primary">{v.name}</td>
                      <td className="px-4 py-3 text-right font-medium text-text-primary">{v.price ? formatCurrency(v.price) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardTitle>Details</CardTitle>
            <dl className="mt-4 space-y-3 text-body-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Category</dt>
                <dd className="font-medium text-text-primary">{product.category_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Brand</dt>
                <dd className="font-medium text-text-primary">{product.brand_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Weight</dt>
                <dd className="font-medium text-text-primary">{product.weight_kg ? `${product.weight_kg} kg` : '—'}</dd>
              </div>
              {product.average_rating !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">Rating</dt>
                  <dd className="font-medium text-text-primary">
                    {product.average_rating.toFixed(1)} ★ ({product.review_count} reviews)
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
