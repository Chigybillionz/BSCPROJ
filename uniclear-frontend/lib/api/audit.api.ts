import { apiClient } from './client'
import { AuditLog, PaginatedResponse } from '@/types'

export const AuditApi = {
  list: (params?: { page?: number; limit?: number; actorId?: string; targetId?: string; action?: string; search?: string }) =>
    apiClient.get<PaginatedResponse<AuditLog>>('/audit', { params }),
}
