'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi } from '@/lib/api/students.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { FileText, Eye, ArrowLeft, Download, Pencil, CheckCircle2, Clock, Shield, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { useState, useEffect, use } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { normalizeDocUrl, formatDate } from '@/lib/utils/format'

const editSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  jambRegNo: z.string().min(1, 'Required'),
  matricNo:  z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

export default function AdminStudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  
  const form = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.getById(id).then(r => r.data.data),
  })

  const { data: clearance, isLoading: loadingClearance } = useQuery({
    queryKey: ['student-clearance', id],
    queryFn: () => studentsApi.getClearanceProgress(id).then(r => r.data.data),
  })

  useEffect(() => {
    if (student && editOpen) {
      form.reset({
        firstName: student.firstName,
        lastName: student.lastName,
        jambRegNo: student.jambRegNo,
        matricNo: student.matricNo || '',
      })
    }
  }, [student, editOpen, form])

  const { mutate: updateStudent, isPending: updating } = useMutation({
    mutationFn: (data: EditForm) => studentsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] })
      toast.success('Student profile updated securely')
      setEditOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update student')
    }
  })

  if (loadingStudent || loadingClearance) return <LoadingSkeleton />
  if (!student) return <div className="p-10 text-center">Student not found</div>

  const approvals = clearance?.stageApprovals || []
  const documents = clearance?.documents || []

  const isDocImage = (url: string) => /\.(jpg|jpeg|png|webp)($|\?)/i.test(url)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href={ROUTES.admin.students} className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)] flex items-center mb-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Students
      </Link>
      
      <PageHeader 
        title={`${student.firstName} ${student.lastName}`} 
        subtitle={`JAMB Reg No: ${student.jambRegNo} • ${student.department?.name || 'Department'} (${student.faculty?.name || 'Faculty'})`} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Details */}
        <Card className="col-span-1" padding="lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Profile Details</h3>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          </div>
          <div className="space-y-4 text-xs">
            <div>
              <p className="text-[var(--color-muted)] mb-0.5">Matric Number</p>
              <p className="font-semibold text-sm text-[var(--color-primary)]">
                {student.matricNo || <span className="text-gray-400 italic font-normal">Pending Clearance</span>}
              </p>
            </div>
            <div>
              <p className="text-[var(--color-muted)] mb-0.5">JAMB Reg Number</p>
              <p className="font-mono font-medium text-gray-800">{student.jambRegNo}</p>
            </div>
            <div>
              <p className="text-[var(--color-muted)] mb-0.5">Email Address</p>
              <p className="font-medium text-gray-800 truncate">{student.user?.email || '—'}</p>
            </div>
            <div>
              <p className="text-[var(--color-muted)] mb-0.5">Faculty</p>
              <p className="font-medium text-gray-800">{student.faculty?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[var(--color-muted)] mb-0.5">Department</p>
              <p className="font-medium text-gray-800">{student.department?.name || '—'}</p>
            </div>
            {clearance?.session && (
              <div>
                <p className="text-[var(--color-muted)] mb-0.5">Academic Session</p>
                <p className="font-medium text-gray-800">{clearance.session.name}</p>
              </div>
            )}
            {clearance?.clearanceNumber && (
              <div className="pt-2 border-t border-[var(--color-border)]">
                <p className="text-[var(--color-muted)] mb-0.5">Clearance Certificate No</p>
                <p className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  {clearance.clearanceNumber}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Clearance Stages Overview */}
        <Card className="col-span-1 md:col-span-2" padding="lg">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Clearance Progress &amp; Milestone Pipeline</h3>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Campaign: <strong className="text-gray-800">{clearance?.campaign?.name || 'Faculty Clearance'}</strong>
              </p>
            </div>
            {clearance && <StatusBadge status={clearance.status} />}
          </div>

          {!clearance ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-[var(--color-muted)]">This student has not started their clearance process yet.</p>
            </div>
          ) : (() => {
            const rawStages: any[] = clearance.campaign?.stages || []
            const sortedStages = [...rawStages].sort((a: any, b: any) => a.orderIndex - b.orderIndex)
            const approvalMap = new Map<string, any>()
            for (const app of approvals) {
              approvalMap.set(app.stageId, app)
            }

            const approvedStagesCount = approvals.filter((a: any) => a.status === 'APPROVED').length
            const totalStagesCount = sortedStages.length > 0 ? sortedStages.length : approvals.length
            const percentComplete = totalStagesCount > 0 ? Math.round((approvedStagesCount / totalStagesCount) * 100) : 0
            const currentStageObj = sortedStages.find((s: any) => s.id === clearance.currentStageId)

            return (
              <div className="space-y-4">
                {/* Pipeline Progress Header Banner */}
                <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 rounded-xl p-3.5 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">Clearance Milestone Track</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-2xs">
                        {approvedStagesCount} of {totalStagesCount} Stages Endorsed ({percentComplete}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full max-w-sm bg-blue-200/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500 rounded-full"
                        style={{ width: `${percentComplete}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-blue-800 font-medium">
                      {clearance.status === 'COMPLETED' ? (
                        <span className="text-emerald-700 font-bold">✓ All stages approved — Clearance completed!</span>
                      ) : (
                        <span>
                          Current Milestone: <strong>Stage #{currentStageObj?.orderIndex || approvedStagesCount + 1} ({currentStageObj?.name || 'Next Review Stage'})</strong>
                        </span>
                      )}
                    </p>
                  </div>

                  <Link
                    href={`/officer/review/${id}?requestId=${clearance.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-xs transition-all shrink-0 self-start sm:self-auto"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Open Officer Review</span>
                  </Link>
                </div>

                {/* Stages List (All 17 Stages Rendered) */}
                <div className="border border-[var(--color-border)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)] max-h-[460px] overflow-y-auto">
                  {(sortedStages.length > 0 ? sortedStages : approvals).map((item: any, idx: number) => {
                    const isStageObject = sortedStages.length > 0
                    const stage = isStageObject ? item : item.stage
                    const approval = isStageObject ? approvalMap.get(stage.id) : item
                    const isApproved = approval?.status === 'APPROVED'
                    const isRejected = approval?.status === 'REJECTED'
                    const isCurrent = !isApproved && !isRejected && (stage.id === clearance.currentStageId || (!clearance.currentStageId && idx === approvedStagesCount))

                    // Find corresponding document uploaded for this stage
                    const matchingDoc = documents.find((d: any) =>
                      d.documentTypeId === stage.id ||
                      d.documentType?.name?.toLowerCase() === stage.name?.toLowerCase() ||
                      d.documentType?.stageRequirements?.some((r: any) => r.stageId === stage.id)
                    )

                    const officerName = approval?.officerRef 
                      ? `${approval.officerRef.firstName} ${approval.officerRef.lastName}` 
                      : (approval?.officer?.email || 'Clearance Officer')

                    return (
                      <div
                        key={stage?.id || idx}
                        className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isCurrent
                            ? 'bg-blue-50/60 ring-1 ring-blue-500/20'
                            : isApproved
                            ? 'bg-white hover:bg-gray-50/80'
                            : 'bg-gray-50/50 text-gray-500'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-gray-400">
                              #{stage.orderIndex || idx + 1}
                            </span>
                            <span className={`text-xs font-bold ${isCurrent ? 'text-blue-900 font-extrabold' : isApproved ? 'text-gray-900' : 'text-gray-600'}`}>
                              {stage.name || 'Stage'}
                            </span>
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> Approved
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                Rejected
                              </span>
                            ) : isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                                <Clock className="h-3 w-3 text-blue-600" /> Current Stage (In Review)
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                Pending
                              </span>
                            )}

                            {/* Credential file status badge */}
                            {matchingDoc ? (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                matchingDoc.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                Doc: {matchingDoc.status === 'APPROVED' ? 'Verified' : 'Uploaded (Pending Review)'}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                Doc: Not Uploaded
                              </span>
                            )}
                          </div>

                          {isApproved && (
                            <div className="text-[11px] text-[var(--color-muted)] flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3 text-blue-600" />
                                <span>{officerName}</span>
                              </span>
                              <span>•</span>
                              <span>{new Date(approval.decidedAt || approval.createdAt).toLocaleDateString()}</span>
                              {approval.stamp && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Stamped: {approval.stamp.name}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          )}

                          {approval?.remarks && (
                            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 mt-1">
                              &ldquo;{approval.remarks}&rdquo;
                            </p>
                          )}
                        </div>

                        {approval?.attachmentUrl && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="text-xs h-7 px-2.5"
                              onClick={() => setPreviewDoc({
                                url: normalizeDocUrl(approval.attachmentUrl),
                                title: `Signed Endorsement — ${stage.name || 'Stage'}`
                              })}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View Endorsement
                            </Button>
                            <a href={normalizeDocUrl(approval.attachmentUrl)} target="_blank" download>
                              <Button variant="secondary" size="sm" type="button" className="h-7 w-7 p-0">
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </Card>
      </div>

      {/* Submitted Documents Section */}
      <Card padding="lg" className="border border-[var(--color-border)] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>Student Submitted Documents ({documents.length})</span>
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              All documents uploaded by the student across all clearance stages
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {documents.filter((d: any) => d.status === 'APPROVED').length} Verified / {documents.length} Total
          </span>
        </div>

        {/* Informational Callout: Document Verification vs Stage Endorsement */}
        <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-700 flex items-start gap-2.5 mb-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900">
              Understanding Document Verification vs Clearance Stages
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When documents show <strong>&quot;Approved&quot; (Verified)</strong> below, it confirms the uploaded PDF/image credential is valid and legible. However, the student&apos;s clearance is only completed when each of the <strong>Clearance Milestones above</strong> is officially stamped and endorsed by the assigned office/officer in sequence.
            </p>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-[var(--color-muted)]">No documents uploaded by this student yet.</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
            {documents.map((doc: any) => {
              const url = normalizeDocUrl(doc.fileUrl)
              const docTitle = doc.documentType?.name || doc.fileName

              return (
                <div key={doc.id} className="p-3.5 bg-white hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-gray-900 truncate">{docTitle}</p>
                      <StatusBadge status={doc.status} />
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                        {doc.mimeType?.includes('pdf') ? 'PDF' : 'IMAGE'}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--color-muted)] flex items-center gap-2">
                      <span>{doc.fileName}</span>
                      <span>•</span>
                      <span>{doc.fileSizeMB ? `${doc.fileSizeMB} MB` : 'File'}</span>
                      <span>•</span>
                      <span>Uploaded {formatDate(doc.uploadedAt || new Date())}</span>
                    </p>

                    {doc.status === 'REJECTED' && doc.rejectionReason && (
                      <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-1.5 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Rejection Note: </span>
                          <span>{doc.rejectionReason}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-7 px-2.5"
                      onClick={() => setPreviewDoc({ url, title: docTitle })}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View File
                    </Button>
                    <a href={url} target="_blank" download={doc.fileName}>
                      <Button variant="secondary" size="sm" type="button" className="h-7 w-7 p-0">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Document Preview Modal */}
      <Dialog 
        open={!!previewDoc} 
        onClose={() => setPreviewDoc(null)} 
        title={previewDoc?.title || "Document Preview"}
        className="max-w-4xl w-full"
      >
        <div className="w-full h-[78vh] bg-gray-950 mt-3 rounded-lg overflow-hidden flex items-center justify-center relative">
          {previewDoc && (
            isDocImage(previewDoc.url) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={previewDoc.url} 
                alt={previewDoc.title} 
                className="max-h-full max-w-full object-contain p-2" 
              />
            ) : (
              <iframe 
                src={previewDoc.url} 
                className="w-full h-full border-0 bg-white" 
                title={previewDoc.title}
              />
            )
          )}
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-[var(--color-border)] mt-3">
          <span className="text-xs text-[var(--color-muted)] truncate max-w-md">{previewDoc?.title}</span>
          <div className="flex items-center gap-2">
            {previewDoc && (
              <a href={previewDoc.url} target="_blank" download>
                <Button size="sm" variant="secondary" className="text-xs h-8">
                  <Download className="w-3.5 h-3.5 mr-1" /> Open / Download
                </Button>
              </a>
            )}
            <Button size="sm" onClick={() => setPreviewDoc(null)} className="text-xs h-8">
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Profile Modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Student Profile">
        <form onSubmit={form.handleSubmit(d => updateStudent(d))} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" error={form.formState.errors.firstName?.message} {...form.register('firstName')} />
            <Input label="Last Name"  error={form.formState.errors.lastName?.message}  {...form.register('lastName')} />
          </div>
          <Input label="JAMB Reg Number" error={form.formState.errors.jambRegNo?.message} {...form.register('jambRegNo')} />
          <Input label="Matriculation Number" placeholder="Leave empty if pending" error={form.formState.errors.matricNo?.message} {...form.register('matricNo')} />
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
            Note: Changes to primary identifiers are securely logged to the Global Audit Trail.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" loading={updating}>Save Changes</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

