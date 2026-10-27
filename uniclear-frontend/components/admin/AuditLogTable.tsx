'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AuditApi } from '@/lib/api/audit.api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Award,
  Play,
  LogIn,
  UserPlus,
  UserCheck,
  UserMinus,
  Search,
  RefreshCw,
  Copy,
  Check,
  Clock,
  Info,
  X,
  FileCode,
  Activity,
  Layers,
} from 'lucide-react'

const ACTION_OPTIONS: DropdownOption[] = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'STAGE_APPROVED', label: 'Stage Approved' },
  { value: 'STAGE_REJECTED', label: 'Stage Rejected' },
  { value: 'STAGE_SUBMITTED', label: 'Stage Submitted' },
  { value: 'DOCUMENT_UPLOADED', label: 'Document Uploaded' },
  { value: 'CLEARANCE_STARTED', label: 'Clearance Started' },
  { value: 'CLEARANCE_COMPLETED', label: 'Clearance Completed' },
  { value: 'USER_LOGIN', label: 'User Login' },
  { value: 'OFFICER_CREATED', label: 'Officer Created' },
  { value: 'STAGE_OFFICER_ASSIGNED', label: 'Officer Assigned' },
  { value: 'STAGE_OFFICER_ASSIGNED_MULTIPLE', label: 'Multiple Stages Assigned' },
  { value: 'STAGE_OFFICER_UNASSIGNED', label: 'Officer Unassigned' },
  { value: 'UPDATE_STUDENT_PROFILE', label: 'Student Profile Updated' },
]

function getActionMeta(action: string) {
  const upper = (action || '').toUpperCase()
  if (upper.includes('APPROVED')) {
    return {
      label: 'Stage Approved',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    }
  }
  if (upper.includes('REJECTED')) {
    return {
      label: 'Stage Rejected',
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
    }
  }
  if (upper.includes('SUBMITTED')) {
    return {
      label: 'Stage Submitted',
      icon: <Layers className="h-3.5 w-3.5" />,
      colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    }
  }
  if (upper.includes('UPLOADED')) {
    return {
      label: 'Document Uploaded',
      icon: <FileUp className="h-3.5 w-3.5" />,
      colorClass: 'text-sky-700 bg-sky-50 border-sky-200',
    }
  }
  if (upper.includes('COMPLETED') || upper.includes('COMPLETE')) {
    return {
      label: 'Clearance Complete',
      icon: <Award className="h-3.5 w-3.5" />,
      colorClass: 'text-purple-700 bg-purple-50 border-purple-200',
    }
  }
  if (upper.includes('STARTED')) {
    return {
      label: 'Clearance Started',
      icon: <Play className="h-3.5 w-3.5" />,
      colorClass: 'text-blue-700 bg-blue-50 border-blue-200',
    }
  }
  if (upper.includes('LOGIN')) {
    return {
      label: 'User Login',
      icon: <LogIn className="h-3.5 w-3.5" />,
      colorClass: 'text-slate-700 bg-slate-100 border-slate-200',
    }
  }
  if (upper.includes('ASSIGNED')) {
    return {
      label: 'Officer Assigned',
      icon: <UserCheck className="h-3.5 w-3.5" />,
      colorClass: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    }
  }
  if (upper.includes('UNASSIGNED')) {
    return {
      label: 'Officer Unassigned',
      icon: <UserMinus className="h-3.5 w-3.5" />,
      colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    }
  }
  if (upper.includes('OFFICER_CREATED')) {
    return {
      label: 'Officer Created',
      icon: <UserPlus className="h-3.5 w-3.5" />,
      colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
    }
  }
  return {
    label: action.replace(/_/g, ' '),
    icon: <Activity className="h-3.5 w-3.5" />,
    colorClass: 'text-slate-700 bg-slate-50 border-slate-200',
  }
}

function getRoleBadge(role?: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-700 border border-purple-200">SUPER ADMIN</span>
    case 'ADMIN':
      return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 border border-blue-200">ADMIN</span>
    case 'OFFICER':
      return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cyan-100 text-cyan-700 border border-cyan-200">OFFICER</span>
    case 'STUDENT':
      return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200">STUDENT</span>
    default:
      return null
  }
}

export function AuditLogTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedAction, setSelectedAction] = useState('ALL')
  const [activeModalLog, setActiveModalLog] = useState<any | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['auditLogs', page, selectedAction, search],
    queryFn: () =>
      AuditApi.list({
        page,
        limit: 15,
        action: selectedAction !== 'ALL' ? selectedAction : undefined,
        search: search.trim() || undefined,
      }).then(res => {
        const raw = res.data as any
        const items: any[] = Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.data?.items)
          ? raw.data.items
          : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw)
          ? raw
          : []
        const total: number =
          raw?.pagination?.total ??
          raw?.data?.pagination?.total ??
          raw?.data?.total ??
          raw?.total ??
          items.length
        const limit: number =
          raw?.pagination?.limit ?? raw?.data?.pagination?.limit ?? 15
        return { items, total, limit }
      }),
  })

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const logs = data?.items || []
  const totalLogs = data?.total || 0
  const approvalsCount = logs.filter((l: any) => l.action?.includes('APPROVED')).length
  const uploadsCount = logs.filter((l: any) => l.action?.includes('UPLOADED')).length
  const submissionsCount = logs.filter((l: any) => l.action?.includes('SUBMITTED')).length

  return (
    <div className="space-y-6">
      {/* ── KPI Stat Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="flex items-center gap-4 bg-white/70 backdrop-blur border-slate-200/80 shadow-xs">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Logs</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{totalLogs}</p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4 bg-white/70 backdrop-blur border-slate-200/80 shadow-xs">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Approvals</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{approvalsCount}</p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4 bg-white/70 backdrop-blur border-slate-200/80 shadow-xs">
          <div className="h-11 w-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <FileUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Uploads</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{uploadsCount}</p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4 bg-white/70 backdrop-blur border-slate-200/80 shadow-xs">
          <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submissions</p>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Immutable security trail active"></span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{submissionsCount}</p>
          </div>
        </Card>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────── */}
      <Card padding="sm" className="bg-white/80 backdrop-blur border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-1">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by email, action, target type, or ID..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action Filter Dropdown */}
          <div className="w-full md:w-64">
            <CustomDropdown
              placeholder="Filter by Action"
              options={ACTION_OPTIONS}
              value={selectedAction}
              onChange={val => {
                setSelectedAction(val)
                setPage(1)
              }}
              clearable={false}
              searchable={true}
            />
          </div>

          {/* Refresh Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-[var(--color-primary)]' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </Card>

      {/* ── Audit Logs Table ──────────────────────────────────────── */}
      <Card padding="none" className="overflow-hidden border-slate-200/80 shadow-xs bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Network IP</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-4 px-4"><div className="h-5 bg-slate-200 rounded-full w-24"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log: any) => {
                  const meta = getActionMeta(log.action)
                  const formattedDate = new Date(log.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.colorClass}`}
                        >
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {log.actor?.email ? log.actor.email[0].toUpperCase() : 'S'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate max-w-[200px]" title={log.actor?.email || 'System'}>
                              {log.actor?.email || 'System / Auto'}
                            </p>
                            <div className="mt-0.5">{getRoleBadge(log.actor?.role)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 text-xs">
                            {log.targetType || 'System'}
                          </span>
                          {log.targetId && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                              <span>{log.targetId.slice(0, 10)}...</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(log.targetId, log.id)}
                                title="Copy Target ID"
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                              >
                                {copiedId === log.id ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {log.ipAddress || 'Internal'}
                        </span>
                      </td>

                      {/* Details Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setActiveModalLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Info className="h-3 w-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <FileCode className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">No audit logs found</p>
                      <p className="text-xs text-slate-500">
                        {search || selectedAction !== 'ALL'
                          ? 'No security events matched your active search or filter criteria.'
                          : 'No audit records have been generated yet.'}
                      </p>
                      {(search || selectedAction !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('')
                            setSelectedAction('ALL')
                          }}
                          className="mt-2 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          Clear active filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Controls ─────────────────────────────────── */}
        {data && data.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-800">{(page - 1) * data.limit + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(page * data.limit, data.total)}</span> of{' '}
              <span className="font-bold text-slate-800">{data.total}</span> events
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="text-xs px-3 py-1 font-semibold"
              >
                Previous
              </Button>
              <span className="px-2 font-semibold text-slate-700">
                Page {page} of {Math.max(1, Math.ceil(data.total / data.limit))}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * data.limit >= data.total}
                onClick={() => setPage(p => p + 1)}
                className="text-xs px-3 py-1 font-semibold"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Metadata Inspection Modal ─────────────────────────────── */}
      {activeModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Event Audit Record</h3>
                  <p className="text-xs text-slate-500 font-mono">{activeModalLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Action</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{activeModalLog.action}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Timestamp</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{new Date(activeModalLog.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actor Email</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{activeModalLog.actor?.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actor Role</span>
                  <div className="mt-0.5">{getRoleBadge(activeModalLog.actor?.role)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Entity</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{activeModalLog.targetType || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">IP Address</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{activeModalLog.ipAddress || 'Internal'}</p>
                </div>
              </div>

              {activeModalLog.targetId && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Identifier</span>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-700 mt-1 border border-slate-200">
                    <span className="truncate">{activeModalLog.targetId}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeModalLog.targetId, 'modal-target')}
                      className="text-slate-500 hover:text-slate-800 ml-2 shrink-0 font-sans text-xs flex items-center gap-1 font-semibold"
                    >
                      {copiedId === 'modal-target' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Event Metadata Payload</span>
                <pre className="p-3 mt-1 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                  {activeModalLog.metadata
                    ? JSON.stringify(activeModalLog.metadata, null, 2)
                    : '// No additional metadata recorded'}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveModalLog(null)}
                className="px-4 py-2 text-xs font-semibold"
              >
                Close Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
