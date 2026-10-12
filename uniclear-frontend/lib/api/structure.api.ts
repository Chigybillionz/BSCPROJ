import { apiClient } from './client'

export const structureApi = {
  getPublicStructure: (slug?: string) =>
    apiClient.get<{ success: true; data: any[] }>(slug ? `/structure/public?tenant=${slug}` : '/structure/public'),
  getFaculties: () => apiClient.get<{ success: true; data: any[] }>('/structure/faculties'),
  getDepartments: (facultyId?: string) =>
    apiClient.get<{ success: true; data: any[] }>(facultyId ? `/structure/departments?facultyId=${facultyId}` : '/structure/departments'),
  createFaculty: (name: string) => apiClient.post<{ success: true; data: any }>('/structure/faculties', { name }),
  createDepartment: (facultyId: string, name: string, availableLevels?: string[]) => apiClient.post<{ success: true; data: any }>('/structure/departments', { facultyId, name, availableLevels }),
  deleteFaculty: (id: string) => apiClient.delete(`/structure/faculties/${id}`),
  deleteDepartment: (id: string) => apiClient.delete(`/structure/departments/${id}`)
}
