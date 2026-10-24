import { PageHeader } from '@/components/layout/PageHeader'
import { StageBuilder } from '@/components/admin/StageBuilder'

export default async function AdminStagesPage({ searchParams }: { searchParams: Promise<{ campaignId?: string }> }) {
  const { campaignId } = await searchParams
  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Clearance Workflow Sequence"
        subtitle="Define and reorder clearance stages, assign departmental officers, and mandate required documentation."
      />
      <StageBuilder campaignId={campaignId} />
    </div>
  )
}
