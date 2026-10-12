'use client'

import React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useOfficerQueue } from '@/features/clearance/hooks/useClearance'
import { PageHeader } from '@/components/layout/PageHeader'
import { CheckCircle } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { OfficerQueueTable } from '@/components/officer/OfficerQueueTable'

export default function OfficerQueuePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const search = searchParams.get('search') || ''
  const sessionId = searchParams.get('sessionId')
  const campaignId = searchParams.get('campaignId') || ''
  const page = Number(searchParams.get('page') || '1')

  const setQueryParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const { data: sessionsRes } = useQuery({
    queryKey: ['sessions'],
    queryFn: () =>
      import('@/lib/api/misc.api').then(m => m.sessionsApi.list()).then(r => {
        const active = r.data.data.find((s: any) => s.isActive)
        if (active && sessionId === null && !searchParams.has('sessionId')) {
          setQueryParam('sessionId', active.id)
        }
        return r.data
      }),
  })

  const { data: campaignsRes } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () =>
      import('@/lib/api/campaigns.api').then(m => m.campaignsApi.list()).then(r => r.data),
  })

  const { data, error, isLoading, isError, refetch } = useOfficerQueue(
    page,
    search || undefined,
    sessionId || undefined,
    campaignId || undefined
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Clearance Queue" subtitle="Students awaiting your review and approval" />

      {/* Campaign & Session Selectors */}
      <div className="flex flex-col sm:flex-row gap-3 items-center mb-2">
        <select
          className="text-xs border border-[var(--color-border)] bg-[var(--color-bg)] rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)] w-full sm:w-auto font-medium text-[var(--color-text)]"
          value={sessionId || ''}
          onChange={e => setQueryParam('sessionId', e.target.value)}
        >
          <option value="">All Academic Sessions</option>
          {sessionsRes?.data?.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="text-xs border border-[var(--color-border)] bg-[var(--color-bg)] rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-primary)] w-full sm:w-auto font-medium text-[var(--color-text)]"
          value={campaignId}
          onChange={e => setQueryParam('campaignId', e.target.value)}
        >
          <option value="">All Clearance Campaigns</option>
          {campaignsRes?.data
            ?.filter((c: any) => !sessionId || c.sessionId === sessionId)
            .map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      {isError && (error as any)?.response?.status === 403 ? (
        <Card padding="lg" className="text-center py-12">
          <EmptyState
            icon={<CheckCircle className="h-10 w-10 text-amber-500" />}
            title="No Assigned Stages"
            description="You have not been assigned to clear students for any stage yet. Please contact your administrator."
          />
        </Card>
      ) : isError ? (
        <ErrorState
          message={(error as any)?.response?.data?.message ?? "We couldn't load your queue."}
          onRetry={() => refetch()}
        />
      ) : (
        <OfficerQueueTable
          items={data?.items ?? []}
          isLoading={isLoading}
          total={data?.total ?? 0}
          page={page}
          onPageChange={p => setQueryParam('page', String(p))}
          onRefresh={() => refetch()}
          search={search}
          onSearchChange={val => setQueryParam('search', val)}
        />
      )}
    </div>
  )
}
