'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi } from '@/lib/api/students.api'
import { structureApi } from '@/lib/api/structure.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { InviteResultDialog } from '@/components/shared/InviteResultDialog'
import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Users, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

const addSchema = z.object({
  firstName:  z.string().min(1, 'Required'),
  lastName:   z.string().min(1, 'Required'),
  email:      z.string().email('Invalid email'),
  jambRegNo:  z.string().min(1, 'Required'),
  matricNo:   z.string().optional(),
  facultyId:  z.string().optional(),
  departmentId: z.string().optional(),
})
type AddForm = z.infer<typeof addSchema>

interface InviteResult { email: string; tempPassword: string; inviteLink: string }

export default function AdminStudentsPage() {
  const qc = useQueryClient()
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [addOpen, setAddOpen]     = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['students', page, search],
    queryFn:  () => studentsApi.list(page, 20, search || undefined).then(r => ({
      items: r.data.data,
      total: r.data.pagination.total
    })),
  })

  const { data: faculties } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => structureApi.getFaculties().then(r => r.data.data),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => structureApi.getDepartments().then(r => r.data.data),
  })

  const form = useForm<AddForm>({ resolver: zodResolver(addSchema) })
  const selectedFacultyId = form.watch('facultyId')
  const filteredDepartments = departments?.filter(d => d.facultyId === selectedFacultyId) || []

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (d: AddForm) => studentsApi.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      setAddOpen(false)
      form.reset()
      const d = res.data.data as any
      setInviteResult({ email: d.email ?? '', tempPassword: d.tempPassword, inviteLink: d.inviteLink })
    },
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => studentsApi.delete(deleteTarget.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      setDeleteTarget(null)
    },
  })

  const { mutate: bulkCreate, isPending: bulkCreating } = useMutation({
    mutationFn: (d: any[]) => studentsApi.bulkCreate(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      setImportOpen(false)
      const data = res.data.data
      toast.success(`Successfully imported ${data.created} students`)
      if (data.errors?.length) {
        toast.error(`${data.errors.length} failed to import. Check console.`)
        console.error('Import Errors:', data.errors)
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to import students')
    }
  })

  const handleImport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const file = (e.currentTarget.elements.namedItem('csv') as HTMLInputElement).files?.[0]
    if (!file) return toast.error('Please select a file')

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) return toast.error('CSV appears empty')
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const payload = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim())
        const obj: any = {}
        headers.forEach((h, i) => {
          if (h.includes('jamb') || h.includes('reg')) obj.jambRegNo = cols[i]
          else if (h.includes('matric')) obj.matricNo = cols[i]
          else if (h.includes('first')) obj.firstName = cols[i]
          else if (h.includes('last')) obj.lastName = cols[i]
          else if (h.includes('email')) obj.email = cols[i]
          else if (h.includes('faculty')) obj.facultyName = cols[i]
          else if (h.includes('dept') || h.includes('department')) obj.departmentName = cols[i]
          else if (h.includes('session')) obj.sessionName = cols[i]
          else if (h.includes('level')) obj.level = cols[i]
        })
        return obj
      }).filter(o => o.firstName && o.lastName && o.jambRegNo)

      if (!payload.length) return toast.error('Could not parse any valid student rows. Ensure columns: email, first name, last name, jamb reg no')
      bulkCreate(payload)
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle="All enrolled students"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setImportOpen(true)} variant="secondary">Import CSV</Button>
            <Button onClick={() => setAddOpen(true)}>+ Add Student</Button>
          </div>
        }
      />

      <Input
        placeholder="Search by name or JAMB Reg No..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1) }}
        icon={<Search className="h-4 w-4" />}
        className="max-w-sm"
      />

      {isLoading && <LoadingSkeleton rows={8} />}
      {isError   && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <Card padding="sm">
          {!data?.items?.length ? (
            <EmptyState icon={<Users className="h-10 w-10" />} title="No students found" action={{ label: '+ Add Student', onClick: () => setAddOpen(true) }} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-left">
                      <th className="pb-3 px-3 text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">JAMB Reg No.</th>
                      <th className="pb-3 px-3 text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Name</th>
                      <th className="pb-3 px-3 text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Department</th>
                      <th className="pb-3 px-3 text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Faculty</th>
                      <th className="pb-3 px-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {data.items.map((s: any) => (
                      <tr key={s.id} className="hover:bg-[var(--color-bg)] transition-colors">
                        <td className="py-3 px-3 font-mono text-xs">{s.jambRegNo}</td>
                        <td className="py-3 px-3 font-medium">{s.firstName} {s.lastName}</td>
                        <td className="py-3 px-3 text-[var(--color-muted)]">{s.department?.name ?? '—'}</td>
                        <td className="py-3 px-3 text-[var(--color-muted)]">{s.faculty?.name ?? '—'}</td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end items-center gap-2">
                            <Link href={`${ROUTES.admin.students}/${s.id}`}>
                              <Button variant="secondary" size="sm">
                                View Profile
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="text-[var(--color-rejected)] hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(s)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-muted)]">{data.total} total students</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                  <Button size="sm" variant="secondary" disabled={data.items.length < 20} onClick={() => setPage(p => p + 1)}>Next →</Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Add student dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Student">
        <form onSubmit={form.handleSubmit(d => create(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" error={form.formState.errors.firstName?.message} {...form.register('firstName')} />
            <Input label="Last Name"  error={form.formState.errors.lastName?.message}  {...form.register('lastName')} />
          </div>
          <Input label="Email" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="JAMB Reg Number" placeholder="e.g. 12345678AB" error={form.formState.errors.jambRegNo?.message} {...form.register('jambRegNo')} />
            <Input label="Matric Number (Optional)" placeholder="e.g. EDU/2021/001" error={form.formState.errors.matricNo?.message} {...form.register('matricNo')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">Faculty (Optional)</label>
              <CustomDropdown
                value={form.watch('facultyId') || ''}
                onChange={val => {
                  form.setValue('facultyId', val)
                  form.setValue('departmentId', '')
                }}
                placeholder="Select Faculty..."
                searchable={true}
                options={[
                  { value: '', label: 'Select Faculty...' },
                  ...(faculties || []).map(f => ({ value: f.id, label: f.name })),
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">Department (Optional)</label>
              <CustomDropdown
                disabled={!selectedFacultyId}
                value={form.watch('departmentId') || ''}
                onChange={val => form.setValue('departmentId', val)}
                placeholder="Select Department..."
                searchable={true}
                options={[
                  { value: '', label: 'Select Department...' },
                  ...filteredDepartments.map(d => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={creating}>Add & Invite</Button>
          </div>
        </form>
      </Dialog>

      {/* Import CSV dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Import Students (CSV)">
        <form onSubmit={handleImport} className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Upload a CSV file containing at minimum: <span className="font-mono">First Name, Last Name, JAMB Reg No</span>. 
            <br/><br/>
            Optional: <span className="font-mono">Email, Faculty, Department, Session, Level</span>. If Faculty, Dept, or Session are provided, they <strong>must</strong> exactly match an existing structure in the system or the row will fail.
          </p>
          <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-6 text-center">
            <input type="file" id="csv" name="csv" accept=".csv" className="text-sm text-[var(--color-text)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:bg-opacity-10 file:text-[var(--color-primary)] hover:file:bg-opacity-20 transition-all cursor-pointer" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={bulkCreating}>Import</Button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Student">
        <p className="text-sm text-[var(--color-muted)] mb-5">
          Remove <span className="font-medium text-[var(--color-text)]">{deleteTarget?.firstName} {deleteTarget?.lastName}</span>? This cannot be undone.
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
