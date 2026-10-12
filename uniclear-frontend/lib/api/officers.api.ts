import { apiClient } from './client'
import type { Officer, PaginatedResponse, ClearanceRequest } from '@/types'

export const officersApi = {
  list: (page = 1, limit = 20, stageId?: string) =>
    apiClient.get<PaginatedResponse<Officer>>(
      `/officers?page=${page}&limit=${limit}${stageId ? `&stageId=${stageId}` : ''}`
    ),
  getMe: () =>
    apiClient.get<{ success: true; data: Officer }>('/officers/me'),
  getQueue: (page = 1, limit = 20, search?: string, sessionId?: string, campaignId?: string, stageStatus?: string) =>
    apiClient.get<PaginatedResponse<ClearanceRequest>>('/officers/queue', {
      params: { page, limit, search, sessionId, campaignId, stageStatus }
    }),
  create: (data: { email: string; firstName: string; lastName: string }) =>
    apiClient.post<{ success: true; data: Officer }>('/officers', data),
  update: (id: string, data: { firstName?: string; lastName?: string }) =>
    apiClient.patch(`/officers/${id}`, data),
  delete: (id: string) =>
    apiClient.delete(`/officers/${id}`),
  assign: (stageId: string, data: { officerId: string; facultyId?: string; departmentId?: string; sessionId?: string }) =>
    apiClient.post(`/officers/stage/${stageId}/assign`, data),
  unassign: (assignmentId: string) =>
    apiClient.delete(`/officers/assignment/${assignmentId}`),
}
