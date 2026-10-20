'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/lib/api/auth.api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTenantStore } from '@/store/useTenantStore'
import { BrandLogo } from '@/components/shared/BrandLogo'

const schema = z.object({
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type Form = z.infer<typeof schema>

function SetPasswordContent() {
  const { primaryColor, accentColor, name, logoUrl } = useTenantStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const isReset = !!token

  const { mutate, isPending } = useMutation({
    mutationFn: (d: Form) =>
      token
        ? authApi.resetPassword(token, d.password, d.confirmPassword)
        : authApi.setPassword(d.password, d.confirmPassword),
    onSuccess: () => {
      toast.success('Password set successfully')
      router.push('/login')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Something went wrong'),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
      >
        <div className="max-w-sm text-center">
          <BrandLogo
            logoUrl={logoUrl}
            alt={name || 'UniClear'}
            size={80}
            priority
            className="h-20 w-20 rounded-2xl mx-auto mb-6 ring-1 ring-white/25 shadow-lg"
          />
          <h1 className="text-3xl font-bold mb-3">{name || 'UniClear'}</h1>
          <p className="text-white/80 text-base leading-relaxed">
            University Clearance Management Portal.<br />
            Fast, transparent, and paperless.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--color-bg)]">
        <div className="w-full max-w-sm">
          {/* Mobile branding header */}
          <div className="lg:hidden text-center mb-8">
            <BrandLogo
              logoUrl={logoUrl}
              alt={name || 'UniClear'}
              size={64}
              className="h-16 w-16 rounded-2xl mx-auto mb-3 ring-1 ring-black/5 shadow-sm"
            />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">{name || 'UniClear'}</h2>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-1">
            {isReset ? 'Reset password' : 'Set your password'}
          </h2>
          <p className="text-sm text-[var(--color-muted)] mb-8">
            {isReset
              ? 'Enter your new password below.'
              : 'Welcome! Set a password to activate your account.'}
          </p>

          <form onSubmit={handleSubmit(d => mutate(d))} className="space-y-4">
            <Input
              label="New password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button
              type="submit"
              size="lg"
              loading={isPending}
              className="w-full"
              style={{ backgroundColor: primaryColor }}
            >
              {isReset ? 'Reset password' : 'Set password'}
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--color-muted)] mt-6">
            <Link href="/login" className="text-[var(--color-primary)] hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordContent />
    </Suspense>
  )
}
