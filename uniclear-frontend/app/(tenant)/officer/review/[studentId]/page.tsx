'use client'

import Image from 'next/image'
import { use, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApproveStage, useRejectStage } from '@/features/clearance/hooks/useClearance'
import { RejectDialog } from '@/components/officer/RejectDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import dynamic from 'next/dynamic'
const PdfStampViewer = dynamic(
  () => import('@/components/officer/PdfStampViewer').then(mod => mod.PdfStampViewer),
  { ssr: false, loading: () => <LoadingSkeleton rows={10} /> }
)
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/EmptyState'
import { clearanceApi } from '@/lib/api/clearance.api'
import { useStages } from '@/features/stages/hooks/useStages'
import { documentsApi } from '@/lib/api/documents.api'
import { formatDateTime, getInitials } from '@/lib/utils/format'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Building2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'

export default function ReviewPage({ params }: { params: Promise<{ studentId: string }> }) {
  const router = useRouter()
  const qc = useQueryClient()
  const { studentId } = use(params)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [docRejectOpen, setDocRejectOpen] = useState(false)
  const [docRejectReason, setDocRejectReason] = useState('')
  const [selectedDocIdx, setSelectedDocIdx] = useState(0)
  const [stampedFile, setStampedFile] = useState<File | undefined>()
  const [selectedStampId, setSelectedStampId] = useState<string | undefined>()
  const [docActionPending, setDocActionPending] = useState(false)

  // Resilient query: handles both requestId and studentId
  const { data: clearance, isLoading, isError } = useQuery({
    queryKey: ['clearance', 'review', studentId],
    queryFn: async () => {
      try {
        const res = await clearanceApi.getById(studentId)
        return res.data.data
      } catch {
        const res = await clearanceApi.getByStudent(studentId)
        return Array.isArray(res.data.data) ? res.data.data[0] : res.data.data
      }
    },
  })

  const { data: documents, refetch: refetchDocs } = useQuery({
    queryKey: ['documents', clearance?.id],
    queryFn: () => documentsApi.getByRequest(clearance!.id).then(r => r.data.data),
    enabled: !!clearance?.id,
  })

  const { mutate: approve, isPending: approving } = useApproveStage()
  const { mutate: reject, isPending: rejecting } = useRejectStage()

  const { data: allStages } = useStages()

  const [issueDataOpen, setIssueDataOpen] = useState(false)
  const [issuedData, setIssuedData] = useState<Record<string, string>>({})

  if (isLoading) return <LoadingSkeleton rows={6} />
  if (isError || !clearance) return <ErrorState />

  const campaignStages = allStages?.filter(s => s.campaignId === clearance.campaignId) || []
  const sortedStages = [...campaignStages].sort((a, b) => a.orderIndex - b.orderIndex)
  const isFinalStage =
    sortedStages.length > 0 &&
    sortedStages[sortedStages.length - 1].id === clearance.currentStageId
  const issuedDataFields: string[] = clearance.campaign?.issuedDataFields || []
  const needsIssuedData = isFinalStage && issuedDataFields.length > 0

  // Check how many documents have been approved
  const approvedDocsCount = documents?.filter(d => (d as any).status === 'APPROVED').length ?? 0
  const totalDocsCount = documents?.length ?? 0
  const allDocsApproved = totalDocsCount > 0 && approvedDocsCount === totalDocsCount

  const handleApproveDoc = async (docId: string) => {
    setDocActionPending(true)
    try {
      await documentsApi.approve(docId)
      toast.success('Document marked as verified & approved')
      refetchDocs()
    } catch {
      toast.error('Failed to approve document')
    } finally {
      setDocActionPending(false)
    }
  }

  const handleRejectDoc = async () => {
    if (!docRejectReason.trim()) return toast.error('Please enter a rejection reason')
    const doc = documents?.[selectedDocIdx]
    if (!doc) return
    setDocActionPending(true)
    try {
      await documentsApi.reject(doc.id, docRejectReason)
      toast.success('Document rejected — student notified to re-upload')
      setDocRejectOpen(false)
      setDocRejectReason('')
      refetchDocs()
    } catch {
      toast.error('Failed to reject document')
    } finally {
      setDocActionPending(false)
    }
  }

  const handleApproveClick = () => {
    if (needsIssuedData) {
      setIssueDataOpen(true)
    } else {
      approve(
        { requestId: clearance.id, file: stampedFile, stampId: selectedStampId },
        {
          onSuccess: () => {
            qc.invalidateQueries()
            router.push(ROUTES.officer.queue)
          },
        }
      )
    }
  }

  const handleIssueDataSubmit = () => {
    approve(
      { requestId: clearance.id, file: stampedFile, issuedData, stampId: selectedStampId },
      {
        onSuccess: () => {
          setIssueDataOpen(false)
          qc.invalidateQueries()
          router.push(ROUTES.officer.queue)
        },
      }
    )
  }

  const selectedDoc = documents?.[selectedDocIdx]
  const selectedDocStatus = (selectedDoc as any)?.status ?? 'PENDING'

  const docStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        )
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3" /> Pending Review
          </span>
        )
    }
  }

  const studentFullName = `${clearance.student?.firstName ?? ''} ${clearance.student?.lastName ?? ''}`.trim() || 'Student'
  const initials = getInitials(studentFullName)

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-3 pb-3">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between shrink-0 px-1">
        <button
          onClick={() => router.push(ROUTES.officer.queue)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors py-1 px-2 rounded-lg hover:bg-[var(--color-bg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Officer Queue</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-muted)] font-medium">Clearance Request:</span>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]">
            {clearance.clearanceNumber || clearance.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Main Split-Screen Layout */}
      {/* LEFT: Document Viewer (using react-pdf / PdfStampViewer) */}
      {/* RIGHT: Student Details & Approve/Reject Decision Buttons */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
        
        {/* ======================================================== */}
        {/* LEFT PANEL: Document Viewer (react-pdf)                  */}
        {/* ======================================================== */}
        <Card className="flex-1 flex flex-col overflow-hidden p-0 border border-[var(--color-border)] shadow-xs">
          {/* Document Tabs Bar */}
          <div className="bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {documents && documents.length > 0 ? (
                documents.map((doc, idx) => {
                  const isCurrent = idx === selectedDocIdx
                  const status = (doc as any).status ?? 'PENDING'
                  return (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocIdx(idx)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        isCurrent
                          ? 'bg-[var(--color-surface)] text-[var(--color-primary)] border border-[var(--color-border)] shadow-xs'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/60'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{doc.documentType?.name || `Doc ${idx + 1}`}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          status === 'APPROVED'
                            ? 'bg-emerald-500'
                            : status === 'REJECTED'
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                        }`}
                      />
                    </button>
                  )
                })
              ) : (
                <span className="text-xs text-[var(--color-muted)]">No documents uploaded</span>
              )}
            </div>

            {/* Document Pagination */}
            {documents && documents.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  disabled={selectedDocIdx === 0}
                  onClick={() => setSelectedDocIdx(i => Math.max(0, i - 1))}
                  className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] disabled:opacity-30 disabled:pointer-events-none text-[var(--color-text)]"
                  title="Previous document"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-mono font-medium text-[var(--color-muted)] px-1">
                  {selectedDocIdx + 1}/{documents.length}
                </span>
                <button
                  disabled={selectedDocIdx >= documents.length - 1}
                  onClick={() => setSelectedDocIdx(i => Math.min(documents.length - 1, i + 1))}
                  className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] disabled:opacity-30 disabled:pointer-events-none text-[var(--color-text)]"
                  title="Next document"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Document Content Area */}
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg)]/30 relative">
            {selectedDoc ? (
              <>
                {/* Active Document Subheader */}
                <div className="px-4 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <p className="text-xs font-bold text-[var(--color-text)] truncate">
                      {selectedDoc.documentType?.name}
                    </p>
                    {docStatusBadge(selectedDocStatus)}
                  </div>

                  {/* Individual Doc Actions */}
                  <div className="flex items-center gap-2">
                    {selectedDoc.fileUrl && (
                      <a
                        href={selectedDoc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)] font-medium p-1 hover:underline"
                        title="Open file in new tab"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Open Raw</span>
                      </a>
                    )}
                    {selectedDocStatus !== 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={docActionPending}
                        onClick={() => handleApproveDoc(selectedDoc.id)}
                        className="text-xs text-emerald-700 hover:border-emerald-600 h-7 px-2.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Verify Doc
                      </Button>
                    )}
                    {selectedDocStatus !== 'REJECTED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={docActionPending}
                        onClick={() => setDocRejectOpen(true)}
                        className="text-xs text-rose-600 hover:bg-rose-50 h-7 px-2"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Flag Doc
                      </Button>
                    )}
                  </div>
                </div>

                {/* React-PDF / Image Canvas */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
                  {selectedDoc.mimeType === 'application/pdf' ? (
                    <div className="w-full h-full min-h-[450px]">
                      <PdfStampViewer
                        fileUrl={selectedDoc.fileUrl}
                        onSaveStampedFile={file => setStampedFile(file)}
                        onStampSelect={stamp => setSelectedStampId(stamp?.id)}
                      />
                    </div>
                  ) : (
                    <div className="relative w-full h-full min-h-[450px] flex items-center justify-center">
                      <Image
                        src={selectedDoc.fileUrl}
                        alt={selectedDoc.documentType?.name || 'Document Preview'}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <FileText className="h-12 w-12 text-[var(--color-muted)] opacity-50 mb-2" />
                <h4 className="text-sm font-semibold text-[var(--color-text)]">
                  No Document Selected
                </h4>
                <p className="text-xs text-[var(--color-muted)] max-w-xs mt-1">
                  Select a document from the top tabs to preview and verify.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Student Details & Approval Action Panel     */}
        {/* ======================================================== */}
        <Card className="w-full md:w-[380px] lg:w-[420px] flex flex-col justify-between overflow-y-auto p-5 border border-[var(--color-border)] shadow-xs shrink-0">
          <div className="space-y-4">
            {/* Student Profile Card */}
            <div className="pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-base flex items-center justify-center shadow-xs">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[var(--color-text)] truncate">
                    {studentFullName}
                  </h3>
                  <span className="font-mono text-xs font-semibold text-[var(--color-primary)]">
                    {clearance.student?.jambRegNo || 'JAMB Reg No N/A'}
                  </span>
                </div>
              </div>

              {/* Department & Academic Info */}
              <div className="bg-[var(--color-bg)] rounded-xl p-3 border border-[var(--color-border)] space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-[var(--color-muted)] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">
                      {clearance.student?.department?.name || 'Department of Physical Sciences'}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      {clearance.student?.faculty?.name || 'Faculty of Physical Sciences'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)] text-[11px] text-[var(--color-muted)]">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Level: <strong className="text-[var(--color-text)]">{clearance.student?.level || '100'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Matric: <strong className="font-mono text-[var(--color-text)]">{clearance.student?.matricNo || 'Pending'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Current Stage Card */}
            <div className="pb-4 border-b border-[var(--color-border)] space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-muted)]">
                  Current Clearance Stage
                </p>
                <span className="text-xs font-mono font-bold text-[var(--color-primary)]">
                  #{clearance.currentStage?.orderIndex ?? 1}
                </span>
              </div>
              <p className="text-sm font-bold text-[var(--color-text)]">
                {clearance.currentStage?.name || 'Assigned Review Stage'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Submitted on {formatDateTime(clearance.updatedAt || clearance.createdAt)}</span>
              </div>
            </div>

            {/* Document Verification Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-muted)]">
                  Documents Verified
                </p>
                <span className="text-xs font-semibold text-[var(--color-text)]">
                  {approvedDocsCount} of {totalDocsCount} Verified
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-[var(--color-bg)] rounded-full overflow-hidden border border-[var(--color-border)]">
                <div
                  className={`h-full transition-all duration-300 ${
                    allDocsApproved ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${totalDocsCount > 0 ? (approvedDocsCount / totalDocsCount) * 100 : 0}%`,
                  }}
                />
              </div>

              {/* Document items list */}
              <div className="space-y-1.5 pt-1">
                {documents?.map((doc, idx) => {
                  const isCurrent = idx === selectedDocIdx
                  const status = (doc as any).status ?? 'PENDING'
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocIdx(idx)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-[var(--color-bg)] border border-[var(--color-border)] font-semibold'
                          : 'hover:bg-[var(--color-bg)] text-[var(--color-muted)]'
                      }`}
                    >
                      <span className="truncate pr-2">{doc.documentType?.name}</span>
                      <span className="shrink-0">{docStatusBadge(status)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* Main Action Buttons: "Approve" (Green) and "Reject" (Red) */}
          {/* ======================================================== */}
          <div className="pt-4 border-t border-[var(--color-border)] space-y-2.5 mt-auto">
            {!allDocsApproved && totalDocsCount > 0 && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-tight">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Please verify each required document above before submitting final approval.
                </span>
              </div>
            )}

            {/* 1. Main Action Button: APPROVE (Green) */}
            <Button
              className="w-full py-3 h-auto text-sm font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-xs rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              loading={approving}
              disabled={!allDocsApproved || approving}
              onClick={handleApproveClick}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {approving
                  ? 'Approving...'
                  : isFinalStage
                  ? 'Approve & Issue Final Clearance'
                  : 'Approve Clearance Stage'}
              </span>
            </Button>

            {/* 2. Main Action Button: REJECT (Red) */}
            <Button
              variant="danger"
              className="w-full py-3 h-auto text-sm font-bold bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white shadow-xs rounded-xl flex items-center justify-center gap-2"
              loading={rejecting}
              disabled={rejecting}
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="h-4 w-4" />
              <span>{rejecting ? 'Rejecting...' : 'Reject Clearance Stage'}</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* Reject Modal (Requires Officer Remarks)                  */}
      {/* ======================================================== */}
      {rejectOpen && (
        <RejectDialog
          isPending={rejecting}
          onConfirm={remarks =>
            reject(
              { requestId: clearance.id, remarks },
              {
                onSuccess: () => {
                  setRejectOpen(false)
                  qc.invalidateQueries()
                  router.push(ROUTES.officer.queue)
                },
              }
            )
          }
          onCancel={() => setRejectOpen(false)}
        />
      )}

      {/* Individual Document Reject Modal */}
      <Dialog
        open={docRejectOpen}
        onClose={() => {
          setDocRejectOpen(false)
          setDocRejectReason('')
        }}
        title="Flag / Reject Document"
      >
        <div className="pt-3 space-y-4">
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            Specify why this document is invalid or rejected (e.g. illegible, missing stamp, wrong session). The student will be prompted to re-upload.
          </p>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text)] mb-1 block">
              Rejection Remarks (Required)
            </label>
            <Input
              value={docRejectReason}
              onChange={e => setDocRejectReason(e.target.value)}
              placeholder="e.g. Document image is blurry. Please upload a clear PDF copy."
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDocRejectOpen(false)
                setDocRejectReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={docActionPending}
              disabled={!docRejectReason.trim()}
              onClick={handleRejectDoc}
            >
              Confirm Document Rejection
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Final Stage Issued Data Modal */}
      <Dialog
        open={issueDataOpen}
        onClose={() => setIssueDataOpen(false)}
        title="Final Clearance Issuance Data"
      >
        <div className="pt-3 space-y-4">
          <p className="text-xs text-[var(--color-muted)]">
            This is the final clearance stage. Please enter the final parameters required for certificate generation.
          </p>
          {issuedDataFields.map(field => (
            <div key={field}>
              <label className="text-xs font-semibold mb-1 block capitalize">{field}</label>
              <Input
                value={issuedData[field] || ''}
                onChange={e => setIssuedData({ ...issuedData, [field]: e.target.value })}
                placeholder={`Enter ${field}`}
                className="text-xs"
              />
            </div>
          ))}
          <div className="flex justify-end pt-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIssueDataOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={approving}
              onClick={handleIssueDataSubmit}
              disabled={issuedDataFields.some(f => !issuedData[f]?.trim())}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Confirm & Issue Clearance
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
