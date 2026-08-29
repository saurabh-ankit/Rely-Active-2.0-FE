import axios from 'axios'
import { BASE_URL } from '@/lib/api/endpoints'

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
  const token = localStorage.getItem('rely_auth_token')
  const locationId = localStorage.getItem('rely_active_property_id')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (locationId) {
    config.headers['x-location-id'] = locationId
    config.headers['x-property-id'] = locationId
  }

  return config
})

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('rely_auth_token')
  const locationId = localStorage.getItem('rely_active_property_id')

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
