import { CheckCircle2, Compass, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export function WorkspacePage() {
  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <p className="text-caption font-semibold uppercase tracking-[0.12em] text-primary">Workspace</p>
        <h2 className="mt-2 text-heading-xl font-semibold tracking-tight text-text-primary">Ready when you are.</h2>
        <p className="mt-2 max-w-2xl text-body-md text-text-secondary">
          The secure ShopCore admin shell is connected to your staff account. Business modules will appear here
          as their real backend contracts are introduced.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <ShieldCheck className="h-5 w-5 text-success" aria-hidden />
            <CardTitle className="mt-4">Staff access verified</CardTitle>
            <p className="mt-2 text-body-sm text-text-secondary">
              Access is enforced by the Django API and checked before the shell renders.
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle className="mt-4">Shared foundation</CardTitle>
            <p className="mt-2 text-body-sm text-text-secondary">
              Authentication, theme tokens, API refresh, query behavior, and feedback match the store app.
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Compass className="h-5 w-5 text-accent" aria-hidden />
            <CardTitle className="mt-4">No fake data</CardTitle>
            <p className="mt-2 text-body-sm text-text-secondary">
              No business widgets are shown until the backend provides an appropriate API.
            </p>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}