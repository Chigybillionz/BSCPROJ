import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  UploadCloud, 
  X, 
  Loader2, 
  FileText, 
  ExternalLink, 
  AlertCircle, 
  FileCheck,
  ShieldCheck,
  Clock,
  Sparkles,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatFileSize } from '@/lib/utils/format'
import type { ClearanceRequest, Document } from '@/types'

interface ClearanceSubmissionPanelProps {
  request: ClearanceRequest
  documents: Document[]
  initialStageId?: string
  onUploadDocument: (file: File, documentTypeId: string) => Promise<void>
  onDeleteDocument: (documentId: string) => Promise<void>
  onSubmitStage: () => Promise<void>
}

export function ClearanceSubmissionPanel({
  request,
  documents,
  initialStageId,
  onUploadDocument,
  onDeleteDocument,
  onSubmitStage,
}: ClearanceSubmissionPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Extract all campaign stages in order
  const campaignStages: any[] = ((request.campaign as any)?.stages || [])
    .slice()
    .sort((a: any, b: any) => a.orderIndex - b.orderIndex)

  // Fallback to currentStage if campaign stages are not attached
  const stagesToDisplay = campaignStages.length > 0 
    ? campaignStages 
    : (request.currentStage ? [request.currentStage] : [])

  const [selectedStageId, setSelectedStageId] = useState<string>(() => {
    if (initialStageId && stagesToDisplay.some(s => s.id === initialStageId)) {
      return initialStageId
    }
    return request.currentStageId || stagesToDisplay[0]?.id || ''
  })

  const activeStage = stagesToDisplay.find(s => s.id === selectedStageId) || stagesToDisplay[0]

  if (!activeStage) {
    return (
      <Card className="text-center py-10" padding="lg">
        <p className="text-sm text-slate-500">No clearance stages found.</p>
      </Card>
    )
  }

  const isCurrentStage = !activeStage.id || activeStage.id === request.currentStageId
  const approval = request.stageApprovals?.find(a => a.stageId === activeStage.id)
  const isApproved = approval?.status === 'APPROVED'
  const isRejected = approval?.status === 'REJECTED'
  const isUnderReview = isCurrentStage && request.stageStatus === 'SUBMITTED'

  const requirements: any[] = activeStage.documentRequirements || []
  const requiredCount = requirements.filter((r: any) => r.isRequired).length
  const uploadedRequiredCount = requirements.filter((r: any) => 
    r.isRequired && documents.some(d => d.documentTypeId === r.documentTypeId && d.status !== 'REJECTED')
  ).length

  const percentComplete = requiredCount > 0 ? Math.round((uploadedRequiredCount / requiredCount) * 100) : 100
  const canSubmit = isCurrentStage && requiredCount === uploadedRequiredCount && !isUnderReview

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, typeId: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingId(typeId)
      await onUploadDocument(file, typeId)
    } finally {
      setUploadingId(null)
      e.target.value = '' // reset input
    }
  }

  const handleDrop = async (e: React.DragEvent, typeId: string) => {
    e.preventDefault()
    setDragOverId(null)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    try {
      setUploadingId(typeId)
      await onUploadDocument(file, typeId)
    } finally {
      setUploadingId(null)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      await onSubmitStage()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stage Selector Tabs */}
      {stagesToDisplay.length > 1 && (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1.5">
            Select Clearance Department to Manage Documents:
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {stagesToDisplay.map((stage: any, idx: number) => {
              const isSelected = stage.id === selectedStageId
              const stageAppr = request.stageApprovals?.find(a => a.stageId === stage.id)
              const stageCleared = stageAppr?.status === 'APPROVED'
              const stageIsCurrent = stage.id === request.currentStageId
              const stageReqs = stage.documentRequirements || []
              const uploadedCount = stageReqs.filter((r: any) => 
                documents.some(d => d.documentTypeId === r.documentTypeId)
              ).length

              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStageId(stage.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                    isSelected 
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm font-bold" 
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  <span className={cn(
                    "h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                    isSelected ? "bg-white text-[var(--color-primary)]" : "bg-slate-200 text-slate-700"
                  )}>
                    {stageCleared ? '✓' : idx + 1}
                  </span>
                  <span>{stage.name}</span>
                  {stageCleared ? (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      isSelected ? "bg-emerald-400/30 text-white" : "bg-emerald-100 text-emerald-800"
                    )}>
                      Cleared
                    </span>
                  ) : stageIsCurrent ? (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
                    )}>
                      Active
                    </span>
                  ) : (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-medium",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    )}>
                      {uploadedCount}/{stageReqs.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Document Submission Card */}
      <Card className="w-full flex flex-col gap-6" padding="lg">
        {/* Header with Stage Details & Context Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Stage: {activeStage.name}
              </h2>
              {isApproved ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Cleared & Approved
                </span>
              ) : isRejected ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Action Required (Rejected)
                </span>
              ) : isUnderReview ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Under Officer Review
                </span>
              ) : isCurrentStage ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Active Stage
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  <UploadCloud className="h-3 w-3 text-[var(--color-primary)]" /> Advance Upload
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isApproved 
                ? 'All required documents for this department have been approved and verified.'
                : isRejected
                ? 'Officer requested corrections. Please re-upload the flagged documents below.'
                : isCurrentStage 
                ? 'Upload and submit required documents for clearance officer review.'
                : 'Upload all required documents in advance. Files are saved securely and will be reviewed once your clearance reaches this department.'}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="sm:text-right min-w-[150px]">
            <p className="text-xs font-semibold text-slate-600">
              {uploadedRequiredCount} of {requiredCount} Required Uploaded
            </p>
            <div className="w-full sm:w-36 h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-200">
              <div 
                className="h-full bg-[var(--color-primary)] transition-all duration-300 rounded-full"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>

        {/* Informative Notice Banner */}
        {isRejected && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Officer Remarks:</p>
              <p className="mt-0.5 text-rose-800">
                {approval?.remarks || 'Please re-upload clear and authentic copies of the requested documents.'}
              </p>
            </div>
          </div>
        )}

        {!isCurrentStage && !isApproved && !isRejected && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs">
            <Info className="h-5 w-5 text-blue-600 shrink-0" />
            <p>
              <strong>Advance Upload Mode:</strong> You do not need to wait for prior departments to approve your documents. You can upload all your files for <strong>{activeStage.name}</strong> now!
            </p>
          </div>
        )}

        {isApproved && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs">
            <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
            <p>
              <strong>Officially Approved:</strong> This stage has been signed off by the clearance officer. Already verified documents cannot be replaced or deleted.
            </p>
          </div>
        )}

        {/* Requirements List */}
        <div className="space-y-4">
          {requirements.map((req: any) => {
            const doc = documents.find(d => d.documentTypeId === req.documentTypeId)
            const isDragOver = dragOverId === req.documentTypeId
            const isCurrentUploading = uploadingId === req.documentTypeId
            const isDocRejected = doc?.status === 'REJECTED'
            const isDocApproved = doc?.status === 'APPROVED'
            const docType = req.documentType as any
            const allowedFormats: string[] = docType?.allowedFormats && docType.allowedFormats.length > 0 
              ? docType.allowedFormats 
              : ['pdf', 'jpg', 'png']
            const maxSizeMB: number = docType?.maxFileSizeMB || 5

            return (
              <div 
                key={req.id} 
                className={cn(
                  "border rounded-xl p-4 sm:p-5 transition-all bg-[var(--color-surface)] shadow-2xs",
                  isDragOver ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-blue-50/20" : "border-[var(--color-border)]",
                  isDocRejected ? "border-red-200 bg-red-50/15" : "",
                  isDocApproved ? "border-emerald-200 bg-emerald-50/15" : ""
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      isDocApproved ? "bg-emerald-100 text-emerald-700" : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    )}>
                      {isDocApproved ? <ShieldCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-[var(--color-text)]">
                        {req.documentType?.name}
                        {req.isRequired && <span className="text-red-500 font-bold">*</span>}
                      </span>
                      <p className="text-xs text-[var(--color-muted)]">
                        Allowed: {allowedFormats.map((f: string) => f.toUpperCase()).join(', ')} • Max {maxSizeMB}MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2.5 py-0.5 rounded-full font-medium",
                      req.isRequired ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                    )}>
                      {req.isRequired ? "Required" : "Optional"}
                    </span>
                  </div>
                </div>

                {/* Uploaded state card */}
                {doc ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-[var(--color-bg)] gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileCheck className={cn("w-5 h-5 shrink-0", isDocApproved ? "text-emerald-600" : "text-blue-600")} />
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[var(--color-text)] truncate block max-w-[200px] sm:max-w-xs" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                          {doc.fileSizeMB && (
                            <span className="text-xs text-[var(--color-muted)]">
                              {formatFileSize(doc.fileSizeMB * 1024 * 1024)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDocApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-500" data-testid="check-icon" />
                        )}

                        {doc.fileUrl && (
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors rounded-md hover:bg-gray-100"
                            title="Preview document"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {/* Can only delete if not approved */}
                        {!isDocApproved && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onDeleteDocument(doc.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 h-auto"
                            aria-label="Delete document"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Rejection feedback */}
                    {isDocRejected && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold">Document was rejected by clearance officer</p>
                          {doc.rejectionReason && (
                            <p className="mt-0.5 text-red-600 font-medium">Reason: {doc.rejectionReason}</p>
                          )}
                          <p className="mt-1 text-red-600">
                            Please upload a replacement document below to update your submission.
                          </p>
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => document.getElementById(`file-input-${req.id}`)?.click()}
                              disabled={isCurrentUploading}
                              className="text-xs font-bold text-red-700 hover:bg-red-100 border-red-300 cursor-pointer"
                            >
                              {isCurrentUploading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Uploading...
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-3.5 h-3.5 mr-1" /> Re-upload File
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Drag & Drop Upload Zone */
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(req.documentTypeId) }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => handleDrop(e, req.documentTypeId)}
                    onClick={() => document.getElementById(`file-input-${req.id}`)?.click()}
                    className={cn(
                      "mt-2 border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center",
                      isDragOver 
                        ? "border-[var(--color-primary)] bg-blue-50/50" 
                        : "border-gray-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)]"
                    )}
                  >
                    {isCurrentUploading ? (
                      <div className="flex items-center gap-2 text-sm text-[var(--color-primary)] font-medium">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Uploading document...</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-[var(--color-text)]">
                          Drag and drop your file here, or <span className="text-[var(--color-primary)] underline">browse</span>
                        </p>
                        <p className="text-[11px] text-[var(--color-muted)]">
                          Supports {allowedFormats.map((f: string) => f.toUpperCase()).join(', ')} (up to {maxSizeMB}MB)
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Persistent Hidden File Input for both Initial Upload and Re-upload */}
                <input 
                  id={`file-input-${req.id}`}
                  type="file" 
                  className="hidden" 
                  accept={allowedFormats.map((f: string) => `.${f}`).join(',')}
                  onChange={(e) => handleFileChange(e, req.documentTypeId)}
                  disabled={isCurrentUploading}
                  data-testid={`file-input-${req.documentTypeId}`}
                />
              </div>
            )
          })}

          {requirements.length === 0 && (
            <div className="text-center py-6 text-sm text-[var(--color-muted)]">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No documents required for this stage.</p>
            </div>
          )}
        </div>

        {/* Bottom Submission Action Bar */}
        <div className="pt-2 border-t">
          {isCurrentStage ? (
            <>
              <Button 
                className="w-full" 
                size="lg" 
                disabled={!canSubmit || isSubmitting || isUnderReview} 
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isUnderReview ? 'Submitted — Awaiting Officer Review' : 'Submit for Review'}
              </Button>
              {isUnderReview ? (
                <p className="text-xs text-center text-emerald-600 mt-2 font-medium">
                  This stage has been submitted and is currently in the officer queue for verification.
                </p>
              ) : !canSubmit && requirements.length > 0 ? (
                <p className="text-xs text-center text-[var(--color-muted)] mt-2">
                  Please upload all required documents above to enable submission.
                </p>
              ) : null}
            </>
          ) : isApproved ? (
            <div className="text-center py-2 text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              This departmental stage has been officially verified and endorsed.
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-slate-500 flex items-center justify-center gap-2">
              <UploadCloud className="h-4 w-4 text-[var(--color-primary)]" />
              <span>
                All documents uploaded for <strong>{activeStage.name}</strong> are saved in advance and ready for review when you complete previous stages.
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
