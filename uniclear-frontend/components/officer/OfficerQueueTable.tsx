'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateTime, getInitials } from '@/lib/utils/format'
import { ROUTES } from '@/lib/constants'
import {
  Search,
  Eye,
  Clock,
  Building2,
  RefreshCw,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface OfficerQueueItem {
  id: string
  status: string
  stageStatus: string
  currentStageId?: string | null
  updatedAt: string | Date
  createdAt: string | Date
  student?: {
    id: string
    firstName: string
    lastName: string
    jambRegNo: string
    matricNo?: string | null
    level?: string | null
    faculty?: { id: string; name: string } | null
    department?: { id: string; name: string } | null
  } | null
  currentStage?: {
    id: string
    name: string
    orderIndex?: number
  } | null
  documents?: Array<{
    id: string
    status?: string
    fileName?: string
    uploadedAt?: string | Date
    documentType?: { name: string } | null
  }> | null
}

interface OfficerQueueTableProps {
  items: OfficerQueueItem[]
  isLoading?: boolean
  total?: number
  page?: number
  onPageChange?: (page: number) => void
  onRefresh?: () => void
  search?: string
  onSearchChange?: (val: string) => void
}

export function OfficerQueueTable({
  items = [],
  isLoading = false,
  total = 0,
  page = 1,
  onPageChange,
  onRefresh,
  search = '',
  onSearchChange,
}: OfficerQueueTableProps) {
  const router = useRouter()
  const [localSearch, setLocalSearch] = useState(search)
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [recentOnly, setRecentOnly] = useState<boolean>(false)

  // Extract unique departments for filter dropdown
  const departments = React.useMemo(() => {
    const set = new Set<string>()
    items.forEach(item => {
      if (item.student?.department?.name) {
        set.add(item.student.department.name)
      }
    })
    return Array.from(set).sort()
  }, [items])

  // Helper to determine if an item had an upload within the last 24 hours
  const isRecentlyUploaded = (item: OfficerQueueItem) => {
    const docs = item.documents || []
    if (docs.length === 0) return false
    const now = Date.now()
    return docs.some(d => {
      if (!d.uploadedAt) return false
      const uploadedTime = new Date(d.uploadedAt).getTime()
      return now - uploadedTime < 24 * 60 * 60 * 1000 // 24 hours
    })
  }

  // Count recent items
  const recentCount = React.useMemo(() => {
    return items.filter(isRecentlyUploaded).length
  }, [items])

  // Filter items locally by department and recent uploads
  const filteredItems = React.useMemo(() => {
    let result = items
    if (selectedDept !== 'ALL') {
      result = result.filter(i => i.student?.department?.name === selectedDept)
    }
    if (recentOnly) {
      result = result.filter(isRecentlyUploaded)
    }
    return result
  }, [items, selectedDept, recentOnly])

  // Real-time debounced search so officers don't have to manually press Enter
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange?.(localSearch)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, search, onSearchChange])

  React.useEffect(() => {
    setLocalSearch(search)
  }, [search])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchChange?.(localSearch)
  }

  return (
    <Card padding="sm" className="p-0 overflow-hidden border border-[var(--color-border)] shadow-sm">
      {/* Table Toolbar */}
      <div className="p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
          <Input
            placeholder="Search by name or JAMB Reg No..."
            value={localSearch}
            onChange={e => {
              setLocalSearch(e.target.value)
              if (e.target.value === '') {
                onSearchChange?.('')
              }
            }}
            icon={<Search className="h-4 w-4 text-[var(--color-muted)]" />}
            className="w-full text-xs"
          />
          <Button type="submit" size="sm" variant="secondary" className="shrink-0 text-xs">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2.5">
          {/* Recent Uploads Quick Filter Toggle */}
          <button
            type="button"
            onClick={() => setRecentOnly(!recentOnly)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              recentOnly
                ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]/40"
            )}
            title="Filter students who uploaded documents in the last 24 hours"
          >
            <Sparkles className={cn("h-3.5 w-3.5", recentOnly ? "text-white" : "text-amber-500")} />
            <span>Recent Uploads {recentCount > 0 ? `(${recentCount})` : ''}</span>
          </button>

          {departments.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5 text-[var(--color-muted)]" />
              <select
                className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text)] font-medium"
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
              >
                <option value="ALL">All Departments ({items.length})</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh queue"
              className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[var(--color-bg)]/60 border-b border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4">Reg Number</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Date Submitted</th>
              <th className="py-3 px-4 text-center">Docs</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[var(--color-muted)]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
                    <p className="text-xs font-medium">Loading clearance queue...</p>
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--color-text)] mb-1">
                      {search || selectedDept !== 'ALL' ? 'No Matching Records' : 'All Caught Up!'}
                    </h4>
                    <p className="text-xs text-[var(--color-muted)]">
                      {search || selectedDept !== 'ALL'
                        ? 'Try clearing your search query or department filters to see more results.'
                        : 'There are currently no students awaiting clearance approval in your assigned queue.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map(item => {
                const fullName = item.student
                  ? `${item.student.firstName} ${item.student.lastName}`
                  : 'Unknown Student'
                const initials = getInitials(fullName)

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--color-bg)]/70 transition-colors group"
                  >
                    {/* Student Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-xs text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors truncate">
                              {fullName}
                            </p>
                            {isRecentlyUploaded(item) && (
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shrink-0"
                                title="Student uploaded new document(s) within the last 24 hours"
                              >
                                <Sparkles className="h-2.5 w-2.5 text-amber-600 animate-pulse" />
                                <span>New Upload</span>
                              </span>
                            )}
                          </div>
                          {item.student?.level && (
                            <span className="text-[10px] text-[var(--color-muted)] flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              Level {item.student.level}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Reg Number */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] tracking-tight">
                        {item.student?.jambRegNo || item.student?.matricNo || 'N/A'}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4">
                      <div className="min-w-0">
                        <p className="font-medium text-xs text-[var(--color-text)] truncate flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-[var(--color-muted)] shrink-0" />
                          <span>{item.student?.department?.name || 'Departmental Stage'}</span>
                        </p>
                        {item.student?.faculty?.name && (
                          <p className="text-[10px] text-[var(--color-muted)] truncate pl-5">
                            {item.student.faculty.name}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Date Submitted */}
                    <td className="py-3 px-4 text-[var(--color-muted)]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[var(--color-muted)] shrink-0" />
                        <span className="text-xs whitespace-nowrap">
                          {formatDateTime(item.updatedAt || item.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* Documents Status Breakdown */}
                    <td className="py-3 px-4 text-center">
                      {(() => {
                        const docs = item.documents || []
                        const approved = docs.filter(d => (d as any).status === 'APPROVED').length
                        const rejected = docs.filter(d => (d as any).status === 'REJECTED').length
                        const pending = docs.filter(d => (d as any).status !== 'APPROVED' && (d as any).status !== 'REJECTED').length
                        const total = docs.length

                        if (total === 0) {
                          return (
                            <span className="text-[11px] text-slate-400 font-mono">0 files</span>
                          )
                        }

                        if (rejected > 0) {
                          return (
                            <span 
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                              title={`${rejected} document(s) flagged/rejected, ${approved} approved, ${pending} pending`}
                            >
                              <AlertCircle className="h-3 w-3 text-rose-600 shrink-0" />
                              <span>{approved}/{total} • {rejected} Flagged</span>
                            </span>
                          )
                        }

                        if (approved === total && total > 0) {
                          return (
                            <span 
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              title={`All ${total} documents verified & approved`}
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>{approved}/{total} Verified</span>
                            </span>
                          )
                        }

                        return (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                            title={`${approved} verified, ${pending} pending verification`}
                          >
                            <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                            <span>{approved}/{total} ({pending} Pending)</span>
                          </span>
                        )
                      })()}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={(item.stageStatus || item.status) as any} />
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(ROUTES.officer.review(item.id))}
                        className="text-xs shadow-2xs hover:border-[var(--color-primary)] font-medium"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Review
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      {total > 0 && (
        <div className="px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted)]">
          <p>
            Showing <span className="font-semibold text-[var(--color-text)]">{filteredItems.length}</span> of{' '}
            <span className="font-semibold text-[var(--color-text)]">{total}</span> student requests
          </p>
          {onPageChange && total > 20 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="h-8 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="font-medium text-[var(--color-text)] px-1">
                Page {page}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page * 20 >= total}
                onClick={() => onPageChange(page + 1)}
                className="h-8 px-2 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
