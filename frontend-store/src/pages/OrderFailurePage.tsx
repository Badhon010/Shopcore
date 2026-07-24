import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { XCircle } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'

export function OrderFailurePage() {
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason')

  return (
    <>
      <Helmet>
        <title>Order Failed — ShopCore</title>
      </Helmet>
      <PageContainer className="py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger-subtle">
          <XCircle className="h-10 w-10 text-danger" />
        </div>
        <h1 className="text-heading-xl font-semibold text-text-primary">Payment failed</h1>
        <p className="mt-3 text-body-md text-text-secondary">
          {reason ?? 'We were unable to process your payment. Please try again.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to={ROUTES.CHECKOUT_PAYMENT}>Try again</Link>
          </Button>
          <Button variant="ghost" asChild>
            <a href={`mailto:hello@shopcore.com`}>Contact support</a>
          </Button>
        </div>
      </PageContainer>
    </>
  )
}
