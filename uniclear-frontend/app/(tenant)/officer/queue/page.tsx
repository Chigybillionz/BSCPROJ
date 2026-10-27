'use client'

import React, { useState } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useOfficerQueue } from '@/features/clearance/hooks/useClearance'
import { PageHeader } from '@/components/layout/PageHeader'
import { CheckCircle, Calendar } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { OfficerQueueTable } from '@/components/officer/OfficerQueueTable'
import { sessionsApi } from '@/lib/api/misc.api'
import { campaignsApi } from '@/lib/api/campaigns.api'
import { CustomDropdown } from '@/components/ui/CustomDropdown'

export default function OfficerQueuePage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Controlled UI state for instant, synchronous responsiveness
  const [search, setSearch] = useState<string>(searchParams.get('search') || '')
  const [sessionId, setSessionId] = useState<string>(searchParams.get('sessionId') || '')
  const [campaignId, setCampaignId] = useState<string>(searchParams.get('campaignId') || '')
  const [stageStatus, setStageStatus] = useState<string>(searchParams.get('stageStatus') || 'SUBMITTED')
  const [page, setPage] = useState<number>(Number(searchParams.get('page') || '1'))

  // Sync state changes to browser URL quietly without full page navigation lag
  const updateUrl = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search)
    Object.entries(newParams).forEach(([key, val]) => {
      if (val && val !== '') params.set(key, val)
      else params.delete(key)
    })
    const query = params.toString()
    const newUrl = query ? `${pathname}?${query}` : pathname
    window.history.replaceState(null, '', newUrl)
  }

  // Load sessions
  const { data: sessionsRes } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list().then(r => r.data),
  })

  // Load campaigns
  const { data: campaignsRes } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsApi.list().then(r => r.data),
  })

  // Fetch officer queue reactively based on controlled state
  const { data, error, isLoading, isError, refetch } = useOfficerQueue(
    page,
    search || undefined,
    sessionId || undefined,
    campaignId || undefined,
    stageStatus
  )

  const handleTabChange = (newStatus: string) => {
    setStageStatus(newStatus)
    setPage(1)
    updateUrl({ stageStatus: newStatus, page: '1' })
  }

  const handleSessionChange = (newSessionId: string) => {
    setSessionId(newSessionId)
    setPage(1)
    updateUrl({ sessionId: newSessionId, page: '1' })
  }

  const handleCampaignChange = (newCampaignId: string) => {
    setCampaignId(newCampaignId)
    setPage(1)
    updateUrl({ campaignId: newCampaignId, page: '1' })
  }

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch)
    setPage(1)
    updateUrl({ search: newSearch, page: '1' })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    updateUrl({ page: String(newPage) })
  }

  const selectedSessionObj = sessionsRes?.data?.find((s: any) => s.id === sessionId)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <PageHeader title="Clearance Queue" subtitle="Students awaiting your review and approval" />
        {selectedSessionObj && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <span>Active Filter: {selectedSessionObj.name}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto self-start border border-slate-200">
          {[
            { id: 'SUBMITTED', label: 'Awaiting Review' },
            { id: 'PENDING', label: 'In Progress / Pending' },
            { id: 'APPROVED', label: 'Approved / Cleared' },
            { id: 'REJECTED', label: 'Action / Re-uploaded' },
            { id: 'ALL', label: 'All Records' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
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

        {/* Campaign & Session Selectors */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center w-full md:w-auto">
          <div className="w-full sm:w-56">
            <CustomDropdown
              value={sessionId}
              onChange={val => handleSessionChange(val)}
              options={[
                { value: '', label: 'All Academic Sessions' },
                ...(sessionsRes?.data || []).map((s: any) => ({
                  value: s.id,
                  label: `Session ${s.name}`,
                  badge: s.isActive ? 'Current' : undefined,
                })),
              ]}
              searchable={true}
              placeholder="All Academic Sessions"
              triggerClassName="py-1.5 px-3 text-xs font-semibold"
              align="right"
            />
          </div>

          <div className="w-full sm:w-64">
            <CustomDropdown
              value={campaignId}
              onChange={val => handleCampaignChange(val)}
              options={[
                { value: '', label: 'All Clearance Campaigns' },
                ...(campaignsRes?.data || [])
                  .filter((c: any) => !sessionId || c.sessionId === sessionId)
                  .map((c: any) => ({
                    value: c.id,
                    label: c.name,
                  })),
              ]}
              searchable={true}
              placeholder="All Clearance Campaigns"
              triggerClassName="py-1.5 px-3 text-xs font-semibold"
              align="right"
            />
          </div>
        </div>
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
          onPageChange={handlePageChange}
          onRefresh={() => refetch()}
          search={search}
          onSearchChange={handleSearchChange}
        />
      )}
    </div>
  )
}
