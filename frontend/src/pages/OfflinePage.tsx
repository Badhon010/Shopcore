import { Helmet } from 'react-helmet-async'
import { WifiOff } from 'lucide-react'

export function OfflinePage() {
  return (
    <>
      <Helmet>
        <title>Offline — ShopCore</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-bg-subtle">
          <WifiOff className="h-10 w-10 text-text-tertiary" />
        </div>
        <h1 className="text-heading-xl font-semibold text-text-primary">You&apos;re offline</h1>
        <p className="mt-3 max-w-md text-body-md text-text-secondary">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 rounded-lg bg-accent px-6 py-3 text-body-md font-medium text-text-inverse transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:shadow-focus-ring"
        >
          Try again
        </button>
      </div>
    </>
  )
}
