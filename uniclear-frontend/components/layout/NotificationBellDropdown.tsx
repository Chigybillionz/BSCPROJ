'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, CheckCheck, CheckCircle2, AlertTriangle, Sparkles,
  FileText, Info, Trash2
} from 'lucide-react'
import { notificationsApi, type AppNotification } from '@/lib/api/notifications.api'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

function formatTimeAgo(dateString: string) {
  const now = new Date()
  const past = new Date(dateString)
  const diffMs = now.getTime() - past.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return past.toLocaleDateString()
}

export function NotificationBellDropdown() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Fetch unread count (polls every 15 seconds)
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.getUnreadCount().then(r => r.data.data),
    refetchInterval: 15000,
  })
  const unreadCount = countData?.count || 0

  // Fetch recent notifications
  const { data: listData, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list(1, 15).then(r => r.data),
    refetchInterval: 15000,
  })
  const notifications: AppNotification[] = listData?.data || []

  // Mark single as read
  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Mark all as read
  const { mutate: markAllRead, isPending: markingAll } = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
  })

  // Delete notification
  const { mutate: deleteNotification } = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'STAGE_APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
      case 'STAGE_REJECTED':
        return <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
      case 'CLEARANCE_COMPLETE':
        return <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
      case 'DOCUMENT_UPLOADED':
        return <FileText className="h-4 w-4 text-blue-600 shrink-0" />
      default:
        return <Info className="h-4 w-4 text-blue-500 shrink-0" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
          open && "bg-gray-100 text-gray-900"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                disabled={markingAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List of Alerts */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-gray-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="text-sm font-medium text-gray-700">No notifications yet</p>
                <p className="text-xs text-gray-400">
                  Alerts about your clearance stage approvals and decisions will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markRead(n.id)
                  }}
                  className={cn(
                    "group relative p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-gray-50",
                    !n.isRead ? "bg-blue-50/40" : "bg-white"
                  )}
                >
                  <div className="mt-0.5 p-1.5 rounded-full bg-white shadow-2xs border border-gray-100 shrink-0">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-xs font-semibold truncate", !n.isRead ? "text-gray-900" : "text-gray-700")}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">
                      {formatTimeAgo(n.createdAt)}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(n.id)
                    }}
                    title="Dismiss notification"
                    className="absolute top-3 right-3 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-center">
            <span className="text-[11px] text-gray-500 font-medium">
              Real-time clearance alert system
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
