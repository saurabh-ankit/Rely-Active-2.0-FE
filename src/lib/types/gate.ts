export interface GateStats {
  expected?: number
  currentlyInside?: number
  completed?: number
  pendingWalkins?: number
}

export interface GateItem {
  id: string
  itemName: string
  quantity: number
  isChecked?: boolean
}

export interface GateItemInput {
  itemName: string
  quantity: number
}

export interface GateEntry {
  id: string
  visitorName: string
  visitorPhone?: string
  visitorPhotos?: string[]
  visitorType: string
  entrySource?: string
  status: string
  unit?: { id?: string; unit_number?: string }
  company?: string
  personToMeet?: string
  vehicleNumber?: string
  notes?: string
  createdAt?: string
  clockedInAt?: string
  clockedOutAt?: string
  preapproved?: { scheduleType?: string; createdAt?: string }
  createdByUser?: { id?: string; username?: string; email?: string }
  approvedByUser?: { id?: string; username?: string; email?: string }
  /** Who approved (or, for a Rejected entry, rejected) it. */
  approverType?: 'STAFF' | 'RESIDENT' | 'FAMILY_MEMBER' | null
  approverName?: string | null
  approvedAt?: string | null
  clockedInByUser?: GateStaffUser | null
  clockedOutByUser?: GateStaffUser | null
  /** Who raised it: the resident (or family member) behind a pre-approval, or the guard who raised a walk-in. */
  raisedBy?: {
    type: 'STAFF' | 'RESIDENT' | 'FAMILY_MEMBER'
    name: string | null
    userId: string | null
    residentName: string | null
  } | null
  items?: GateItem[]
}

export interface GateStaffUser {
  id?: string
  username?: string
  email?: string
  profile?: { firstName?: string; lastName?: string } | null
}

export interface GatePersonName {
  id?: string
  firstName?: string
  lastName?: string | null
}

export interface GatePreapproved {
  id: string
  /** The resident household that pre-approved the visitor. */
  resident?: GatePersonName | null
  /** Set when a family member, not the resident, made the pre-approval. */
  createdByFamilyMember?: GatePersonName | null
  visitorName: string
  visitorPhone?: string
  visitorPhotos?: string[]
  visitorType: string
  status: string
  unit?: { id?: string; unit_number?: string }
  company?: string
  personToMeet?: string
  vehicleNumber?: string
  notes?: string
  scheduleType?: string
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  qrCode?: string
  qrCodeImage?: string
}

export interface GateQueryParams {
  page?: number
  limit?: number
  date?: string
  status?: string
  visitorType?: string
}

export interface GatePaginatedData<T> {
  rows: T[]
  totalPages: number
  totalCount?: number
  currentPage?: number
}

export interface GateApiResponse<T> {
  success: boolean
  data: T
  message?: string
}
