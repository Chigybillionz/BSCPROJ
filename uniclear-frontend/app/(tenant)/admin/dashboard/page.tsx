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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, note }) => (
          <Card key={label} padding="lg" className="border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                <Icon className="h-4 w-4 shrink-0" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums truncate">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {note && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md mt-2">
                {note}
              </span>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
        <Card padding="lg" className="border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Campaigns</h2>
              <p className="text-xs text-slate-500 mt-0.5">Configured clearance workflows for active sessions</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {campaigns.length} Active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
            {campaigns.map((campaign: any) => (
              <Link key={campaign.id} href={`/admin/campaigns/${campaign.id}`}>
                <div className="border border-slate-200 hover:border-[var(--color-primary)] transition-all rounded-xl p-4 bg-white hover:bg-slate-50/60 cursor-pointer group shadow-2xs">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                      {campaign.name}
                    </h3>
                    {campaign.isActive && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {campaign.description || 'No campaign description provided.'}
                  </p>
                  <div className="mt-3 flex items-center text-[11px] font-semibold text-[var(--color-primary)]">
                    Manage Workflow <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
                  </div>
                </div>
              </Link>
            ))}
            {campaigns.length === 0 && (
              <div className="col-span-full text-center py-8 text-xs text-slate-500">
                No active clearance campaigns configured.
              </div>
            )}
          </div>
        </Card>

        <Card padding="lg" className="border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Department Clearance Rates</h2>
              <p className="text-xs text-slate-500 mt-0.5">Completion distribution across academic departments</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              Top {Math.min(8, summary.departmentRates?.length || 0)}
            </span>
          </div>
          <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
            {summary.departmentRates?.slice(0, 8).map(dept => (
              <div key={dept.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <p className="font-semibold text-slate-800 truncate pr-4">{dept.name}</p>
                  <span className="text-slate-500 font-mono text-[11px] tabular-nums shrink-0">
                    {dept.completed} / {dept.total} ({dept.rate}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                  <div 
                    className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${dept.rate}%` }} 
                  />
                </div>
              </div>
            ))}
            {(!summary.departmentRates || summary.departmentRates.length === 0) && (
              <div className="text-center py-8 text-xs text-slate-500">
                No departmental clearance data available for this session.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
