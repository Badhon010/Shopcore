import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { useEffect } from 'react'
import { catalogService } from '@/services/api/catalog.service'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Skeleton } from '@/components/feedback/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { ROUTES } from '@/constants/routes'

const schema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  base_price:  z.coerce.number().positive('Price must be positive'),
  status:      z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
})
type FormValues = z.infer<typeof schema>

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const isNew = slug === 'new'
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', slug],
    queryFn: () => catalogService.getProduct(slug!),
    enabled: !isNew && !!slug,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'DRAFT', base_price: 0 },
  })

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        base_price: product.base_price,
        status: product.status as FormValues['status'],
      })
    }
  }, [product, reset])

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      isNew
        ? catalogService.createProduct(values)
        : catalogService.updateProduct(slug!, values),
    onSuccess: (saved) => {
      toast({ title: isNew ? 'Product created' : 'Product saved', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-products'] })
      if (isNew) navigate(ROUTES.PRODUCT_DETAIL(saved.slug), { replace: true })
    },
    onError: () => toast({ title: 'Failed to save product', variant: 'destructive' }),
  })

  if (!isNew && isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[
        { label: 'Products', href: ROUTES.PRODUCTS },
        { label: isNew ? 'New product' : (product?.name ?? '…') },
      ]} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-md" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-text-primary">
            {isNew ? 'New product' : (product?.name ?? '…')}
          </h1>
        </div>
        <Button
          onClick={handleSubmit((v) => saveMutation.mutate(v))}
          isLoading={isSubmitting || saveMutation.isPending}
          loadingText="Saving…"
          disabled={!isNew && !isDirty}
        >
          <Save className="h-4 w-4" /> Save
        </Button>
      </div>

      <Card>
        <form className="grid grid-cols-1 gap-5 sm:grid-cols-2" noValidate>
          <FormField label="Name" htmlFor="name" error={errors.name?.message} required className="sm:col-span-2">
            <Input id="name" autoFocus={isNew} error={!!errors.name} {...register('name')} />
          </FormField>

          <FormField label="Description" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" rows={5} {...register('description')} />
          </FormField>

          <FormField label="Base price (USD)" htmlFor="base_price" error={errors.base_price?.message} required>
            <Input id="base_price" type="number" step="0.01" min="0" error={!!errors.base_price} {...register('base_price')} />
          </FormField>

          <FormField label="Status" htmlFor="status" required>
            <Select id="status" {...register('status')}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </FormField>
        </form>
      </Card>
    </div>
  )
}
