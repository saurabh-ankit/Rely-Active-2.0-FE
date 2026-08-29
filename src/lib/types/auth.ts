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
