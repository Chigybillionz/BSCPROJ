'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, UserCircle, Settings, FileText,
  CalendarDays, BarChart2, Paintbrush, ClipboardList, University,
  GraduationCap, FolderOpen, Terminal, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/store/useUIStore'
import { useRole } from '@/hooks/useRole'
import { useTenant } from '@/hooks/useTenant'
import { ROUTES } from '@/lib/constants'
import { BrandLogo } from '@/components/shared/BrandLogo'

interface NavItem { label: string; href: string; icon: LucideIcon }

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.admin.dashboard,  icon: LayoutDashboard },
  { label: 'Students',  href: ROUTES.admin.students,   icon: Users },
  { label: 'Officers',  href: ROUTES.admin.officers,   icon: UserCircle },
  { label: 'Campaigns', href: ROUTES.admin.campaigns,  icon: Settings },
  { label: 'Stages',    href: ROUTES.admin.stages,     icon: Settings },
  { label: 'Documents', href: ROUTES.admin.documents,  icon: FileText },
  { label: 'Sessions',  href: ROUTES.admin.sessions,   icon: CalendarDays },
  { label: 'Structure', href: ROUTES.admin.structure,  icon: University },
  { label: 'Reports',   href: ROUTES.admin.reports,    icon: BarChart2 },
  { label: 'Audit Log', href: ROUTES.admin.audit,      icon: ClipboardList },
  { label: 'Branding',  href: ROUTES.admin.branding,   icon: Paintbrush },
  { label: 'Developer', href: ROUTES.admin.developer,  icon: Terminal },
]

const officerNav: NavItem[] = [
  { label: 'Dashboard',        href: ROUTES.officer.dashboard, icon: LayoutDashboard },
  { label: 'Queue',            href: ROUTES.officer.queue,     icon: ClipboardList },
  { label: 'Stamps & Profile', href: ROUTES.officer.settings,  icon: Settings },
]

const studentNav: NavItem[] = [
  { label: 'Dashboard',   href: ROUTES.student.dashboard,   icon: LayoutDashboard },
  { label: 'Documents',   href: ROUTES.student.documents,   icon: FolderOpen },
  { label: 'Clearance',   href: ROUTES.student.clearance,   icon: GraduationCap },
  { label: 'Certificate', href: ROUTES.student.certificate, icon: FileText },
]

const platformNav: NavItem[] = [
  { label: 'Dashboard',    href: ROUTES.platform.dashboard,    icon: LayoutDashboard },
  { label: 'Universities', href: ROUTES.platform.universities, icon: University },
]

export function Sidebar() {
  const pathname                      = usePathname()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { role, isOfficer, isPlatformOwner, isStudent } = useRole()
  const { name, logoUrl } = useTenant()

  // Use pathname as fallback during initial hydration to prevent nav flashing
  let navItems = adminNav
  if (role) {
    navItems = isPlatformOwner ? platformNav
             : isOfficer       ? officerNav
             : isStudent       ? studentNav
             : adminNav
  } else {
    if (pathname.startsWith('/platform')) navItems = platformNav
    else if (pathname.startsWith('/officer')) navItems = officerNav
    else if (pathname.startsWith('/student')) navItems = studentNav
  }

  const handleNavClick = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <aside
      className={cn(
        'fixed top-14 lg:top-0 bottom-0 left-0 z-30 flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-250',
        sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
      )}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)]">
        <BrandLogo
          logoUrl={isPlatformOwner ? null : logoUrl}
          alt={isPlatformOwner ? 'UniClear' : (name || 'UniClear')}
          size={32}
          className="h-8 w-8 rounded-md ring-1 ring-black/5"
        />
        <span className="font-semibold text-sm text-[var(--color-text)] truncate">{isPlatformOwner ? 'UniClear Platform' : (name || 'UniClear')}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-accent)]'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
