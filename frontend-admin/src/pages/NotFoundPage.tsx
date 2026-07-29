import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <p className="text-display-lg font-bold text-primary">404</p>
      <h1 className="mt-3 text-heading-lg font-semibold text-text-primary">Page not found</h1>
      <p className="mt-2 text-body-md text-text-secondary">That admin route does not exist.</p>
      <Button asChild className="mt-6">
        <Link to={ROUTES.DASHBOARD}>Return to dashboard</Link>
      </Button>
    </div>
  )
}