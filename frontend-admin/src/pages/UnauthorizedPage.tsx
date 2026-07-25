import { ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export function UnauthorizedPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleReturn = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-subtle text-danger">
        <ShieldX className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="mt-6 text-heading-lg font-semibold text-text-primary">Staff access required</h1>
      <p className="mt-2 text-body-md text-text-secondary">
        This account can use the ShopCore store, but it does not have permission to use the admin workspace.
      </p>
      <Button variant="secondary" className="mt-6" onClick={() => void handleReturn()}>
        Sign in with another account
      </Button>
    </div>
  )
}