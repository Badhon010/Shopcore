import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, Inbox, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { notificationsService } from '@/services/api/notifications.service'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'

/**
 * Topbar notification bell with a real unread count and a dropdown of the
 * most recent notifications. The badge is hidden entirely when the count is 0.
 */
export function NotificationBell() {
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: unreadCount, isLoading: countLoading } = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: () => notificationsService.getUnreadCount(),
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchInterval: 60_000,
  })

  const { data: recent } = useQuery({
    queryKey: ['notification-recent'],
    queryFn: () => notificationsService.listNotifications({ page: 1, page_size: 5 }),
    enabled: isAuthenticated && open,
    staleTime: 10_000,
  })

  // Refetch the count when the dropdown opens so it's always fresh.
  useEffect(() => {
    if (open) {
      void queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] })
      void queryClient.invalidateQueries({ queryKey: ['notification-recent'] })
    }
  }, [open, queryClient])

  const markAllMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] })
      void queryClient.invalidateQueries({ queryKey: ['notification-recent'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      toast({ title: 'All notifications marked as read', variant: 'success' })
    },
    onError: () => toast({ title: 'Could not update notifications', variant: 'destructive' }),
  })

  const notifications = recent?.results ?? []
  const showBadge = (unreadCount ?? 0) > 0

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={showBadge ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {showBadge && (
            <span
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground ring-2 ring-surface"
              aria-hidden
            >
              {unreadCount! > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold text-text-primary">Notifications</p>
          {showBadge && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:shadow-focus-ring disabled:opacity-50"
            >
              {markAllMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <CheckCheck className="h-3 w-3" aria-hidden />
              )}
              Mark all read
            </button>
          )}
        </div>

        <DropdownMenuSeparator className="bg-border-light" />

        <div className="max-h-[320px] overflow-y-auto py-1">
          {countLoading && !recent ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <Inbox className="h-5 w-5 text-text-muted" aria-hidden />
              <p className="text-sm text-text-muted">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5',
                  !n.is_read && 'bg-primary-light/30'
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    n.is_read ? 'bg-border-strong' : 'bg-primary'
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm', n.is_read ? 'text-text-secondary' : 'font-medium text-text-primary')}>
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-text-tertiary">{formatRelativeTime(n.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <DropdownMenuSeparator className="bg-border-light" />

        <DropdownMenuItem asChild>
          <Link to={ROUTES.NOTIFICATIONS} className="justify-center text-primary">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
