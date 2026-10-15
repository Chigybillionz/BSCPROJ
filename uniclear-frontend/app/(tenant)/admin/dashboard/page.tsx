import { serverFetch } from '@/lib/api/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Users, CheckCircle, Clock } from 'lucide-react'
import { DashboardSessionFilter } from '@/components/admin/DashboardSessionFilter'
import Link from 'next/link'

async function getSummary(sessionId?: string) {
  try {
    return await serverFetch<{
      totalStudents: number
      totalClearances: number
      completed: number
      inProgress: number
      completionRate: string
      avgProcessingDays: number
      departmentRates: { name: string; total: number; completed: number; rate: number }[]
    }>(`/reports/summary${sessionId ? `?sessionId=${sessionId}` : ''}`)
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    console.error('Dashboard summary fetch error:', err)
    return { totalStudents: 0, totalClearances: 0, completed: 0, inProgress: 0, completionRate: '0', avgProcessingDays: 0, departmentRates: [] }
  }
}

async function getCampaigns(sessionId?: string) {
  try {
    const res = await serverFetch<any>(`/campaigns${sessionId ? `?sessionId=${sessionId}` : ''}`)
    return Array.isArray(res) ? res : res.data || []
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    return []
  }
}

async function getSessions() {
  try {
    const res = await serverFetch<any>('/sessions')
    return Array.isArray(res) ? res : res.data || []
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    console.error('Dashboard sessions fetch error:', err)
    return []
  }
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ sessionId?: string }> }) {
  const resolvedParams = await searchParams
  const sessions = await getSessions()
  const activeSessionId = sessions.find((s: any) => s.isActive)?.id
  
  // If no sessionId in URL, default to active session. Use 'all' if user explicitly wants global.
  let sessionId = resolvedParams?.sessionId
  if (sessionId === undefined && activeSessionId) {
    sessionId = activeSessionId
  } else if (sessionId === 'all') {
    sessionId = undefined
  }

  const [summary, campaigns] = await Promise.all([
    getSummary(sessionId), 
    getCampaigns(sessionId)
  ])

  const statCards = [
    { label: 'Students',    value: summary.totalStudents,        icon: Users,         note: '' },
    { label: 'Cleared',     value: summary.completed,            icon: CheckCircle,   note: `${summary.completionRate}%` },
    { label: 'In Progress', value: summary.inProgress,           icon: Clock,         note: '' },
    { label: 'Avg Process', value: summary.avgProcessingDays,    icon: Clock,         note: 'Days to clear' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title="Dashboard" subtitle={sessionId ? `Clearance activity for session` : `Clearance activity overview`} />
        <DashboardSessionFilter sessions={sessions} />
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
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Active Campaigns</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {campaigns.map((campaign: any) => (
              <Link key={campaign.id} href={`/admin/campaigns/${campaign.id}`}>
                <div className="border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors rounded-lg p-3 bg-[var(--color-bg-secondary)] cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">{campaign.name}</h3>
                    {campaign.isActive && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1"></span>}
                  </div>
                  <p className="text-xs text-[var(--color-muted)] line-clamp-2">
                    {campaign.description || 'No description provided.'}
                  </p>
                  <div className="mt-3 flex items-center text-[11px] font-medium text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <span className="ml-1">→</span>
                  </div>
                </div>
              </Link>
            ))}
            {campaigns.length === 0 && (
              <div className="col-span-full text-center py-6 text-sm text-[var(--color-muted)]">No active campaigns found.</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Department Clearance Rates</h2>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {summary.departmentRates?.slice(0, 8).map(dept => (
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
