'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { clearanceApi } from '@/lib/api/clearance.api'

export const clearanceKeys = {
  all:    ()           => ['clearance'] as const,
  status: ()           => ['clearance', 'status'] as const,
  queue:  ()           => ['clearance', 'queue'] as const,
  history:(id: string) => ['clearance', 'history', id] as const,
}

export function useClearanceStatus() {
  return useQuery({
    queryKey: clearanceKeys.status(),
    queryFn:  async () => {
      try {
        const res = await clearanceApi.getStatus()
        return res.data.data
      } catch (e: any) {
        if (e.response?.status === 404) return null
        throw e
      }
    },
    retry:        false,
    throwOnError: false,
  })
}

export function useOfficerQueue(page = 1, search?: string, sessionId?: string, campaignId?: string) {
  return useQuery({
    queryKey: [...clearanceKeys.queue(), page, search, sessionId, campaignId],
    queryFn:  () => clearanceApi.getQueue(page, 20, search, sessionId, campaignId).then((r: any) => ({
      items: r.data.data,
      total: r.data.pagination.total
    })),
  })
}

export function useApproveStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, remarks, file, issuedData, stampId }: { requestId: string; remarks?: string; file?: File; issuedData?: any; stampId?: string }) =>
      clearanceApi.approve(requestId, remarks, file, issuedData, stampId),
    onSuccess: () => {
      toast.success('Stage approved')
      qc.invalidateQueries({ queryKey: clearanceKeys.queue() })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to approve'),
  })
}

export function useRejectStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, remarks }: { requestId: string; remarks: string }) =>
      clearanceApi.reject(requestId, remarks),
    onSuccess: () => {
      toast.success('Stage rejected')
      qc.invalidateQueries({ queryKey: clearanceKeys.queue() })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to reject'),
  })
}

export function useSubmitStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => clearanceApi.submit(requestId),
    onSuccess: () => {
      toast.success('Submitted for review')
      qc.invalidateQueries({ queryKey: clearanceKeys.all() })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Submission failed'),
  })
}
