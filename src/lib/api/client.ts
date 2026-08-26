import axios from 'axios'
import { env } from '@/lib/env'
import { useAuthStore } from '@/lib/stores/auth-store'

export const apiClient = axios.create({ baseURL: env.VITE_API_URL, timeout: 15_000 })

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
