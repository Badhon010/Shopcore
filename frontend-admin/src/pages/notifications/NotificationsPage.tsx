import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { notificationsService } from '@/services/api/notifications.service'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import { useState } from 'react'
import type { ApiError } from '@/types/api'

const PAGE_SIZE = 20

export function NotificationsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications', page],
    queryFn: () => notificationsService.listNotifications({ page, page_size: PAGE_SIZE }),
    enabled: isAuthenticated,
  })

  const markReadMutation = useMutation({
    mutationFn: (pk: string) => notificationsService.markRead(pk),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }) },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      toast({ title: 'All notifications marked as read', variant: 'success' })
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pk: string) => notificationsService.deleteNotification(pk),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      toast({ title: 'Notification deleted', variant: 'success' })
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const clearAllMutation = useMutation({
    mutationFn: () => notificationsService.clearAll(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      toast({ title: 'All notifications cleared', variant: 'success' })
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'destructive' }),
  })

  const notifications = data?.results ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Notifications</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="text-danger hover:bg-danger-subtle"
              isLoading={clearAllMutation.isPending}
              onClick={() => clearAllMutation.mutate()}
            >
              <X className="h-3.5 w-3.5" /> Clear all
            </Button>
          )}
        </div>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-4">
                <div className="mt-2 h-2 w-2 shrink-0 animate-pulse rounded-full bg-skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-skeleton" />
                  <div className="h-3 w-24 animate-pulse rounded bg-skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-6 pb-6 pt-2">
            <EmptyState
              icon={<Bell className="h-6 w-6" />}
              title="No notifications"
              description="System notifications will appear here."
              className="border-0 shadow-none"
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'flex items-start gap-4 px-6 py-4 transition-colors',
                  !n.is_read && 'bg-primary-light/30'
                )}
              >
                <div
                  className={cn(
                    'mt-2 h-2 w-2 shrink-0 rounded-full',
                    n.is_read ? 'bg-border' : 'bg-primary'
                  )}
                  aria-hidden
                />
                <div className="flex-1">
                  <p className={cn(
                    'text-sm',
                    n.is_read ? 'text-text-secondary' : 'font-medium text-text-primary'
                  )}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{n.body}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-xs text-text-muted">{formatRelativeTime(n.created_at)}</span>
                    {n.action_url && (
                      <Link to={n.action_url} className="text-xs font-medium text-primary hover:underline">
                        View →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-text-muted"
                      onClick={() => markReadMutation.mutate(String(n.id))}
                      isLoading={markReadMutation.isPending}
                    >
                      Mark read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete notification"
                    className="text-text-muted hover:bg-danger-subtle hover:text-danger"
                    onClick={() => deleteMutation.mutate(String(n.id))}
                    isLoading={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="border-t border-border px-6 py-4 flex justify-end">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
