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
  username?: string | null
  email?: string | null
  phone?: string | null
  status: string
  isActive: boolean
  company_id?: string | null
  default_location_id?: string | null
  defaultLocationId?: string | null
  profile?: {
    firstName?: string | null
    first_name?: string | null
    lastName?: string | null
    last_name?: string | null
    phone?: string | null
    dateOfJoining?: string | null
    date_of_joining?: string | null
    employeeCode?: string | null
    employee_code?: string | null
    gender?: string | null
    dateOfBirth?: string | null
    date_of_birth?: string | null
    emergencyContact?: string | null
    emergency_contact?: string | null
    bloodGroup?: string | null
    blood_group?: string | null
    address?: string | null
    qualification?: string | null
    experience?: string | null
  } | null
  userRoles?: UserRoleItem[]
  userLocations?: Array<{
    id: string
    userId: string
    locId: string
    roleId?: string | null
    companyId?: string | null
    departmentId?: string | null
    jobCategoryId?: string | null
    department?: {
      id: string
      name: string
      code: string
      description?: string | null
    }
    departmentName?: string
    jobCategoryName?: string
    role?: {
      id: string
      name: string
      code: string
      description?: string | null
    }
    jobCategory?: {
      id: string
      name: string
      code: string
      description?: string | null
    }
    managerId?: string | null
    manager?: {
      id: string
      username?: string
      email?: string
      phone?: string
      profile?: {
        firstName?: string
        lastName?: string
      }
    }
  }>
  assignedProperties?: Array<{ id: string; property_name: string }>
  createdAt: string
}

export interface CreateUserPayload {
  username?: string
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  password?: string
  dateOfJoining?: string
  date_of_joining?: string
  employee_code?: string
  employeeCode?: string
  gender?: string
  date_of_birth?: string
  dateOfBirth?: string
  emergency_contact?: string
  emergencyContact?: string
  blood_group?: string
  bloodGroup?: string
  address?: string
  qualification?: string
  experience?: string
  roleCode?: string
  departmentId?: string
  jobCategoryId?: string
  managerId?: string
  propertyIds?: string[]
  locIds?: string[]
  companyId?: string
  defaultLocationId?: string
}

export type UpdateUserPayload = Partial<CreateUserPayload>

export interface UserLocationPermissionItem {
  id: string
  userId: string
  locationId: string
  resourceKey: string
  permission: 'view' | 'create' | 'update' | 'delete'
}
