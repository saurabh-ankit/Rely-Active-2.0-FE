import { API_BASE_URL, type ApiResponse } from './api'

export interface LoginPayload {
  username: string
  password: string
}

export interface UserProfileData {
  id: string
  user_id: string
  first_name: string
  last_name?: string | null
  photo_url?: string | null
  designation?: string | null
  employee_code?: string | null
}

export interface UserAuthData {
  id: string
  username?: string | null
  email?: string | null
  phone?: string | null
  companyId?: string | null
  defaultLocationId?: string | null
  profile?: UserProfileData | null
  isSuperAdmin: boolean
  roles: string[]
  permissions: string[]
}

export interface LoginResponseData {
  token: string
  user: UserAuthData
}

export const authApi = {
  /** Login with username & password */
  login: async (payload: LoginPayload): Promise<LoginResponseData> => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json: ApiResponse<LoginResponseData> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Login failed')
    return json.data
  },

  /** Get logged in user profile & permissions */
  getMe: async (token: string): Promise<UserAuthData> => {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json: ApiResponse<UserAuthData> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch user profile')
    return json.data
  },
}
