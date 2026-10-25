import { PageHeader } from '@/components/layout/PageHeader'
import { CampaignList } from '@/components/admin/CampaignList'
import { serverFetch } from '@/lib/api/server'

export const dynamic = 'force-dynamic'

async function getSessions() {
  try {
    const res = await serverFetch<any>('/sessions')
    return Array.isArray(res) ? res : res.data || []
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    console.error('Failed to fetch sessions:', err)
    return []
  }
}

export default async function AdminCampaignsPage() {
  const sessions = await getSessions()
  
  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Clearance Campaigns"
        subtitle="Manage multiple clearance workflows (e.g. Fresher, Hostel, Graduation)"
      />
      <CampaignList initialSessions={sessions} />
    </div>
  )
}
