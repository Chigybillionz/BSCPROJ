'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, LogOut, Search, Sparkles, ShieldCheck } from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useTenantStore } from '@/store/useTenantStore'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { getInitials } from '@/lib/utils/format'
import { NotificationBellDropdown } from './NotificationBellDropdown'
import { ProfileSlideOver } from './ProfileSlideOver'

interface TopbarProps {
  title?: string
}

export function Topbar({ title }: TopbarProps) {
  const toggleSidebar = useUIStore(s => s.toggleSidebar)
  const { mutate: logout, isPending } = useLogout()
  const [profileOpen, setProfileOpen] = useState(false)

  const user = useAuthStore(s => s.user)
  const tenantName = useTenantStore(s => s.name)
  const tenantSlug = useTenantStore(s => s.slug)

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 md:px-6 glass-panel border-b border-slate-200/80 transition-all">
        {/* Left Section: Menu toggle & Contextual Title / Breadcrumb */}
        <div className="flex items-center gap-3.5">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            aria-label="Toggle navigation sidebar"
          >
            <Menu className="h-5 w-5" />
          </motion.button>

          <div className="flex items-center gap-2">
            {tenantName && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                {tenantName}
              </span>
            )}
            {title && (
              <span className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                <span className="hidden sm:inline text-slate-300">/</span>
                {title}
              </span>
            )}
          </div>
        </div>

        {/* Center Section: Quick Search Command Bar Button */}
        <div className="hidden md:flex items-center max-w-sm w-full mx-4">
          <div className="w-full relative flex items-center">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              readOnly
              placeholder="Search clearances, stages, documents..."
              className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60 rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 cursor-pointer transition-all focus:outline-none"
              onClick={() => setProfileOpen(true)}
            />
            <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Section: Notifications, User Profile & Logout */}
        <div className="flex items-center gap-2.5">
          <NotificationBellDropdown />

          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            {/* User Profile Pill */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-left"
            >
              <div className="h-8 w-8 rounded-full bg-[var(--color-primary)] text-white text-xs font-extrabold flex items-center justify-center shadow-xs ring-2 ring-white">
                {user ? getInitials(user.email) : '?'}
              </div>
              <div className="hidden xl:block leading-tight">
                <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                  {user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-[var(--color-primary)] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  {user?.role || 'User'}
                </p>
              </div>
            </motion.button>

            {/* Logout Button */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => logout()}
              disabled={isPending}
              className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </header>

      <ProfileSlideOver open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
