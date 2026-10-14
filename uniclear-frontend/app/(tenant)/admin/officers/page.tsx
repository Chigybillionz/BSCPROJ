'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { officersApi } from '@/lib/api/officers.api'
import { stagesApi } from '@/lib/api/stages.api'
import { structureApi } from '@/lib/api/misc.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { InviteResultDialog } from '@/components/shared/InviteResultDialog'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import {
  UserCircle, AlertTriangle, Pencil, Trash2, Shield, Plus,
  Search, CheckCircle2, UserPlus, Layers, X
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

const inviteUserSchema = z.object({
  firstName:    z.string().min(1, 'First name is required'),
  lastName:     z.string().min(1, 'Last name is required'),
  email:        z.string().email('Please enter a valid email address'),
  role:         z.enum(['OFFICER', 'ADMIN']).default('OFFICER'),
  stageId:      z.string().optional(),
  facultyId:    z.string().optional(),
  departmentId: z.string().optional(),
})
type InviteUserForm = z.infer<typeof inviteUserSchema>

const editSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
})
type EditForm = z.infer<typeof editSchema>

interface InviteResult { email: string; tempPassword: string; inviteLink: string }

export default function AdminOfficersPage() {
  const qc = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [assignTarget, setAssignTarget] = useState<any | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'OFFICER' | 'ADMIN'>('ALL')
  const [stageFilter, setStageFilter] = useState<string>('ALL')

  // Quick Assign form state
  const [quickStageId, setQuickStageId] = useState('')
  const [quickFacultyId, setQuickFacultyId] = useState('')
  const [quickDeptId, setQuickDeptId] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['officers'],
    queryFn: () => officersApi.list(1, 100).then(r => ({
      items: r.data.data,
      total: r.data.pagination.total
    })),
  })

  const { data: stages = [] } = useQuery({
    queryKey: ['stages'],
    queryFn: () => stagesApi.list().then(r => r.data.data),
  })

  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => structureApi.faculties().then(r => r.data.data),
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => structureApi.departments().then(r => r.data.data),
  })

  const inviteForm = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'OFFICER',
      stageId: '',
      facultyId: '',
      departmentId: '',
    }
  })

  const selectedRole = inviteForm.watch('role')
  const selectedStageId = inviteForm.watch('stageId')
  const selectedStage = stages.find(s => s.id === selectedStageId)

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (d: InviteUserForm) => officersApi.create({
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      email: d.email.trim().toLowerCase(),
      role: d.role,
      stageId: d.stageId ? d.stageId : undefined,
      facultyId: d.facultyId ? d.facultyId : undefined,
      departmentId: d.departmentId ? d.departmentId : undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['officers'] })
      qc.invalidateQueries({ queryKey: ['stages'] })
      setInviteOpen(false)
      inviteForm.reset()
      const d = res.data.data as any
      setInviteResult({
        email: d.user?.email ?? d.email ?? '',
        tempPassword: d.tempPassword ?? '',
        inviteLink: d.inviteLink ?? ''
      })
      toast.success('User registered successfully!')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to create user')
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: (d: EditForm) => officersApi.update(editTarget.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['officers'] })
      setEditTarget(null)
      toast.success('User updated')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to update user')
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => officersApi.delete(deleteTarget.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['officers'] })
      setDeleteTarget(null)
      toast.success('User removed')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to remove user')
  })

  const { mutate: assignStage, isPending: assigning } = useMutation({
    mutationFn: () => {
      if (!quickStageId || !assignTarget) throw new Error('Stage is required')
      return officersApi.assign(quickStageId, {
        officerId: assignTarget.id,
        facultyId: quickFacultyId || undefined,
        departmentId: quickDeptId || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['officers'] })
      qc.invalidateQueries({ queryKey: ['stages'] })
      setQuickStageId('')
      setQuickFacultyId('')
      setQuickDeptId('')
      toast.success('Stage assigned to officer')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to assign stage')
  })

  const { mutate: unassignStage } = useMutation({
    mutationFn: (assignmentId: string) => officersApi.unassign(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['officers'] })
      qc.invalidateQueries({ queryKey: ['stages'] })
      toast.success('Assignment removed')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to remove assignment')
  })

  const openEdit = (o: any) => {
    setEditTarget(o)
    editForm.reset({ firstName: o.firstName, lastName: o.lastName })
  }

  const openAssign = (o: any) => {
    setAssignTarget(o)
    setQuickStageId('')
    setQuickFacultyId('')
    setQuickDeptId('')
  }

  // Filtered list
  const filteredOfficers = useMemo(() => {
    if (!data?.items) return []
    return data.items.filter((o: any) => {
      const q = search.toLowerCase()
      const fullName = `${o.firstName} ${o.lastName}`.toLowerCase()
      const email = (o.user?.email || '').toLowerCase()
      const matchesSearch = fullName.includes(q) || email.includes(q)

      const officerRole = o.user?.role || 'OFFICER'
      const matchesRole = roleFilter === 'ALL' || officerRole === roleFilter

      let matchesStage = true
      if (stageFilter === 'UNASSIGNED') {
        matchesStage = !o.stageAssignments || o.stageAssignments.length === 0
      } else if (stageFilter !== 'ALL') {
        matchesStage = o.stageAssignments?.some((a: any) => a.stageId === stageFilter)
      }

      return matchesSearch && matchesRole && matchesStage
    })
  }, [data?.items, search, roleFilter, stageFilter])

  // KPI Calculations
  const totalOfficers = data?.items?.length || 0
  const assignedOfficersCount = data?.items?.filter((o: any) => o.stageAssignments && o.stageAssignments.length > 0).length || 0
  const unassignedCount = totalOfficers - assignedOfficersCount
  const adminUsersCount = data?.items?.filter((o: any) => o.user?.role === 'ADMIN').length || 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Role Management"
        subtitle="Register officers and administrators, assign clearance stages, and manage departmental permissions."
        actions={
          <Button onClick={() => setInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <UserPlus className="h-4 w-4 mr-1.5" /> + Add User / Officer
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Total Registered Staff</span>
            <UserCircle className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1.5">{totalOfficers}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Stage Assigned</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1.5">{assignedOfficersCount}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Unassigned Officers</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1.5">{unassignedCount}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>University Admins</span>
            <Shield className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-1.5">{adminUsersCount}</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="font-medium text-gray-500">Role:</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Roles</option>
              <option value="OFFICER">Officers Only</option>
              <option value="ADMIN">Admins Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="font-medium text-gray-500">Stage:</span>
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Stages</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && <LoadingSkeleton rows={5} />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <Card padding="sm" className="overflow-hidden border border-gray-200">
          {!filteredOfficers.length ? (
            <EmptyState
              icon={<UserCircle className="h-10 w-10 text-gray-400" />}
              title="No users found"
              description="No officers or administrators match your filters. Add a new user to get started."
              action={{ label: '+ Add User / Officer', onClick: () => setInviteOpen(true) }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Staff Member</th>
                    <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</th>
                    <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Account Status</th>
                    <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Clearance Stage Assignments</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOfficers.map((o: any) => {
                    const role = o.user?.role || 'OFFICER'
                    const hasAssignments = o.stageAssignments && o.stageAssignments.length > 0

                    return (
                      <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {o.firstName?.[0]}{o.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{o.firstName} {o.lastName}</p>
                              <p className="text-xs text-gray-500 truncate">{o.user?.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1',
                            role === 'ADMIN' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                          )}>
                            {role === 'ADMIN' && <Shield className="h-3 w-3" />}
                            {role}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1',
                            o.user?.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', o.user?.isActive !== false ? 'bg-emerald-600' : 'bg-amber-600')} />
                            {o.user?.isActive !== false ? 'Active' : 'Pending Invite'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {hasAssignments ? (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {o.stageAssignments.map((a: any) => (
                                <span
                                  key={a.id}
                                  className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                                >
                                  <Layers className="h-3 w-3 text-blue-600 shrink-0" />
                                  <span>{a.stage?.name || 'Stage'}</span>
                                  {a.faculty && (
                                    <span className="text-[10px] text-gray-500">({a.faculty.name})</span>
                                  )}
                                  {a.department && (
                                    <span className="text-[10px] text-gray-500">({a.department.name})</span>
                                  )}
                                  <button
                                    onClick={() => unassignStage(a.id)}
                                    title="Remove stage assignment"
                                    className="text-gray-400 hover:text-red-600 ml-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-amber-600 text-xs font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> Unassigned
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openAssign(o)}
                              title="Assign to Clearance Stage"
                              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            >
                              + Assign Stage
                            </button>
                            <button
                              onClick={() => openEdit(o)}
                              title="Edit user details"
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(o)}
                              title="Remove user"
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Add User / Officer Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Register User & Assign Clearance Stage" className="max-w-lg">
        <form onSubmit={inviteForm.handleSubmit(d => create(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              placeholder="e.g. Samuel"
              error={inviteForm.formState.errors.firstName?.message}
              {...inviteForm.register('firstName')}
            />
            <Input
              label="Last Name *"
              placeholder="e.g. Eze"
              error={inviteForm.formState.errors.lastName?.message}
              {...inviteForm.register('lastName')}
            />
          </div>

          <Input
            label="Official University Email *"
            type="email"
            placeholder="e.g. samuel.eze@unn.edu.ng"
            error={inviteForm.formState.errors.email?.message}
            {...inviteForm.register('email')}
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block">
              User Role *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={cn(
                "flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                selectedRole === 'OFFICER' ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-white"
              )}>
                <input
                  type="radio"
                  value="OFFICER"
                  {...inviteForm.register('role')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-900">OFFICER</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Reviews and stamps student clearance submissions</p>
                </div>
              </label>

              <label className={cn(
                "flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                selectedRole === 'ADMIN' ? "border-purple-500 bg-purple-50/50" : "border-gray-200 bg-white"
              )}>
                <input
                  type="radio"
                  value="ADMIN"
                  {...inviteForm.register('role')}
                  className="mt-0.5 text-purple-600"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-900">ADMIN</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Manages campaigns, stages, and university workflows</p>
                </div>
              </label>
            </div>
          </div>

          {/* Stage Assignment Dropdown (populated from stages) */}
          <div className="space-y-2 p-3.5 bg-blue-50/40 rounded-xl border border-blue-100">
            <label htmlFor="stageSelect" className="text-xs font-semibold text-blue-900 uppercase tracking-wide block">
              Assign Clearance Stage (Optional)
            </label>
            <select
              id="stageSelect"
              {...inviteForm.register('stageId')}
              className="w-full text-xs rounded-lg border border-gray-300 bg-white p-2.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="">(None — Assign Stage Later)</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} (Stage {s.orderIndex}) — {s.scope || 'UNIVERSITY'}
                </option>
              ))}
            </select>

            {selectedStage && selectedStage.scope === 'FACULTY' && (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-medium text-gray-700">Specific Faculty (Optional)</label>
                <select
                  {...inviteForm.register('facultyId')}
                  className="w-full text-xs rounded border border-gray-300 bg-white p-2 text-gray-800"
                >
                  <option value="">All Faculties</option>
                  {faculties.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedStage && selectedStage.scope === 'DEPARTMENT' && (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-medium text-gray-700">Specific Department (Optional)</label>
                <select
                  {...inviteForm.register('departmentId')}
                  className="w-full text-xs rounded border border-gray-300 bg-white p-2 text-gray-800"
                >
                  <option value="">All Departments</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" loading={creating}>
              Create User & Assign Stage
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Quick Stage Assignment Modal */}
      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} title={`Assign Stage to ${assignTarget?.firstName} ${assignTarget?.lastName}`} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="quickStageSelect" className="text-xs font-semibold text-gray-700 uppercase tracking-wide block">
              Select Clearance Stage *
            </label>
            <select
              id="quickStageSelect"
              value={quickStageId}
              onChange={e => setQuickStageId(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 bg-white p-2.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="">Choose a stage...</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name} (Stage {s.orderIndex})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Faculty (Optional)</label>
            <select
              value={quickFacultyId}
              onChange={e => setQuickFacultyId(e.target.value)}
              className="w-full text-xs rounded border border-gray-300 bg-white p-2 text-gray-800"
            >
              <option value="">All Faculties (Universal)</option>
              {faculties.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Department (Optional)</label>
            <select
              value={quickDeptId}
              onChange={e => setQuickDeptId(e.target.value)}
              className="w-full text-xs rounded border border-gray-300 bg-white p-2 text-gray-800"
            >
              <option value="">All Departments</option>
              {departments
                .filter((d: any) => !quickFacultyId || d.facultyId === quickFacultyId)
                .map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue-600 text-white"
              disabled={!quickStageId}
              loading={assigning}
              onClick={() => assignStage()}
            >
              Confirm Assignment
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit User Profile">
        <form onSubmit={editForm.handleSubmit(d => update(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" error={editForm.formState.errors.firstName?.message} {...editForm.register('firstName')} />
            <Input label="Last Name"  error={editForm.formState.errors.lastName?.message}  {...editForm.register('lastName')} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={updating}>Save Changes</Button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Staff Member">
        <p className="text-sm text-[var(--color-muted)] mb-5">
          Remove <span className="font-semibold text-[var(--color-text)]">{deleteTarget?.firstName} {deleteTarget?.lastName}</span>? This will revoke access and remove all stage assignments.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" loading={deleting} onClick={() => remove()}>Remove</Button>
        </div>
      </Dialog>

      <InviteResultDialog result={inviteResult} onClose={() => setInviteResult(null)} />
    </div>
  )
}
