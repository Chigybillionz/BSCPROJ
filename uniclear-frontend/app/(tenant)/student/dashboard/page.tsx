'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTenantStore } from '@/store/useTenantStore'
import { useClearanceStatus } from '@/features/clearance/hooks/useClearance'
import { useStages } from '@/features/stages/hooks/useStages'
import { ClearanceStepper } from '@/components/student/ClearanceStepper'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { ROUTES } from '@/lib/constants'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { clearanceApi } from '@/lib/api/clearance.api'
import { toast } from 'sonner'
import { 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  GraduationCap, 
  ShieldCheck, 
  Calendar,
  FileCheck2,
  ExternalLink,
  Sparkles,
  UploadCloud,
  AlertCircle,
  Search
} from 'lucide-react'
import Link from 'next/link'

export default function StudentDashboard() {
  const tenant = useTenantStore()
  const { data: clearances, isLoading: loadingClearance } = useClearanceStatus()
  const { data: stages, isLoading: loadingStages } = useStages()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<'ALL' | 'ACTION' | 'APPROVED' | 'PENDING'>('ALL')
  const [docHubFilter, setDocHubFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL')
  const [docHubSearch, setDocHubSearch] = useState('')

  const isLoading = loadingClearance || loadingStages

  const handleDownloadCertificate = async (clearanceId: string, jambRegNo?: string) => {
    try {
      setDownloadingId(clearanceId)
      toast.loading('Generating official clearance certificate...', { id: 'cert-download' })
      await clearanceApi.downloadCertificatePdf(
        clearanceId,
        `Clearance_Certificate_${jambRegNo || 'student'}.pdf`
      )
      toast.success('Certificate downloaded successfully!', { id: 'cert-download' })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download certificate. Please try again.', { id: 'cert-download' })
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) return <CardSkeleton />

  const completedClearances = clearances?.filter(c => c.status === 'COMPLETED') ?? []

  // Show only one clearance block in the main view (the active one, else the first)
  const primaryClearance =
    clearances?.find(c => c.status === 'IN_PROGRESS') ?? clearances?.[0]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-8 pb-10"
    >
      <PageHeader 
        title="Student Clearance Portal" 
        subtitle="Monitor and manage your departmental clearance stages in real-time" 
      />

      {(primaryClearance ? [primaryClearance] : []).map(clearance => {
        const campaignStages = (stages?.filter(s => s.campaignId === clearance.campaignId) ?? [])
          .sort((a, b) => a.orderIndex - b.orderIndex)

        // A stage is effectively approved if it has a formal StageApproval OR all its
        // required documents are individually verified (APPROVED) by an officer.
        const isStageEffectivelyApproved = (stage: any) => {
          const formalApproval = clearance.stageApprovals?.find(a => a.stageId === stage.id && a.status === 'APPROVED')
          if (formalApproval) return true
          const stageReqs = stage.documentRequirements || []
          const required = stageReqs.filter((r: any) => r.isRequired)
          if (required.length === 0) return false
          return required.every((r: any) =>
            (clearance.documents || []).some((d: any) => d.documentTypeId === r.documentTypeId && d.status === 'APPROVED')
          )
        }

        const totalStages = campaignStages.length
        const approvedCount = campaignStages.filter(isStageEffectivelyApproved).length
        const progressPercent = totalStages > 0 ? Math.round((approvedCount / totalStages) * 100) : 0
        const activeStage = campaignStages.find(s => s.id === clearance.currentStageId)

        const filteredStages = campaignStages.filter(stage => {
          const approval = clearance.stageApprovals?.find(a => a.stageId === stage.id)
          const isCurrent = clearance.currentStageId === stage.id
          const isApproved = isStageEffectivelyApproved(stage)
          const isRejected = approval?.status === 'REJECTED'
          const isUnderReview = isCurrent && clearance.stageStatus === 'SUBMITTED'

          if (stageFilter === 'ACTION') return (isCurrent && !isUnderReview) || isRejected
          if (stageFilter === 'APPROVED') return isApproved
          if (stageFilter === 'PENDING') return isUnderReview || (!isCurrent && !isApproved && !isRejected)
          return true
        })

        return (
          <div key={clearance.id} className="space-y-8">
            {/* Student Profile & Progress Header Card */}
            <Card padding="lg" className="border-t-4 border-t-[var(--color-primary)] shadow-md overflow-hidden bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 shadow-2xs">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      {clearance.student 
                        ? `${clearance.student.firstName} ${clearance.student.lastName}`
                        : 'Student Profile'}
                    </h2>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                      <span>JAMB: <strong className="text-slate-800 font-mono font-bold">{clearance.student?.jambRegNo || 'N/A'}</strong></span>
                      {clearance.student?.department?.name && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>Dept: <strong className="text-slate-800 font-semibold">{clearance.student.department.name}</strong></span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{clearance.session?.name ?? 'Session'}</span>
                  </div>
                  <StatusBadge status={clearance.status} />
                </div>
              </div>

              {/* Real-time Progress Bar */}
              <div className="pt-5">
                <div className="flex items-center justify-between text-xs font-bold mb-2.5">
                  <span className="text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                    Institutional Clearance Progress
                  </span>
                  <span className="text-[var(--color-primary)] font-extrabold text-sm tabular-nums">
                    {approvedCount} / {totalStages} Cleared ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-full shadow-xs"
                  />
                </div>
                {clearance.status === 'COMPLETED' ? (
                  <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 gap-4 shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-950">
                          Clearance Fully Approved & Verified!
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                          All departmental stages have been officially endorsed and digitally stamped.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="md"
                      onClick={() => handleDownloadCertificate(clearance.id, clearance.student?.jambRegNo)}
                      disabled={downloadingId === clearance.id}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold shrink-0 shadow-xs"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingId === clearance.id ? 'Generating PDF...' : 'Download Certificate'}
                    </Button>
                  </div>
                ) : activeStage && clearance.status === 'IN_PROGRESS' ? (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[var(--color-primary-light)]/60 border border-[var(--color-primary)]/20 rounded-2xl p-4 gap-3">
                    <div className="flex items-center gap-2.5 text-slate-800 text-xs">
                      <Clock className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                      <span>
                        Current Action: <strong className="text-[var(--color-primary)] font-bold">{activeStage.name}</strong>
                        {clearance.stageStatus === 'SUBMITTED' 
                          ? ' — Documents uploaded. Clearance officer review pending.' 
                          : ' — Required documents pending submission.'}
                      </span>
                    </div>
                    <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}`}>
                      <Button size="sm" className="shrink-0 font-bold shadow-xs">
                        {clearance.stageStatus === 'SUBMITTED' ? 'View Submission' : 'Upload Documents'}
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </div>
            </Card>

            {/* Stepper Visualization */}
            <Card padding="lg" className="shadow-md bg-white">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  Clearance Milestones & Verification Track
                </h3>
              </div>
              <ClearanceStepper stages={campaignStages} request={clearance} />
            </Card>

            {/* Individual Document Verification Hub */}
            <Card padding="lg" className="shadow-md bg-white border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Individual Document Verification Hub
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time status and clearance officer remarks for all your uploaded files
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto self-start sm:self-auto">
                  {(() => {
                    const docs = clearance.documents || []
                    const approved = docs.filter((d: any) => d.status === 'APPROVED').length
                    const rejected = docs.filter((d: any) => d.status === 'REJECTED').length
                    const pending = docs.filter((d: any) => d.status !== 'APPROVED' && d.status !== 'REJECTED').length

                    return [
                      { id: 'ALL', label: `All (${docs.length})` },
                      { id: 'APPROVED', label: `Verified (${approved})` },
                      { id: 'PENDING', label: `Under Review (${pending})` },
                      { id: 'REJECTED', label: `Action Needed (${rejected})` },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setDocHubFilter(tab.id as any)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all',
                          docHubFilter === tab.id
                            ? 'bg-white text-[var(--color-primary)] shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-900'
                        )}
                      >
                        {tab.label}
                      </button>
                    ))
                  })()}
                </div>
              </div>

              {/* Search & Stats Bar */}
              <div className="pt-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative max-w-xs w-full">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search documents by name..."
                    value={docHubSearch}
                    onChange={e => setDocHubSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:bg-white text-slate-800"
                  />
                </div>

                <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}`}>
                  <Button size="sm" variant="secondary" className="gap-1.5 text-xs font-semibold w-full sm:w-auto">
                    <UploadCloud className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                    Manage & Upload Files
                  </Button>
                </Link>
              </div>

              {/* Document Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {(() => {
                  const docs = clearance.documents || []
                  const filtered = docs.filter((doc: any) => {
                    if (docHubFilter === 'APPROVED' && doc.status !== 'APPROVED') return false
                    if (docHubFilter === 'REJECTED' && doc.status !== 'REJECTED') return false
                    if (docHubFilter === 'PENDING' && (doc.status === 'APPROVED' || doc.status === 'REJECTED')) return false
                    if (docHubSearch) {
                      const q = docHubSearch.toLowerCase()
                      const name = doc.documentType?.name?.toLowerCase() || ''
                      const file = doc.fileName?.toLowerCase() || ''
                      if (!name.includes(q) && !file.includes(q)) return false
                    }
                    return true
                  })

                  if (docs.length === 0) {
                    return (
                      <div className="col-span-full py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                        <UploadCloud className="h-9 w-9 text-slate-400 mx-auto mb-2 opacity-60" />
                        <p className="text-xs font-bold text-slate-700">No Documents Uploaded Yet</p>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5 mb-3">
                          You haven&apos;t uploaded clearance documents. You can upload all required documents in advance.
                        </p>
                        <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}`}>
                          <Button size="sm" className="font-semibold text-xs">
                            Start Uploading Now
                          </Button>
                        </Link>
                      </div>
                    )
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="col-span-full py-6 text-center text-xs text-slate-400 italic">
                        No documents match the &quot;{docHubFilter.toLowerCase()}&quot; filter.
                      </div>
                    )
                  }

                  return filtered.map((doc: any) => {
                    const isApproved = doc.status === 'APPROVED'
                    const isRejected = doc.status === 'REJECTED'
                    const isPending = !isApproved && !isRejected

                    // Associated stage name
                    const associatedStage = doc.documentType?.stageRequirements?.[0]?.stage?.name || 'Institutional Requirement'

                    return (
                      <div
                        key={doc.id}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5",
                          isApproved && "bg-emerald-50/30 border-emerald-200",
                          isPending && "bg-white border-slate-200 hover:border-slate-300",
                          isRejected && "bg-rose-50/40 border-rose-200"
                        )}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                                {associatedStage}
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={doc.documentType?.name}>
                                {doc.documentType?.name || 'Document'}
                              </h4>
                            </div>

                            <div className="shrink-0">
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="h-3 w-3 text-amber-600" /> Under Review
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <AlertCircle className="h-3 w-3 text-rose-600" /> Action Required
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <p className="truncate font-mono text-[10px] text-slate-600" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <p className="flex items-center gap-2 text-[10px]">
                              <span>Uploaded {doc.uploadedAt ? formatDate(doc.uploadedAt) : 'Recently'}</span>
                              {doc.fileSizeMB && <span>• {Number(doc.fileSizeMB).toFixed(2)} MB</span>}
                            </p>
                          </div>

                          {/* Rejection Remarks Box */}
                          {isRejected && (
                            <div className="p-2 rounded-lg bg-rose-100/70 border border-rose-200 text-rose-800 text-xs">
                              <p className="font-bold flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                Officer Feedback:
                              </p>
                              <p className="mt-0.5 text-[11px] text-rose-700">
                                {doc.rejectionReason || 'Document was flagged. Please re-upload a clear and valid copy.'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          {doc.fileUrl ? (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] font-semibold hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Preview Document</span>
                            </a>
                          ) : <span />}

                          {isRejected ? (
                            <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}`}>
                              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white h-7 px-2.5 text-xs font-bold">
                                Re-upload Now
                              </Button>
                            </Link>
                          ) : !isApproved ? (
                            <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}`}>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900">
                                Replace
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5" /> Endorsed
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </Card>

            {/* Stage-by-Stage Detailed Status Cards */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Departmental Status Breakdown
                </h3>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto self-start sm:self-auto">
                  {(['ALL', 'ACTION', 'APPROVED', 'PENDING'] as const).map(tab => {
                    const count = tab === 'ALL'
                      ? campaignStages.length
                      : tab === 'APPROVED'
                      ? approvedCount
                      : tab === 'ACTION'
                      ? campaignStages.filter(s => (s.id === clearance.currentStageId && clearance.stageStatus !== 'SUBMITTED') || clearance.stageApprovals?.some(a => a.stageId === s.id && a.status === 'REJECTED')).length
                      : campaignStages.length - approvedCount

                    return (
                      <button
                        key={tab}
                        onClick={() => setStageFilter(tab)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all',
                          stageFilter === tab
                            ? 'bg-white text-[var(--color-primary)] shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-900'
                        )}
                      >
                        {tab === 'ALL' && `All (${count})`}
                        {tab === 'ACTION' && `Action Required (${count})`}
                        {tab === 'APPROVED' && `Cleared (${count})`}
                        {tab === 'PENDING' && `Pending (${count})`}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredStages.map((stage, idx) => {
                  const approval = clearance.stageApprovals?.find(a => a.stageId === stage.id)
                  const isCurrent = clearance.currentStageId === stage.id
                  const isApproved = isStageEffectivelyApproved(stage)
                  const isRejected = approval?.status === 'REJECTED'
                  const isUnderReview = isCurrent && clearance.stageStatus === 'SUBMITTED'
                  const isUpcoming = !isCurrent && !isApproved && !isRejected

                  return (
                    <div 
                      key={stage.id} 
                      className={cn(
                        "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                        isApproved && "bg-emerald-50/20 border-emerald-200",
                        isCurrent && !isUnderReview && "bg-blue-50/30 border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20",
                        isUnderReview && "bg-amber-50/20 border-amber-200",
                        isRejected && "bg-red-50/20 border-red-200",
                        isUpcoming && "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
                          isApproved && "bg-emerald-100 text-emerald-700",
                          isCurrent && "bg-[var(--color-primary)] text-white",
                          isUnderReview && "bg-amber-100 text-amber-700",
                          isRejected && "bg-red-100 text-red-700",
                          isUpcoming && "bg-blue-50 text-[var(--color-primary)] border border-blue-100"
                        )}>
                          {isApproved ? <CheckCircle2 className="h-5 w-5" /> : isUpcoming ? <UploadCloud className="h-4 w-4" /> : idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm sm:text-base text-[var(--color-text)]">
                              {stage.name}
                            </h4>
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                              isApproved && "bg-emerald-100 text-emerald-800",
                              isCurrent && !isUnderReview && "bg-blue-100 text-blue-800",
                              isUnderReview && "bg-amber-100 text-amber-800",
                              isRejected && "bg-red-100 text-red-800",
                              isUpcoming && "bg-slate-100 text-slate-700"
                            )}>
                              {isApproved 
                                ? 'Cleared' 
                                : isUnderReview 
                                ? 'Under Review' 
                                : isCurrent 
                                ? 'In Progress' 
                                : isRejected 
                                ? 'Rejected' 
                                : 'Ready to Upload'}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--color-muted)] mt-1">
                            {isApproved && (
                              <span>
                                Approved on {approval?.createdAt ? formatDate(approval.createdAt) : 'N/A'}
                                {approval?.remarks && ` • Note: "${approval.remarks}"`}
                              </span>
                            )}
                            {isUnderReview && (
                              <span>Documents uploaded. Awaiting officer sign-off.</span>
                            )}
                            {isCurrent && !isUnderReview && (
                              <span className="text-[var(--color-primary)] font-medium">
                                Action required: Upload required documents to complete this stage.
                              </span>
                            )}
                            {isRejected && (
                              <span className="text-red-600 font-medium">
                                Remarks: {approval?.remarks || 'Please re-upload requested clearance documents.'}
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="text-slate-500">
                                Unlocked: You can upload your documents for this department in advance.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Stage Action Buttons */}
                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        {isCurrent && (
                          <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}&stageId=${stage.id}`}>
                            <Button size="sm">
                              {isUnderReview ? 'View Documents' : 'Upload Documents'}
                              <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </Link>
                        )}
                        {isUpcoming && (
                          <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}&stageId=${stage.id}`}>
                            <Button size="sm" variant="secondary" className="gap-1.5 text-xs font-semibold">
                              <UploadCloud className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                              Upload in Advance
                            </Button>
                          </Link>
                        )}
                        {isRejected && (
                          <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}&stageId=${stage.id}`}>
                            <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 text-xs font-semibold">
                              <ArrowRight className="h-3.5 w-3.5" />
                              Re-upload
                            </Button>
                          </Link>
                        )}
                        {isApproved && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {(approval as any)?.stamp && (
                              <div
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs"
                                title={`Officially stamped & endorsed: ${(approval as any).stamp.name}`}
                              >
                                <span className="relative w-4.5 h-4.5 rounded-full overflow-hidden bg-white border border-emerald-300 flex items-center justify-center shrink-0">
                                  <Image
                                    src={(approval as any).stamp.imageUrl}
                                    alt={(approval as any).stamp.name}
                                    fill
                                    className="object-contain p-0.5"
                                  />
                                </span>
                                <span className="text-[11px] truncate max-w-[130px]">
                                  {(approval as any).stamp.name}
                                </span>
                              </div>
                            )}
                            {approval?.attachmentUrl && (
                              <a
                                href={approval.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] font-medium hover:underline p-1"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Endorsement</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}

      {/* Completed Clearances Card */}
      {completedClearances.length > 0 && (
        <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/10" padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <FileCheck2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-bold text-[var(--color-text)]">
              Cleared & Approved Clearances
            </h3>
          </div>
          <div className="space-y-3">
            {completedClearances.map(clearance => (
              <div 
                key={clearance.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--color-bg)] rounded-xl border border-emerald-100 gap-3 shadow-sm"
              >
                <div>
                  <h4 className="font-semibold text-sm text-[var(--color-text)]">
                    {clearance.campaign?.name ?? 'University Clearance'}
                  </h4>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    Clearance No: <span className="font-mono font-semibold text-[var(--color-text)]">{clearance.clearanceNumber || 'UNN-CLEARED'}</span> • Cleared on {clearance.completedAt ? formatDate(clearance.completedAt) : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {clearance.campaign?.issuesCertificate !== false && (
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        disabled={downloadingId === clearance.id}
                        onClick={() => handleDownloadCertificate(clearance.id, clearance.student?.jambRegNo)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        {downloadingId === clearance.id ? 'Downloading...' : 'Download Clearance Certificate'}
                      </Button>
                      <Link href={ROUTES.student.certificate}>
                        <Button size="sm" variant="secondary">
                          View
                        </Button>
                      </Link>
                    </div>
                  )}
                  {clearance.campaign?.issuesClearanceSlip === true && (
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => {
                        import('@/lib/utils/pdf').then(({ generateClearanceSlipPDF }) => {
                          generateClearanceSlipPDF({
                            studentName: `${clearance.student?.firstName} ${clearance.student?.lastName}`,
                            jambRegNo: clearance.student?.jambRegNo || 'N/A',
                            universityName: tenant.name || 'University of Nigeria, Nsukka',
                            campaignName: clearance.campaign?.name || 'Clearance',
                            completedAt: clearance.completedAt ? new Date(clearance.completedAt).toLocaleDateString() : new Date().toLocaleDateString(),
                            clearanceNumber: clearance.clearanceNumber,
                            issuedData: clearance.issuedData
                          })
                        })
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Slip
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {(!clearances || clearances.length === 0) && (
        <Card className="text-center py-12" padding="lg">
          <GraduationCap className="h-12 w-12 text-[var(--color-muted)] mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-[var(--color-text)] mb-1">
            No Active Clearance Found
          </h3>
          <p className="text-sm text-[var(--color-muted)] max-w-sm mx-auto mb-5">
            You have not started a clearance session yet. Begin your online clearance process now.
          </p>
          <Link href={ROUTES.student.clearance}>
            <Button size="lg">
              Start Clearance <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </Card>
      )}
    </motion.div>
  )
}

