import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Save, Plus, Trash2, Star, StarOff,
  Upload, Image as ImageIcon, Pencil,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { catalogService } from '@/services/api/catalog.service'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Tabs } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/feedback/Skeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { applyServerErrors } from '@/services/api/axiosClient'
import { formatCurrency } from '@/utils/format'
import { ROUTES } from '@/constants/routes'
import type { Attribute, ProductVariant, ProductImage } from '@/types/models'
import type { ApiError } from '@/types/api'

// ── Detail form schema ────────────────────────────────────────
const detailSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  short_description: z.string().optional(),
  base_price: z.coerce.number({ invalid_type_error: 'Price is required' }).positive('Price must be a positive number'),
  compare_at_price: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().positive('Must be a positive number').nullable().optional()
  ),
  sku: z.string().optional(),
  weight_kg: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().positive('Must be a positive number').nullable().optional()
  ),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  category: z.coerce.number({ invalid_type_error: 'Category is required' }).min(1, 'Please select a category'),
  brand: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable().optional()
  ),
  is_featured: z.boolean().default(false),
  meta_title: z.string().max(70, 'Keep under 70 characters for best SEO results').optional(),
  meta_description: z.string().max(160, 'Keep under 160 characters for best SEO results').optional(),
}).refine(
  (data) => {
    if (data.compare_at_price != null && data.compare_at_price <= data.base_price) return false
    return true
  },
  { message: 'Compare-at price must be greater than the base price', path: ['compare_at_price'] }
)
type DetailFormValues = z.infer<typeof detailSchema>

// ── Variant form schema ───────────────────────────────────────
const variantSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  price_override: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().positive('Must be a positive number').nullable().optional()
  ),
  is_active: z.boolean().default(true),
  attribute_values: z.array(z.number()).default([]),
})
type VariantFormValues = z.infer<typeof variantSchema>

function getRelatedId(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (typeof value === 'object' && 'id' in value) {
    return getRelatedId((value as { id: unknown }).id)
  }
  return null
}

// ── Component ─────────────────────────────────────────────────
export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const isNew = slug === 'new'
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const [activeTab, setActiveTab] = useState('details')

  // Variant modal state
  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [editVariant, setEditVariant] = useState<ProductVariant | null>(null)
  const [deleteVariant, setDeleteVariant] = useState<ProductVariant | null>(null)

  // Image state
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deleteImage, setDeleteImage] = useState<ProductImage | null>(null)

  // ── Fetch product ──────────────────────────────────────────
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['admin-product', slug],
    queryFn: () => catalogService.getProduct(slug!),
    enabled: isAuthenticated && !isNew && !!slug,
  })

  // ── Fetch categories & brands for selectors ────────────────
  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories-all'],
    queryFn: () => catalogService.listCategories({ page_size: 200 } as never),
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  })

  const { data: brandsData } = useQuery({
    queryKey: ['admin-brands-all'],
    queryFn: () => catalogService.listBrands({ page_size: 200 } as never),
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  })

  const { data: attributesData } = useQuery({
    queryKey: ['admin-attributes-all'],
    queryFn: () => catalogService.listAttributes(),
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  })

  // ── Fetch variants & images (existing products only) ───────
  const { data: variants, isLoading: variantsLoading } = useQuery({
    queryKey: ['admin-variants', slug],
    queryFn: () => catalogService.listVariants(slug!),
    enabled: isAuthenticated && !isNew && !!slug,
  })

  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ['admin-images', slug],
    queryFn: () => catalogService.listImages(slug!),
    enabled: isAuthenticated && !isNew && !!slug,
  })

  // ── Detail form ────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
    setError,
  } = useForm<DetailFormValues>({
    resolver: zodResolver(detailSchema),
    defaultValues: {
      name: '', description: '', short_description: '',
      base_price: 0, compare_at_price: null,
      sku: '', weight_kg: null,
      status: 'DRAFT', category: undefined, brand: null,
      is_featured: false, meta_title: '', meta_description: '',
    },
  })

  // Wait for both product AND the lookup data before resetting so the
  // category/brand <select> elements have their options ready when the
  // controlled value is applied – without this the selects show blank.
  useEffect(() => {
    if (!product) return
    if (!isNew && (!categoriesData || !brandsData)) return
    reset({
      name: product.name,
      description: product.description ?? '',
      short_description: product.short_description ?? '',
      base_price: parseFloat(product.base_price ?? product.price ?? '0'),
      compare_at_price: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
      sku: product.sku ?? '',
      weight_kg: product.weight_kg ? parseFloat(product.weight_kg) : null,
      status: product.status,
      category: getRelatedId(product.category) ?? undefined,
      brand: getRelatedId(product.brand),
      is_featured: product.is_featured,
      meta_title: product.meta_title ?? '',
      meta_description: product.meta_description ?? '',
    })
  }, [product, categoriesData, brandsData, isNew, reset])

  const saveMutation = useMutation({
    mutationFn: (values: DetailFormValues) => {
      const payload: Record<string, unknown> = {
        name: values.name,
        description: values.description ?? '',
        short_description: values.short_description ?? '',
        base_price: String(values.base_price),
        status: values.status,
        category: values.category,
        brand: values.brand ?? null,
        is_featured: values.is_featured,
      }
      if (values.compare_at_price != null) payload.compare_at_price = String(values.compare_at_price)
      else payload.compare_at_price = null
      if (values.sku?.trim()) payload.sku = values.sku.trim()
      if (values.weight_kg != null) payload.weight_kg = String(values.weight_kg)
      else payload.weight_kg = null
      if (values.meta_title !== undefined) payload.meta_title = values.meta_title
      if (values.meta_description !== undefined) payload.meta_description = values.meta_description
      return isNew
        ? catalogService.createProduct(payload)
        : catalogService.updateProduct(slug!, payload)
    },
    onSuccess: (saved) => {
      toast({ title: isNew ? 'Product created' : 'Product saved', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-products'] })
      void qc.invalidateQueries({ queryKey: ['admin-product', slug] })
      if (isNew) navigate(ROUTES.PRODUCT_DETAIL(saved.slug), { replace: true })
    },
    onError: (err) => {
      const apiErr = err as unknown as ApiError
      toast({ title: 'Failed to save product', description: apiErr.message, variant: 'destructive' })
      applyServerErrors(setError, apiErr.fieldErrors)
    },
  })

  // ── Variant form ───────────────────────────────────────────
  const variantForm = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: { is_active: true },
  })

  function openCreateVariant() {
    setEditVariant(null)
    variantForm.reset({ sku: '', price_override: null, is_active: true, attribute_values: [] })
    setVariantModalOpen(true)
  }

  function openEditVariant(v: ProductVariant) {
    setEditVariant(v)
    const existingAttrValueIds = v.attribute_values.map((av) => Number(av.id))
    variantForm.reset({
      sku: v.sku,
      price_override: v.price_override ? parseFloat(v.price_override) : null,
      is_active: v.is_active,
      attribute_values: existingAttrValueIds,
    })
    setVariantModalOpen(true)
  }

  const saveVariantMutation = useMutation({
    mutationFn: (values: VariantFormValues) => {
      const payload = {
        sku: values.sku,
        price_override: values.price_override != null ? String(values.price_override) : null,
        is_active: values.is_active,
        attribute_values: values.attribute_values,
      }
      return editVariant
        ? catalogService.updateVariant(slug!, String(editVariant.id), payload)
        : catalogService.createVariant(slug!, payload)
    },
    onSuccess: () => {
      toast({ title: editVariant ? 'Variant updated' : 'Variant created', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-variants', slug] })
      setVariantModalOpen(false)
    },
    onError: (err) => {
      const apiErr = err as unknown as ApiError
      toast({ title: 'Failed to save variant', description: apiErr.message, variant: 'destructive' })
      applyServerErrors(variantForm.setError, apiErr.fieldErrors)
    },
  })

  const deleteVariantMutation = useMutation({
    mutationFn: (pk: string) => catalogService.deleteVariant(slug!, pk),
    onSuccess: () => {
      toast({ title: 'Variant deleted', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-variants', slug] })
      setDeleteVariant(null)
    },
    onError: () => toast({ title: 'Failed to delete variant', variant: 'destructive' }),
  })

  // ── Image mutations ────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !slug) return
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      await catalogService.uploadImage(slug, fd)
      void qc.invalidateQueries({ queryKey: ['admin-images', slug] })
      toast({ title: 'Image uploaded', variant: 'success' })
    } catch {
      toast({ title: 'Failed to upload image', variant: 'destructive' })
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const setPrimaryMutation = useMutation({
    mutationFn: (pk: string) => catalogService.updateImage(slug!, pk, { is_primary: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-images', slug] })
      toast({ title: 'Primary image updated', variant: 'success' })
    },
    onError: () => toast({ title: 'Failed to set primary image', variant: 'destructive' }),
  })

  const deleteImageMutation = useMutation({
    mutationFn: (pk: string) => catalogService.deleteImage(slug!, pk),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-images', slug] })
      toast({ title: 'Image deleted', variant: 'success' })
      setDeleteImage(null)
    },
    onError: () => toast({ title: 'Failed to delete image', variant: 'destructive' }),
  })

  // ── Variant table columns ──────────────────────────────────
  const variantColumns: Column<ProductVariant>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (row) => <span className="font-mono text-sm text-text-primary">{row.sku}</span>,
    },
    {
      key: 'options',
      header: 'Options',
      render: (row) =>
        row.attribute_values?.length ? (
          <span className="text-sm text-text-secondary">
            {row.attribute_values.map((av) => `${av.attribute_name}: ${av.value}`).join(' · ')}
          </span>
        ) : (
          <span className="text-sm text-text-muted">Default</span>
        ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-text-primary">{formatCurrency(row.effective_price)}</span>
      ),
    },
    {
      key: 'available',
      header: 'Available',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'default'}>
          {row.is_active ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={<Pencil />}
            label="Edit variant"
            size="sm"
            className="text-text-muted hover:bg-background-subtle"
            onClick={() => openEditVariant(row)}
          />
          <IconButton
            icon={<Trash2 />}
            label="Delete variant"
            size="sm"
            className="text-danger hover:bg-danger-subtle"
            onClick={() => setDeleteVariant(row)}
          />
        </div>
      ),
    },
  ]

  // ── Loading skeleton ───────────────────────────────────────
  if (!isNew && productLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  const tabs = isNew
    ? [{ value: 'details', label: 'Details' }]
    : [
        { value: 'details', label: 'Details' },
        { value: 'images', label: 'Images', count: images?.length },
        { value: 'variants', label: 'Variants', count: variants?.length },
      ]

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: 'Products', href: ROUTES.PRODUCTS },
          { label: isNew ? 'New product' : (product?.name ?? '…') },
        ]}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-md" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-text-primary">
            {isNew ? 'New product' : (product?.name ?? '…')}
          </h1>
          {product?.is_featured && (
            <Badge variant="warning">Featured</Badge>
          )}
        </div>
        {activeTab === 'details' && (
          <Button
            onClick={handleSubmit((v) => saveMutation.mutate(v))}
            isLoading={isSubmitting || saveMutation.isPending}
            loadingText="Saving…"
            disabled={!isNew && !isDirty}
          >
            <Save className="h-4 w-4" /> Save
          </Button>
        )}
      </div>

      {/* Tab navigation */}
      {tabs.length > 1 && (
        <Tabs tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
      )}

      {/* ── Details tab ─────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="space-y-5">
          {/* ── Core info ───────────────────────────────────── */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Basic information</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Name"
                htmlFor="name"
                error={errors.name?.message}
                required
                className="sm:col-span-2"
              >
                <Input
                  id="name"
                  autoFocus={isNew}
                  error={!!errors.name}
                  {...register('name')}
                />
              </FormField>

              <FormField
                label="Short description"
                htmlFor="short_description"
                className="sm:col-span-2"
                hint="One-line summary shown in product listings."
              >
                <Input
                  id="short_description"
                  placeholder="e.g. Lightweight running shoe with responsive cushioning"
                  {...register('short_description')}
                />
              </FormField>

              <FormField
                label="Description"
                htmlFor="description"
                className="sm:col-span-2"
              >
                <Textarea id="description" rows={5} {...register('description')} />
              </FormField>

              <FormField label="SKU" htmlFor="sku" hint="Product-level stock-keeping unit.">
                <Input
                  id="sku"
                  placeholder="e.g. SHOE-001"
                  {...register('sku')}
                />
              </FormField>

              <FormField
                label="Weight (kg)"
                htmlFor="weight_kg"
                error={errors.weight_kg?.message}
                hint="Used for shipping rate calculations."
              >
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.000"
                  error={!!errors.weight_kg}
                  {...register('weight_kg')}
                />
              </FormField>
            </div>
          </Card>

          {/* ── Pricing ─────────────────────────────────────── */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Pricing</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Base price (USD)"
                htmlFor="base_price"
                error={errors.base_price?.message}
                required
                hint="The standard selling price."
              >
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  error={!!errors.base_price}
                  {...register('base_price')}
                />
              </FormField>

              <FormField
                label="Compare-at price (USD)"
                htmlFor="compare_at_price"
                error={errors.compare_at_price?.message}
                hint="Original / crossed-out price shown to highlight a discount. Must be higher than the base price."
              >
                <Input
                  id="compare_at_price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  error={!!errors.compare_at_price}
                  {...register('compare_at_price')}
                />
              </FormField>
            </div>
          </Card>

          {/* ── Catalogue & status ──────────────────────────── */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Catalogue & status</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Category"
                htmlFor="category"
                error={errors.category?.message}
                required
              >
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="category"
                      error={!!errors.category}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    >
                      <option value="">Select a category…</option>
                      {categoriesData?.results.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Brand" htmlFor="brand">
                <Controller
                  name="brand"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="brand"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    >
                      <option value="">No brand</option>
                      {brandsData?.results.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Status" htmlFor="status" required>
                <Select id="status" {...register('status')}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              </FormField>

              <div className="flex items-center gap-2 self-end pb-2">
                <input
                  id="is_featured"
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  {...register('is_featured')}
                />
                <label
                  htmlFor="is_featured"
                  className="cursor-pointer text-sm font-medium text-text-primary"
                >
                  Featured product
                  <span className="ml-1.5 text-xs font-normal text-text-muted">
                    (highlighted on the storefront)
                  </span>
                </label>
              </div>
            </div>
          </Card>

          {/* ── SEO ─────────────────────────────────────────── */}
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-text-primary">SEO</h2>
            <p className="mb-4 text-xs text-text-muted">
              Leave blank to auto-generate from the product name and description.
            </p>
            <div className="grid grid-cols-1 gap-5">
              <FormField
                label="Meta title"
                htmlFor="meta_title"
                error={errors.meta_title?.message}
                hint="Shown in search engine results. Keep under 70 characters."
              >
                <Input
                  id="meta_title"
                  placeholder="e.g. Buy Widget Pro – Best Price | ShopCore"
                  {...register('meta_title')}
                />
              </FormField>

              <FormField
                label="Meta description"
                htmlFor="meta_description"
                error={errors.meta_description?.message}
                hint="Short summary shown below the title in search results. Keep under 160 characters."
              >
                <Textarea
                  id="meta_description"
                  rows={3}
                  placeholder="e.g. Shop the Widget Pro at the best price. Free shipping on orders over $50."
                  {...register('meta_description')}
                />
              </FormField>
            </div>
          </Card>
        </div>
      )}

      {/* ── Images tab ──────────────────────────────────────── */}
      {activeTab === 'images' && !isNew && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {images?.length ?? 0} image{images?.length !== 1 ? 's' : ''}. Click
              <Star className="mx-1 inline h-3.5 w-3.5 text-warning" />
              to set the primary image.
            </p>
            <Button
              variant="secondary"
              size="sm"
              isLoading={uploadingImage}
              onClick={() => imageInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> Upload image
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleImageUpload(e)}
            />
          </div>

          {imagesLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-xl" />
              ))}
            </div>
          ) : !images?.length ? (
            <EmptyState
              icon={<ImageIcon className="h-6 w-6" />}
              title="No images yet"
              description="Upload the first image for this product."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img) => (
                <div key={img.id} className="group relative">
                  <div
                    className={`overflow-hidden rounded-xl border-2 transition-colors ${
                      img.is_primary ? 'border-warning' : 'border-border'
                    }`}
                  >
                    <img
                      src={img.image}
                      alt={img.alt_text ?? 'Product image'}
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                  {img.is_primary && (
                    <div className="absolute left-2 top-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-white">
                        <Star className="h-3 w-3" /> Primary
                      </span>
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!img.is_primary && (
                      <button
                        type="button"
                        title="Set as primary"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-surface shadow-sm hover:bg-warning-subtle"
                        onClick={() => setPrimaryMutation.mutate(String(img.id))}
                      >
                        <StarOff className="h-3.5 w-3.5 text-warning" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete image"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-surface shadow-sm hover:bg-danger-subtle"
                      onClick={() => setDeleteImage(img)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Variants tab ────────────────────────────────────── */}
      {activeTab === 'variants' && !isNew && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {variants?.length ?? 0} variant{variants?.length !== 1 ? 's' : ''}
            </p>
            <Button size="sm" onClick={openCreateVariant}>
              <Plus className="h-3.5 w-3.5" /> Add variant
            </Button>
          </div>

          <div className="admin-surface overflow-hidden">
            <DataTable
              columns={variantColumns}
              data={variants ?? []}
              isLoading={variantsLoading}
              rowKey={(r) => r.id}
              emptyTitle="No variants"
              emptyDescription="Every product gets a default variant automatically. Add more for size/colour options."
            />
          </div>
        </div>
      )}

      {/* ── Variant create/edit modal ────────────────────────── */}
      <Modal
        open={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        title={editVariant ? 'Edit variant' : 'New variant'}
        size="sm"
      >
        <form
          className="space-y-4"
          onSubmit={variantForm.handleSubmit((v) => saveVariantMutation.mutate(v))}
          noValidate
        >
          <FormField label="SKU" error={variantForm.formState.errors.sku?.message} required>
            <Input
              error={!!variantForm.formState.errors.sku}
              placeholder="PROD-001-RED-M"
              autoFocus
              {...variantForm.register('sku')}
            />
          </FormField>

          <FormField
            label="Price override (optional)"
            error={variantForm.formState.errors.price_override?.message}
            hint="Leave blank to use the product base price."
          >
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              error={!!variantForm.formState.errors.price_override}
              {...variantForm.register('price_override')}
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              id="variant-active"
              type="checkbox"
              className="h-4 w-4 rounded accent-primary"
              {...variantForm.register('is_active')}
            />
            <label htmlFor="variant-active" className="cursor-pointer text-sm text-text-primary">
              Active (available for purchase)
            </label>
          </div>

          {attributesData && attributesData.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-text-primary">Attribute values</p>
              {attributesData.map((attr: Attribute) => (
                <div key={attr.id} className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    {attr.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {attr.values?.map((val) => {
                      const numId = Number(val.id)
                      const checked = variantForm.watch('attribute_values').includes(numId)
                      return (
                        <label
                          key={val.id}
                          className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                            checked
                              ? 'border-primary bg-primary text-white'
                              : 'border-border bg-surface text-text-secondary hover:border-primary'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={(e) => {
                              const current = variantForm.getValues('attribute_values')
                              variantForm.setValue(
                                'attribute_values',
                                e.target.checked
                                  ? [...current, numId]
                                  : current.filter((id) => id !== numId),
                                { shouldDirty: true }
                              )
                            }}
                          />
                          {val.value}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setVariantModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveVariantMutation.isPending}>
              {editVariant ? 'Update' : 'Create variant'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete variant dialog ────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteVariant}
        onClose={() => setDeleteVariant(null)}
        onConfirm={() => deleteVariant && deleteVariantMutation.mutate(String(deleteVariant.id))}
        title="Delete variant?"
        description={`SKU "${deleteVariant?.sku}" will be permanently removed. Any reserved stock will be freed.`}
        confirmLabel="Delete"
        isLoading={deleteVariantMutation.isPending}
      />

      {/* ── Delete image dialog ──────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteImage}
        onClose={() => setDeleteImage(null)}
        onConfirm={() => deleteImage && deleteImageMutation.mutate(String(deleteImage.id))}
        title="Delete image?"
        description="This image will be permanently removed from the product."
        confirmLabel="Delete"
        isLoading={deleteImageMutation.isPending}
      />
    </div>
  )
}
