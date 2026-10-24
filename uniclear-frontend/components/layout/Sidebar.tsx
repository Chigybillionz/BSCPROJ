'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, UserCircle, Settings, FileText,
  CalendarDays, BarChart2, Paintbrush, ClipboardList, University,
  GraduationCap, FolderOpen, Terminal, Sparkles, ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/store/useUIStore'
import { useRole } from '@/hooks/useRole'
import { useTenant } from '@/hooks/useTenant'
import { ROUTES } from '@/lib/constants'
import { BrandLogo } from '@/components/shared/BrandLogo'

interface NavSection {
  title?: string
  items: Array<{ label: string; href: string; icon: LucideIcon; badge?: string }>
}

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { role, isOfficer, isPlatformOwner, isStudent } = useRole()
  const { name, logoUrl } = useTenant()

  const adminSections: NavSection[] = [
    {
      title: 'Analytics & Activity',
      items: [
        { label: 'Dashboard', href: ROUTES.admin.dashboard, icon: LayoutDashboard },
        { label: 'Reports', href: ROUTES.admin.reports, icon: BarChart2 },
        { label: 'Audit Log', href: ROUTES.admin.audit, icon: ClipboardList },
      ],
    },
    {
      title: 'Clearance Workflows',
      items: [
        { label: 'Campaigns', href: ROUTES.admin.campaigns, icon: Settings },
        { label: 'Stages & Steps', href: ROUTES.admin.stages, icon: Settings },
        { label: 'Document Types', href: ROUTES.admin.documents, icon: FileText },
        { label: 'Academic Sessions', href: ROUTES.admin.sessions, icon: CalendarDays },
      ],
    },
    {
      title: 'Users & Roles',
      items: [
        { label: 'Students', href: ROUTES.admin.students, icon: Users },
        { label: 'Clearance Officers', href: ROUTES.admin.officers, icon: UserCircle },
      ],
    },
    {
      title: 'Platform Config',
      items: [
        { label: 'Faculties & Depts', href: ROUTES.admin.structure, icon: University },
        { label: 'Branding & Themes', href: ROUTES.admin.branding, icon: Paintbrush },
        { label: 'Developer API', href: ROUTES.admin.developer, icon: Terminal },
      ],
    },
  ]

  const officerSections: NavSection[] = [
    {
      title: 'Review Queue',
      items: [
        { label: 'Dashboard', href: ROUTES.officer.dashboard, icon: LayoutDashboard },
        { label: 'Pending Approvals', href: ROUTES.officer.queue, icon: ClipboardList },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Stamps & Profile', href: ROUTES.officer.settings, icon: Settings },
      ],
    },
  ]

  const studentSections: NavSection[] = [
    {
      title: 'Clearance Portal',
      items: [
        { label: 'Dashboard', href: ROUTES.student.dashboard, icon: LayoutDashboard },
        { label: 'Active Clearance', href: ROUTES.student.clearance, icon: GraduationCap },
        { label: 'My Documents', href: ROUTES.student.documents, icon: FolderOpen },
        { label: 'Final Certificate', href: ROUTES.student.certificate, icon: FileText },
      ],
    },
  ]

  const platformSections: NavSection[] = [
    {
      title: 'SaaS Platform',
      items: [
        { label: 'Dashboard', href: ROUTES.platform.dashboard, icon: LayoutDashboard },
        { label: 'Universities', href: ROUTES.platform.universities, icon: University },
      ],
    },
  ]

  const sections = isPlatformOwner
    ? platformSections
    : isOfficer
    ? officerSections
    : isStudent
    ? studentSections
    : adminSections

  const handleNavClick = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <aside
      className={cn(
        'fixed top-16 lg:top-0 bottom-0 left-0 z-30 flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-xs transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}
    >
      {/* Brand & Crest Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-slate-50/50">
        <div className="relative">
          <BrandLogo
            logoUrl={isPlatformOwner ? null : logoUrl}
            alt={isPlatformOwner ? 'UniClear' : name || 'UniClear'}
            size={36}
            className="h-9 w-9 rounded-xl ring-1 ring-black/5 shadow-xs object-cover"
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-xs text-slate-900 truncate tracking-tight">
            {isPlatformOwner ? 'UniClear Platform' : name || 'UniClear Portal'}
          </p>
          <p className="text-[10px] text-[var(--color-muted)] font-medium truncate uppercase tracking-wider">
            {isPlatformOwner ? 'System Admin' : isOfficer ? 'Officer Console' : isStudent ? 'Student Clearance' : 'Tenant Registry'}
          </p>
        </div>
      </div>

      {/* Categorized Nav List */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 custom-scrollbar">
        {sections.map((section, secIdx) => (
          <div key={secIdx} className="space-y-1">
            {section.title && (
              <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                {section.title}
              </p>
            )}
            {section.items.map(item => {
              const active = pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                    active
                      ? 'text-[var(--color-primary)] font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  )}
                >
                  {/* Sliding Framer Motion active pill */}
                  {active && (
                    <motion.div
                      layoutId="activeSidebarIndicator"
                      className="absolute inset-0 bg-[var(--color-primary-light)]/70 border border-[var(--color-primary)]/15 rounded-xl -z-10 shadow-2xs"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                        active ? 'text-[var(--color-primary)]' : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {active && (
                    <ChevronRight className="h-3 w-3 text-[var(--color-primary)] shrink-0 opacity-70" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer System Status Banner */}
      <div className="p-3 border-t border-[var(--color-border)] bg-slate-50/40">
        <div className="px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
              All Systems Operational
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 font-semibold">v1.2</span>
        </div>
      </div>
    </aside>
  )
}
