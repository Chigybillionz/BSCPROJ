'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useRegister } from '@/features/auth/hooks/useRegister'
import { useTenantStore } from '@/store/useTenantStore'
import { structureApi } from '@/lib/api/structure.api'
import { apiClient } from '@/lib/api/client'
import { Faculty, Department } from '@/types'
import { Eye, EyeOff, GraduationCap, School, CheckCircle2 } from 'lucide-react'

const registerSchema = z.object({
  universitySlug:  z.string().min(1, 'University is required'),
  firstName:       z.string().min(2, 'First name must be at least 2 characters').trim(),
  lastName:        z.string().min(2, 'Last name must be at least 2 characters').trim(),
  jambRegNo:       z.string().min(3, 'JAMB Reg No is required').trim(),
  facultyId:       z.string().min(1, 'Please select your Faculty'),
  departmentId:    z.string().min(1, 'Please select your Department'),
  email:           z.string().email('Please enter a valid email address').trim().toLowerCase(),
  phone:           z.string().optional(),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Tenant branding from store / CSS variables
  const tenantName    = useTenantStore(s => s.name)
  const tenantSlug    = useTenantStore(s => s.slug)
  const tenantLogo    = useTenantStore(s => s.logoUrl)
  const setTenant     = useTenantStore(s => s.setTenant)
  const primaryColor  = 'var(--color-primary)'
  const accentColor   = 'var(--color-accent)'

  // Fetch active universities if slug is not yet known or user wants to switch
  const { data: universities } = useQuery({
    queryKey: ['universities', 'public'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: any[] }>('/universities/public')
      return res.data.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const activeSlug = tenantSlug || (universities && universities.length > 0 ? universities[0].slug : 'unn')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      universitySlug: activeSlug,
      firstName: '',
      lastName: '',
      jambRegNo: '',
      facultyId: '',
      departmentId: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  // Keep universitySlug in sync if tenant slug becomes available
  useEffect(() => {
    if (activeSlug) {
      setValue('universitySlug', activeSlug)
    }
  }, [activeSlug, setValue])

  const selectedFacultyId = watch('facultyId')
  const selectedUniSlug   = watch('universitySlug') || activeSlug

  // Fetch faculties with their departments for the active university
  const { data: faculties, isLoading: loadingStructure } = useQuery<Faculty[]>({
    queryKey: ['structure', 'public', selectedUniSlug],
    queryFn: async () => {
      const res = await structureApi.getPublicStructure(selectedUniSlug)
      return res.data.data
    },
    enabled: !!selectedUniSlug,
    staleTime: 5 * 60 * 1000,
  })

  // Filter available departments for the selected faculty
  const availableDepartments = useMemo<Department[]>(() => {
    if (!selectedFacultyId || !faculties) return []
    const fac = faculties.find(f => f.id === selectedFacultyId)
    return fac?.departments ?? []
  }, [selectedFacultyId, faculties])

  // Reset department selection when faculty changes
  const handleFacultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setValue('facultyId', val, { shouldValidate: true })
    setValue('departmentId', '', { shouldValidate: true })
  }

  const { mutate: submitRegistration, isPending } = useRegister()

  const onSubmit = (values: RegisterFormValues) => {
    submitRegistration({
      universitySlug: values.universitySlug,
      firstName:      values.firstName,
      lastName:       values.lastName,
      email:          values.email,
      jambRegNo:      values.jambRegNo.toUpperCase(),
      facultyId:      values.facultyId,
      departmentId:   values.departmentId,
      password:       values.password,
      phone:          values.phone || undefined,
    })
  }

  const currentUniName = tenantName || universities?.find(u => u.slug === selectedUniSlug)?.name || 'UniClear'

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col items-center justify-center p-12 text-white relative overflow-hidden login-bg-panel"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
        }}
      >
        <div className="absolute inset-0 login-bg-image" />
        <div className="absolute inset-0 login-bg-overlay" />
        <div className="max-w-md text-center relative z-10 px-4">
          {tenantLogo ? (
            <Image
              src={tenantLogo}
              alt={currentUniName}
              width={88}
              height={88}
              className="rounded-2xl mx-auto mb-6 object-cover shadow-lg border-2 border-white/20"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-md mx-auto mb-6 flex items-center justify-center text-3xl font-bold shadow-lg">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            {currentUniName}
          </h1>
          <p className="text-white/85 text-base leading-relaxed mb-8">
            Student Clearance Portal.<br />
            Register your profile, submit documents, and track your departmental clearances online.
          </p>

          <div className="space-y-3 text-left max-w-xs mx-auto text-sm text-white/90 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
              <span>Instant account activation</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
              <span>Direct department routing</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
              <span>Official digital certificate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — student registration form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-[var(--color-bg)] overflow-y-auto">
        <div className="w-full max-w-xl py-6">
          {/* Mobile branding header */}
          <div className="lg:hidden text-center mb-6">
            <div
              className="h-14 w-14 rounded-xl mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">{currentUniName}</h2>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] mb-3">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Fresh Student Onboarding</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              Create your account
            </h2>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Provide your admission details and set up your clearance profile.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* University selector (if multiple institutions and not locked by tenant) */}
            {universities && universities.length > 1 && !tenantSlug && (
              <Select
                label="Institution"
                icon={<School className="h-4 w-4" />}
                error={errors.universitySlug?.message}
                {...register('universitySlug')}
                onChange={(e) => {
                  const slug = e.target.value
                  setValue('universitySlug', slug)
                  const chosen = universities.find(u => u.slug === slug)
                  if (chosen) setTenant({ slug: chosen.slug, name: chosen.name, universityId: chosen.id })
                }}
              >
                {universities.map(u => (
                  <option key={u.id} value={u.slug}>
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
              </Select>
            )}

            {/* Names (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="e.g. Adaeze"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="e.g. Nwosu"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            {/* JAMB Registration Number & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="JAMB Registration Number"
                placeholder="e.g. 202210067841FA"
                error={errors.jambRegNo?.message}
                {...register('jambRegNo')}
              />
              <Input
                label="Phone Number (Optional)"
                type="tel"
                placeholder="e.g. 08012345678"
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>

            {/* Academic Placement: Faculty & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Faculty"
                error={errors.facultyId?.message}
                placeholder={loadingStructure ? 'Loading faculties...' : 'Select Faculty'}
                value={selectedFacultyId}
                onChange={handleFacultyChange}
                disabled={loadingStructure || !faculties || faculties.length === 0}
              >
                <option value="" disabled>Select Faculty</option>
                {faculties?.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Department"
                error={errors.departmentId?.message}
                placeholder={
                  !selectedFacultyId
                    ? 'Select faculty first'
                    : availableDepartments.length === 0
                    ? 'No departments found'
                    : 'Select Department'
                }
                disabled={!selectedFacultyId || availableDepartments.length === 0}
                {...register('departmentId')}
              >
                <option value="" disabled>
                  {!selectedFacultyId ? 'Select faculty first' : 'Select Department'}
                </option>
                {availableDepartments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Email Address */}
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. moses.praise.243671@unn.edu.ng"
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              loading={isPending}
              className="w-full mt-4 font-semibold shadow-md transition-all duration-200"
              style={{ backgroundColor: primaryColor }}
            >
              {isPending ? 'Setting up profile...' : 'Complete Registration & Sign In'}
            </Button>

            {/* Navigation links */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] mt-4">
              <p className="text-xs text-[var(--color-muted)]">Already registered?</p>
              <Link href="/login" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
                Sign in to your account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
