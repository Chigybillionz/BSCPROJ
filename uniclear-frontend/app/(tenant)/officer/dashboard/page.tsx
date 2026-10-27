'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useOfficerQueue } from '@/features/clearance/hooks/useClearance'
import { officersApi } from '@/lib/api/officers.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { OfficerQueueTable } from '@/components/officer/OfficerQueueTable'
import { ROUTES } from '@/lib/constants'
import { Clock, ShieldAlert, Award, Layers, Building, Sparkles, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

function formatAgo(dateString?: string | Date | null) {
  if (!dateString) return ''
  const past = new Date(dateString).getTime()
  const diffMs = Date.now() - past
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateString).toLocaleDateString()
}

export default function OfficerDashboard() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stageStatus, setStageStatus] = useState<string>('SUBMITTED')

  const {
    data: queue,
    error: queueError,
    isLoading: queueLoading,
    isError: queueIsError,
    refetch: refetchQueue,
  } = useOfficerQueue(page, search || undefined, undefined, undefined, stageStatus)

  const { data: meRes, isLoading: meLoading } = useQuery({
    queryKey: ['officer', 'me'],
    queryFn: () => officersApi.getMe().then((r: any) => r.data.data),
  })

  // Extract recent uploads across students in the officer's queue (declared before conditional returns)
  const recentUploads = React.useMemo(() => {
    if (!queue?.items) return []
    const list: Array<{
      studentId: string
      requestId: string
      studentName: string
      matricNo: string
      departmentName: string
      documentId: string
      documentName: string
      uploadedAt: string | Date
      status: string
      stageName: string
    }> = []

    queue.items.forEach((item: any) => {
      const sName = item.student ? `${item.student.firstName} ${item.student.lastName}` : 'Student'
      const matric = item.student?.matricNo || item.student?.jambRegNo || 'N/A'
      const dept = item.student?.department?.name || 'Departmental Stage'
      const stage = item.currentStage?.name || 'Clearance Stage'

      ;(item.documents || []).forEach((doc: any) => {
        list.push({
          studentId: item.student?.id || item.id,
          requestId: item.id,
          studentName: sName,
          matricNo: matric,
          departmentName: dept,
          documentId: doc.id,
          documentName: doc.documentType?.name || doc.fileName || 'Uploaded Document',
          uploadedAt: doc.uploadedAt || item.updatedAt,
          status: doc.status || 'PENDING',
          stageName: stage,
        })
      })
    })

    return list
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 6)
  }, [queue?.items])

  // Error State: Officer not assigned to any stage
  if (queueIsError) {
    const errorMsg = (queueError as any)?.response?.data?.message
    if (errorMsg === 'You are not assigned to any stage') {
      return (
        <div className="w-full space-y-6">
          <PageHeader
            title="Officer Dashboard"
            subtitle="Clearance verification & student approvals"
          />
          <Card padding="lg" className="text-center py-16 max-w-xl mx-auto border-dashed">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">
              No Clearance Stage Assigned
            </h3>
            <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto mb-4 leading-relaxed">
              Your account has not been mapped to any clearance stage yet. Please contact your Super Administrator to assign your profile to a stage (e.g., Department, Faculty, Library, or Bursary).
            </p>
          </Card>
        </div>
      )
    }
  }

  const pending = queue?.total ?? queue?.items?.length ?? 0
  const assignment = meRes?.stageAssignments?.[0]
  const stageName = assignment?.stage?.name ?? 'Assigned Stage'

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Officer Dashboard"
        subtitle={
          meRes
            ? `Welcome, Officer ${meRes.firstName} ${meRes.lastName} • Review and approve student clearance submissions`
            : 'Review and approve student clearance submissions in your assigned queue'
        }
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {queueLoading || meLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            {/* 1. Pending Review */}
            <Card className="border-l-4 border-l-amber-500 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider font-semibold">
                  Pending Queue
                </p>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              </div>
              <p className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
                {pending}
              </p>
              <p className="text-xs text-amber-700 font-medium mt-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Awaiting your review</span>
              </p>
            </Card>

            {/* 2. Today's Approvals Velocity */}
            <Card className="border-l-4 border-l-emerald-500 shadow-xs">
              <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">
                Today&apos;s Velocity
              </p>
              <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                {meRes?.todayVelocity ?? 0}
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1.5 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Cleared today</span>
              </p>
            </Card>

            {/* 3. Assigned Stage */}
            <Card className="border-l-4 border-l-[var(--color-primary)] shadow-xs">
              <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">
                Your Stage
              </p>
              <p className="text-base font-bold text-[var(--color-text)] truncate mt-1">
                {stageName}
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1.5 flex items-center gap-1.5 truncate">
                <Layers className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                <span>Sequence #{assignment?.stage?.orderIndex ?? 1}</span>
              </p>
            </Card>

            {/* 4. Jurisdiction / Scope */}
            <Card className="border-l-4 border-l-sky-500 shadow-xs">
              <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">
                Review Scope
              </p>
              <div className="mt-1">
                {!assignment?.faculty && !assignment?.department ? (
                  <p className="text-sm font-bold text-[var(--color-primary)]">
                    University Wide
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-[var(--color-text)] truncate flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <span>{assignment?.department?.name ?? 'All Departments'}</span>
                    </p>
                    {assignment?.faculty?.name && (
                      <p className="text-[11px] text-[var(--color-muted)] truncate pl-4.5">
                        {assignment.faculty.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Recent Student Uploads & Action Feed */}
      <Card padding="md" className="border border-[var(--color-border)] shadow-xs overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                Recent Student Uploads & Action Feed
              </h3>
              <p className="text-[11px] text-[var(--color-muted)]">
                Files uploaded by students for your review & instant verification
              </p>
            </div>
          </div>
          {recentUploads.length > 0 && (
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {recentUploads.length} recent files
            </span>
          )}
        </div>

        {recentUploads.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-muted)] flex flex-col items-center justify-center gap-1.5">
            <FileText className="h-6 w-6 text-slate-300" />
            <p className="font-semibold text-slate-700">No student documents in the queue yet</p>
            <p className="text-[11px] text-slate-400">Newly uploaded student documents will appear here automatically for fast-track verification.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
            {recentUploads.map((up) => (
              <div
                key={`${up.requestId}-${up.documentId}`}
                className="group p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-bg)]/40 transition-all flex flex-col justify-between gap-2.5 bg-[var(--color-surface)] shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      {up.stageName}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)] flex items-center gap-1 shrink-0 font-medium">
                      <Clock className="h-3 w-3" />
                      {formatAgo(up.uploadedAt)}
                    </span>
                  </div>

                  <p className="font-bold text-xs text-[var(--color-text)] mt-2 group-hover:text-[var(--color-primary)] transition-colors line-clamp-1" title={up.documentName}>
                    {up.documentName}
                  </p>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                    <span className="font-medium text-slate-700 truncate max-w-[140px]">{up.studentName}</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">{up.matricNo}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between">
                  {up.status === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  ) : up.status === 'REJECTED' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700">
                      <AlertCircle className="h-3 w-3" />
                      Flagged
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                      <Clock className="h-3 w-3" />
                      Awaiting Review
                    </span>
                  )}

                  <button
                    onClick={() => router.push(ROUTES.officer.review(up.requestId))}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline group-hover:translate-x-0.5 transition-transform cursor-pointer"
                  >
                    <span>Review</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Main Request Queue Data Table & Status Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto self-start border border-slate-200">
            {[
              { id: 'SUBMITTED', label: 'Awaiting Review' },
              { id: 'PENDING', label: 'In Progress / Pending' },
              { id: 'REJECTED', label: 'Action / Re-uploaded' },
              { id: 'ALL', label: 'All Records' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setStageStatus(tab.id)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  stageStatus === tab.id
                    ? 'bg-white text-[var(--color-primary)] shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-muted)] font-medium">
              Queue:
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[var(--color-text)] border border-[var(--color-border)]">
              {queue?.total ?? 0} students
            </span>
          </div>
        </div>

        <OfficerQueueTable
          items={queue?.items ?? []}
          isLoading={queueLoading}
          total={queue?.total ?? 0}
          page={page}
          onPageChange={setPage}
          onRefresh={() => refetchQueue()}
          search={search}
          onSearchChange={val => {
            setSearch(val)
            setPage(1)
          }}
        />
      </div>
    </div>
  )
}
