import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export interface AppNotification {
  id: string
  universityId: string
  userId: string
  type: 'STAGE_APPROVED' | 'STAGE_REJECTED' | 'CLEARANCE_COMPLETE' | 'DOCUMENT_UPLOADED' | 'GENERAL'
  title: string
  message: string
  isRead: boolean
  metadata?: any
  createdAt: string
}

export const notificationsApi = {
  list: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResponse<AppNotification>>(`/notifications?page=${page}&limit=${limit}`),
  getUnreadCount: () =>
    apiClient.get<{ success: true; data: { count: number } }>('/notifications/unread-count'),
  markRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () =>
    apiClient.patch('/notifications/read-all'),
  delete: (id: string) =>
    apiClient.delete(`/notifications/${id}`),
}
