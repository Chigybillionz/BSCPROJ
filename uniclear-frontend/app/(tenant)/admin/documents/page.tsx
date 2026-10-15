'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentTypesApi } from '@/lib/api/documents.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { FileText, Pencil, Trash2 } from 'lucide-react'

const FORMAT_OPTIONS = ['pdf', 'jpg', 'png', 'jpeg', 'docx']

const schema = z.object({
  name:          z.string().min(1, 'Name is required'),
  description:   z.string().optional(),
  isRequired:    z.boolean().default(true),
  maxFileSizeMB: z.coerce.number().int().min(1).max(50).default(5),
})
type FormData = z.infer<typeof schema>

export default function AdminDocumentsPage() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen]       = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [formats, setFormats]       = useState<string[]>(['pdf', 'jpg', 'png'])
  const [editFormats, setEditFormats] = useState<string[]>([])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['document-types'],
    queryFn:  () => documentTypesApi.list().then(r => r.data.data),
  })

  const addForm  = useForm({ resolver: zodResolver(schema), defaultValues: { isRequired: true, maxFileSizeMB: 5 } })
  const editForm = useForm({ resolver: zodResolver(schema) })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (d: FormData) => documentTypesApi.create({ ...d, allowedFormats: formats }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-types'] })
      setAddOpen(false)
      addForm.reset()
      setFormats(['pdf', 'jpg', 'png'])
    },
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: (d: FormData) => documentTypesApi.update(editTarget.id, { ...d, allowedFormats: editFormats }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-types'] })
      setEditTarget(null)
    },
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => documentTypesApi.delete(deleteTarget.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-types'] })
      setDeleteTarget(null)
    },
  })

  const openEdit = (dt: any) => {
    setEditTarget(dt)
    setEditFormats(dt.allowedFormats ?? ['pdf'])
    editForm.reset({ name: dt.name, description: dt.description ?? '', isRequired: dt.isRequired, maxFileSizeMB: dt.maxFileSizeMB })
  }

  const toggleFormat = (f: string, current: string[], setter: (v: string[]) => void) =>
    setter(current.includes(f) ? current.filter(x => x !== f) : [...current, f])

  const FormatPills = ({ selected, onToggle }: { selected: string[]; onToggle: (f: string) => void }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[var(--color-text)]">Allowed Formats</label>
      <div className="flex gap-2 flex-wrap">
        {FORMAT_OPTIONS.map(f => (
          <button key={f} type="button" onClick={() => onToggle(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              selected.includes(f)
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)]'
            }`}
          >{f.toUpperCase()}</button>
        ))}
      </div>
      {selected.length === 0 && <p className="text-xs text-[var(--color-rejected)]">Select at least one format</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Types"
        subtitle="Configure required documents for clearance stages"
        actions={<Button onClick={() => setAddOpen(true)}>+ Add Document Type</Button>}
      />

      {isLoading && <LoadingSkeleton rows={5} />}
      {isError   && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <Card padding="sm">
          {!data?.length ? (
            <EmptyState icon={<FileText className="h-10 w-10" />} title="No document types" description="Add document types to get started." />
          ) : (
            <div className="overflow-x-auto -mx-3">
              <table className="w-full text-xs min-w-[520px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left">
                    <th className="pb-2 px-3 text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wide">Name</th>
                    <th className="pb-2 px-3 text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wide">Formats</th>
                    <th className="pb-2 px-3 text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wide">Size</th>
                    <th className="pb-2 px-3 text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wide">Req.</th>
                    <th className="pb-2 px-3 text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wide">Status</th>
                    <th className="pb-2 px-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {data.map((dt: any) => (
                    <tr key={dt.id} className="hover:bg-[var(--color-bg)] transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-[var(--color-text)]">{dt.name}</p>
                        {dt.description && <p className="text-[11px] text-[var(--color-muted)] truncate max-w-[160px]">{dt.description}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-muted)] uppercase">{dt.allowedFormats?.join(', ')}</td>
                      <td className="py-2.5 px-3 text-[var(--color-muted)] whitespace-nowrap">{dt.maxFileSizeMB}MB</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${dt.isRequired ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          {dt.isRequired ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3"><StatusBadge status={dt.isActive ? 'APPROVED' : 'REJECTED'} /></td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(dt)} className="p-1.5 rounded hover:bg-[var(--color-bg)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(dt)} className="p-1.5 rounded hover:bg-red-50 text-[var(--color-muted)] hover:text-[var(--color-rejected)] transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Document Type">
        <form onSubmit={addForm.handleSubmit(d => create(d))} className="space-y-4">
          <Input label="Name" placeholder="e.g. JAMB Admission Letter" error={addForm.formState.errors.name?.message} {...addForm.register('name')} />
          <Input label="Description (optional)" placeholder="Instructions for the student" {...addForm.register('description')} />
          <FormatPills selected={formats} onToggle={f => toggleFormat(f, formats, setFormats)} />
          <Input label="Max File Size (MB)" type="number" min={1} max={50} error={addForm.formState.errors.maxFileSizeMB?.message} {...addForm.register('maxFileSizeMB')} />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isRequired-add" {...addForm.register('isRequired')} defaultChecked className="h-4 w-4 accent-[var(--color-primary)]" />
            <label htmlFor="isRequired-add" className="text-sm text-[var(--color-text)]">Required document</label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={creating} disabled={formats.length === 0}>Add</Button>
          </div>
        </form>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Document Type">
        <form onSubmit={editForm.handleSubmit(d => update(d))} className="space-y-4">
          <Input label="Name" error={editForm.formState.errors.name?.message} {...editForm.register('name')} />
          <Input label="Description (optional)" {...editForm.register('description')} />
          <FormatPills selected={editFormats} onToggle={f => toggleFormat(f, editFormats, setEditFormats)} />
          <Input label="Max File Size (MB)" type="number" min={1} max={50} error={editForm.formState.errors.maxFileSizeMB?.message} {...editForm.register('maxFileSizeMB')} />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isRequired-edit" {...editForm.register('isRequired')} className="h-4 w-4 accent-[var(--color-primary)]" />
            <label htmlFor="isRequired-edit" className="text-sm text-[var(--color-text)]">Required document</label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={updating} disabled={editFormats.length === 0}>Save</Button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Document Type">
        <p className="text-sm text-[var(--color-muted)] mb-5">
          Delete <span className="font-medium text-[var(--color-text)]">{deleteTarget?.name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" loading={deleting} onClick={() => remove()}>Delete</Button>
        </div>
      </Dialog>
    </div>
  )
}
