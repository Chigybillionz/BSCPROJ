'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useTenantStore } from '@/store/useTenantStore'
import { useUIStore } from '@/store/useUIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils/cn'
import { ROUTES } from '@/lib/constants'
import type { University } from '@/types'

interface TenantShellProps {
  university: University | null
  children: React.ReactNode
}

export function TenantShell({ university, children }: TenantShellProps) {
  const setTenant      = useTenantStore(s => s.setTenant)
  const sidebarOpen    = useUIStore(s => s.sidebarOpen)
  const setSidebarOpen = useUIStore(s => s.setSidebarOpen)
  const user           = useAuthStore(s => s.user)
  const pathname       = usePathname()
  const router         = useRouter()
  const [rehydrated, setRehydrated] = useState(false)

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) { setRehydrated(true); return }
    const unsub = useAuthStore.persist.onFinishHydration(() => setRehydrated(true))
    return unsub
  }, [])

  useEffect(() => {
    if (university) {
      setTenant({
        universityId: university.id,
        name:         university.name,
        slug:         university.slug,
        primaryColor: university.primaryColor ?? '#1B4F72',
        accentColor:  university.accentColor  ?? '#2980B9',
        logoUrl:      university.logoUrl       ?? null,
      })
    } else if (user?.role === 'PLATFORM_OWNER') {
      setTenant({
        universityId: null,
        name:         'UniClear Platform',
        slug:         'platform',
        primaryColor: '#1B4F72',
        accentColor:  '#2980B9',
        logoUrl:      null,
      })
    }
  }, [university, setTenant, user?.role])

  const isAuthorised = rehydrated && !!user && (
    (user.role === 'STUDENT'                                    && pathname.startsWith('/student')) ||
    (user.role === 'OFFICER'                                    && pathname.startsWith('/officer')) ||
    ((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')     && pathname.startsWith('/admin'))  ||
    (user.role === 'PLATFORM_OWNER'                             && pathname.startsWith('/platform'))
  )

  useEffect(() => {
    if (!rehydrated) return
    if (!user) { router.replace(ROUTES.login); return }
    const role = user.role
    if (role === 'STUDENT' && !pathname.startsWith('/student'))   { router.replace(ROUTES.student.dashboard); return }
    if (role === 'OFFICER' && !pathname.startsWith('/officer'))   { router.replace(ROUTES.officer.dashboard); return }
    if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && !pathname.startsWith('/admin')) { router.replace(ROUTES.admin.dashboard); return }
  }, [user, pathname, rehydrated, router])

  if (!rehydrated) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
    </div>
  )

  if (!isAuthorised) return null

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={cn('transition-all duration-250', sidebarOpen ? 'lg:pl-60' : 'pl-0')}>
        <Topbar />
        <main className="p-3 md:p-6">{children}</main>
      </div>
    </div>
  )
}
