/** Dashboard statistics (GET /location/:locationId/dashboard/stats). Every value is live data. */

export interface DayCount {
  day: string
  count: number
}

export interface DashboardOverview {
  residents: {
    residing: number
    total: number
    residingFamilyMembers: number
    pending: number
    movedOut: number
    away: number
    movedInToday: number
    movedOutToday: number
    acuity: { stable: number; moderate: number; critical: number }
  }
  /** Active residents with Condition: Critical (same as resident detail), else careLevel Critical. */
  criticalResidents: {
    total: number
    page: number
    limit: number
    totalPages: number
    items: { id: string; name: string; unit: string | null; photoUrl: string | null; gender: string | null }[]
  }
  tickets: {
    total: number
    byStatus: { open: number; inProgress: number; onHold: number; resolved: number; closed: number; cancelled: number }
    openNow: number
    urgentOpen: number
    byPriority: { priority: string; count: number }[]
    resolutionRate: number
    trend: { day: string; created: number; resolved: number }[]
  }
  feedback: { total: number; good: number; average: number; poor: number; score: number }
  visitors: {
    last30Days: { type: string; count: number }[]
    today: number
    insideNow: number
    awaitingApproval: number
    trend: DayCount[]
  }
  staff: { total: number; byDepartment: { code: string; name: string; count: number }[] }
  medical: {
    doctors: number
    nurses: number
    appointmentsToday: { total: number; completed: number; upcoming: number; missed: number }
    trend: DayCount[]
    careTasks: { active: number; completedToday: number }
  }
  events: {
    total: number
    upcoming: number
    today: number
    thisMonth: number
    seatsBookedThisMonth: number
    attendedThisMonth: number
  }
  dining: {
    ordersToday: number
    dineIn: number
    roomService: number
    completed: number
    dineInAttendanceToday: number
  }
  recentActivity: { type: string; title: string; detail: string | null; at: string }[]
}

export interface DashboardOccupancy {
  totalUnits: number
  occupied: number
  ownerOccupied: number
  tenantOccupied: number
  vacant: number
  booked: number
  occupancyRate: number
  blocks: number
  floors: number
  residingResidents: number
  residingFamilyMembers: number
  unitTypes: { type: string; total: number; occupied: number }[]
  byBlock: { name: string; total: number; occupied: number }[]
  movement: { month: string; moveIns: number; moveOuts: number }[]
}

export interface DashboardBilling {
  invoiceCount: number
  totalBilled: number
  totalCollected: number
  outstanding: number
  overdue: number
  collectionRate: number
  receipts: number
  statusCounts: {
    draft: number
    pending: number
    partiallyPaid: number
    paid: number
    overdue: number
    carriedForward: number
  }
  monthly: { month: string; billed: number; collected: number }[]
  paymentMethods: { method: string; amount: number; count: number }[]
  topOutstanding: { unit: string | null; name: string | null; due: number; invoices: number }[]
  subscriptions: {
    carePackages: number
    carePackagesValue: number
    foodPackages: number
    foodPackagesValue: number
  }
}

export interface DashboardInventory {
  itemsTracked: number
  categories: number
  suppliers: number
  totalUnits: number
  inStock: number
  outOfStock: number
  lowStock: number
  purchaseOrders: { total: number; byStatus: { status: string; count: number }[] }
  byCategory: { category: string; items: number; quantity: number }[]
  lowStockItems: { name: string; category: string | null; quantity: number; threshold: number }[]
  monthly: { month: string; issued: number; received: number }[]
}

export interface DashboardStats {
  generatedAt: string
  overview: DashboardOverview
  occupancy: DashboardOccupancy
  billing: DashboardBilling
  inventory: DashboardInventory
}
