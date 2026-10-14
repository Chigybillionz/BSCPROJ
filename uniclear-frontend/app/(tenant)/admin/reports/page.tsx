import { serverFetch } from '@/lib/api/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { DashboardSessionFilter } from '@/components/admin/DashboardSessionFilter'
import Link from 'next/link'
import { Download } from 'lucide-react'

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ sessionId?: string }> }) {
  const resolvedParams = await searchParams
  let sessions: any[] = []
  try {
    sessions = await serverFetch<any>('/sessions').then(res => Array.isArray(res) ? res : res.data || [])
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    console.error('Failed to fetch sessions for reports:', err)
  }
  
  const activeSessionId = sessions.find((s: any) => s.isActive)?.id

  let sessionId = resolvedParams?.sessionId
  if (sessionId === undefined && activeSessionId) {
    sessionId = activeSessionId
  } else if (sessionId === 'all') {
    sessionId = undefined
  }

  let summary = { totalStudents: 0, totalClearances: 0, completed: 0, completionRate: 0 }
  let campaigns: any[] = []
  
  try {
    const [fetchedSummary, fetchedCampaigns] = await Promise.all([
      serverFetch<any>(`/reports/summary${sessionId ? `?sessionId=${sessionId}` : ''}`),
      serverFetch<any>(`/campaigns${sessionId ? `?sessionId=${sessionId}` : ''}`).then(res => Array.isArray(res) ? res : res.data || [])
    ])
    summary = fetchedSummary || summary
    campaigns = fetchedCampaigns || campaigns
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    console.error('Failed to fetch report data:', err)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Reports" subtitle={sessionId ? "Clearance analytics for session" : "Global clearance analytics"} />
        <div className="flex items-center gap-3">
          <DashboardSessionFilter sessions={sessions} baseUrl="/admin/reports" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students',    value: summary.totalStudents   },
          { label: 'Total Clearances',  value: summary.totalClearances },
          { label: 'Completed',         value: summary.completed       },
          { label: 'Completion Rate',   value: `${summary.completionRate}%` },
        ].map(c => (
          <Card key={c.label}>
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide font-medium mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card padding="sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Campaign Reports</h2>
          <a 
            href={`/api/v1/reports/export?format=csv${sessionId ? `&sessionId=${sessionId}` : ''}`} 
            target="_blank" 
            download
            className="inline-flex items-center justify-center font-medium rounded-md text-xs px-3 py-1.5 gap-1.5 border border-[var(--color-border)] hover:bg-[var(--color-bg)]"
          >
            <Download className="h-4 w-4 mr-1" />
            Export Session Data (CSV)
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/admin/campaigns/${campaign.id}`}>
              <div className="border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors rounded-lg p-3 bg-[var(--color-bg-secondary)] cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">{campaign.name}</h3>
                  {campaign.isActive && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1"></span>}
                </div>
                <div className="mt-3 flex items-center text-[11px] font-medium text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  View Campaign Details <span className="ml-1">→</span>
                </div>
              </div>
            </Link>
          ))}
          {campaigns.length === 0 && (
            <div className="col-span-full text-center py-6 text-sm text-[var(--color-muted)]">No campaigns available for reporting in this session.</div>
          )}
        </div>
      </Card>
    </div>
  )
}
