export const API_BASE_URL = 'http://localhost:3002/api/v1'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}
