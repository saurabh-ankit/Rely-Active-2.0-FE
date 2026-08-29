import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { LoginPayload, LoginResponseData, UserAuthData } from '@/lib/types'

export const loginAPI = async (payload: LoginPayload): Promise<LoginResponseData> => {
  const response = await api.post(API_ENDPOINTS.auth.login, payload)
  return response.data?.data || response.data
}

export const getMeAPI = async (token?: string): Promise<UserAuthData> => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const response = await api.get(API_ENDPOINTS.auth.profile, { headers })
  return response.data?.data || response.data
}
