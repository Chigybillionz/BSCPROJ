import { apiClient } from './client'
import type { ClearanceRequest } from '@/types'

export const clearanceApi = {
  getStatus:   () =>
    apiClient.get<{ success: true; data: ClearanceRequest[] }>('/clearance/status'),

  start:       (sessionId: string, campaignId: string) =>
    apiClient.post<{ success: true; data: ClearanceRequest }>('/clearance/start', { sessionId, campaignId }),

  submit:      (requestId: string) =>
    apiClient.post(`/clearance/${requestId}/submit`, {}),

  approve: (requestId: string, remarks?: string, file?: File, issuedData?: any, stampId?: string) => {
    if (file) {
      const formData = new FormData()
      if (remarks) formData.append('remarks', remarks)
      if (issuedData) formData.append('issuedData', typeof issuedData === 'string' ? issuedData : JSON.stringify(issuedData))
      if (stampId) formData.append('stampId', stampId)
      formData.append('file', file)
      return apiClient.post(`/clearance/${requestId}/approve`, formData)
    }
    return apiClient.post(`/clearance/${requestId}/approve`, { remarks, issuedData, stampId })
  },

  reject:      (requestId: string, remarks: string) =>
    apiClient.post(`/clearance/${requestId}/reject`, { remarks }),

  getByStudent: (studentId: string) =>
    apiClient.get(`/clearance/by-student/${studentId}`),

  getById: (requestId: string) =>
    apiClient.get(`/clearance/${requestId}`),

  getQueue:    (page = 1, limit = 20, search?: string, sessionId?: string, campaignId?: string) =>
    apiClient.get(`/clearance/queue?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}${sessionId ? `&sessionId=${sessionId}` : ''}${campaignId ? `&campaignId=${campaignId}` : ''}`),

  getHistory:  (requestId: string) =>
    apiClient.get(`/clearance/${requestId}/history`),

  getCertificate: (requestId: string) =>
    apiClient.get(`/clearance/${requestId}/certificate`),

  verify: (clearanceNumber: string) =>
    apiClient.get<{ success: true; data: any }>(`/clearance/verify/${encodeURIComponent(clearanceNumber)}`),
}
