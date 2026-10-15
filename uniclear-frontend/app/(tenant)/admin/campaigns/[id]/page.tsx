import { serverFetch } from '@/lib/api/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Users, CheckCircle, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

async function getSummary(campaignId: string) {
  try {
    return await serverFetch<{
      totalStudents: number
      totalClearances: number
      completed: number
      inProgress: number
      completionRate: string
      avgProcessingDays: number
      departmentRates: { name: string; total: number; completed: number; rate: number }[]
    }>(`/reports/summary?campaignId=${campaignId}`)
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    return { totalStudents: 0, totalClearances: 0, completed: 0, inProgress: 0, completionRate: '0', avgProcessingDays: 0, departmentRates: [] }
  }
}

async function getStageBreakdown(campaignId: string) {
  try {
    return await serverFetch<{ stage: { name: string }; pending: number; approved: number; rejected: number }[]>(`/reports/by-stage?campaignId=${campaignId}`)
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    return []
  }
}

async function getCampaign(campaignId: string) {
  try {
    const res = await serverFetch<any>('/campaigns')
    const campaigns = Array.isArray(res) ? res : res.data || []
    const campaign = campaigns.find((c: any) => c.id === campaignId)
    return campaign || { id: campaignId, name: 'Campaign Details' }
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    return { id: campaignId, name: 'Campaign Details' }
  }
}

export default async function CampaignDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params
  const [summary, stages, campaign] = await Promise.all([
    getSummary(campaignId),
    getStageBreakdown(campaignId),
    getCampaign(campaignId)
  ])

  const statCards = [
    { label: 'Students',    value: summary.totalStudents,        icon: Users,         note: '' },
    { label: 'Cleared',     value: summary.completed,            icon: CheckCircle,   note: `${summary.completionRate}%` },
    { label: 'In Progress', value: summary.inProgress,           icon: Clock,         note: '' },
    { label: 'Avg Process', value: summary.avgProcessingDays,    icon: Clock,         note: 'Days to clear' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/dashboard">
          <Button variant="secondary" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        </Link>
        <PageHeader title={campaign.name} subtitle="Specific clearance funnel and rates for this campaign" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, note }) => (
          <Card key={label} padding="md">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">{label}</p>
              <Icon className="h-3.5 w-3.5 text-[var(--color-muted)] shrink-0" />
            </div>
            <p className="text-xl font-bold text-[var(--color-text)] truncate">{value}</p>
            {note && <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{note}</p>}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Clearance Funnel Analytics</h2>
            <div className="flex gap-4 text-[11px] font-medium">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Approved</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400"></span> Pending</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"></span> Rejected</span>
            </div>
          </div>
          <div className="space-y-5">
            {stages.map(row => {
              const total = Math.max(row.approved + row.pending + row.rejected, 1)
              const approvedPct = (row.approved / total) * 100
              const pendingPct = (row.pending / total) * 100
              const rejectedPct = (row.rejected / total) * 100

              return (
                <div key={row.stage.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-[var(--color-text)]">{row.stage.name}</p>
                    <div className="flex gap-3 text-xs shrink-0 ml-2 font-medium">
                      <span className="text-emerald-600">{row.approved}</span>
                      <span className="text-yellow-600">{row.pending}</span>
                      <span className="text-red-600">{row.rejected}</span>
                    </div>
                  </div>
                  <div className="bg-[var(--color-bg-secondary)] rounded-full h-2.5 overflow-hidden flex border border-[var(--color-border)] shadow-inner">
                    {approvedPct > 0 && <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${approvedPct}%` }} title={`Approved: ${row.approved}`} />}
                    {pendingPct > 0 && <div className="bg-yellow-400 h-full transition-all duration-500" style={{ width: `${pendingPct}%` }} title={`Pending: ${row.pending}`} />}
                    {rejectedPct > 0 && <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${rejectedPct}%` }} title={`Rejected: ${row.rejected}`} />}
                  </div>
                </div>
              )
            })}
            {stages.length === 0 && (
              <div className="text-center py-6 text-sm text-[var(--color-muted)]">No active clearance stages found.</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Department Clearance Rates</h2>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {summary.departmentRates?.map(dept => (
              <div key={dept.name}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-[var(--color-text)] truncate pr-4">{dept.name}</p>
                  <p className="text-[11px] text-[var(--color-muted)] shrink-0">{dept.completed} / {dept.total}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-[var(--color-bg-secondary)] rounded-full h-1.5 overflow-hidden flex-1">
                    <div className="bg-[var(--color-primary)] h-full transition-all duration-500" style={{ width: `${dept.rate}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--color-text)] w-8 text-right">{dept.rate}%</span>
                </div>
              </div>
            ))}
            {(!summary.departmentRates || summary.departmentRates.length === 0) && (
              <div className="text-center py-6 text-sm text-[var(--color-muted)]">No department data available.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
