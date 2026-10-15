'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsApi } from '@/lib/api/misc.api'
import { Plus, Settings, Trash2, Power, X } from 'lucide-react'
import { toast } from 'sonner'
import { campaignsApi } from '@/lib/api/campaigns.api'
import { structureApi } from '@/lib/api/misc.api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

function MultiSelectPill({ options, selectedIds, onChange, placeholder }: { options: {id: string, name: string}[], selectedIds: string[], onChange: (ids: string[]) => void, placeholder: string }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()) && !selectedIds.includes(o.id))
  
  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedIds.map(id => {
          const opt = options.find(o => o.id === id)
          return (
            <div key={id} className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="font-medium">{opt?.name || id}</span>
              <button type="button" onClick={() => onChange(selectedIds.filter(i => i !== id))} className="hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
            </div>
          )
        })}
      </div>
      <div className="relative">
        <Input 
          placeholder={placeholder}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {open && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-md shadow-xl max-h-48 overflow-y-auto z-[60]">
            {filtered.map(opt => (
              <button
                key={opt.id}
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-[var(--color-border)] last:border-0 transition-colors"
                onClick={() => {
                  onChange([...selectedIds, opt.id])
                  setSearch('')
                  setOpen(false)
                }}
              >
                {opt.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CampaignList({ initialSessions = [] }: { initialSessions?: any[] }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [issuesCertificate, setIssuesCertificate] = useState(true)
  const [issuesClearanceSlip, setIssuesClearanceSlip] = useState(false)
  const [issuedDataFieldsStr, setIssuedDataFieldsStr] = useState('')
  const [sessionId, setSessionId] = useState('')
  
  const [targetGroups, setTargetGroups] = useState<{ id: string, faculties: string[], departments: string[], levels: string[] }[]>([])

  const { data: sessions = [] } = useQuery({ 
    queryKey: ['sessions'], 
    queryFn: () => sessionsApi.list().then(r => r.data.data),
    initialData: initialSessions.length > 0 ? initialSessions : undefined
  })
  
  // Default to active session
  useEffect(() => {
    if (sessions.length > 0 && !sessionId) {
      const active = sessions.find((s: any) => s.isActive)
      if (active) setSessionId(active.id)
      else setSessionId(sessions[0].id) // Fallback to the first session if none is active
    }
  }, [sessions, sessionId])

  const { data: faculties = [] } = useQuery({ queryKey: ['faculties'], queryFn: () => structureApi.faculties().then(r => r.data.data) })
  const { data: allDepartments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => structureApi.departments().then(r => r.data.data) })
  const getLevelsForGroup = (group: any) => {
    let relevantDepts = allDepartments
    if (group.departments.length > 0) {
      relevantDepts = allDepartments.filter((d: any) => group.departments.includes(d.id))
    } else if (group.faculties.length > 0) {
      relevantDepts = allDepartments.filter((d: any) => group.faculties.includes(d.facultyId))
    }
    
    const levelSet = new Set<string>()
    relevantDepts.forEach((d: any) => {
      if (d.availableLevels && Array.isArray(d.availableLevels)) {
        d.availableLevels.forEach((l: string) => levelSet.add(l))
      }
    })
    
    return Array.from(levelSet).sort().map(l => ({ id: l, name: isNaN(Number(l)) ? l : `${l} Level` }))
  }

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsApi.list().then(r => r.data.data),
  })

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => {
      if (!sessionId) {
        throw new Error('Please select an Academic Session for this campaign.')
      }

      const issuedDataFields = issuedDataFieldsStr.split(',').map(s => s.trim()).filter(Boolean)
      
      const formattedRules: any[] = []
      
      targetGroups.forEach(group => {
        const fList = group.faculties.length > 0 ? group.faculties : [null]
        const dList = group.departments.length > 0 ? group.departments : [null]
        const lList = group.levels.length > 0 ? group.levels : [null]
        
        fList.forEach(fac => {
          dList.forEach(dep => {
            lList.forEach(lvl => {
              if (fac === null && dep === null && lvl === null) return
              formattedRules.push({ facultyId: fac, departmentId: dep, level: lvl })
            })
          })
        })
      })

      return campaignsApi.create({ name, description, sessionId, eligibilityRules: formattedRules, issuesCertificate, issuesClearanceSlip, issuedDataFields })
    },
    onSuccess: () => {
      toast.success('Campaign created')
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      setOpen(false)
      setName('')
      setDescription('')
      setIssuesCertificate(true)
      setIssuesClearanceSlip(false)
      setIssuedDataFieldsStr('')
      setSessionId('')
      setTargetGroups([])
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? e.message ?? 'Failed to create campaign'),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: (id: string) => campaignsApi.toggle(id),
    onSuccess: () => {
      toast.success('Campaign status updated')
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to update campaign'),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => {
      toast.success('Campaign deleted')
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to delete campaign'),
  })

  if (isLoading) return <LoadingSkeleton rows={3} />

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Campaign</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns?.map(campaign => (
          <Card key={campaign.id} className={`p-5 flex flex-col justify-between ${!campaign.isActive ? 'opacity-70' : ''}`}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-[var(--color-text)]">{campaign.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${campaign.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                  {campaign.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-[var(--color-muted)] mb-4">{campaign.description || 'No description provided.'}</p>
              
              <div className="flex gap-2 mb-2">
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Active</span>
                {campaign.session && <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">{campaign.session.name}</span>}
                {campaign.issuesCertificate && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Issues Certificate</span>}
                {campaign.issuesClearanceSlip && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Issues Slip</span>}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
              <Link href={`${ROUTES.admin.stages}?campaignId=${campaign.id}`} className="flex-1">
                <Button variant="secondary" className="w-full"><Settings className="h-4 w-4 mr-2" /> Stages</Button>
              </Link>
              <Link href={`/admin/campaigns/${campaign.id}/certificate`} className="flex-1">
                <Button variant="secondary" className="w-full">Certificate</Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={() => toggle(campaign.id)} title={campaign.isActive ? 'Deactivate' : 'Activate'}>
                <Power className={`h-4 w-4 ${campaign.isActive ? 'text-amber-500' : 'text-emerald-500'}`} />
              </Button>
              <Button variant="danger" size="sm" onClick={() => {
                if (window.confirm('Are you sure you want to delete this campaign?')) remove(campaign.id)
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {campaigns?.length === 0 && (
          <div className="col-span-full p-10 text-center border-2 border-dashed border-[var(--color-border)] rounded-lg">
            <p className="text-[var(--color-muted)]">No campaigns found. Create one to get started.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Create Clearance Campaign" className="max-w-3xl">
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Campaign Name</label>
                <Input placeholder="e.g. 2026 Graduating Students Clearance" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Academic Session <span className="text-red-500">*</span></label>
                {sessions.length === 0 ? (
                  <div className="mt-1 p-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                    No academic sessions found. Please create one in the <Link href="/admin/sessions" className="font-semibold underline">Sessions</Link> tab first.
                  </div>
                ) : (
                  <select
                    value={sessionId}
                    onChange={e => setSessionId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select an academic session</option>
                    {sessions.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Current)' : ''}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input placeholder="Optional details..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div className="space-y-4 border-t border-[var(--color-border)] py-4 my-2">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-sm font-semibold">Eligibility Scopes</p>
                  <p className="text-xs text-[var(--color-muted)]">Create logical groups. E.g. &quot;Science 400L&quot; as one group, and &quot;Arts 100L&quot; as another. If empty, everyone is eligible.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setTargetGroups([...targetGroups, { id: Math.random().toString(), faculties: [], departments: [], levels: [] }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Scope
                </Button>
              </div>

              {targetGroups.map((group, idx) => {
                const groupDepartments = group.faculties.length > 0 
                  ? allDepartments.filter((d: any) => group.faculties.includes(d.facultyId))
                  : allDepartments

                const updateGroup = (field: string, val: any) => {
                  setTargetGroups(prev => prev.map(g => g.id === group.id ? { ...g, [field]: val } : g))
                }

                return (
                  <div key={group.id} className="relative bg-gray-50/50 border border-[var(--color-border)] rounded-md p-4">
                    <button 
                      type="button" 
                      onClick={() => setTargetGroups(prev => prev.filter(g => g.id !== group.id))}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-xs font-bold text-[var(--color-muted)] mb-3 uppercase tracking-wider">Scope Group {idx + 1}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Faculties</label>
                        <MultiSelectPill 
                          options={faculties}
                          selectedIds={group.faculties}
                          onChange={ids => updateGroup('faculties', ids)}
                          placeholder="Any Faculty"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Departments</label>
                        <MultiSelectPill 
                          options={groupDepartments}
                          selectedIds={group.departments}
                          onChange={ids => updateGroup('departments', ids)}
                          placeholder="Any Department"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Levels</label>
                        <MultiSelectPill 
                          options={getLevelsForGroup(group)}
                          selectedIds={group.levels}
                          onChange={ids => updateGroup('levels', ids)}
                          placeholder="Any Level"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="space-y-2 border-t border-b border-[var(--color-border)] py-4 my-2">
              <p className="text-sm font-semibold">Upon Completion Outputs</p>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <input 
                  type="checkbox" 
                  checked={issuesCertificate} 
                  onChange={e => setIssuesCertificate(e.target.checked)}
                  className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                Issue Certificate
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <input 
                  type="checkbox" 
                  checked={issuesClearanceSlip} 
                  onChange={e => setIssuesClearanceSlip(e.target.checked)}
                  className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                Issue Clearance Slip
              </label>
              <div className="mt-4">
                <label className="text-sm font-medium mb-1 block">Custom Issued Data Fields (Comma Separated)</label>
                <Input placeholder="e.g. Matric Number, Hostel Room" value={issuedDataFieldsStr} onChange={e => setIssuedDataFieldsStr(e.target.value)} />
                <p className="text-xs text-[var(--color-muted)] mt-1">Officers will be prompted to provide these when approving the final stage.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create()} disabled={isPending || !name || !sessionId} loading={isPending}>Create Campaign</Button>
            </div>
          </div>
      </Dialog>
    </div>
  )
}
