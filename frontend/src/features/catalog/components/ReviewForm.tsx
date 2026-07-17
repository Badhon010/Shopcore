import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { RatingStars } from '@/components/ui/RatingStars'
import { useSubmitReview } from '../hooks/useProducts'
import { applyServerErrors } from '@/services/api/axiosClient'
import type { ApiError } from '@/types/api'
import { useToast } from '@/contexts/ToastContext'
import { useState } from 'react'

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  title: z.string().max(100).optional(),
  body: z.string().min(10, 'Review must be at least 10 characters').max(2000),
})

type ReviewFormData = z.infer<typeof reviewSchema>

interface ReviewFormProps {
  productSlug: string
}

export function ReviewForm({ productSlug }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const submit = useSubmitReview(productSlug)
  const { toast } = useToast()

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, title: '', body: '' },
  })

  const onSubmit = async (data: ReviewFormData) => {
    try {
      await submit.mutateAsync(data)
      toast({ title: 'Review submitted', description: 'Thank you for your feedback!', variant: 'success' })
      form.reset()
      setRating(0)
    } catch (err) {
      const apiErr = err as ApiError
      applyServerErrors(form.setError, apiErr.fieldErrors)
      if (!apiErr.fieldErrors) {
        toast({ title: 'Could not submit review', description: apiErr.message, variant: 'error' })
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <p className="mb-2 text-body-sm font-medium text-text-primary">Your rating *</p>
        <RatingStars
          rating={rating}
          interactive
          size="lg"
          onRate={(r) => {
            setRating(r)
            form.setValue('rating', r)
          }}
        />
        {form.formState.errors.rating && (
          <p role="alert" className="mt-1 text-caption text-danger">
            {form.formState.errors.rating.message}
          </p>
        )}
      </div>

      <FormField label="Title" error={form.formState.errors.title?.message}>
        {(id, errorId) => (
          <Input
            id={id}
            placeholder="Summarize your experience"
            error={!!form.formState.errors.title}
            errorId={errorId}
            {...form.register('title')}
          />
        )}
      </FormField>

      <FormField label="Review" required error={form.formState.errors.body?.message}>
        {(id, errorId) => (
          <Textarea
            id={id}
            placeholder="Share your experience with this product..."
            rows={4}
            error={!!form.formState.errors.body}
            errorId={errorId}
            {...form.register('body')}
          />
        )}
      </FormField>

      <Button type="submit" isLoading={submit.isPending}>
        Submit review
      </Button>
    </form>
  )
}
