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

export interface JobCategoryItem {
  id: string
  departmentId?: string
  code: string
  name: string
  description?: string | null
  isActive?: boolean
}

export interface DepartmentItem {
  id: string
  name: string
  code: string
  description?: string | null
  isActive: boolean
  jobCategories?: JobCategoryItem[]
}

export interface ResourceItem {
  id: string
  key: string
  name: string
  description?: string | null
  isActive: boolean
}
