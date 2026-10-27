'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CustomDropdown } from '@/components/ui/CustomDropdown'

export function DashboardCampaignFilter({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCampaignId = searchParams.get('campaignId') || ''

  const options = [
    { value: '', label: 'All Campaigns (Global)' },
    ...campaigns.map(c => ({
      value: c.id,
      label: c.name,
    })),
  ]

  return (
    <div className="w-60">
      <CustomDropdown
        value={currentCampaignId}
        onChange={(val) => {
          if (val) {
            router.push(`/admin/dashboard?campaignId=${val}`)
          } else {
            router.push(`/admin/dashboard`)
          }
        }}
        options={options}
        searchable={true}
        placeholder="All Campaigns (Global)"
        triggerClassName="py-1.5 px-3 text-xs font-semibold"
      />
    </div>
  )
}
