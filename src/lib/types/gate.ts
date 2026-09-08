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
  preapproved?: { scheduleType?: string }
  createdByUser?: { id?: string; username?: string; email?: string }
  approvedByUser?: { id?: string; username?: string; email?: string }
  items?: GateItem[]
}

export interface GatePreapproved {
  id: string
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
