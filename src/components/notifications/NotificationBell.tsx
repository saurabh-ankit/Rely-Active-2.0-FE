import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Archive, Bell, CheckCheck, Loader2 } from 'lucide-react'
import {
  useArchiveNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadNotificationCountQuery,
} from '@/hooks/react-query/notifications'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import type { NotificationItem } from '@/lib/types/notification'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  onOpen?: () => void
}

const LIST_QUERY = { page: 1, limit: 12, status: 'ALL' as const }

function timeAgo(value?: string | null): string {
  if (!value) return 'just now'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'just now'
  return formatDistanceToNow(parsed, { addSuffix: true })
}

/** When a notification happened, for newest-first ordering (0 if unknown). */
function notificationTime(item: NotificationItem): number {
  const parsed = new Date(item.event?.occurredAt || item.createdAt || '').getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function severityClass(severity?: string | null): string {
  if (severity === 'CRITICAL') return 'border-rose-200 bg-rose-50'
  if (severity === 'WARNING') return 'border-amber-200 bg-amber-50'
  return 'border-gray-200 bg-white'
}

export function NotificationBell({ onOpen }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const unreadCountQuery = useUnreadNotificationCountQuery()
  const notificationsQuery = useNotificationsQuery(isOpen, LIST_QUERY)

  const markReadMutation = useMarkNotificationReadMutation()
  const markAllReadMutation = useMarkAllNotificationsReadMutation()
  const archiveMutation = useArchiveNotificationMutation()

  const unreadCount = unreadCountQuery.data?.data.unreadCount ?? 0
  // Newest on top: the API already sorts this way; sorting again keeps the order right
  // even if items arrive out of order. The sort is stable, so ties keep the API order.
  const notifications = useMemo(
    () =>
      [...(notificationsQuery.data?.data.notifications ?? [])].sort(
        (a, b) => notificationTime(b) - notificationTime(a),
      ),
    [notificationsQuery.data?.data.notifications],
  )

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next)
    if (next) onOpen?.()
  }

  /**
   * Handles the full "tap a notification" flow:
   * mark it as read first, then follow the attached destination.
   */
  const handleNotificationClick = async (item: NotificationItem) => {
    if (item.status === 'UNREAD') {
      try {
        await markReadMutation.mutateAsync(item.id)
      } catch {
        // Keep navigation smooth even if the read-state call fails.
      }
    }

    const destination = item.event?.actionValue
    if (destination) {
      navigate(destination)
      setIsOpen(false)
    }
  }

  const handleArchive = async (event: React.MouseEvent, item: NotificationItem) => {
    event.stopPropagation()
    try {
      await archiveMutation.mutateAsync(item.id)
    } catch {
      // Quiet fail: archived state can be retried from the same card.
    }
  }

  const busy =
    notificationsQuery.isFetching ||
    markReadMutation.isPending ||
    markAllReadMutation.isPending ||
    archiveMutation.isPending

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg text-gray-700 transition-transform hover:scale-105 cursor-pointer"
        title="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-[360px] p-0 rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            <p className="text-[11px] text-gray-500">{unreadCount} unread</p>
          </div>
          <Button
            variant="ghost"
            type="button"
            onClick={() => markAllReadMutation.mutate(undefined)}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            className="h-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#005390] bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {notificationsQuery.isLoading ? (
            <div className="px-3 py-8 text-center text-xs font-semibold text-gray-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs font-semibold text-gray-400">No notifications yet</div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'w-full text-left rounded-xl border p-3 mb-2 transition-colors hover:bg-gray-50 flex items-start justify-between gap-2',
                  severityClass(item.event?.severity),
                  item.status === 'UNREAD' ? 'ring-1 ring-blue-200' : 'opacity-90',
                )}
              >
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className="flex-1 min-w-0 p-0 h-auto text-left justify-start items-start flex-col font-normal hover:bg-transparent cursor-pointer whitespace-normal"
                >
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#005390] truncate w-full">
                    {item.event?.module || 'SYSTEM'}
                  </p>
                  <p className="text-xs font-bold text-gray-900 line-clamp-1 w-full">
                    {item.event?.title || 'Notification'}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-600 leading-relaxed line-clamp-2 w-full">
                    {item.event?.message || 'You have a new update.'}
                  </p>

                  <div className="mt-2 flex items-center justify-between w-full">
                    <span className="text-[10px] text-gray-400 font-semibold">
                      {timeAgo(item.event?.occurredAt || item.createdAt)}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold truncate max-w-[160px]">
                      {item.event?.actorName || 'System'}
                    </span>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  onClick={(event) => handleArchive(event, item)}
                  disabled={archiveMutation.isPending}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Archive notification"
                  title="Archive"
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        {busy && (
          <div className="px-3 py-2 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Syncing...
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
