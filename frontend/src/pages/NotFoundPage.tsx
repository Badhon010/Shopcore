import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ROUTES } from '@/constants/routes'

export function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page Not Found — ShopCore</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-display-lg font-bold text-border">404</p>
        <h1 className="mt-4 text-heading-lg font-semibold text-text-primary">Page not found</h1>
        <p className="mt-2 max-w-sm text-body-md text-text-secondary">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to={ROUTES.HOME}
          className="mt-8 rounded-lg bg-accent px-6 py-3 text-body-md font-medium text-text-inverse transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:shadow-focus-ring"
        >
          Go home
        </Link>
      </div>
    </>
  )
}
