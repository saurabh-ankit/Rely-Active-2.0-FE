export type TicketCategory = 'REPAIR_MAINTENANCE' | 'CONCIERGE' | 'HOUSEKEEPING' | 'FOOD' | 'OTHER'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'
export type TicketActivityType =
  | 'CREATED'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'STATUS_CHANGE'
  | 'COMMENT_ADDED'
  | 'ATTACHMENT_ADDED'
  | 'PRIORITY_CHANGE'
  | 'UPDATED'

export interface TicketSubCategoryMaster {
  id: string
  categoryId: string
  name: string
  code?: string | null
  description?: string | null
  isActive: boolean
}

export interface TicketCategoryMaster {
  id: string
  name: string
  code?: string | null
  description?: string | null
  isActive: boolean
  subCategories?: TicketSubCategoryMaster[]
}

export interface AssignableEmployee {
  id: string
  name: string
  email: string
  initials: string
  totalAssigned: number
  openCount: number
  closedCount: number
}

export interface TicketPropertyRef {
  id: string
  name: string
}

export interface TicketUnitRef {
  id: string
  unitNumber?: string
  unit_number?: string
  blockNumber?: string
  floorNumber?: string
}

export interface TicketResidentRef {
  id: string
  firstName: string
  lastName: string
  phone?: string
  email?: string
}

export interface TicketUserRef {
  id: string
  email: string
  name?: string
}

export interface TicketDepartmentRef {
  id: string
  name: string
}

export interface TicketJobCategoryRef {
  id: string
  name: string
}

export interface TicketVendorRef {
  id: string
  name: string
  phone?: string
}

export interface TicketAssetRef {
  id: string
  assetTag: string
  serialNumber?: string
}

export interface TicketActivityLog {
  id: string
  ticketId: string
  performedByUserId?: string | null
  performedByName?: string | null
  activityType: TicketActivityType
  fromStatus?: string | null
  toStatus?: string | null
  comment?: string | null
  attachments?: string[] | Record<string, unknown> | null
  createdAt: string
  performedByUser?: TicketUserRef | null
}

export interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description?: string | null
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  locId: string
  unitId?: string | null
  residentId?: string | null
  familyMemberId?: string | null
  raisedByUserId?: string | null
  departmentId?: string | null
  jobCategoryId?: string | null
  categoryId?: string | null
  subCategoryId?: string | null
  tatOption?: string | null
  customTatDeadline?: string | null
  assignedToUserId?: string | null
  vendorId?: string | null
  assetId?: string | null
  approvedByUserId?: string | null
  approvedAt?: string | null
  dueDate?: string | null
  resolvedAt?: string | null
  closedAt?: string | null
  resolutionNotes?: string | null
  attachments?: string[] | null
  createdAt: string
  updatedAt: string
  property?: TicketPropertyRef | null
  unit?: TicketUnitRef | null
  resident?: TicketResidentRef | null
  department?: TicketDepartmentRef | null
  jobCategory?: TicketJobCategoryRef | null
  categoryObj?: TicketCategoryMaster | null
  subCategoryObj?: TicketSubCategoryMaster | null
  assignedToUser?: TicketUserRef | null
  raisedByUser?: TicketUserRef | null
  vendor?: TicketVendorRef | null
  asset?: TicketAssetRef | null
  activityLogs?: TicketActivityLog[]
  areaType?: 'IN_FLAT' | 'COMMON_AREA' | null
  raisedBy?: string | null
  completedBy?: string | null
  tatUpdatedBy?: string | null
  escalatedBy?: string | null
}

export interface TicketStats {
  total: number
  open: number
  inProgress: number
  closed: number
  overdue: number
}
