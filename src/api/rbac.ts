import { API_BASE_URL, type ApiResponse } from './api'

export interface UserRoleItem {
  id: string
  user_id: string
  role_id: string
  company_id?: string | null
  location_id?: string | null
  department_id?: string | null
  role?: {
    id: string
    name: string
    code: string
    description?: string | null
  }
}

export interface UserItem {
  id: string
  email?: string | null
  phone?: string | null
  status: string
  isActive: boolean
  company_id?: string | null
  default_location_id?: string | null
  profile?: {
    first_name: string
    last_name?: string | null
    designation?: string | null
    employee_code?: string | null
  } | null
  userRoles?: UserRoleItem[]
  assignedProperties?: Array<{ id: string; property_name: string }>
  createdAt: string
}

export interface PermissionItem {
  id: string
  module_id: string
  name: string
  code: string
  action: string
  description?: string | null
  module?: {
    id: string
    name: string
    code: string
  }
}

export interface ModuleItem {
  id: string
  name: string
  code: string
  description?: string | null
  icon?: string | null
  permissions?: PermissionItem[]
}

export interface RoleItem {
  id: string
  name: string
  code: string
  description?: string | null
  is_system: boolean
  isActive: boolean
  permissions?: PermissionItem[]
}

export interface DepartmentItem {
  id: string
  name: string
  code: string
  description?: string | null
  isActive: boolean
}

export interface ResourceItem {
  id: string
  key: string
  name: string
  description?: string | null
  type?: string | null
  path?: string | null
  isActive: boolean
}

export interface UserLocationPermissionItem {
  id: string
  userId: string
  locationId: string
  resourceKey: string
  permission: 'view' | 'create' | 'update' | 'delete'
}

export const rbacApi = {
  // ── Users ────────────────────────────────────────────────────────────────
  getUsers: async (): Promise<UserItem[]> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const json: ApiResponse<UserItem[]> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch users')
    return json.data
  },

  createUser: async (payload: {
    first_name: string
    last_name?: string
    email?: string
    phone?: string
    password?: string
    designation?: string
    employee_code?: string
    roleCode?: string
    departmentId?: string
    propertyIds?: string[]
    companyId?: string
    defaultLocationId?: string
  }): Promise<UserItem> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(payload),
    })
    const json: ApiResponse<UserItem> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create user')
    return json.data
  },

  getUserAccessibleProperties: async (): Promise<Array<{ id: string; property_name: string }>> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/users/me/properties`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const json: ApiResponse<Array<{ id: string; property_name: string }>> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch user accessible properties')
    return json.data
  },

  updateUserProperties: async (userId: string, propertyIds: string[]) => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/users/${userId}/properties`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ propertyIds }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update user properties')
    return json.data
  },

  assignUserRole: async (
    userId: string,
    payload: { roleCode: string; companyId?: string; locationId?: string; departmentId?: string },
  ) => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/users/${userId}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to assign role')
    return json.data
  },

  updateUserPermissions: async (userId: string, permissionIds: string[]) => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/users/${userId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ permissionIds }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update user permissions')
    return json.data
  },

  // ── Location & Resource UBAC ─────────────────────────────────────────────
  getResources: async (): Promise<ResourceItem[]> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/resources`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const json: ApiResponse<ResourceItem[]> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch resources')
    return json.data
  },

  getUserLocationPermissions: async (userId: string, locationId: string): Promise<UserLocationPermissionItem[]> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/resources/users/${userId}/location-permissions?locationId=${locationId}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const json: ApiResponse<UserLocationPermissionItem[]> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch location permissions')
    return json.data
  },

  saveUserLocationPermissions: async (
    userId: string,
    locationId: string,
    permissions: Array<{ resourceKey: string; permission: 'view' | 'create' | 'update' | 'delete' }>,
  ) => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/resources/users/${userId}/location-permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ locationId, permissions }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save location permissions')
    return json.data
  },

  // ── Roles ────────────────────────────────────────────────────────────────
  getRoles: async (): Promise<RoleItem[]> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/roles`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const json: ApiResponse<RoleItem[]> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch roles')
    return json.data
  },

  createRole: async (payload: {
    name: string
    code: string
    description?: string
    permissionIds?: string[]
  }): Promise<RoleItem> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(payload),
    })
    const json: ApiResponse<RoleItem> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create role')
    return json.data
  },

  updateRolePermissions: async (roleId: string, permissionIds: string[]): Promise<RoleItem> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ permissionIds }),
    })
    const json: ApiResponse<RoleItem> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update role permissions')
    return json.data
  },

  // ── Departments ──────────────────────────────────────────────────────────
  getDepartments: async (): Promise<DepartmentItem[]> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/departments`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const json: ApiResponse<DepartmentItem[]> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch departments')
    return json.data
  },

  // ── Permissions & Modules ────────────────────────────────────────────────
  getModules: async (): Promise<ModuleItem[]> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/permissions/modules`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const json: ApiResponse<ModuleItem[]> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch modules')
    return json.data
  },

  getPermissionsAndModules: async (): Promise<{ permissions: PermissionItem[]; modules: ModuleItem[] }> => {
    const token = localStorage.getItem('rely_auth_token')
    const res = await fetch(`${API_BASE_URL}/permissions`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const json: ApiResponse<{ permissions: PermissionItem[]; modules: ModuleItem[] }> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch permissions')
    return json.data
  },
}
