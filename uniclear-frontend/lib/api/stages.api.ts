import { apiClient } from './client'
import type { ClearanceStage } from '@/types'

export const stagesApi = {
  list:    (campaignId?: string) => apiClient.get<{ success: true; data: ClearanceStage[] }>(`/stages${campaignId ? `?campaignId=${campaignId}` : ''}`),
  reorder: (ids: string[]) => apiClient.patch('/stages/reorder', {
    stages: ids.map((id, index) => ({ id, orderIndex: index + 1 }))
  }),
  create:  (data: { name: string; description?: string; campaignId?: string; scope?: string }) => apiClient.post('/stages', data),
  update:  (id: string, data: Partial<ClearanceStage>)   => apiClient.patch(`/stages/${id}`, data),
  delete:  (id: string) => apiClient.delete(`/stages/${id}`),
}
