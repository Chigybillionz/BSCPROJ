'use client'

import { useState } from 'react'
import Image from 'next/image'
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
  Lock, 
  GraduationCap, 
  ShieldCheck, 
  Calendar,
  FileCheck2,
  ExternalLink,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

export default function StudentDashboard() {
  const tenant = useTenantStore()
  const { data: clearances, isLoading: loadingClearance } = useClearanceStatus()
  const { data: stages, isLoading: loadingStages } = useStages()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader 
        title="Student Clearance Portal" 
        subtitle="Monitor and manage your departmental clearance stages in real-time" 
      />

      {(clearances ?? []).map(clearance => {
        const campaignStages = (stages?.filter(s => s.campaignId === clearance.campaignId) ?? [])
          .sort((a, b) => a.orderIndex - b.orderIndex)
        
        const totalStages = campaignStages.length
        const approvedCount = clearance.stageApprovals?.filter(a => a.status === 'APPROVED').length ?? 0
        const progressPercent = totalStages > 0 ? Math.round((approvedCount / totalStages) * 100) : 0
        const activeStage = campaignStages.find(s => s.id === clearance.currentStageId)

        return (
          <div key={clearance.id} className="space-y-6">
            {/* Student Profile & Progress Header Card */}
            <Card padding="lg" className="border-t-4 border-t-[var(--color-primary)] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text)]">
                      {clearance.student 
                        ? `${clearance.student.firstName} ${clearance.student.lastName}`
                        : 'Student Profile'}
                    </h2>
                    <p className="text-xs text-[var(--color-muted)] flex items-center gap-2 mt-0.5">
                      <span>JAMB: <strong className="text-[var(--color-text)]">{clearance.student?.jambRegNo || 'N/A'}</strong></span>
                      {clearance.student?.department?.name && (
                        <>
                          <span>•</span>
                          <span>Dept: <strong className="text-[var(--color-text)]">{clearance.student.department.name}</strong></span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    <Calendar className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                    <span>{clearance.session?.name ?? 'Session'}</span>
                  </div>
                  <StatusBadge status={clearance.status} />
                </div>
              </div>

              {/* Real-time Progress Bar (Figure 3.9) */}
              <div className="pt-4">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-[var(--color-text)] flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                    Overall Clearance Progress
                  </span>
                  <span className="text-[var(--color-primary)] font-bold">
                    {approvedCount} of {totalStages} Departments Cleared ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div 
                    className="h-full bg-[var(--color-primary)] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {clearance.status === 'COMPLETED' ? (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-4 gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-950">
                          Clearance Fully Approved & Verified!
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          All departmental stages have been completed and officially signed with digital stamps.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleDownloadCertificate(clearance.id, clearance.student?.jambRegNo)}
                      disabled={downloadingId === clearance.id}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shrink-0"
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      {downloadingId === clearance.id ? 'Generating PDF...' : 'Download Clearance Certificate'}
                    </Button>
                  </div>
                ) : activeStage && clearance.status === 'IN_PROGRESS' ? (
                  <div className="mt-3 flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-xs">
                    <div className="flex items-center gap-2 text-blue-900">
                      <Clock className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                      <span>
                        Current Action: <strong>{activeStage.name}</strong>
                        {clearance.stageStatus === 'SUBMITTED' 
                          ? ' — Documents submitted. Awaiting clearance officer review.' 
                          : ' — Required documents pending submission.'}
                      </span>
                    </div>
                    <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}`}>
                      <Button size="sm" className="shrink-0 ml-2">
                        {clearance.stageStatus === 'SUBMITTED' ? 'View Submitted' : 'Upload Documents'}
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </div>
            </Card>

            {/* Stepper Visualization */}
            <Card padding="lg">
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-4 text-[var(--color-muted)]">
                Workflow Sequence
              </h3>
              <ClearanceStepper stages={campaignStages} request={clearance} />
            </Card>

            {/* Stage-by-Stage Detailed Status Cards */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider text-[var(--color-muted)]">
                Departmental Status Breakdown
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {campaignStages.map((stage, idx) => {
                  const approval = clearance.stageApprovals?.find(a => a.stageId === stage.id)
                  const isCurrent = clearance.currentStageId === stage.id
                  const isApproved = approval?.status === 'APPROVED'
                  const isRejected = approval?.status === 'REJECTED'
                  const isUnderReview = isCurrent && clearance.stageStatus === 'SUBMITTED'
                  const isLocked = !isCurrent && !isApproved && !isRejected

                  return (
                    <div 
                      key={stage.id} 
                      className={cn(
                        "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                        isApproved && "bg-emerald-50/20 border-emerald-200",
                        isCurrent && !isUnderReview && "bg-blue-50/30 border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20",
                        isUnderReview && "bg-amber-50/20 border-amber-200",
                        isRejected && "bg-red-50/20 border-red-200",
                        isLocked && "bg-[var(--color-surface)] border-gray-200 opacity-70"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
                          isApproved && "bg-emerald-100 text-emerald-700",
                          isCurrent && "bg-[var(--color-primary)] text-white",
                          isUnderReview && "bg-amber-100 text-amber-700",
                          isRejected && "bg-red-100 text-red-700",
                          isLocked && "bg-gray-100 text-gray-500"
                        )}>
                          {isApproved ? <CheckCircle2 className="h-5 w-5" /> : isLocked ? <Lock className="h-4 w-4" /> : idx + 1}
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
                              isLocked && "bg-gray-100 text-gray-600"
                            )}>
                              {isApproved 
                                ? 'Cleared' 
                                : isUnderReview 
                                ? 'Under Review' 
                                : isCurrent 
                                ? 'In Progress' 
                                : isRejected 
                                ? 'Rejected' 
                                : 'Pending'}
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
                            {isLocked && (
                              <span>Locked until prior departments complete verification.</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Stage Action Buttons */}
                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        {isCurrent && (
                          <Link href={`${ROUTES.student.documents}?requestId=${clearance.id}`}>
                            <Button size="sm">
                              {isUnderReview ? 'View Documents' : 'Upload Documents'}
                              <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
    </div>
  )
}

