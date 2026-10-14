'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { authApi, RegisterDto } from '@/lib/api/auth.api'
import { useAuthStore } from '@/store/useAuthStore'
import { ROUTES } from '@/lib/constants'

export function useRegister() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const setUser = useAuthStore(s => s.setUser)

  return useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),

    onSuccess: (response) => {
      const user = response.data.data
      setUser(user)
      queryClient.setQueryData(['auth', 'me'], user)
      toast.success('Registration successful! Welcome to UniClear.')
      router.push(ROUTES.student.dashboard)
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Registration failed. Please try again.')
    },
  })
}
