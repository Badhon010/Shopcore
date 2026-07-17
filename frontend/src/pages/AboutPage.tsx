import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'

export function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us — ShopCore</title>
        <meta name="description" content="Learn about ShopCore's story and mission." />
      </Helmet>
      <PageContainer className="py-12 max-w-3xl">
        <h1 className="text-heading-xl font-semibold text-text-primary">Our Story</h1>
        <div className="mt-6 space-y-4 text-body-md text-text-secondary">
          <p>
            ShopCore was founded with a simple belief: that everyday products should be beautiful, durable, and
            crafted with care. We partner with independent makers and established artisans to bring you a curated
            selection of goods that stand the test of time.
          </p>
          <p>
            Every item in our collection is chosen for its quality, thoughtful design, and the story behind it.
            We believe in transparency — in how things are made, where they come from, and what they&apos;re made of.
          </p>
          <p>
            Based everywhere and nowhere in particular, our small team works remotely to bring you the best of
            global craftsmanship, delivered with care.
          </p>
        </div>
      </PageContainer>
    </>
  )
}
