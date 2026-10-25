import { apiClient } from './client'

export interface AcademicSession {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

export const sessionsApi = {
  list:     ()                                                                    => apiClient.get<{ success: true; data: AcademicSession[] }>('/sessions'),
  create:   (data: { name: string; startDate: string; endDate: string })          => apiClient.post('/sessions', data),
  update:   (id: string, data: { name?: string; startDate?: string; endDate?: string }) => apiClient.patch(`/sessions/${id}`, data),
  activate: (id: string)                                                          => apiClient.patch(`/sessions/${id}/activate`, {}),
  delete:   (id: string)                                                          => apiClient.delete(`/sessions/${id}`),
}

export const structureApi = {
  faculties:   () => apiClient.get('/structure/faculties'),
  departments: () => apiClient.get('/structure/departments'),
}

export const reportsApi = {
  summary:  () => apiClient.get('/reports/summary'),
  byStage:  () => apiClient.get('/reports/by-stage'),
  export:   (sessionId?: string) =>
    apiClient.get(`/reports/export${sessionId ? `?sessionId=${sessionId}` : ''}`),
}

export const universitiesApi = {
  list: (page = 1, search?: string) =>
    apiClient.get(`/universities?page=${page}${search ? `&search=${search}` : ''}`),
  getStats: () => apiClient.get<{ data: { totalStudents: number; totalClearances: number; totalOfficers: number; documents: { count: number; totalSizeMB: number }; tiers: Record<string, number> } }>('/universities/stats'),
  create: (data: object) => apiClient.post('/universities', data),
  update: (id: string, data: object) => apiClient.patch(`/universities/${id}`, data),
  suspend: (id: string)  => apiClient.patch(`/universities/${id}/suspend`, {}),
  restore: (id: string)  => apiClient.patch(`/universities/${id}/restore`, {}),
  updateContract: (id: string, data: object) => apiClient.patch(`/universities/${id}/contract`, data),
  getApiKey: () => apiClient.get<{ success: true, data: { apiKey: string | null } }>('/universities/settings/api-key'),
  generateApiKey: () => apiClient.post<{ success: true, data: { apiKey: string } }>('/universities/settings/api-key/generate', {}),
}

export const brandingApi = {
  get:           ()                   => apiClient.get('/branding'),
  update:        (data: object)       => apiClient.patch('/branding', data),
  uploadLogo:    (file: File)         => {
    const form = new FormData(); form.append('file', file)
    return apiClient.post('/branding/logo', form)
  },
  uploadLoginBg: (file: File)         => {
    const form = new FormData(); form.append('file', file)
    return apiClient.post('/branding/login-bg', form)
  },
}
