import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { notificationsService } from '@/services/api/notifications.service'
import { useToast } from '@/contexts/ToastContext'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { ApiError } from '@/types/api'

export function NotificationsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => notificationsService.getNotifications({ page_size: 50 }),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }),
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      toast({ title: 'All notifications marked as read', variant: 'success' })
    },
    onError: (e: ApiError) => toast({ title: e.message, variant: 'error' }),
  })

  const notifications = data?.results ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-text-primary">Notifications</h1>
          <p className="mt-0.5 text-body-sm text-text-secondary">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
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
      </div>

      <Card noPadding>
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-4">
                <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-6 pb-6 pt-2">
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="System notifications will appear here."
              className="border-0 shadow-none"
            />
          </div>
        ) : (
          <ul className="divide-y divide-border" role="list">
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
                  <p
                    className={cn(
                      'text-body-sm',
                      n.is_read ? 'text-text-secondary' : 'font-medium text-text-primary'
                    )}
                  >
                    {n.message}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-caption text-text-muted">{formatRelativeTime(n.created_at)}</span>
                    {n.link && (
                      <a href={n.link} className="text-caption font-medium text-primary hover:underline">
                        View →
                      </a>
                    )}
                  </div>
                </div>
                {!n.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-caption text-text-muted"
                    onClick={() => markReadMutation.mutate(n.id)}
                    isLoading={markReadMutation.isPending}
                  >
                    Mark read
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
