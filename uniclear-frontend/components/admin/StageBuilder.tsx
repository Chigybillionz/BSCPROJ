'use client'

import { useState, useEffect, Fragment } from 'react'
import {
  GripVertical, AlertTriangle, X, ChevronRight, ChevronDown,
  FileText, Plus, Trash2, Search, Settings2, Sparkles, Check
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useStages, useReorderStages, useCreateStage, useUpdateStage,
  useDeleteStage, useAssignDocumentToStage, useRemoveDocumentFromStage,
  useAssignOfficerToStage, useUnassignOfficerFromStage
} from '@/features/stages/hooks/useStages'
import { apiClient } from '@/lib/api/client'
import { structureApi, sessionsApi } from '@/lib/api/misc.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'
import type { ClearanceStage } from '@/types'
import { toast } from 'sonner'

const STAGE_TEMPLATES = [
  { name: 'Library Clearance', scope: 'UNIVERSITY' as const, description: 'Confirm return of all library materials and books with zero outstanding fines.' },
  { name: 'Bursary & Student Accounts', scope: 'UNIVERSITY' as const, description: 'Audit tuition payments, registration receipts, and outstanding university charges.' },
  { name: 'Departmental Verification', scope: 'DEPARTMENT' as const, description: 'Head of Department validation of degree requirements, departmental dues, and project defense.' },
  { name: 'Faculty Officer Clearance', scope: 'FACULTY' as const, description: 'Faculty Officer review and validation of faculty records and examination results.' },
  { name: 'Medical Centre', scope: 'UNIVERSITY' as const, description: 'Medical examination and health center file clearance.' },
  { name: 'Student Affairs Division', scope: 'UNIVERSITY' as const, description: 'Hostel accommodation clearance and student conduct verification.' },
  { name: 'Security Department', scope: 'UNIVERSITY' as const, description: 'Verification of student identity card and security clearance.' },
]

function useOfficers() {
  return useQuery({
    queryKey: ['officers', 'dropdown'],
    queryFn:  () => apiClient.get<{ success: true; data: any[] }>('/officers?limit=100').then(r => r.data.data),
  })
}

function SearchableSelect({ 
  options, value, onChange, placeholder = "Search...", className = "" 
}: { 
  options: { label: string, value: string }[], value: string, onChange: (val: string) => void, placeholder?: string, className?: string 
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = options.find(o => o.value === value)
  
  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={cn("relative inline-block", className)}>
      <button 
        type="button"
        className="w-full text-left text-[13px] px-2 py-1 rounded border border-gray-200 bg-white hover:border-blue-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none flex justify-between items-center transition-all font-medium text-gray-900"
        onClick={() => { setOpen(!open); setSearch('') }}
      >
        <span className="truncate pr-4">{selected ? selected.label : <span className="text-gray-400 font-normal">{placeholder}</span>}</span>
        <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full left-0 w-full min-w-[200px] mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-56 flex flex-col overflow-hidden">
            <div className="flex items-center px-2 py-1.5 border-b border-gray-100 bg-gray-50/50">
              <Search className="h-3 w-3 text-gray-400 mr-2 shrink-0" />
              <input 
                type="text" 
                autoFocus
                className="text-[13px] bg-transparent outline-none w-full placeholder:text-gray-400 font-normal"
                placeholder="Type to search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
              <button 
                className={cn("w-full text-left px-2 py-1.5 text-[13px] rounded transition-colors", !value ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700 font-normal")}
                onClick={() => { onChange(''); setOpen(false) }}
              >
                {placeholder}
              </button>
              {filtered.length === 0 ? (
                <p className="text-[12px] text-gray-400 p-2 text-center">No results found</p>
              ) : (
                filtered.map(o => (
                  <button 
                    key={o.value}
                    className={cn("w-full text-left px-2 py-1.5 text-[13px] rounded truncate transition-colors", value === o.value ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700 font-normal")}
                    onClick={() => { onChange(o.value); setOpen(false) }}
                  >
                    {o.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StagePanel({ stage, campaignId, onClose }: { stage: ClearanceStage; campaignId: string; onClose: () => void }) {
  const { mutate: update, isPending } = useUpdateStage()
  const { mutate: deleteStage, isPending: deleting } = useDeleteStage()
  const { mutate: assignDoc, isPending: assigningDoc } = useAssignDocumentToStage()
  const { mutate: removeDoc } = useRemoveDocumentFromStage()
  const { mutate: assignOfficer, isPending: assigningOfficer } = useAssignOfficerToStage()
  const { mutate: unassignOfficer } = useUnassignOfficerFromStage()

  const [editName, setEditName] = useState(stage.name)
  const [editDesc, setEditDesc] = useState(stage.description || '')
  const [editScope, setEditScope] = useState<'UNIVERSITY' | 'FACULTY' | 'DEPARTMENT'>(stage.scope || 'UNIVERSITY')
  const [isEditingDetails, setIsEditingDetails] = useState(false)

  const { data: officers = [] } = useOfficers()
  const { data: allDocTypes = [] } = useQuery({
    queryKey: ['document-types'],
    queryFn:  () => apiClient.get<{ success: true; data: any[] }>('/document-types').then(r => r.data.data),
  })
  
  const { data: campaigns = [] } = useQuery({ 
    queryKey: ['campaigns'], 
    queryFn: () => apiClient.get<{ success: true; data: any[] }>('/campaigns').then(r => r.data.data) 
  })
  const campaign = campaigns.find((c: any) => c.id === campaignId)

  const { data: allFaculties = [] } = useQuery({ queryKey: ['faculties'], queryFn: () => structureApi.faculties().then(r => r.data.data) })
  const { data: allDepartments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => structureApi.departments().then(r => r.data.data) })
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: () => sessionsApi.list().then(r => r.data.data) })
  const qc = useQueryClient()

  const hasRules = campaign?.eligibilityRules && campaign.eligibilityRules.length > 0
  
  const allowedFacultyIds = hasRules 
    ? campaign.eligibilityRules.map((r: any) => r.facultyId).filter(Boolean) 
    : []
  const allowedDepartmentIds = hasRules
    ? campaign.eligibilityRules.map((r: any) => r.departmentId).filter(Boolean)
    : []

  const faculties = hasRules && allowedFacultyIds.length > 0
    ? allFaculties.filter((f: any) => allowedFacultyIds.includes(f.id)) 
    : allFaculties

  const departments = hasRules && allowedDepartmentIds.length > 0
    ? allDepartments.filter((d: any) => allowedDepartmentIds.includes(d.id))
    : allDepartments

  const [assignForm, setAssignForm] = useState({ 
    officerId: '', 
    facultyId: faculties.length === 1 ? faculties[0].id : '', 
    departmentId: departments.length === 1 ? departments[0].id : '', 
    sessionId: '' 
  })

  const [newDocName, setNewDocName] = useState('')
  const [isCreatingDoc, setIsCreatingDoc] = useState(false)
  const [docSearch, setDocSearch] = useState('')
  const [assignmentSearch, setAssignmentSearch] = useState('')

  const { mutate: createDoc } = useMutation({
    mutationFn: (name: string) => apiClient.post('/document-types', {
      name,
      isRequired: true,
      allowedFormats: ['pdf', 'jpg', 'png'],
      maxFileSizeMB: 5,
      stageId: stage.id
    }),
    onSuccess: () => {
      setNewDocName('')
      setIsCreatingDoc(false)
      qc.invalidateQueries({ queryKey: ['document-types'] })
      qc.invalidateQueries({ queryKey: ['stages'] })
      toast.success('Document created and assigned!')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create document')
  })

  const handleAssignOfficer = () => {
    if (!assignForm.officerId) return
    assignOfficer(
      { stageId: stage.id, data: { officerId: assignForm.officerId, facultyId: assignForm.facultyId || undefined, departmentId: assignForm.departmentId || undefined, sessionId: assignForm.sessionId || undefined } },
      { onSuccess: () => setAssignForm({ officerId: '', facultyId: '', departmentId: '', sessionId: '' }) }
    )
  }

  const handleSaveDetails = () => {
    if (!editName.trim()) return
    update({
      id: stage.id,
      data: {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        scope: editScope,
      }
    }, {
      onSuccess: () => setIsEditingDetails(false)
    })
  }

  const handleDeleteStage = () => {
    if (window.confirm(`Are you sure you want to delete stage "${stage.name}"? This action cannot be undone.`)) {
      deleteStage(stage.id, {
        onSuccess: () => onClose()
      })
    }
  }

  const assignedIds = new Set(stage.documentRequirements.map(r => r.documentTypeId))
  const unassigned  = allDocTypes.filter((d: any) => !assignedIds.has(d.id))

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-[var(--shadow-lg)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">{stage.name}</p>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Stage {stage.orderIndex}
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">Scope: {stage.scope || 'UNIVERSITY'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--color-bg)] text-[var(--color-muted)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* General Details & Editing */}
          <div className="space-y-3 p-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Stage Details</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setIsEditingDetails(!isEditingDetails)}
              >
                {isEditingDetails ? 'Cancel' : 'Edit Details'}
              </Button>
            </div>

            {isEditingDetails ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Stage Name</label>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Stage Name"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Scope</label>
                  <select
                    value={editScope}
                    onChange={e => setEditScope(e.target.value as any)}
                    className="mt-1 w-full text-xs rounded border border-gray-300 bg-white p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="UNIVERSITY">UNIVERSITY (All students)</option>
                    <option value="FACULTY">FACULTY (Specific faculties)</option>
                    <option value="DEPARTMENT">DEPARTMENT (Specific departments)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Description</label>
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="Instructions for students and clearance officers"
                    rows={2}
                    className="mt-1 w-full text-xs rounded border border-gray-300 bg-white p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveDetails} loading={isPending} className="text-xs">
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-600 italic">
                  {stage.description || 'No description provided for this stage.'}
                </p>
              </div>
            )}
          </div>

          {/* Status toggle */}
          <div>
            <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide mb-2">Stage Status</p>
            <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {stage.isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {stage.isActive ? 'Students can submit to this stage' : 'Stage is disabled for clearance'}
                </p>
              </div>
              <Button
                size="sm"
                variant={stage.isActive ? 'danger' : 'primary'}
                loading={isPending}
                onClick={() => update({ id: stage.id, data: { isActive: !stage.isActive } })}
              >
                {stage.isActive ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>

          {/* Officer assignments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Officer Assignments</p>
              {(() => {
                const hasUniversal = stage.officerAssignments?.some((a: any) => !a.faculty)
                const coveredFaculties = new Set(stage.officerAssignments?.filter((a: any) => a.faculty).map((a: any) => a.faculty.id)).size
                const totalFaculties = faculties.length
                const isFullyCovered = hasUniversal || (totalFaculties > 0 && coveredFaculties >= totalFaculties)
                
                return (
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", isFullyCovered ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                    {isFullyCovered ? "100% Coverage" : `Coverage: ${coveredFaculties}/${totalFaculties} Faculties`}
                  </span>
                )
              })()}
            </div>

            {(!stage.officerAssignments || stage.officerAssignments.length === 0) ? (
              <p className="text-xs text-[var(--color-muted)] mb-3">No officers assigned. Students will be stuck at this stage.</p>
            ) : (
              <>
                {stage.officerAssignments.length > 5 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-gray-400" />
                    <input 
                      type="text" 
                      value={assignmentSearch}
                      onChange={e => setAssignmentSearch(e.target.value)}
                      placeholder="Filter assignments by name, email, faculty, or department..." 
                      className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-blue-400 bg-gray-50/50"
                    />
                  </div>
                )}
                <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {stage.officerAssignments
                    .filter((a: any) => {
                      if (!assignmentSearch) return true
                      const q = assignmentSearch.toLowerCase()
                      const email = officers.find((o: any) => o.id === a.officerId)?.user?.email || ''
                      return (
                        a.officer.firstName.toLowerCase().includes(q) ||
                        a.officer.lastName.toLowerCase().includes(q) ||
                        email.toLowerCase().includes(q) ||
                        a.faculty?.name.toLowerCase().includes(q) ||
                        a.department?.name.toLowerCase().includes(q)
                      )
                    })
                    .map((a: any) => {
                      const officerEmail = officers.find((o: any) => o.id === a.officerId)?.user?.email
                      return (
                        <div key={a.id} className="flex flex-col gap-1 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]">
                          <div className="flex justify-between items-center">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--color-text)] truncate">{a.officer.firstName} {a.officer.lastName}</p>
                              {officerEmail && <p className="text-xs text-[var(--color-muted)] truncate">{officerEmail}</p>}
                              <p className="text-xs text-[var(--color-muted)] mt-1">
                                {a.faculty ? `Faculty: ${a.faculty.name}` : 'All Faculties'}
                                {a.department ? `, Dept: ${a.department.name}` : ''}
                              </p>
                            </div>
                            <button onClick={() => unassignOfficer(a.id)} className="p-1.5 rounded hover:bg-red-50 text-[var(--color-muted)] hover:text-red-500 transition-colors shrink-0 ml-2">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </>
            )}

            {/* Toggle Views */}
            <div className="flex gap-2 border-b border-[var(--color-border)] mb-4">
              <button 
                className={cn("text-xs font-medium pb-2 border-b-2 px-1 transition-colors", assignForm.sessionId !== 'matrix' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800")}
                onClick={() => setAssignForm(s => ({...s, sessionId: ''}))}
              >
                Rule Builder
              </button>
              <button 
                className={cn("text-xs font-medium pb-2 border-b-2 px-1 transition-colors", assignForm.sessionId === 'matrix' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800")}
                onClick={() => setAssignForm(s => ({...s, sessionId: 'matrix'}))}
              >
                Matrix View (Bulk)
              </button>
            </div>

            {assignForm.sessionId === 'matrix' ? (
              <div className="border border-gray-200 rounded-lg overflow-visible bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-2 font-semibold text-gray-700">Faculty</th>
                      <th className="p-2 font-semibold text-gray-700">Assigned Officer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {faculties.map((f: any) => {
                      const facultyAssignment = stage.officerAssignments?.find((a: any) => a.faculty?.id === f.id && !a.department)
                      const facultyDepts = departments.filter((d: any) => d.facultyId === f.id)
                      
                      return (
                        <Fragment key={f.id}>
                          <tr className="bg-gray-50 border-t border-gray-200">
                            <td className="p-2 font-medium text-gray-700">{f.name} <span className="text-gray-400 font-normal ml-1">(All Departments)</span></td>
                            <td className="p-1.5">
                              <SearchableSelect
                                options={officers.map((o: any) => ({ label: `${o.firstName} ${o.lastName} ${o.user?.email ? `(${o.user.email})` : ''}`, value: o.id }))}
                                placeholder="Search officer..."
                                className="w-full"
                                value={facultyAssignment?.officerId || ''}
                                onChange={async (newOfficerId) => {
                                  if (facultyAssignment?.officerId === newOfficerId) return
                                  if (facultyAssignment) await apiClient.delete(`/officers/assignment/${facultyAssignment.id}`)
                                  if (newOfficerId) {
                                    await apiClient.post(`/officers/stage/${stage.id}/assign`, {
                                      officerId: newOfficerId,
                                      facultyId: f.id
                                    })
                                  }
                                  qc.invalidateQueries({ queryKey: ['stages'] })
                                }}
                              />
                            </td>
                          </tr>
                          {facultyDepts.map((d: any) => {
                            const deptAssignment = stage.officerAssignments?.find((a: any) => a.department?.id === d.id)
                            return (
                              <tr key={d.id} className="hover:bg-gray-50 border-t border-gray-100">
                                <td className="p-2 pl-6 font-medium text-gray-500 text-[11px]">
                                  <div className="flex items-center">
                                    <ChevronRight className="h-3 w-3 mr-1 opacity-50" />
                                    {d.name}
                                  </div>
                                </td>
                                <td className="p-1.5">
                                  <SearchableSelect
                                    options={officers.map((o: any) => ({ label: `${o.firstName} ${o.lastName} ${o.user?.email ? `(${o.user.email})` : ''}`, value: o.id }))}
                                    placeholder="Search officer..."
                                    className="w-full"
                                    value={deptAssignment?.officerId || ''}
                                    onChange={async (newOfficerId) => {
                                      if (deptAssignment?.officerId === newOfficerId) return
                                      if (deptAssignment) await apiClient.delete(`/officers/assignment/${deptAssignment.id}`)
                                      if (newOfficerId) {
                                        await apiClient.post(`/officers/stage/${stage.id}/assign`, {
                                          officerId: newOfficerId,
                                          facultyId: f.id,
                                          departmentId: d.id
                                        })
                                      }
                                      qc.invalidateQueries({ queryKey: ['stages'] })
                                    }}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Natural Language Assignment Form */
              <div className="border border-blue-100 p-3.5 rounded-lg bg-blue-50/30">
                <p className="text-xs font-semibold text-blue-800 mb-3">Assign an Officer</p>
                
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-700 leading-loose">
                  <span>Assign</span>
                  <SearchableSelect
                    value={assignForm.officerId}
                    onChange={val => setAssignForm(s => ({ ...s, officerId: val }))}
                    placeholder="Select Officer..."
                    options={officers.map((o: any) => ({ label: `${o.firstName} ${o.lastName} ${o.user?.email ? `(${o.user.email})` : ''}`, value: o.id }))}
                    className="min-w-[160px]"
                  />
                  
                  <span>to handle clearance for</span>
                  <SearchableSelect
                    value={assignForm.facultyId}
                    onChange={val => setAssignForm(s => ({ ...s, facultyId: val, departmentId: '' }))}
                    placeholder="Everyone (All Faculties)"
                    options={faculties.map((f: any) => ({ label: f.name, value: f.id }))}
                    className="min-w-[160px]"
                  />

                  {assignForm.facultyId && (
                    <>
                      <span className="text-gray-500">specifically in</span>
                      <SearchableSelect
                        value={assignForm.departmentId}
                        onChange={val => setAssignForm(s => ({ ...s, departmentId: val }))}
                        placeholder="All Departments"
                        options={departments.filter((d: any) => d.facultyId === assignForm.facultyId).map((d: any) => ({ label: d.name, value: d.id }))}
                        className="min-w-[160px]"
                      />
                    </>
                  )}
                  
                  <span className="text-gray-500 pl-1">for session</span>
                  <SearchableSelect
                    value={assignForm.sessionId !== 'matrix' ? assignForm.sessionId : ''}
                    onChange={val => setAssignForm(s => ({ ...s, sessionId: val }))}
                    placeholder="All Sessions"
                    options={sessions.map((sess: any) => ({ label: sess.name, value: sess.id }))}
                    className="min-w-[160px]"
                  />
                </div>

                <Button onClick={handleAssignOfficer} disabled={!assignForm.officerId} loading={assigningOfficer} size="sm" className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                  Confirm Assignment
                </Button>
              </div>
            )}
          </div>

          {/* Document requirements */}
          <div>
            <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide mb-2">Required Documents</p>

            {stage.documentRequirements.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)] mb-3">No documents required for this stage.</p>
            ) : (
              <div className="space-y-1 mb-3">
                {stage.documentRequirements.map(req => (
                  <div key={req.documentTypeId} className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-[var(--color-muted)] shrink-0" />
                      <span className="text-xs font-medium text-[var(--color-text)] truncate">{req.documentType.name}</span>
                    </div>
                    <button
                      onClick={() => removeDoc({ documentTypeId: req.documentTypeId, stageId: stage.id })}
                      className="p-1 rounded hover:bg-red-50 text-[var(--color-muted)] hover:text-red-500 transition-colors shrink-0 ml-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {unassigned.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[var(--color-muted)]">Add existing document:</p>
                </div>
                {unassigned.length > 3 && (
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-blue-400 bg-gray-50/50"
                  />
                )}
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {unassigned
                    .filter((d: any) => d.name.toLowerCase().includes(docSearch.toLowerCase()))
                    .map((d: any) => (
                    <button
                      key={d.id}
                      disabled={assigningDoc}
                      onClick={() => assignDoc({ documentTypeId: d.id, stageId: stage.id })}
                      className="w-full flex items-center gap-2 p-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)] text-left transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                      <span className="text-xs text-[var(--color-text)] truncate">{d.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              {isCreatingDoc ? (
                <div className="space-y-2 p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
                  <p className="text-[11px] font-medium text-[var(--color-muted)]">New Document Name</p>
                  <input 
                    type="text" 
                    value={newDocName}
                    onChange={e => setNewDocName(e.target.value)}
                    placeholder="e.g. O'Level Result" 
                    className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-400"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => setIsCreatingDoc(false)} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-800">Cancel</button>
                    <button onClick={() => { if(newDocName.trim()) createDoc(newDocName.trim()) }} disabled={!newDocName.trim()} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingDoc(true)}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-[var(--radius-md)] border border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 text-blue-600 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-medium">Create New Document</span>
                </button>
              )}
            </div>
          </div>

          {/* Delete Danger Zone */}
          <div className="pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Danger Zone</p>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDeleteStage}
              className="w-full text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Clearance Stage
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SortableStage({
  stage,
  onSelect,
  onDelete
}: {
  stage: ClearanceStage
  onSelect: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] cursor-pointer hover:border-[var(--color-primary)] transition-all',
        isDragging && 'opacity-60 shadow-xl border-blue-500 scale-[1.01] z-30',
        !stage.isActive && 'opacity-65 bg-gray-50/50'
      )}
      onClick={onSelect}
    >
      <button
        {...attributes} {...listeners}
        className="text-[var(--color-muted)] hover:text-[var(--color-primary)] cursor-grab active:cursor-grabbing touch-none p-1.5 rounded hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Drag to reorder"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="h-8 w-8 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
        {stage.orderIndex}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[var(--color-text)]">{stage.name}</p>
          <span className={cn(
            'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full',
            stage.scope === 'DEPARTMENT' ? 'bg-purple-100 text-purple-700' :
            stage.scope === 'FACULTY' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          )}>
            {stage.scope || 'UNIVERSITY'}
          </span>
        </div>
        
        {stage.description && (
          <p className="text-xs text-[var(--color-muted)] truncate max-w-md mt-0.5">{stage.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-[var(--color-muted)] mt-1.5 flex-wrap">
          <span>
            {stage.officerAssignments && stage.officerAssignments.length > 0 ? (
              <span className="text-emerald-700 font-medium">✓ {stage.officerAssignments.length} officer(s) assigned</span>
            ) : (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 inline" /> No officer assigned
              </span>
            )}
          </span>
          <span className="text-gray-300">•</span>
          <span>
            {stage.documentRequirements && stage.documentRequirements.length > 0 ? (
              <span className="text-gray-600 font-medium">{stage.documentRequirements.length} required document(s)</span>
            ) : (
              <span className="text-gray-400">No documents required</span>
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          'text-xs px-2.5 py-0.5 rounded-full font-medium',
          stage.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
        )}>
          {stage.isActive ? 'Active' : 'Inactive'}
        </span>
        <button
          onClick={onDelete}
          title="Delete stage"
          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <ChevronRight className="h-4 w-4 text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
      </div>
    </div>
  )
}

export function StageBuilder({ campaignId: initialCampaignId }: { campaignId?: string }) {
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiClient.get<{ success: true; data: any[] }>('/campaigns').then(r => r.data.data),
  })

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(initialCampaignId || '')

  useEffect(() => {
    if (!selectedCampaignId && campaigns.length > 0) {
      const active = campaigns.find((c: any) => c.isActive) || campaigns[0]
      if (active) setSelectedCampaignId(active.id)
    }
  }, [campaigns, selectedCampaignId])

  const campaignId = initialCampaignId || selectedCampaignId

  const { data: stages, isLoading, isError, refetch } = useStages(campaignId || undefined)
  const { mutate: reorder } = useReorderStages(campaignId || undefined)
  const { mutate: createStage, isPending: creating } = useCreateStage(campaignId || undefined)
  const { mutate: deleteStage } = useDeleteStage()

  const [items, setItems] = useState<ClearanceStage[]>([])
  const [selected, setSelected] = useState<ClearanceStage | null>(null)
  
  // Add Stage Modal state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageScope, setNewStageScope] = useState<'UNIVERSITY' | 'FACULTY' | 'DEPARTMENT'>('UNIVERSITY')
  const [newStageDesc, setNewStageDesc] = useState('')

  const synced = items.length 
    ? items.map(item => {
        const latest = stages?.find(s => s.id === item.id)
        return latest ? { ...latest, orderIndex: item.orderIndex } : item
      }) 
    : (stages ?? [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = synced.findIndex(s => s.id === active.id)
    const newIndex = synced.findIndex(s => s.id === over.id)
    const reordered = arrayMove(synced, oldIndex, newIndex).map((s, i) => ({ ...s, orderIndex: i + 1 }))
    setItems(reordered)
    reorder(reordered.map(s => s.id), {
      onSuccess: () => {
        toast.success('Clearance workflow order updated')
      }
    })
  }

  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStageName.trim() || !campaignId) return
    createStage({
      name: newStageName.trim(),
      description: newStageDesc.trim() || undefined,
      scope: newStageScope,
      campaignId,
    }, {
      onSuccess: () => {
        setNewStageName('')
        setNewStageDesc('')
        setNewStageScope('UNIVERSITY')
        setAddDialogOpen(false)
        setItems([])
      }
    })
  }

  const handleApplyTemplate = (tmpl: typeof STAGE_TEMPLATES[number]) => {
    setNewStageName(tmpl.name)
    setNewStageScope(tmpl.scope)
    setNewStageDesc(tmpl.description)
  }

  if (loadingCampaigns || (campaignId && isLoading)) {
    return <LoadingSkeleton rows={5} />
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />
  }

  if (campaigns.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed rounded-xl bg-white space-y-3">
        <Sparkles className="h-8 w-8 text-blue-500 mx-auto" />
        <h3 className="text-base font-semibold text-gray-900">No Clearance Campaigns Found</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Please create a Clearance Campaign first before defining workflow stages.
        </p>
      </div>
    )
  }

  const selectedStage = selected ? (synced.find(s => s.id === selected.id) ?? selected) : null

  return (
    <div className="space-y-6">
      {/* Campaign selector bar and Add Stage CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Clearance Campaign:</span>
          <select
            value={campaignId}
            onChange={e => {
              setSelectedCampaignId(e.target.value)
              setItems([])
            }}
            className="text-sm font-semibold border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {campaigns.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.isActive ? '• Active' : ''}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={() => setAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Add Clearance Stage
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <p className="text-xs text-gray-500 font-medium">Total Stages</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{synced.length}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <p className="text-xs text-gray-500 font-medium">Active Stages</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{synced.filter(s => s.isActive).length}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <p className="text-xs text-gray-500 font-medium">Officers Assigned</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {synced.reduce((acc, s) => acc + (s.officerAssignments?.length || 0), 0)}
          </p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <p className="text-xs text-gray-500 font-medium">Required Documents</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {synced.reduce((acc, s) => acc + (s.documentRequirements?.length || 0), 0)}
          </p>
        </div>
      </div>

      {/* Visual Pipeline Progression Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-blue-700" />
            <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Dynamic Clearance Sequence</span>
          </div>
          <span className="text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
            Linear Progression
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Students are routed strictly in this sequence. Drag stages to reorder; order updates dynamically route existing and incoming clearances.
        </p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
          {synced.map((s, idx) => (
            <div key={s.id} className="flex items-center shrink-0">
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-2xs font-medium text-gray-800">
                <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {s.orderIndex}
                </span>
                <span className="truncate max-w-[120px]">{s.name}</span>
              </div>
              {idx < synced.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-blue-400 mx-1 shrink-0" />}
            </div>
          ))}
          {synced.length > 0 && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-emerald-500 mx-1 shrink-0" />
              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg font-semibold shrink-0">
                <span>🎓 Complete & Issued</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sortable Stages List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Sequence Stages ({synced.length})</h3>
          <span className="text-xs text-gray-500">Drag items to rearrange sequence</span>
        </div>

        {synced.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-xl bg-white space-y-3">
            <p className="text-sm text-gray-500">No clearance stages defined for this campaign.</p>
            <Button size="sm" onClick={() => setAddDialogOpen(true)} className="bg-blue-600 text-white">
              <Plus className="h-4 w-4 mr-1" /> Add First Stage
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={synced.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2.5">
                {synced.map(stage => (
                  <SortableStage
                    key={stage.id}
                    stage={stage}
                    onSelect={() => setSelected(stage)}
                    onDelete={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Delete stage "${stage.name}"?`)) {
                        deleteStage(stage.id)
                      }
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add Stage Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} title="Add Clearance Stage" className="max-w-lg">
        <form onSubmit={handleCreateStage} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {STAGE_TEMPLATES.map((tmpl) => (
                <button
                  type="button"
                  key={tmpl.name}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    newStageName === tmpl.name
                      ? "bg-blue-50 border-blue-400 text-blue-700 font-medium"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="stageName" className="text-xs font-medium text-gray-700">Stage Name *</label>
            <Input
              id="stageName"
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="e.g. Medical Centre"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="stageScope" className="text-xs font-medium text-gray-700">Administrative Scope</label>
            <select
              id="stageScope"
              value={newStageScope}
              onChange={e => setNewStageScope(e.target.value as any)}
              className="w-full text-sm rounded border border-gray-300 bg-white p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="UNIVERSITY">UNIVERSITY — Applies universally across all faculties & departments</option>
              <option value="FACULTY">FACULTY — Handled by faculty officers</option>
              <option value="DEPARTMENT">DEPARTMENT — Handled by departmental officers</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="stageDesc" className="text-xs font-medium text-gray-700">Student Instructions / Description</label>
            <textarea
              id="stageDesc"
              value={newStageDesc}
              onChange={e => setNewStageDesc(e.target.value)}
              placeholder="Provide instructions for students regarding this stage..."
              rows={2}
              className="w-full text-sm rounded border border-gray-300 bg-white p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} disabled={!newStageName.trim()} className="bg-blue-600 text-white">
              Create Stage
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Stage Detail Drawer / Slideover */}
      {selectedStage && (
        <StagePanel
          stage={selectedStage}
          campaignId={campaignId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
