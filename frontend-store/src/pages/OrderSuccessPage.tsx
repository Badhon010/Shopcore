import { useParams, Link, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Check, KeyRound, Clock3 } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'

interface OrderSuccessPageState {
  guestLookupToken?: string
  manualPending?: boolean
}

export function OrderSuccessPage() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const reducedMotion = usePrefersReducedMotion()

  const state = (location.state ?? {}) as OrderSuccessPageState
  const guestLookupToken: string | undefined = state.guestLookupToken
  const manualPending: boolean = state.manualPending ?? false

  const { isAuthenticated } = useAuth()

  const trackOrderUrl = isAuthenticated && orderNumber
    ? `/orders/${orderNumber}`
    : ROUTES.TRACK_ORDER

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

        {/* Manual payment notice — order is on hold until staff verify */}
        {manualPending && (
          <div className="mx-auto mt-8 max-w-lg rounded-xl border border-border bg-background-subtle p-5 text-left">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                <Clock3 className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="text-body-sm font-semibold text-text-primary">Payment pending verification</p>
                <p className="mt-1 text-body-sm text-text-secondary">
                  We&apos;ve received your payment details. Our team verifies manual payments during business
                  hours — you&apos;ll get an email as soon as your order is confirmed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Guest lookup token — one-time credential for tracking/cancelling */}
        {guestLookupToken && (
          <div className="mx-auto mt-6 max-w-lg rounded-xl border border-border bg-background-subtle p-5 text-left">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                <KeyRound className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="text-body-sm font-semibold text-text-primary">Guest order tracking code</p>
                <p className="mt-1 text-body-sm text-text-secondary">
                  Use this code to track or cancel your order. Keep it safe — it&apos;s shown only once.
                </p>
                <code className="mt-2 inline-block rounded-lg bg-surface border border-border px-3 py-1.5 font-mono text-body-sm text-text-primary">
                  {guestLookupToken}
                </code>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to={trackOrderUrl}>Track your order</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to={ROUTES.PRODUCTS}>Continue shopping</Link>
          </Button>
        </div>
      </PageContainer>
    </>
  )
}
