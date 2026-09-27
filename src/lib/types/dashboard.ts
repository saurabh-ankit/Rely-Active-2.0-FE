export interface DashboardResidentStatusOverview {
  activeResidents: number
  todayAdmissions: number
  todayDischarges: number
  totalResidents: number
  totalOutResidents: number
  registeredPreAssessed: number
  totalDischarged: number
  notAdmitted: number
  hospitalizationPending: number
}

export interface CriticalResidentItem {
  id: string
  name: string
  room: string
  status: string
  condition?: string
  riskLevel?: string
}

export interface DashboardCriticalResidents {
  total: number
  page: number
  limit: number
  totalPages: number
  items: CriticalResidentItem[]
}

export interface DashboardOccupancySummary {
  totalRooms: number
  occupiedRooms: number
  availableVacancies: number
  occupancyRate: number
}

export interface DashboardBillingSummary {
  totalCollected: number
  pendingInvoicesCount: number
  pendingAmount: number
  pendingInvoices?: number
  collectionEfficiency: number
}

export interface DashboardInventorySummary {
  totalStockedItems: number
  stockReorderAlerts: number
  approvedSuppliers: number
}

export interface DashboardStats {
  residentStatus: DashboardResidentStatusOverview
  criticalResidents: DashboardCriticalResidents
  occupancy: DashboardOccupancySummary
  billing: DashboardBillingSummary
  inventory: DashboardInventorySummary
}
