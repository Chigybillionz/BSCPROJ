'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { universitiesApi } from '@/lib/api/misc.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Building2 } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'

const onboardSchema = z.object({
  name:         z.string().min(2, 'Required'),
  slug:         z.string().min(2, 'Required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  abbreviation: z.string().min(2, 'Required'),
  address:      z.string().min(5, 'Required'),
  contactEmail: z.string().email('Invalid email'),
  website:      z.string().optional(),
  primaryColor: z.string().min(1),
  accentColor:  z.string().min(1),
  tier:         z.enum(['TRIAL', 'STANDARD', 'ENTERPRISE']),
})
type OnboardForm = z.infer<typeof onboardSchema>

export default function PlatformUniversitiesPage() {
  const [showForm, setShowForm] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['universities'],
    queryFn:  () => universitiesApi.list().then((r: any) => ({
      items: r.data.data,
      total: r.data.pagination.total
    })),
  })

  const { mutate: create, isPending } = useMutation({
    mutationFn: (d: OnboardForm) => universitiesApi.create(d),
    onSuccess:  () => { toast.success('University onboarded'); qc.invalidateQueries({ queryKey: ['universities'] }); setShowForm(false); reset() },
    onError:    (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const { mutate: suspend } = useMutation({
    mutationFn: (id: string) => universitiesApi.suspend(id),
    onSuccess:  () => { toast.success('University suspended'); qc.invalidateQueries({ queryKey: ['universities'] }) },
    onError:    (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const { mutate: restore } = useMutation({
    mutationFn: (id: string) => universitiesApi.restore(id),
    onSuccess:  () => { toast.success('University restored'); qc.invalidateQueries({ queryKey: ['universities'] }) },
    onError:    (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<OnboardForm>({
    resolver: zodResolver(onboardSchema),
    defaultValues: { primaryColor: '#1B4F72', accentColor: '#2980B9', tier: 'TRIAL' },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Universities"
        subtitle="Onboard and manage tenant universities"
        actions={<Button onClick={() => setShowForm(s => !s)}>+ Onboard University</Button>}
      />

      {showForm && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Onboard New University</h3>
          <form onSubmit={handleSubmit(d => create(d))} className="grid grid-cols-2 gap-4">
            <Input label="University Name"  error={errors.name?.message}         {...register('name')}         className="col-span-2" />
            <Input label="Slug"             error={errors.slug?.message}         {...register('slug')}         placeholder="unn" />
            <Input label="Abbreviation"     error={errors.abbreviation?.message} {...register('abbreviation')} placeholder="UNN" />
            <Input label="Contact Email"    error={errors.contactEmail?.message} {...register('contactEmail')} type="email" />
            <Input label="Website"          error={errors.website?.message}      {...register('website')}      placeholder="https://unn.edu.ng" />
            <Input label="Address"          error={errors.address?.message}      {...register('address')}      className="col-span-2" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">Primary Colour</label>
              <input type="color" defaultValue="#1B4F72" {...register('primaryColor')} className="h-9 w-full rounded border border-[var(--color-border)] cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">Accent Colour</label>
              <input type="color" defaultValue="#2980B9" {...register('accentColor')} className="h-9 w-full rounded border border-[var(--color-border)] cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-sm font-medium text-[var(--color-text)]">Plan Tier</label>
              <CustomDropdown
                value={watch('tier')}
                onChange={val => setValue('tier', val)}
                searchable={false}
                options={[
                  { value: 'TRIAL', label: 'Trial' },
                  { value: 'STANDARD', label: 'Standard' },
                  { value: 'ENTERPRISE', label: 'Enterprise' },
                ]}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={isPending}>Onboard</Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading && <LoadingSkeleton rows={5} />}
      {isError   && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <Card padding="sm">
          {!data?.items?.length ? (
            <EmptyState icon={<Building2 className="h-10 w-10" />} title="No universities yet" action={{ label: '+ Onboard University', onClick: () => setShowForm(true) }} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left">
                  <th className="pb-3 px-3 text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">University</th>
                  <th className="pb-3 px-3 text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Slug</th>
                  <th className="pb-3 px-3 text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Tier</th>
                  <th className="pb-3 px-3 text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Status</th>
                  <th className="pb-3 px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.items.map((u: any) => (
                  <tr key={u.id} className="hover:bg-[var(--color-bg)] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: u.primaryColor ?? '#1B4F72' }}>
                          {u.abbreviation ?? u.name[0]}
                        </div>
                        <p className="font-medium text-[var(--color-text)]">{u.name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-[var(--color-muted)]">{u.slug}</td>
                    <td className="py-3 px-3 text-[var(--color-muted)]">{u.contract?.tier ?? 'TRIAL'}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.isActive
                        ? <Button size="sm" variant="danger" onClick={() => suspend(u.id)}>Suspend</Button>
                        : <Button size="sm" variant="secondary" onClick={() => restore(u.id)}>Restore</Button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}
