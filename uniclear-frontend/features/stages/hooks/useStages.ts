'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { stagesApi } from '@/lib/api/stages.api'
import { officersApi } from '@/lib/api/officers.api'
import { apiClient } from '@/lib/api/client'

export const stageKeys = {
  all: (campaignId?: string) => ['stages', campaignId] as const,
}

export function useStages(campaignId?: string) {
  return useQuery({
    queryKey: stageKeys.all(campaignId),
    queryFn:  () => stagesApi.list(campaignId).then(r => r.data.data),
  })
}

export function useReorderStages(campaignId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => stagesApi.reorder(ids),
    onSuccess:  () => qc.invalidateQueries({ queryKey: stageKeys.all(campaignId) }),
    onError:    (e: any) => toast.error(e.response?.data?.message ?? 'Reorder failed'),
  })
}

export function useCreateStage(campaignId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; campaignId?: string; scope?: 'UNIVERSITY' | 'FACULTY' | 'DEPARTMENT' }) => stagesApi.create({ ...data, campaignId: data.campaignId || campaignId }),
    onSuccess:  () => {
      toast.success('Stage created')
      qc.invalidateQueries({ queryKey: ['stages'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create stage'),
  })
}

export function useUpdateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => stagesApi.update(id, data),
    onSuccess:  () => {
      toast.success('Stage updated')
      qc.invalidateQueries({ queryKey: ['stages'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Update failed'),
  })
}

export function useDeleteStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => stagesApi.delete(id),
    onSuccess: () => {
      toast.success('Stage deleted')
      qc.invalidateQueries({ queryKey: ['stages'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to delete stage'),
  })
}

export function useAssignDocumentToStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ documentTypeId, stageId }: { documentTypeId: string; stageId: string }) =>
      apiClient.post(`/document-types/${documentTypeId}/assign-stage`, { stageId, isRequired: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stages'] }),
    onError:   (e: any) => toast.error(e.response?.data?.message ?? 'Failed to assign document'),
  })
}

export function useRemoveDocumentFromStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ documentTypeId, stageId }: { documentTypeId: string; stageId: string }) =>
      apiClient.delete(`/document-types/${documentTypeId}/assign-stage/${stageId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stages'] }),
    onError:   (e: any) => toast.error(e.response?.data?.message ?? 'Failed to remove document'),
  })
}

export function useAssignOfficerToStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ stageId, data }: { stageId: string; data: { officerId: string; facultyId?: string; departmentId?: string; sessionId?: string } }) =>
      officersApi.assign(stageId, data),
    onSuccess: () => {
      toast.success('Officer assigned')
      qc.invalidateQueries({ queryKey: ['stages'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to assign officer'),
  })
}

export function useUnassignOfficerFromStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) => officersApi.unassign(assignmentId),
    onSuccess: () => {
      toast.success('Officer removed')
      qc.invalidateQueries({ queryKey: ['stages'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to remove officer'),
  })
}
