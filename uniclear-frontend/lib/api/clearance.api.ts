import { apiClient } from './client'
import type { ClearanceRequest } from '@/types'

export const clearanceApi = {
  getStatus:   () =>
    apiClient.get<{ success: true; data: ClearanceRequest[] }>('/clearance/status'),

  start:       (sessionId: string, campaignId: string) =>
    apiClient.post<{ success: true; data: ClearanceRequest }>('/clearance/start', { sessionId, campaignId }),

  submit:      (requestId: string, stageId?: string) =>
    apiClient.post(`/clearance/${requestId}/submit`, { stageId }),

  approve: (requestId: string, remarks?: string, file?: File, issuedData?: any, stampId?: string, stageId?: string) => {
    if (file) {
      const formData = new FormData()
      if (remarks) formData.append('remarks', remarks)
      if (issuedData) formData.append('issuedData', typeof issuedData === 'string' ? issuedData : JSON.stringify(issuedData))
      if (stampId) formData.append('stampId', stampId)
      if (stageId) formData.append('stageId', stageId)
      formData.append('file', file)
      return apiClient.post(`/clearance/${requestId}/approve`, formData)
    }
    return apiClient.post(`/clearance/${requestId}/approve`, { remarks, issuedData, stampId, stageId })
  },

  reject:      (requestId: string, remarks: string, stageId?: string) =>
    apiClient.post(`/clearance/${requestId}/reject`, { remarks, stageId }),

  getByStudent: (studentId: string) =>
    apiClient.get(`/clearance/by-student/${studentId}`),

  getById: (requestId: string) =>
    apiClient.get(`/clearance/${requestId}`),

  getQueue:    (page = 1, limit = 20, search?: string, sessionId?: string, campaignId?: string, stageStatus?: string) =>
    apiClient.get(`/clearance/queue?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}${sessionId ? `&sessionId=${sessionId}` : ''}${campaignId ? `&campaignId=${campaignId}` : ''}${stageStatus ? `&stageStatus=${stageStatus}` : ''}`),

  getHistory:  (requestId: string) =>
    apiClient.get(`/clearance/${requestId}/history`),

  getCertificate: (requestId: string) =>
    apiClient.get(`/clearance/${requestId}/certificate`),

  downloadCertificatePdf: async (requestId: string, fileName?: string) => {
    const res = await apiClient.get(`/clearance/${requestId}/certificate/pdf`, {
      responseType: 'blob',
    })
    if (typeof window !== 'undefined') {
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const link = document.createElement('a')
      const url = window.URL.createObjectURL(blob)
      link.href = url
      link.download = fileName || `Clearance_Certificate_${requestId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }
    return res
  },

  verify: (clearanceNumber: string) =>
    apiClient.get<{ success: true; data: any }>(`/clearance/verify/${encodeURIComponent(clearanceNumber)}`),
}
