'use client'

import { useClearanceStatus, useSubmitStage } from '@/features/clearance/hooks/useClearance'
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/features/documents/hooks/useDocuments'
import { ClearanceSubmissionPanel } from '@/components/student/ClearanceSubmissionPanel'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState, EmptyState } from '@/components/shared/EmptyState'
import { useRouter, useSearchParams } from 'next/navigation'
import { ROUTES } from '@/lib/constants'
import { Suspense } from 'react'

function DocumentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlRequestId = searchParams.get('requestId')
  const urlStageId = searchParams.get('stageId')

  const { data: clearances, isLoading: loadingClearance, isError } = useClearanceStatus()
  
  // Support multi-campaign by picking the requested clearance, or falling back to the first active one
  const clearance = urlRequestId 
    ? clearances?.find((c: any) => c.id === urlRequestId)
    : (clearances?.find((c: any) => c.status !== 'COMPLETED') || clearances?.[0])

  const requestId = clearance?.id ?? ''
  
  const { data: documents, isLoading: loadingDocs } = useDocuments(requestId)
  const { mutateAsync: upload } = useUploadDocument(requestId)
  const { mutateAsync: remove } = useDeleteDocument(requestId)
  const { mutateAsync: submit } = useSubmitStage()

  if (isError) return <ErrorState />
  if (loadingClearance || (requestId && loadingDocs)) return <LoadingSkeleton rows={3} />
  if (!clearance) return <EmptyState title="No active clearance" description="Start your clearance first from the dashboard." />

  const handleUpload = async (file: File, documentTypeId: string) => {
    await upload({ documentTypeId, file })
  }

  const handleDelete = async (documentId: string) => {
    await remove(documentId)
  }

  const handleSubmit = async () => {
    await submit(requestId)
    router.push(ROUTES.student.dashboard)
  }

  return (
    <ClearanceSubmissionPanel
      request={clearance as any}
      documents={documents || []}
      initialStageId={urlStageId || undefined}
      onUploadDocument={handleUpload}
      onDeleteDocument={handleDelete}
      onSubmitStage={handleSubmit}
    />
  )
}

export default function StudentDocumentsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Clearance Documents Hub"
        subtitle="Upload all required departmental documents in advance or manage your submissions"
      />
      <Suspense fallback={<LoadingSkeleton rows={3} />}>
        <DocumentsContent />
      </Suspense>
    </div>
  )
}
