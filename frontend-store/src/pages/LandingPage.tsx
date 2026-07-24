import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'

export function LandingPage() {
  const { campaignSlug } = useParams()

  return (
    <>
      <Helmet>
        <title>Special Offer — ShopCore</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <PageContainer className="py-20 text-center">
        <p className="text-caption uppercase tracking-widest text-accent">{campaignSlug}</p>
        <h1 className="mt-4 text-display-xl font-semibold text-text-primary">
          Limited Time Offer
        </h1>
        <p className="mt-4 text-body-lg text-text-secondary max-w-lg mx-auto">
          Explore our exclusive campaign selection — premium quality, exceptional value.
        </p>
        <Button size="lg" className="mt-8" asChild>
          <Link to={ROUTES.PRODUCTS}>Shop the collection</Link>
        </Button>
      </PageContainer>
    </>
  )
}
