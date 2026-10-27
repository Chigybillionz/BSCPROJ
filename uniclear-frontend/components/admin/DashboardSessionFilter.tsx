'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CustomDropdown } from '@/components/ui/CustomDropdown'

export function DashboardSessionFilter({ sessions, baseUrl = '/admin/dashboard' }: { sessions: { id: string; name: string; isActive?: boolean }[], baseUrl?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSessionId = searchParams.get('sessionId') || ''
  const activeSessionId = sessions.find((s: any) => s.isActive)?.id || 'all'

  const options = [
    { value: 'all', label: 'All Sessions (Global)' },
    ...sessions.map(s => ({
      value: s.id,
      label: s.name,
      badge: s.isActive ? 'Active' : undefined,
    })),
  ]

  return (
    <div className="w-56">
      <CustomDropdown
        value={currentSessionId || activeSessionId}
        onChange={(val) => {
          router.push(`${baseUrl}?sessionId=${val}`)
        }}
        options={options}
        searchable={true}
        placeholder="Select Session"
        triggerClassName="py-1.5 px-3 text-xs font-semibold"
      />
    </div>
  )
}
