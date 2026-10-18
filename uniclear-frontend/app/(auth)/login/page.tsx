'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { useTenantStore } from '@/store/useTenantStore'

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin()

  // Read from CSS variables set server-side — no flash
  const name         = useTenantStore(s => s.name)
  const logoUrl      = useTenantStore(s => s.logoUrl)
  const primaryColor = 'var(--color-primary)'
  const accentColor  = 'var(--color-accent)'

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white relative overflow-hidden login-bg-panel"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
        }}
      >
        {/* bg image sits on top of gradient via CSS variable — no JS needed */}
        <div className="absolute inset-0 login-bg-image" />
        {/* overlay darkens the image when present */}
        <div className="absolute inset-0 login-bg-overlay" />
        <div className="max-w-sm text-center relative z-10">
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

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--color-bg)]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <BrandLogo
              logoUrl={logoUrl}
              alt={name || 'UniClear'}
              size={64}
              className="h-16 w-16 rounded-2xl mx-auto mb-3 ring-1 ring-black/5 shadow-sm"
            />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">{name || 'UniClear'}</h2>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-1">Sign in</h2>
          <p className="text-sm text-[var(--color-muted)] mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit(d => login(d))} className="space-y-4">
            <Input label="Email address" type="email" placeholder="you@university.edu" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <Button type="submit" size="lg" loading={isPending} className="w-full mt-2" style={{ backgroundColor: primaryColor }}>
              Sign in
            </Button>
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--color-muted)]">Newly admitted student?</p>
                <Link href="/register" className="text-xs text-[var(--color-primary)] hover:underline font-medium">
                  Claim your admission
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--color-muted)]">Forgot your password?</p>
                <Link href="/forgot-password" className="text-xs text-[var(--color-primary)] hover:underline">
                  Reset it here
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
