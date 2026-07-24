import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { buildRoute, ROUTES } from '@/constants/routes'

export function OrderSuccessPage() {
  const { orderNumber } = useParams()
  const reducedMotion = usePrefersReducedMotion()

  return (
    <>
      <Helmet>
        <title>Order Confirmed — ShopCore</title>
      </Helmet>
      <PageContainer className="py-16 text-center">
        <motion.div
          initial={reducedMotion ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10"
        >
          <Check
            className="h-10 w-10 text-success animate-checkmark"
            strokeWidth={2.5}
            aria-hidden
          />
        </motion.div>

        <h1 className="text-heading-xl font-semibold text-text-primary">Order confirmed!</h1>
        <p className="mt-3 text-body-md text-text-secondary">
          Thank you for your purchase. Your order{' '}
          <span className="font-semibold text-text-primary">#{orderNumber}</span> has been placed.
        </p>
        <p className="mt-1 text-body-sm text-text-tertiary">
          You&apos;ll receive a confirmation email shortly.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {orderNumber && (
            <Button asChild>
              <Link to={buildRoute.orderDetails(orderNumber)}>View order</Link>
            </Button>
          )}
          <Button variant="ghost" asChild>
            <Link to={ROUTES.PRODUCTS}>Continue shopping</Link>
          </Button>
        </div>
      </PageContainer>
    </>
  )
}
