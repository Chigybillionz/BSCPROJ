'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/lib/api/auth.api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTenantStore } from '@/store/useTenantStore'
import { MailCheck } from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})
type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { primaryColor, accentColor, name, logoUrl } = useTenantStore()
  const [sent, setSent] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: (d: Form) => authApi.forgotPassword(d.email),
    onSuccess: () => setSent(true),
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

          {sent ? (
            <div className="text-center space-y-4">
              <MailCheck className="h-12 w-12 text-[var(--color-approved)] mx-auto" />
              <h2 className="text-2xl font-bold text-[var(--color-text)]">Check your email</h2>
              <p className="text-sm text-[var(--color-muted)]">
                If that email exists in our system, you&apos;ll receive a password reset link shortly.
              </p>
              <Link href="/login" className="text-sm text-[var(--color-primary)] hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-1">Forgot password?</h2>
              <p className="text-sm text-[var(--color-muted)] mb-8">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit(d => mutate(d))} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@university.edu"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Button
                  type="submit"
                  size="lg"
                  loading={isPending}
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  Send reset link
                </Button>
              </form>

              <p className="text-center text-sm text-[var(--color-muted)] mt-6">
                Remember it?{' '}
                <Link href="/login" className="text-[var(--color-primary)] hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
