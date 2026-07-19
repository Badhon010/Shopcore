import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/feedback/Spinner'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { formatRelativeDate } from '@/utils/formatDate'
import { cn } from '@/utils/cn'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/features/account/hooks/useProfile'

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error, refetch } = useNotifications(page)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = data?.results.filter((n) => !n.is_read).length ?? 0
  const totalPages = Math.ceil((data?.count ?? 0) / 10)

  return (
    <>
      <Helmet>
        <title>Notifications — ShopCore</title>
      </Helmet>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-heading-lg font-semibold text-text-primary">Notifications</h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              isLoading={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : error ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data?.results.length ? (
          <EmptyState
            icon={<Bell className="h-8 w-8" />}
            title="No notifications"
            description="You're all caught up!"
          />
        ) : (
          <>
            <div className="divide-y divide-border rounded-xl border border-border">
              {data.results.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex gap-4 p-4 transition-colors',
                    !notification.is_read && 'bg-accent-subtle/30'
                  )}
                >
                  <div
                    className={cn(
                      'mt-1 h-2 w-2 shrink-0 rounded-full',
                      notification.is_read ? 'bg-transparent' : 'bg-accent'
                    )}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-text-primary">{notification.title}</p>
                    <p className="mt-0.5 text-body-sm text-text-secondary">{notification.body}</p>
                    <p className="mt-1 text-caption text-text-tertiary">
                      {formatRelativeDate(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      isLoading={markRead.isPending}
                      onClick={() => markRead.mutate(notification.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
            )}
          </>
        )}
      </div>
    </>
  )
}
