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
  FileCheck 
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatFileSize } from '@/lib/utils/format'
import type { ClearanceRequest, Document } from '@/types'

interface ClearanceSubmissionPanelProps {
  request: ClearanceRequest
  documents: Document[]
  onUploadDocument: (file: File, documentTypeId: string) => Promise<void>
  onDeleteDocument: (documentId: string) => Promise<void>
  onSubmitStage: () => Promise<void>
}

export function ClearanceSubmissionPanel({
  request,
  documents,
  onUploadDocument,
  onDeleteDocument,
  onSubmitStage,
}: ClearanceSubmissionPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  if (!request.currentStage) {
    return null
  }

  const requirements = request.currentStage.documentRequirements || []
  const requiredCount = requirements.filter(r => r.isRequired).length
  const uploadedRequiredCount = requirements.filter(r => 
    r.isRequired && documents.some(d => d.documentTypeId === r.documentTypeId && d.status !== 'REJECTED')
  ).length

  const percentComplete = requiredCount > 0 ? Math.round((uploadedRequiredCount / requiredCount) * 100) : 100
  const canSubmit = requiredCount === uploadedRequiredCount && requirements.length > 0

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
    <Card className="w-full flex flex-col gap-6" padding="lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Stage: {request.currentStage.name}</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              {request.status}
            </span>
          </div>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Upload and verify all required documents for departmental clearance.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="sm:text-right min-w-[140px]">
          <p className="text-xs font-semibold text-[var(--color-muted)]">
            {uploadedRequiredCount} of {requiredCount} Required Uploaded
          </p>
          <div className="w-full sm:w-36 h-2 bg-gray-100 rounded-full overflow-hidden mt-1.5 border border-gray-200">
            <div 
              className="h-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {requirements.map((req) => {
          const doc = documents.find(d => d.documentTypeId === req.documentTypeId)
          const isDragOver = dragOverId === req.documentTypeId
          const isCurrentUploading = uploadingId === req.documentTypeId
          const isDocRejected = doc?.status === 'REJECTED'
          const docType = req.documentType as any
          const allowedFormats: string[] = docType?.allowedFormats && docType.allowedFormats.length > 0 
            ? docType.allowedFormats 
            : ['pdf', 'jpg', 'png']
          const maxSizeMB: number = docType?.maxFileSizeMB || 5

          return (
            <div 
              key={req.id} 
              className={cn(
                "border rounded-xl p-4 sm:p-5 transition-all bg-[var(--color-surface)] shadow-sm",
                isDragOver ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-blue-50/20" : "border-[var(--color-border)]",
                isDocRejected ? "border-red-200 bg-red-50/10" : ""
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-[var(--color-text)]">
                      {req.documentType.name}
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
                      <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
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
                      <CheckCircle2 className="w-5 h-5 text-green-500" data-testid="check-icon" />

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

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onDeleteDocument(doc.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 h-auto"
                        aria-label="Delete document"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Rejection feedback */}
                  {isDocRejected && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">Document was rejected by clearance officer</p>
                        {doc.rejectionReason && (
                          <p className="mt-0.5 text-red-600">Reason: {doc.rejectionReason}</p>
                        )}
                        <p className="mt-1 text-red-500">Please delete and upload an updated document.</p>
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
                    <div className="flex items-center gap-2 text-sm text-[var(--color-primary)]">
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
                        Supports PDF, PNG, or JPG (up to {maxSizeMB}MB)
                      </p>
                    </>
                  )}

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
              )}
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

      <div className="pt-2 border-t">
        <Button 
          className="w-full" 
          size="lg" 
          disabled={!canSubmit || isSubmitting} 
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Submit for Review
        </Button>
        {!canSubmit && requirements.length > 0 && (
          <p className="text-xs text-center text-[var(--color-muted)] mt-2">
            Please upload all required documents above to enable submission.
          </p>
        )}
      </div>
    </Card>
  )
}

