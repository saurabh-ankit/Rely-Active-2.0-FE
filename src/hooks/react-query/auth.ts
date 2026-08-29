import { useMutation, useQuery } from '@tanstack/react-query'
import { getMeAPI, loginAPI } from '@/lib/services/authService'
import type { LoginPayload } from '@/lib/types'

export const AUTH_KEYS = {
  profile: ['auth', 'profile'] as const,
}

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: (payload: LoginPayload) => loginAPI(payload),
  })
}

export const useAuthProfileQuery = (token?: string, enabled = true) => {
  return useQuery({
    queryKey: AUTH_KEYS.profile,
    queryFn: () => getMeAPI(token),
    enabled: enabled && !!token,
  })
}
