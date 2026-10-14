'use client'

import { useEffect, useRef } from 'react'
import { useForm, useController } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { brandingApi } from '@/lib/api/misc.api'
import { useTenantStore } from '@/store/useTenantStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const brandingSchema = z.object({
  primaryColor:  z.string().optional(),
  accentColor:   z.string().optional(),
  bannerMessage: z.string().optional(),
  footerText:    z.string().optional(),
})
type BrandingForm = z.infer<typeof brandingSchema>

function ColorField({ label, name, control }: { label: string; name: 'primaryColor' | 'accentColor'; control: any }) {
  const { field } = useController({ name, control })
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs text-[var(--color-muted)] mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-8 w-8 shrink-0 rounded border border-[var(--color-border)] cursor-pointer"
          style={{ backgroundColor: field.value ?? '#000000' }}
        />
        <input ref={inputRef} type="color" value={field.value ?? '#000000'}
          onChange={e => field.onChange(e.target.value)} className="sr-only" />
        <input
          type="text"
          value={field.value ?? ''}
          onChange={e => field.onChange(e.target.value)}
          placeholder="#000000"
          className="w-28 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>
    </div>
  )
}

function SectionRow({ label, description, action }: { label: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-[var(--color-border)]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
        <p className="text-xs text-[var(--color-muted)]">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export default function AdminBrandingPage() {
  const qc = useQueryClient()
  const setTenant = useTenantStore(s => s.setTenant)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef   = useRef<HTMLInputElement>(null)

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn:  () => brandingApi.get().then((r: any) => r.data.data),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: (d: BrandingForm) => brandingApi.update(d),
    onSuccess:  (_, vars) => {
      toast.success('Branding saved')
      qc.invalidateQueries({ queryKey: ['branding'] })
      if (vars.primaryColor) setTenant({ primaryColor: vars.primaryColor })
      if (vars.accentColor)  setTenant({ accentColor:  vars.accentColor  })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  })

  const { mutate: uploadLogo, isPending: uploadingLogo } = useMutation({
    mutationFn: (file: File) => brandingApi.uploadLogo(file),
    onSuccess:  (res: any) => {
      toast.success('Logo updated')
      qc.invalidateQueries({ queryKey: ['branding'] })
      if (res.data?.data?.logoUrl) setTenant({ logoUrl: res.data.data.logoUrl })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Upload failed'),
  })

  const { mutate: uploadBg, isPending: uploadingBg } = useMutation({
    mutationFn: (file: File) => brandingApi.uploadLoginBg(file),
    onSuccess:  () => toast.success('Login background updated'),
    onError:    (e: any) => toast.error(e.response?.data?.message ?? 'Upload failed'),
  })

  const { register, handleSubmit, reset, control } = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    defaultValues: { primaryColor: '#1B4F72', accentColor: '#2980B9', bannerMessage: '', footerText: '' },
  })

  useEffect(() => {
    if (branding) reset({
      primaryColor:  branding.primaryColor  ?? '#1B4F72',
      accentColor:   branding.accentColor   ?? '#2980B9',
      bannerMessage: branding.bannerMessage ?? '',
      footerText:    branding.footerText    ?? '',
    })
  }, [branding, reset])

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Branding" subtitle="Customise your university portal appearance" />

      <Card className="space-y-4">
        <SectionRow
          label="University Logo"
          description="Displayed in the sidebar and login page"
          action={
            <>
              <Button type="button" size="sm" variant="secondary" loading={uploadingLogo} onClick={() => logoInputRef.current?.click()}>
                Upload Logo
              </Button>
              <input ref={logoInputRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.svg"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
            </>
          }
        />

        <form onSubmit={handleSubmit(d => save(d))} className="space-y-4">
          <div className="flex gap-4 pb-4 border-b border-[var(--color-border)]">
            <ColorField label="Primary Colour" name="primaryColor" control={control} />
            <ColorField label="Accent Colour"  name="accentColor"  control={control} />
          </div>

          <SectionRow
            label="Login Background"
            description="Full-bleed image behind the login form"
            action={
              <>
                <Button type="button" size="sm" variant="secondary" loading={uploadingBg} onClick={() => bgInputRef.current?.click()}>
                  Upload Image
                </Button>
                <input ref={bgInputRef} type="file" className="hidden" accept=".png,.jpg,.jpeg"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadBg(f) }} />
              </>
            }
          />

          <Input label="Banner Message" placeholder="Welcome to UNN Clearance Portal!" {...register('bannerMessage')} />
          <Input label="Footer Text" placeholder="© 2025 University of Nigeria, Nsukka" {...register('footerText')} />

          <div className="flex justify-end pt-1">
            <Button type="submit" loading={isPending}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
