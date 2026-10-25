import { cookies } from 'next/headers'
import type { University } from '@/types'
import { TenantShell } from './TenantShell'

export const dynamic = 'force-dynamic'

const API_URL = process.env.API_URL || 'http://localhost:5000'

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  let university: University | null = null

  if (token) {
    try {
      const res = await fetch(`${API_URL}/api/v1/universities/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const json = await res.json()
      if (json.success) university = json.data
    } catch {}
  }

  const primary = university?.primaryColor ?? '#1B4F72'
  const accent  = university?.accentColor  ?? '#2980B9'

  return (
    <div
      style={{ '--color-primary': primary, '--color-accent': accent } as React.CSSProperties}
      suppressHydrationWarning
    >
      <TenantShell university={university}>
        {children}
      </TenantShell>
    </div>
  )
}
