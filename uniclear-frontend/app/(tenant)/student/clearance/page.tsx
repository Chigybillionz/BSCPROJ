'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { sessionsApi } from '@/lib/api/misc.api'
import { clearanceApi } from '@/lib/api/clearance.api'
import { campaignsApi } from '@/lib/api/campaigns.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { CalendarDays, ArrowRight, FolderKanban } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ROUTES } from '@/lib/constants'

export default function StudentClearancePage() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn:  () => sessionsApi.list().then(r => r.data.data),
  })

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn:  () => campaignsApi.listActive().then(r => r.data.data),
  })

  // A session counts as active when its start year is 2025 or later (year-based rule)
  const isActiveSession = (s: any) => {
    const year = s?.startDate ? new Date(s.startDate).getFullYear() : Number(String(s?.name ?? '').slice(0, 4))
    return year >= 2025
  }

  // Default to the first active (2025+) session when data loads
  useEffect(() => {
    if (sessions && !selectedSessionId) {
      const active = sessions.find((s: any) => isActiveSession(s))
      if (active) setSelectedSessionId(active.id)
      else if (sessions.length > 0) setSelectedSessionId(sessions[0].id)
    }
  }, [sessions, selectedSessionId])

  const { mutate: start, isPending } = useMutation({
    mutationFn: ({ sessionId, campaignId }: { sessionId: string, campaignId: string }) => clearanceApi.start(sessionId, campaignId),
    onSuccess:  () => {
      toast.success('Clearance started!')
      qc.invalidateQueries({ queryKey: ['clearance'] })
      router.push(ROUTES.student.dashboard)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to start clearance'),
  })

  const isSessionActive = (() => {
    const s = sessions?.find((x: any) => x.id === selectedSessionId)
    return s ? isActiveSession(s) : false
  })()

  const isLoading = loadingSessions || loadingCampaigns

  if (isLoading) return <LoadingSkeleton rows={2} />

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader title="Start Clearance" subtitle="Begin a clearance process for a specific session" />

      {(!sessions || sessions.length === 0) ? (
        <EmptyState icon={<CalendarDays className="h-10 w-10" />} title="No sessions available" description="The university has not created any academic sessions yet." />
      ) : (
        <Card className="p-6">
          <div className="mb-6 pb-6 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Select Academic Session</h3>
            <p className="text-xs text-[var(--color-muted)] mb-3">Which session are you performing this clearance for?</p>
            <select 
              value={selectedSessionId || ''} 
              onChange={e => setSelectedSessionId(e.target.value)}
              className="w-full p-2.5 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)]"
            >
              {sessions.map((session: any) => {
                const active = isActiveSession(session)
                return (
                  <option key={session.id} value={session.id} disabled={!active}>
                    {session.name} {active ? '(Active)' : '(Inactive)'}
                  </option>
                )
              })}
            </select>
          </div>

          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Available Clearance Campaigns</h3>
          
          {(!campaigns || campaigns.length === 0) ? (
             <EmptyState icon={<FolderKanban className="h-8 w-8" />} title="No campaigns available" description="You do not have any clearance campaigns available for you." />
          ) : (
            <div className="space-y-3 mb-6">
              {campaigns.map(campaign => (
                <div 
                  key={campaign.id}
                  onClick={() => setSelectedCampaignId(campaign.id)}
                  className={`p-4 border rounded-md cursor-pointer transition-all ${selectedCampaignId === campaign.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}`}
                >
                  <h4 className="font-medium text-[var(--color-text)]">{campaign.name}</h4>
                  {campaign.description && <p className="text-sm text-[var(--color-muted)] mt-1">{campaign.description}</p>}
                </div>
              ))}
            </div>
          )}

          <Button 
            className="w-full" 
            size="lg" 
            disabled={!selectedCampaignId || !selectedSessionId || !isSessionActive || isPending}
            loading={isPending} 
            onClick={() => selectedCampaignId && selectedSessionId && start({ sessionId: selectedSessionId, campaignId: selectedCampaignId })}
          >
            Start Selected Clearance <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Card>
      )}
    </div>
  )
}
