'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApproveStage, useRejectStage } from '@/features/clearance/hooks/useClearance'
import { RejectDialog } from '@/components/officer/RejectDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { officerStampsApi, OfficerStamp } from '@/lib/api/officerStamps.api'
import { StampManagerDialog } from '@/components/officer/StampManagerDialog'
import dynamic from 'next/dynamic'
const PdfStampViewer = dynamic(
  () => import('@/components/officer/PdfStampViewer').then(mod => mod.PdfStampViewer),
  { ssr: false, loading: () => <LoadingSkeleton rows={10} /> }
)

import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/EmptyState'
import { clearanceApi } from '@/lib/api/clearance.api'
import { documentsApi } from '@/lib/api/documents.api'
import { formatDateTime, getInitials, normalizeDocUrl } from '@/lib/utils/format'
import { useRouter, useSearchParams } from 'next/navigation'
import { officersApi } from '@/lib/api/officers.api'
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
  ExternalLink,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCw,
  MessageSquare,
  AlertCircle
} from 'lucide-react'

function InteractiveImageViewer({ url, alt }: { url: string; alt: string }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Reset controls when url changes
  const [currentUrl, setCurrentUrl] = useState(url)
  if (url !== currentUrl) {
    setCurrentUrl(url)
    setZoom(1)
    setRotation(0)
    setLoaded(false)
    setHasError(false)
  }

  return (
    <div className="relative w-full h-full min-h-[480px] flex flex-col items-center justify-center bg-slate-900/5 rounded-xl overflow-hidden p-2">
      {/* Floating Control Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-md">
        <button
          type="button"
          onClick={() => setZoom(z => Math.min(Number((z + 0.25).toFixed(2)), 3))}
          className="p-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(z => Math.max(Number((z - 0.25).toFixed(2)), 0.5))}
          className="p-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setRotation(r => (r + 90) % 360)}
          className="p-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          title="Rotate 90° Clockwise"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => { setZoom(1); setRotation(0); }}
          className="px-1.5 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 rounded"
          title="Reset View"
        >
          {Math.round(zoom * 100)}%
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="p-1 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-slate-100 ml-0.5"
          title="Open Original in New Tab"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Loading Spinner */}
      {!loaded && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-slate-50/50">
          <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          <span className="text-xs text-slate-600 font-medium">Loading document preview...</span>
        </div>
      )}

      {/* Error State */}
      {hasError ? (
        <div className="p-8 text-center max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-slate-800">Could not render image preview directly</p>
          <p className="text-[11px] text-slate-500">The file format or network host requires direct inspection.</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100"
          >
            <span>Open Image in New Window</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            onLoad={() => setLoaded(true)}
            onError={() => setHasError(true)}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            className={`rounded-lg shadow-sm ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      )}
    </div>
  )
}

export default function ReviewPage({ params }: { params: Promise<{ studentId: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlStageId = searchParams.get('stageId')
  const qc = useQueryClient()
  const { studentId } = use(params)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [docRejectOpen, setDocRejectOpen] = useState(false)
  const [docRejectReason, setDocRejectReason] = useState('')
  const [selectedDocIdx, setSelectedDocIdx] = useState(0)
  const [stampedFile, setStampedFile] = useState<File | undefined>()
  const [selectedStampId, setSelectedStampId] = useState<string | undefined>()
  const [docActionPending, setDocActionPending] = useState(false)
  const [docFilter, setDocFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [docSearch, setDocSearch] = useState('')
  const [chosenStageId, setChosenStageId] = useState<string | null>(null)
  const [fastTracking, setFastTracking] = useState(false)

  // Load officer profile for assigned stages
  const { data: meRes } = useQuery({
    queryKey: ['officer', 'me'],
    queryFn: () => officersApi.getMe().then((r: any) => r.data.data),
  })

  // Load officer's available stamps and auto-select default stamp
  const { data: officerStampsRes, refetch: refetchStamps } = useQuery({
    queryKey: ['officerStamps'],
    queryFn: () => officerStampsApi.getAll().then(r => r.data.data),
  })
  const [stampsList, setStampsList] = useState<OfficerStamp[]>([])

  useEffect(() => {
    if (officerStampsRes) {
      setStampsList(officerStampsRes)
      if (officerStampsRes.length > 0 && !selectedStampId) {
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('uniclear_default_stamp_id') : null
        const match = officerStampsRes.find((s: OfficerStamp) => s.id === savedId) || officerStampsRes[0]
        if (match) setSelectedStampId(match.id)
      }
    }
  }, [officerStampsRes, selectedStampId])

  const handleSelectStamp = (id: string) => {
    setSelectedStampId(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('uniclear_default_stamp_id', id)
    }
    toast.success('Official stamp linked to this clearance endorsement')
  }


  // Resilient query: handles both requestId and studentId, with 8s polling for real-time sync
  const { data: clearance, isLoading, isError, refetch: refetchClearance, isFetching: fetchingClearance } = useQuery({
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
    refetchInterval: 8000,
    staleTime: 0,
  })

  const { data: documents, refetch: refetchDocs, isFetching: fetchingDocs } = useQuery({
    queryKey: ['documents', clearance?.id],
    queryFn: () => documentsApi.getByRequest(clearance!.id).then(r => r.data.data),
    enabled: !!clearance?.id,
    refetchInterval: 8000,
    staleTime: 0,
  })

  const handleManualRefresh = () => {
    refetchClearance()
    refetchDocs()
    toast.success('Document verification list refreshed', { id: 'manual-refresh' })
  }

  const { mutate: approve, isPending: approving } = useApproveStage()
  const { mutate: reject, isPending: rejecting } = useRejectStage()

  const [issueDataOpen, setIssueDataOpen] = useState(false)
  const [issuedData, setIssuedData] = useState<Record<string, string>>({})

  if (isLoading) return <LoadingSkeleton rows={6} />
  if (isError || !clearance) return <ErrorState />

  // Use stages already embedded in the clearance response — avoids a separate
  // query and prevents isFinalStage being wrong while useStages() is loading.
  const sortedStages = [...((clearance.campaign?.stages as any[]) || [])]
    .sort((a: any, b: any) => a.orderIndex - b.orderIndex)

  const approvedStageIds = (clearance.stageApprovals || [])
    .filter((a: any) => a.status === 'APPROVED')
    .map((a: any) => a.stageId)

  const officerAssignedStages = sortedStages.filter(s =>
    meRes?.stageAssignments?.some((a: any) => a.stageId === s.id)
  )

  const activeStageId = 
    chosenStageId ||
    (urlStageId && sortedStages.some(s => s.id === urlStageId) ? urlStageId : null) ||
    officerAssignedStages.find(s => !approvedStageIds.includes(s.id))?.id ||
    clearance.currentStageId ||
    sortedStages[0]?.id || ''

  const activeStage = sortedStages.find(s => s.id === activeStageId) || sortedStages[0]
  const isCurrentStageApproved = approvedStageIds.includes(activeStageId)

  const remainingUnapprovedStages = sortedStages.filter(s => !approvedStageIds.includes(s.id) && s.id !== activeStageId)
  const isFinalStage = remainingUnapprovedStages.length === 0
  const issuedDataFields: string[] = clearance.campaign?.issuedDataFields || []
  const needsIssuedData = isFinalStage && issuedDataFields.length > 0

  // Stage-specific document requirements
  const stageReqTypeIds = (activeStage?.documentRequirements || []).map((r: any) => r.documentTypeId)
  
  // Required docs uploaded and not rejected
  const areRequiredDocsUploaded = stageReqTypeIds.length > 0
    ? stageReqTypeIds.every(typeId => {
        const matchingDoc = documents?.find(d => d.documentTypeId === typeId)
        return !!matchingDoc && (matchingDoc as any).status !== 'REJECTED'
      })
    : true

  // Required docs verified
  const areRequiredDocsVerified = stageReqTypeIds.length > 0
    ? stageReqTypeIds.every(typeId => {
        const matchingDoc = documents?.find(d => d.documentTypeId === typeId)
        return matchingDoc && (matchingDoc as any).status === 'APPROVED'
      })
    : true

  const canApproveStage = !isCurrentStageApproved && areRequiredDocsUploaded

  // Check how many documents have been approved overall
  const approvedDocsCount = documents?.filter(d => (d as any).status === 'APPROVED').length ?? 0
  const pendingDocsCount = documents?.filter(d => (d as any).status !== 'APPROVED' && (d as any).status !== 'REJECTED').length ?? 0
  const rejectedDocsCount = documents?.filter(d => (d as any).status === 'REJECTED').length ?? 0
  const totalDocsCount = documents?.length ?? 0
  const allDocsApproved = totalDocsCount > 0 && approvedDocsCount === totalDocsCount

  const unapprovedAssignedStages = officerAssignedStages.filter(s => !approvedStageIds.includes(s.id))

  const handleApproveAll = async () => {
    const pendingDocs = documents?.filter(d => (d as any).status !== 'APPROVED') || []
    if (pendingDocs.length === 0) return
    setDocActionPending(true)
    try {
      await Promise.all(pendingDocs.map(d => documentsApi.approve(d.id)))
      toast.success(`All ${pendingDocs.length} pending documents marked verified!`)
      refetchDocs()
    } catch {
      toast.error('Failed to verify some documents')
    } finally {
      setDocActionPending(false)
    }
  }

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

  const handleApproveClick = async () => {
    if (needsIssuedData) {
      setIssueDataOpen(true)
      return
    }

    // Auto-verify any unverified required documents for this stage
    const unverifiedStageDocs = (documents || []).filter(
      d => stageReqTypeIds.includes(d.documentTypeId) && (d as any).status !== 'APPROVED'
    )
    if (unverifiedStageDocs.length > 0) {
      setDocActionPending(true)
      try {
        await Promise.all(unverifiedStageDocs.map(d => documentsApi.approve(d.id)))
        refetchDocs()
      } catch {
        // Proceed even if background verification had an error
      } finally {
        setDocActionPending(false)
      }
    }

    approve(
      { requestId: clearance.id, stageId: activeStageId, file: stampedFile, stampId: selectedStampId },
      {
        onSuccess: () => {
          qc.invalidateQueries()
          refetchClearance()
          // Check if there are other unapproved stages assigned to this officer
          const nextStage = officerAssignedStages.find(
            s => s.id !== activeStageId && !approvedStageIds.includes(s.id)
          )
          if (nextStage) {
            toast.success(`Stage "${activeStage?.name}" approved! Advanced to next stage: "${nextStage.name}"`)
            setChosenStageId(nextStage.id)
          } else {
            toast.success(`All assigned stages for this student have been officially endorsed!`)
            router.push(ROUTES.officer.queue)
          }
        },
      }
    )
  }

  const handleFastTrackAll = async () => {
    if (unapprovedAssignedStages.length === 0) return
    setFastTracking(true)
    try {
      // 1. Auto-verify all pending documents first
      const pendingDocs = documents?.filter(d => (d as any).status !== 'APPROVED') || []
      if (pendingDocs.length > 0) {
        await Promise.all(pendingDocs.map(d => documentsApi.approve(d.id)))
        refetchDocs()
      }

      // 2. Sequentially approve each assigned stage with the officer's stamp
      for (const stage of unapprovedAssignedStages) {
        await clearanceApi.approve(clearance.id, undefined, stampedFile, undefined, selectedStampId, stage.id)
      }

      toast.success(`Fast-Track Complete: All ${unapprovedAssignedStages.length} assigned clearance stages endorsed!`)
      qc.invalidateQueries()
      router.push(ROUTES.officer.queue)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Fast-track stopped on an error')
      qc.invalidateQueries()
    } finally {
      setFastTracking(false)
    }
  }

  const handleIssueDataSubmit = () => {
    approve(
      { requestId: clearance.id, stageId: activeStageId, file: stampedFile, issuedData, stampId: selectedStampId },
      {
        onSuccess: () => {
          setIssueDataOpen(false)
          qc.invalidateQueries()
          refetchClearance()
          const nextStage = officerAssignedStages.find(
            s => s.id !== activeStageId && !approvedStageIds.includes(s.id)
          )
          if (nextStage) {
            setChosenStageId(nextStage.id)
          } else {
            router.push(ROUTES.officer.queue)
          }
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
    <div className="min-h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col space-y-3 pb-3">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between shrink-0 px-1">
        <button
          onClick={() => router.push(ROUTES.officer.queue)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors py-1 px-2 rounded-lg hover:bg-[var(--color-bg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Officer Queue</span>
        </button>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualRefresh}
            disabled={fetchingClearance || fetchingDocs}
            className="h-7 text-xs gap-1.5 border border-[var(--color-border)] px-2.5"
            title="Refresh latest uploads & verification state"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fetchingClearance || fetchingDocs ? 'animate-spin text-[var(--color-primary)]' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <span className="text-xs text-[var(--color-muted)] font-medium hidden sm:inline">Request:</span>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]">
            {clearance.clearanceNumber || clearance.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Main Split-Screen Layout */}
      {/* LEFT: Document Viewer (using react-pdf / PdfStampViewer) */}
      {/* RIGHT: Student Details & Approve/Reject Decision Buttons */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-y-auto md:overflow-hidden min-h-0">
        
        {/* ======================================================== */}
        {/* LEFT PANEL: Document Viewer (react-pdf)                  */}
        {/* ======================================================== */}
        <Card className="flex-1 flex flex-col overflow-hidden min-h-[420px] md:min-h-0 p-0 border border-[var(--color-border)] shadow-xs">
          {/* Document Tabs Bar */}
          <div className="bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {documents && documents.length > 0 ? (
                documents.map((doc, idx) => {
                  const isCurrent = idx === selectedDocIdx
                  const status = (doc as any).status ?? 'PENDING'
                  const isRecent = doc.uploadedAt && (new Date().getTime() - new Date(doc.uploadedAt).getTime() < 24 * 60 * 60 * 1000)

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
                      {stageReqTypeIds.includes(doc.documentTypeId) && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Required
                        </span>
                      )}
                      {isRecent && status !== 'APPROVED' && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-blue-100 text-blue-700 animate-pulse">
                          NEW
                        </span>
                      )}
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
                        href={normalizeDocUrl(selectedDoc.fileUrl)}
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
                  {(() => {
                    const docUrl = normalizeDocUrl(selectedDoc.fileUrl)
                    const isPdf =
                      selectedDoc.mimeType === 'application/pdf' ||
                      selectedDoc.fileName?.toLowerCase().endsWith('.pdf') ||
                      docUrl.toLowerCase().includes('.pdf')

                    if (isPdf) {
                      return (
                        <div className="w-full h-full min-h-[450px]">
                          <PdfStampViewer
                            fileUrl={docUrl}
                            onSaveStampedFile={file => setStampedFile(file)}
                            onStampSelect={stamp => setSelectedStampId(stamp?.id)}
                          />
                        </div>
                      )
                    }

                    return (
                      <InteractiveImageViewer
                        url={docUrl}
                        alt={selectedDoc.documentType?.name || 'Document Preview'}
                      />
                    )
                  })()}
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
                      {clearance.student?.department?.name ?? (
                        <span className="text-amber-600 font-medium italic">Unassigned Department</span>
                      )}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      {clearance.student?.faculty?.name ?? (
                        <span className="text-amber-600 italic">Unassigned Faculty</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)] text-[11px] text-[var(--color-muted)] flex-wrap">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Level: <strong className="text-[var(--color-text)]">{clearance.student?.level || 'N/A'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Matric: <strong className="font-mono text-[var(--color-text)]">{clearance.student?.matricNo || 'Pending'}</strong>
                  </span>
                  {clearance.session?.name && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                        Session {clearance.session.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Clearance Stage Under Review */}
            <div className="pb-4 border-b border-[var(--color-border)] space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-muted)]">
                  Clearance Stage Under Review
                </p>
                <div className="flex items-center gap-1.5">
                  {isCurrentStageApproved && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Approved
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-[var(--color-primary)]">
                    #{activeStage?.orderIndex ?? 1}
                  </span>
                </div>
              </div>
              {officerAssignedStages.length > 1 ? (
                <div className="space-y-1">
                  <CustomDropdown
                    value={activeStageId}
                    onChange={val => setChosenStageId(val)}
                    searchable={officerAssignedStages.length > 4}
                    options={officerAssignedStages.map(s => ({
                      value: s.id,
                      label: s.name,
                      badge: approvedStageIds.includes(s.id) ? 'Approved' : `Stage ${s.orderIndex}`,
                    }))}
                    triggerClassName="py-1.5 px-3 text-xs font-bold"
                  />
                </div>
              ) : (
                <p className="text-sm font-bold text-[var(--color-text)]">
                  {activeStage?.name || 'Assigned Review Stage'}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Submitted on {formatDateTime(clearance.updatedAt || clearance.createdAt)}</span>
              </div>
            </div>

            {/* Prior Review Remarks / Chat Instructions */}
            {clearance.stageApprovals && clearance.stageApprovals.some((a: any) => a.remarks) && (
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                  <span>Officer Remarks & Chat Notes</span>
                </div>
                <div className="space-y-1">
                  {clearance.stageApprovals
                    .filter((a: any) => a.remarks)
                    .map((a: any) => (
                      <div key={a.id} className="text-xs text-amber-800 bg-white/70 p-2 rounded border border-amber-200/60">
                        <span className="font-semibold text-amber-900">{a.stage?.name || 'Stage'}: </span>
                        <span>{a.remarks}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Active Document Flagged Reason */}
            {selectedDoc?.rejectionReason && (
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Flagged Note: </span>
                  <span>{selectedDoc.rejectionReason}</span>
                </div>
              </div>
            )}

            {/* Document Verification Checklist */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-muted)]">
                    Documents Verification Hub
                  </p>
                  <p className="text-xs font-semibold text-[var(--color-text)]">
                    {approvedDocsCount} of {totalDocsCount} Verified
                  </p>
                </div>

                {pendingDocsCount > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={docActionPending}
                    onClick={handleApproveAll}
                    className="text-[11px] h-7 px-2.5 text-emerald-700 hover:border-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-semibold"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                    Verify All ({pendingDocsCount})
                  </Button>
                )}
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

              {/* Filter Tabs & Search */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1 p-0.5 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
                  {[
                    { id: 'ALL', label: `All (${totalDocsCount})` },
                    { id: 'PENDING', label: `Pending (${pendingDocsCount})` },
                    { id: 'APPROVED', label: `Verified (${approvedDocsCount})` },
                    { id: 'REJECTED', label: `Flagged (${rejectedDocsCount})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDocFilter(tab.id as any)}
                      className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${
                        docFilter === tab.id
                          ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs font-bold'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {totalDocsCount > 3 && (
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2.5 top-2 text-[var(--color-muted)]" />
                    <input
                      type="text"
                      placeholder="Filter documents..."
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      className="w-full text-[11px] pl-7 pr-2.5 py-1 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text)]"
                    />
                  </div>
                )}
              </div>

              {/* Document items list */}
              <div className="space-y-1.5 pt-1 max-h-[220px] overflow-y-auto pr-0.5">
                {(() => {
                  const filtered = (documents || []).filter((doc) => {
                    const status = (doc as any).status ?? 'PENDING'
                    if (docFilter === 'APPROVED' && status !== 'APPROVED') return false
                    if (docFilter === 'REJECTED' && status !== 'REJECTED') return false
                    if (docFilter === 'PENDING' && (status === 'APPROVED' || status === 'REJECTED')) return false
                    if (docSearch) {
                      const name = doc.documentType?.name?.toLowerCase() || ''
                      const file = doc.fileName?.toLowerCase() || ''
                      if (!name.includes(docSearch.toLowerCase()) && !file.includes(docSearch.toLowerCase())) return false
                    }
                    return true
                  })

                  if (filtered.length === 0) {
                    return (
                      <p className="text-center py-4 text-xs text-[var(--color-muted)] italic">
                        No documents match this filter
                      </p>
                    )
                  }

                  return filtered.map((doc) => {
                    const originalIdx = (documents || []).findIndex(d => d.id === doc.id)
                    const isCurrent = originalIdx === selectedDocIdx
                    const status = (doc as any).status ?? 'PENDING'
                    const isRecent = doc.uploadedAt && (new Date().getTime() - new Date(doc.uploadedAt).getTime() < 24 * 60 * 60 * 1000)

                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocIdx(originalIdx)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                          isCurrent
                            ? 'bg-[var(--color-bg)] border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20 font-semibold'
                            : 'border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-muted)]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-medium text-[var(--color-text)]">
                              {doc.documentType?.name}
                            </span>
                            {stageReqTypeIds.includes(doc.documentTypeId) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Required
                              </span>
                            )}
                            {isRecent && status !== 'APPROVED' && (
                              <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-blue-100 text-blue-700 animate-pulse">
                                NEW
                              </span>
                            )}
                          </div>
                          {doc.uploadedAt && (
                            <p className="text-[10px] text-[var(--color-muted)]">
                              {formatDateTime(doc.uploadedAt)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {docStatusBadge(status)}
                          {status !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleApproveDoc(doc.id)
                              }}
                              disabled={docActionPending}
                              title="Mark this document as verified"
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* Main Action Buttons: "Approve" (Green) and "Reject" (Red) */}
          {/* ======================================================== */}
          <div className="pt-4 border-t border-[var(--color-border)] space-y-3 mt-auto">
            {/* Digital Endorsement Stamp & Signature Selector */}
            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  <span>Official Digital Seal</span>
                </span>
                <StampManagerDialog
                  stamps={stampsList}
                  onStampsChange={newStamps => {
                    setStampsList(newStamps)
                    refetchStamps()
                  }}
                />
              </div>

              {stampsList.length === 0 ? (
                <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200/60 text-center">
                  <p>No digital stamps uploaded yet.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click Manage Signatures &amp; Stamps above to add your official seal.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {stampsList.map((stamp: OfficerStamp) => {
                      const isSelected = selectedStampId === stamp.id
                      return (
                        <button
                          key={stamp.id}
                          type="button"
                          onClick={() => handleSelectStamp(stamp.id)}
                          className={`relative flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 bg-white ${
                            isSelected
                              ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/40'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="w-10 h-8 rounded border border-slate-100 flex items-center justify-center p-0.5 overflow-hidden bg-slate-50/50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={normalizeDocUrl(stamp.imageUrl)}
                              alt={stamp.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="text-left pr-1.5">
                            <p className="text-[11px] font-bold text-slate-800 line-clamp-1 max-w-[110px]">{stamp.name}</p>
                            <span className={`text-[9px] font-semibold block ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {isSelected ? '✓ Selected' : 'Click to use'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="font-semibold text-emerald-700">✓ Stamp attached:</span>
                    <span>Will be watermarked on the student&apos;s completion certificate.</span>
                  </p>
                </div>
              )}
            </div>

            {!areRequiredDocsUploaded && stageReqTypeIds.length > 0 && !isCurrentStageApproved && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-tight">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Missing required document for <strong>{activeStage?.name}</strong>. Student has not uploaded all required credentials.
                </span>
              </div>
            )}

            {areRequiredDocsUploaded && !areRequiredDocsVerified && !isCurrentStageApproved && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-tight">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  <strong>1-Click Endorsement:</strong> Required document is ready. Clicking below will verify the credential and apply your official seal to this stage.
                </span>
              </div>
            )}

            {isCurrentStageApproved && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] leading-tight font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  This stage (<strong>{activeStage?.name}</strong>) has been officially verified and endorsed.
                </span>
              </div>
            )}

            {/* Fast-Track Batch Endorse Button (when multiple assigned stages remain) */}
            {unapprovedAssignedStages.length > 1 && !isCurrentStageApproved && (
              <Button
                type="button"
                variant="secondary"
                loading={fastTracking}
                disabled={fastTracking}
                onClick={handleFastTrackAll}
                className="w-full py-2.5 h-auto text-xs font-bold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200/90 rounded-xl flex items-center justify-center gap-2 shadow-2xs"
                title="Verify all documents and approve all stages assigned to you in one click"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span>
                  {fastTracking
                    ? 'Fast-tracking endorsements...'
                    : `Fast-Track: Endorse All My Stages (${unapprovedAssignedStages.length})`}
                </span>
              </Button>
            )}

            {/* 1. Main Action Button: APPROVE (Green) */}
            <Button
              className="w-full py-3 h-auto text-sm font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-xs rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              loading={approving || docActionPending}
              disabled={!canApproveStage || approving || docActionPending}
              onClick={handleApproveClick}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {approving || docActionPending
                  ? 'Processing Endorsement...'
                  : isCurrentStageApproved
                  ? 'Stage Approved'
                  : isFinalStage
                  ? 'Approve & Issue Final Clearance'
                  : !areRequiredDocsVerified && areRequiredDocsUploaded
                  ? `Verify Docs & Approve ${activeStage?.name || 'Stage'}`
                  : `Approve ${activeStage?.name || 'Clearance Stage'}`}
              </span>
            </Button>

            {/* 2. Main Action Button: REJECT (Red) */}
            <Button
              variant="danger"
              className="w-full py-3 h-auto text-sm font-bold bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white shadow-xs rounded-xl flex items-center justify-center gap-2"
              loading={rejecting}
              disabled={rejecting || isCurrentStageApproved}
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="h-4 w-4" />
              <span>{rejecting ? 'Rejecting...' : `Reject ${activeStage?.name || 'Stage'}`}</span>
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
              { requestId: clearance.id, stageId: activeStageId, remarks },
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
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text)] block">
              Rejection Remarks (Required)
            </label>
            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1">
              {[
                'Document image is blurry or unreadable. Please upload a clear copy.',
                'Missing required departmental stamp or official signature.',
                'Uploaded file belongs to an incorrect academic session.',
                'Incomplete document or missing pages.',
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDocRejectReason(chip)}
                  className="text-[10px] text-left px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
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
