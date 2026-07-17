import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ROUTES } from '@/constants/routes'

export function ServerErrorPage() {
  return (
    <>
      <Helmet>
        <title>Server Error — ShopCore</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-display-lg font-bold text-border">500</p>
        <h1 className="mt-4 text-heading-lg font-semibold text-text-primary">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-body-md text-text-secondary">
          An unexpected error occurred. Our team has been notified.
        </p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent px-6 py-3 text-body-md font-medium text-text-inverse transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:shadow-focus-ring"
          >
            Retry
          </button>
          <Link
            to={ROUTES.HOME}
            className="rounded-lg border border-border px-6 py-3 text-body-md font-medium text-text-primary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:shadow-focus-ring"
          >
            Go home
          </Link>
        </div>
      </div>
    </>
  )
}
