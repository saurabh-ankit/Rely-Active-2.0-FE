export interface CareLevelBreakdown {
  stable: number
  moderate: number
  critical: number
}

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
  careLevelBreakdown?: CareLevelBreakdown
}

export interface CriticalResidentItem {
  id: string
  name: string
  room: string
  status: string
  condition?: string
  careLevel?: string
  riskLevel?: string
  photoUrl?: string | null
  gender?: string | null
}

export interface DashboardCriticalResidents {
  total: number
  page: number
  limit: number
  totalPages: number
  items: CriticalResidentItem[]
}

export interface DashboardOccupancyStatusBreakdown {
  ownerOccupied: number
  tenantOccupied: number
  vacant: number
  booked: number
}

export interface DashboardOccupancySummary {
  totalRooms: number
  occupiedRooms: number
  availableVacancies: number
  occupancyRate: number
  totalBlocks?: number
  totalFloors?: number
  residingResidents?: number
  statusBreakdown?: DashboardOccupancyStatusBreakdown
  unitTypeBreakdown?: Record<string, number>
}

export interface DashboardBillingStatusCounts {
  paid: number
  partiallyPaid: number
  overdue: number
  sent: number
  draft: number
}

export interface DashboardBillingSubscriptions {
  activeCarePackages: number
  activeFnbPackages: number
  monthlyRecurring: number
}

export interface DashboardBillingSummary {
  totalBilled?: number
  totalCollected: number
  pendingInvoicesCount: number
  pendingAmount: number
  overdueAmount?: number
  pendingInvoices?: number
  collectionEfficiency: number
  totalInvoices?: number
  statusCounts?: DashboardBillingStatusCounts
  subscriptions?: DashboardBillingSubscriptions
}

export interface DashboardInventoryPurchaseOrders {
  total: number
  pending: number
}

export interface DashboardInventoryTransactions {
  totalIssues: number
  totalReceipts: number
}

export interface DashboardInventorySummary {
  totalStockedItems: number
  stockReorderAlerts: number
  approvedSuppliers: number
  totalCategories?: number
  totalQuantityUnits?: number
  inStockItemsCount?: number
  purchaseOrders?: DashboardInventoryPurchaseOrders
  transactions?: DashboardInventoryTransactions
}

export interface DashboardCareTasksSummary {
  activeAssignments: number
  completedToday: number
}

export interface DashboardTicketsSummary {
  open: number
  criticalUrgent: number
  resolvedToday: number
}

export interface DashboardClinicalSummary {
  todayTotal: number
  todayPending: number
}

export interface DashboardStats {
  residentStatus: DashboardResidentStatusOverview
  criticalResidents: DashboardCriticalResidents
  occupancy: DashboardOccupancySummary
  billing: DashboardBillingSummary
  inventory: DashboardInventorySummary
  careTasks?: DashboardCareTasksSummary
  tickets?: DashboardTicketsSummary
  clinical?: DashboardClinicalSummary
}
