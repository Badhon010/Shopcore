import { Helmet } from 'react-helmet-async'
import { Wrench } from 'lucide-react'

export function MaintenancePage() {
  return (
    <>
      <Helmet>
        <title>Maintenance — ShopCore</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
          <Wrench className="h-10 w-10 text-warning" />
        </div>
        <h1 className="text-heading-xl font-semibold text-text-primary">Under Maintenance</h1>
        <p className="mt-3 max-w-md text-body-md text-text-secondary">
          We&apos;re making some improvements. We&apos;ll be back shortly.
        </p>
      </div>
    </>
  )
}
