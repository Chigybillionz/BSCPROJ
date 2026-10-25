'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sessionsApi, AcademicSession } from '@/lib/api/misc.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { CalendarDays, Pencil, Trash2 } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const sessionSchema = z.object({
  name:      z.string().min(1, 'Required'),
  startDate: z.string().min(1, 'Required'),
  endDate:   z.string().min(1, 'Required'),
})
type SessionForm = z.infer<typeof sessionSchema>

export default function AdminSessionsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingSession, setEditingSession] = useState<AcademicSession | null>(null)
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn:  () => sessionsApi.list().then(r => r.data.data),
  })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (d: SessionForm) => sessionsApi.create(d),
    onSuccess:  () => { toast.success('Session created'); qc.invalidateQueries({ queryKey: ['sessions'] }); setShowForm(false); reset() },
    onError:    (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create session'),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SessionForm }) => sessionsApi.update(id, data),
    onSuccess:  () => { toast.success('Session updated successfully'); qc.invalidateQueries({ queryKey: ['sessions'] }); setEditingSession(null); editReset() },
    onError:    (e: any) => toast.error(e.response?.data?.message ?? 'Failed to update session'),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => sessionsApi.delete(id),
    onSuccess:  () => { toast.success('Session deleted'); qc.invalidateQueries({ queryKey: ['sessions'] }) },
    onError:    (e: any) => toast.error(e.response?.data?.message ?? 'Failed to delete session'),
  })

  const { mutate: activate } = useMutation({
    mutationFn: (id: string) => sessionsApi.activate(id),
    onSuccess:  () => { toast.success('Session activated'); qc.invalidateQueries({ queryKey: ['sessions'] }) },
    onError:    (e: any) => toast.error(e.response?.data?.message ?? 'Failed to activate session'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SessionForm>({ resolver: zodResolver(sessionSchema) })

  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    reset: editReset,
    formState: { errors: editErrors }
  } = useForm<SessionForm>({ resolver: zodResolver(sessionSchema) })

  const openEditDialog = (s: AcademicSession) => {
    setEditingSession(s)
    editReset({
      name: s.name,
      startDate: s.startDate ? s.startDate.slice(0, 10) : '',
      endDate: s.endDate ? s.endDate.slice(0, 10) : '',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Sessions"
        subtitle="Manage clearance sessions and operational date ranges"
        actions={<Button onClick={() => setShowForm(s => !s)}>+ New Session</Button>}
      />

      {showForm && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Create Session</h3>
          <form onSubmit={handleSubmit(d => create(d))} className="grid grid-cols-2 gap-4">
            <Input label="Session Name" placeholder="2025/2026" error={errors.name?.message} {...register('name')} className="col-span-2" />
            <Input label="Start Date" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input label="End Date"   type="date" error={errors.endDate?.message}   {...register('endDate')} />
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={creating}>Create</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Edit Session Dialog */}
      <Dialog open={!!editingSession} onClose={() => setEditingSession(null)} title={`Edit Session: ${editingSession?.name ?? ''}`}>
        <form onSubmit={handleEditSubmit(d => editingSession && update({ id: editingSession.id, data: d }))} className="space-y-4">
          <Input label="Session Name" placeholder="2025/2026" error={editErrors.name?.message} {...editRegister('name')} />
          <Input label="Start Date" type="date" error={editErrors.startDate?.message} {...editRegister('startDate')} />
          <Input label="End Date"   type="date" error={editErrors.endDate?.message}   {...editRegister('endDate')} />
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setEditingSession(null)}>Cancel</Button>
            <Button type="submit" loading={updating}>Save Changes</Button>
          </div>
        </form>
      </Dialog>

      {isLoading && <LoadingSkeleton rows={3} />}
      {isError   && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {!data?.length ? (
            <EmptyState icon={<CalendarDays className="h-10 w-10" />} title="No sessions yet" />
          ) : data.map((s: AcademicSession) => (
            <Card key={s.id} className={cn('flex items-center justify-between', s.isActive && 'border-l-4 border-l-[var(--color-primary)]')}>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">{s.name}</p>
                <p className="text-xs text-[var(--color-muted)]">{formatDate(s.startDate)} — {formatDate(s.endDate)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEditDialog(s)} title="Edit Session Dates">
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                {s.isActive ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => activate(s.id)}>Set Active</Button>
                )}
                {!s.isActive && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (window.confirm(`Are you sure you want to delete session "${s.name}"?`)) remove(s.id)
                  }} title="Delete Session">
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
