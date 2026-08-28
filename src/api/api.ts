export const API_BASE_URL = 'http://localhost:3002/api/v1'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

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
