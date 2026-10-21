import axios from 'axios'
import { BASE_URL } from '@/lib/api/endpoints'
import { useUserStore } from '@/lib/stores/userStore'
import { useLocationStore } from '@/lib/stores/locationStore'
import { clearAppSession } from '@/lib/utils/session'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const authApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = useUserStore.getState().token
  const locationId = useLocationStore.getState().selectedLocationId

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (locationId) {
    config.headers['x-location-id'] = locationId
    config.headers['x-property-id'] = locationId
  }

  // Default JSON Content-Type breaks multipart uploads — let the browser set boundary.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
    } else {
      delete (config.headers as Record<string, unknown>)['Content-Type']
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAppSession({ redirectToLogin: true })
    }
    return Promise.reject(error)
  },
)

export const getAuthHeaders = (): Record<string, string> => {
  const token = useUserStore.getState().token
  const locationId = useLocationStore.getState().selectedLocationId

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (locationId) {
    headers['x-location-id'] = locationId
    headers['x-property-id'] = locationId
  }

  return headers
}

export const apiClient = api
export default api
