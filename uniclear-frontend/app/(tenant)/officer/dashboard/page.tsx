'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOfficerQueue } from '@/features/clearance/hooks/useClearance'
import { officersApi } from '@/lib/api/officers.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { OfficerQueueTable } from '@/components/officer/OfficerQueueTable'
import { Clock, ShieldAlert, Award, Layers, Building } from 'lucide-react'

export default function OfficerDashboard() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const {
    data: queue,
    error: queueError,
    isLoading: queueLoading,
    isError: queueIsError,
    refetch: refetchQueue,
  } = useOfficerQueue(page, search || undefined)

  const { data: meRes, isLoading: meLoading } = useQuery({
    queryKey: ['officer', 'me'],
    queryFn: () => officersApi.getMe().then((r: any) => r.data.data),
  })

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

      {/* Main Request Queue Data Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <span>Pending Student Requests</span>
            {pending > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                {pending}
              </span>
            )}
          </h2>
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
