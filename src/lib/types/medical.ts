export type BillingType = 'MONTHLY' | 'SESSION'

export interface CareTask {
  id: string
  careTaskName: string
  taskName?: string
  careTaskDescription: string | null
  taskDescription?: string | null
  billingType: BillingType | string
  price: number
  careTaskImage?: string | null
  taskImage?: string | null
  taskType?: string
  propertyId: string | null
  isAssigned?: boolean
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  property?: {
    id: string
    property_name: string
    city?: string
    state?: string
  } | null
}

// Backward compatibility alias
export type Task = CareTask

export interface PackageTaskItem {
  taskId: string
  careTaskName?: string
  taskName?: string
  taskType?: string
  billingType?: BillingType | string
  price?: number | null
  careTaskImage?: string | null
  taskImage?: string | null
  complimentaryCount?: number | null
}

export interface CarePackage {
  id: string
  packageName: string
  packageCost: number
  duration: 'Monthly' | 'Yearly' | string
  tasks?: PackageTaskItem[]
  features?: (CareTask & { CarePackageFeaturesMap?: { complimentaryCount?: number } })[]
  description?: string | null
  propertyId: string | null
  isActive: boolean
  isDeleted: boolean
  isSubscribed?: boolean
  subscriptionCount?: number
  activeSubscriptionCount?: number
  createdAt: string
  updatedAt: string
  property?: {
    id: string
    property_name: string
    city?: string
    state?: string
  } | null
}

// Backward compatibility alias
export type Package = CarePackage

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CareTaskQueryParams {
  page?: number
  limit?: number
  search?: string
  propertyId?: string | null
  includeGlobal?: boolean | string
  isActive?: boolean | string
}

export interface CarePackageQueryParams {
  page?: number
  limit?: number
  search?: string
  propertyId?: string | null
  includeGlobal?: boolean | string
  isActive?: boolean | string
}

export interface CareTasksListResponse {
  success: boolean
  message?: string
  data: CareTask[]
  pagination?: PaginationMeta
}

export interface CarePackagesListResponse {
  success: boolean
  message?: string
  data: CarePackage[]
  pagination?: PaginationMeta
}

export interface CreateCarePackagePayload {
  packageName: string
  packageCost: number
  duration: string
  description?: string
  tasks?: PackageTaskItem[]
  features?: Array<{ featureId: string; complimentaryCount: number }>
  propertyId?: string | null
}

export type UpdateCarePackagePayload = Partial<CreateCarePackagePayload>

export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'COMPLETED'

export interface PackageSubscriptionFeatureItem {
  id: string
  name: string
  description?: string | null
  price: number
  complimentaryCount: number
  remainingCount: number
}

export interface AdditionalTaskItem {
  id: string
  taskName: string
  description?: string | null
  price: number
  completedAt: string
  nurseName?: string | null
}

export interface PackageSubscriptionResponse {
  id: string
  residentId: string
  carePackageId: string
  propertyId: string
  status: SubscriptionStatus | string
  startDate: string
  endDate?: string | null
  totalCost?: number | null
  notes?: string | null
  isPrevious?: boolean
  daysUtilized?: number
  costed?: number
  renewalEligible?: boolean
  resident?: {
    id: string
    firstName?: string
    lastName?: string
    fullName?: string
    patientNumber?: string
    username?: string
    gender?: string
    dob?: string
    phone?: string
    email?: string
    unitNumber?: string
    unit?: {
      id: string
      unit_number: string
      flat_type?: string
    }
  } | null
  patient?: {
    id: string
    fullName?: string
    patientNumber?: string
  } | null
  carePackage?: {
    id: string
    name: string
    packageName?: string
    description?: string | null
    cost?: number
    packageCost?: number
    duration?: string
    durationType?: string
    durationValue?: number
  } | null
  features?: PackageSubscriptionFeatureItem[]
  packageFeatures?: PackageSubscriptionFeatureItem[]
  additionalTasks?: AdditionalTaskItem[]
}

export interface ChangePackageRequest {
  newCarePackageId: string
  startDate?: string
  endDate?: string | null
  taskSchedules?: Array<{
    taskId: string
    taskName?: string
    frequency?: number
    times?: string[]
  }>
}

export interface UpdateSubscriptionStatusRequest {
  status: SubscriptionStatus | string
  endDate?: string
  notes?: string
}

export type BillingCategory = BillingType

export type AssignmentSource = 'PACKAGE' | 'ADDON'

export type AssignmentStatus = 'ACTIVE' | 'STOPPED' | 'CANCELLED'

export interface CareTaskAssignmentPackageInfo {
  isIncludedInPackage: boolean
  packageName?: string | null
  packageSubscriptionId?: string
  complimentaryCount: number
  remainingCount: number
  usedCount: number
  subscriptionStatus?: string | null
  isPackageStopped?: boolean
}

export interface CareTaskAssignment {
  id: string
  residentId: string
  taskId: string
  propertyId?: string | null

  packageSubscriptionId?: string | null
  carePackageId?: string | null

  source: AssignmentSource

  billingType: BillingType | string
  price: number

  frequency?: number | null

  startDate: string
  endDate?: string | null

  time?: string | null

  status: AssignmentStatus | string

  customInstructions?: string | null

  nurseId?: string | null

  stoppedBy?: string | null
  stoppedAt?: string | null

  isStopped?: boolean
  completedAt?: string | null
  completedBy?: string | null
  completionCount?: number

  isActive: boolean
  isDeleted: boolean

  createdAt?: string
  updatedAt?: string

  packageInfo?: CareTaskAssignmentPackageInfo | null
  carePackage?: {
    id: string
    packageName: string
    duration?: string
  } | null
  packageSubscription?: {
    id: string
    status: string
    startDate?: string
    endDate?: string | null
  } | null
  resident?: {
    id: string
    firstName?: string
    lastName?: string
    phone?: string
    locId?: string
    unitId?: string
    room_number?: string
  } | null
  task?: CareTask | null
  property?: {
    id: string
    property_name: string
    city?: string
    state?: string
  } | null
  nurse?: {
    id: string
    email?: string
    profile?: {
      firstName?: string
      lastName?: string
    }
  } | null
  completedByUser?: {
    id: string
    email?: string
    profile?: {
      firstName?: string
      lastName?: string
    }
  } | null
  completions?: ResidentCareTaskCompletion[]
}

export interface CareTaskAssignmentSlot {
  id: string
  time: string
  frequency?: number
  startDate: string
  endDate?: string | null
  status: AssignmentStatus | string
  isStopped?: boolean
  completionCount: number
  completedAt?: string | null
  completedBy?: string | null
  nurseId?: string | null
  nurse?: CareTaskAssignment['nurse']
  completedByUser?: CareTaskAssignment['completedByUser']
  customInstructions?: string | null
  source?: AssignmentSource
  rawAssignment: CareTaskAssignment
}

export interface GroupedCareTaskAssignment {
  groupKey: string
  residentId: string
  resident?: CareTaskAssignment['resident']
  taskId: string
  task?: CareTaskAssignment['task']
  propertyId?: string | null
  property?: CareTaskAssignment['property']
  packageSubscriptionId?: string | null
  carePackageId?: string | null
  carePackage?: CareTaskAssignment['carePackage']
  source: AssignmentSource
  sources?: AssignmentSource[]
  billingType: BillingType | string
  price: number
  frequency: number
  startDate: string
  endDate?: string | null
  customInstructions?: string | null
  status: AssignmentStatus | string
  isStopped?: boolean
  packageInfo?: CareTaskAssignmentPackageInfo | null
  totalCompletionCount: number
  totalSlots: number
  slots: CareTaskAssignmentSlot[]
}

export type CompletionStatus = 'COMPLETED' | 'CANCELLED'

export interface ResidentCareTaskCompletion {
  id: string
  residentCareTaskAssignmentId: string
  residentId: string
  taskId: string
  propertyId?: string | null
  completedBy?: string | null
  completedAt: string
  status: CompletionStatus | string
  description?: string | null
  remarks?: string | null
  isActive: boolean
  isDeleted: boolean
  createdAt?: string
  updatedAt?: string
  resident?: {
    id: string
    firstName?: string
    lastName?: string
    phone?: string
  } | null
  task?: CareTask | null
  property?: {
    id: string
    property_name: string
    city?: string
    state?: string
  } | null
  completedByUser?: {
    id: string
    email?: string
    phone?: string
    username?: string
    profile?: {
      firstName?: string
      lastName?: string
    }
  } | null
  assignment?: CareTaskAssignment | null
}

export interface CreateCareTaskAssignmentPayload {
  residentId: string
  taskId: string
  propertyId?: string | null
  packageSubscriptionId?: string | null
  carePackageId?: string | null
  source?: AssignmentSource
  billingType?: BillingType | string
  price?: number
  frequency?: number | null
  startDate: string
  endDate?: string | null
  time?: string
  times?: string[]
  nurseId?: string | null
  customInstructions?: string | null
}

export interface CompleteCareTaskPayload {
  completedAt?: string
  nurseId?: string | null
  notes?: string | null
  remarks?: string | null
  description?: string | null
  isBillable?: boolean
  price?: number
}

export interface CareTaskAssignmentsListResponse {
  success: boolean
  data: CareTaskAssignment[]
  grouped?: GroupedCareTaskAssignment[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  matrix?: {
    totalAssignments: number
    totalActive: number
    totalStopped: number
    totalCancelled?: number
    totalMonthly?: number
    totalSessionWise?: number
    totalPackage?: number
    totalAddon?: number
    totalCompleted?: number
  }
}

export interface CareTaskCompletionsListResponse {
  success: boolean
  data: ResidentCareTaskCompletion[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
