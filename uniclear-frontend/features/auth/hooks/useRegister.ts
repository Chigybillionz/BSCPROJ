'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { authApi, RegisterDto } from '@/lib/api/auth.api'
import { ROUTES } from '@/lib/constants'

export function useRegister() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),

    onSuccess: (_response, variables) => {
      toast.success('Account created successfully! Please sign in with your credentials.')
      const slug = variables.universitySlug
      const loginUrl = slug ? `${ROUTES.login}?tenant=${encodeURIComponent(slug)}` : ROUTES.login
      router.push(loginUrl)
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Registration failed. Please try again.')
    },
  })
}
