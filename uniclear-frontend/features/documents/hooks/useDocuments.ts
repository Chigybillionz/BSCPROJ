'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { documentsApi } from '@/lib/api/documents.api'

export const documentKeys = {
  byRequest: (id: string) => ['documents', 'request', id] as const,
}

export function useDocuments(requestId: string) {
  return useQuery({
    queryKey: documentKeys.byRequest(requestId),
    queryFn:  () => documentsApi.getByRequest(requestId).then(r => r.data.data),
    enabled:  !!requestId,
  })
}

export function useUploadDocument(requestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ documentTypeId, file }: { documentTypeId: string; file: File }) =>
      documentsApi.upload(requestId, documentTypeId, file),
    onSuccess: () => {
      toast.success('Document uploaded')
      qc.invalidateQueries({ queryKey: documentKeys.byRequest(requestId) })
      qc.invalidateQueries({ queryKey: ['clearance'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Upload failed'),
  })
}

export function useDeleteDocument(requestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      toast.success('Document removed')
      qc.invalidateQueries({ queryKey: documentKeys.byRequest(requestId) })
      qc.invalidateQueries({ queryKey: ['clearance'] })
    },
  })
}
