import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { notificationsService } from '@/services/api/notifications.service'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/feedback/Skeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useToast } from '@/contexts/ToastContext'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'

const PAGE_SIZE = 20

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsService.listNotifications({ page, page_size: PAGE_SIZE }),
  })

  const markReadMutation = useMutation({
    mutationFn: (pk: string) => notificationsService.markRead(pk),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      toast({ title: 'All marked as read', variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  })

  const unreadCount = data?.results.filter((n) => !n.is_read).length ?? 0
  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Notifications</h1>
          <p className="text-sm text-text-muted">
            {data?.count ?? 0} total · {unreadCount} unread
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            isLoading={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton rows={8} height="64px" />
      ) : data?.results.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications"
          description="You're all caught up."
        />
      ) : (
        <>
          <div className="admin-surface divide-y divide-border-light overflow-hidden">
            {data?.results.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-background-subtle/50',
                  !notification.is_read && 'bg-primary-light/30'
                )}
                onClick={() =>
                  !notification.is_read && markReadMutation.mutate(String(notification.id))
                }
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    !notification.is_read
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background-subtle text-text-muted'
                  )}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm',
                      notification.is_read ? 'text-text-secondary' : 'font-medium text-text-primary'
                    )}
                  >
                    {notification.title}
                  </p>
                  {notification.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                      {notification.body}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
