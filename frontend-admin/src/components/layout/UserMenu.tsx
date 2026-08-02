import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Settings, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'

/**
 * Topbar profile menu: user identity, settings link, and sign out.
 */
export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:shadow-focus-ring"
        >
          <Avatar name={user?.full_name || user?.email} size="md" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2 normal-case tracking-normal">
          <span className="truncate text-sm font-semibold text-text-primary">{user?.full_name || 'Admin user'}</span>
          <span className="truncate text-xs font-normal text-text-muted">{user?.email}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-border-light" />

        <DropdownMenuItem asChild>
          <Link to={ROUTES.SETTINGS}>
            <Settings className="h-4 w-4" aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={ROUTES.NOTIFICATIONS}>
            <User className="h-4 w-4" aria-hidden />
            Notifications
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border-light" />

        <DropdownMenuItem destructive onClick={handleLogout}>
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
