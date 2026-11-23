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

// ── Dashboard tab settings (GET / PUT /dashboard/settings) ───────────────────

export type DashboardTabKey =
  | 'dashboard'
  | 'occupancy'
  | 'billing'
  | 'inventory'
  | 'tickets'
  | 'visitors'
  | 'dining'
  | 'events'
  | 'medical'
  | 'staff'
  | 'assets'
  | 'feedback'

export type AnalyticsTabKey = Exclude<DashboardTabKey, 'dashboard' | 'occupancy' | 'billing' | 'inventory'>

/** Which tabs show on the dashboard. Stored per company, so it applies to every property. */
export interface DashboardSettings {
  visibleTabs: DashboardTabKey[]
  allTabs: DashboardTabKey[]
  /** Super Admin / Admin only. */
  canEdit: boolean
  updatedAt: string | null
  updatedByName: string | null
}

// ── Analytics tabs (GET /location/:locationId/dashboard/analytics/:tab) ──────

export interface KeyCount {
  key: string
  count: number
}

export interface DashboardTicketsAnalytics {
  total: number
  open: number
  overdue: number
  escalated: number
  raisedThisMonth: number
  resolvedThisMonth: number
  avgResolutionHours: number
  onTimeRate: number
  deadlinesExtended: number
  byCategory: { name: string; total: number; open: number }[]
  byDepartment: { name: string; total: number; open: number; avgResolutionHours: number }[]
  monthly: { month: string; created: number; resolved: number }[]
  topAssignees: { name: string; open: number; resolved: number }[]
  feedback: { good: number; average: number; poor: number }
}

export interface DashboardVisitorsAnalytics {
  last30Days: { entries: number; people: number }
  today: number
  insideNow: number
  awaitingApproval: number
  preapprovedRate: number
  avgVisitMinutes: number
  itemsLogged: number
  trend: DayCount[]
  byHour: { hour: number; count: number }[]
  byType: KeyCount[]
  byStatus: KeyCount[]
  bySource: { preapproved: number; walkIn: number }
  topUnits: { unit: string; count: number }[]
  passes: { active: number; scanned: number; expired: number; cancelled: number }
}

export interface DashboardDiningAnalytics {
  ordersThisMonth: number
  revenueThisMonth: number
  cancelledThisMonth: number
  avgPrepMinutes: number
  dineInThisMonth: number
  lateMarksThisMonth: number
  activePackages: number
  activePackagesValue: number
  daily: { day: string; dineIn: number; roomService: number }[]
  mealSlots: { name: string; attended: number; absent: number; optedOut: number; late: number }[]
  topDishes: { name: string; quantity: number; amount: number }[]
  orderTypes: KeyCount[]
  dietaryPreferences: KeyCount[]
  monthlyRevenue: { month: string; revenue: number }[]
}

export interface DashboardEventsAnalytics {
  upcoming: number
  thisMonth: number
  seatsBookedThisMonth: number
  attendanceRate: number
  openRequests: number
  amenityBookingsThisMonth: number
  amenityRevenueThisMonth: number
  byType: { regular: number; special: number }
  monthly: { month: string; events: number; booked: number; attended: number }[]
  registrationStatus: KeyCount[]
  topEvents: { title: string; capacity: number | null; seats: number; startDate: string }[]
  requestStatus: KeyCount[]
  amenities: { name: string; bookings: number; revenue: number }[]
}

export interface DashboardMedicalAnalytics {
  appointmentsThisMonth: number
  appointmentsUpcoming: number
  attendanceRate: number
  careTasksActive: number
  careTasksCompletedThisMonth: number
  vitalsLast30Days: number
  medication: { given: number; missed: number; adherence: number }
  incidentsLast90Days: number
  appointmentsMonthly: { month: string; attended: number; missed: number; scheduled: number }[]
  byDoctor: { name: string; total: number; attended: number }[]
  daily: { day: string; medsGiven: number; medsMissed: number; careTasks: number }[]
  incidentTypes: KeyCount[]
  incidentSeverity: KeyCount[]
}

export interface DashboardStaffAnalytics {
  headcount: number
  shifts: number
  today: { scheduled: number; present: number; upcoming: number; absent: number; covered: number; dayOff: number }
  byRole: KeyCount[]
  byDepartment: KeyCount[]
  byShiftToday: { name: string; scheduled: number; onDuty: number; absent: number }[]
  daily: { day: string; present: number; absent: number; covered: number }[]
  leaveTypes: KeyCount[]
  topAbsentees: { name: string; count: number }[]
}

export interface DashboardAssetsAnalytics {
  total: number
  purchaseValue: number
  currentValue: number
  inMaintenance: number
  servicesOverdue: number
  servicesDueSoon: number
  certificatesExpiring: number
  certificatesExpired: number
  inspectionsFailed: number
  status: KeyCount[]
  condition: KeyCount[]
  byCategory: { name: string; count: number; value: number }[]
  warranty: { expired: number; within30: number; within60: number; within90: number; later: number; none: number }
  maintenanceCost: { month: string; cost: number }[]
  serviceTypes: KeyCount[]
  upcoming: { kind: 'service' | 'inspection' | 'certificate' | 'warranty'; asset: string; at: string }[]
}

export interface DashboardFeedbackAnalytics {
  formsSent: number
  activeForms: number
  recipients: number
  responses: number
  responseRate: number
  averageRating: number
  ratingsCount: number
  ratingDistribution: { stars: number; count: number }[]
  forms: {
    title: string
    sentAt: string | null
    recipients: number
    responses: number
    responseRate: number
    averageRating: number | null
  }[]
  byAudience: { key: string; recipients: number; responses: number; responseRate: number }[]
  monthly: { month: string; responses: number }[]
}

export interface DashboardAnalyticsMap {
  tickets: DashboardTicketsAnalytics
  visitors: DashboardVisitorsAnalytics
  dining: DashboardDiningAnalytics
  events: DashboardEventsAnalytics
  medical: DashboardMedicalAnalytics
  staff: DashboardStaffAnalytics
  assets: DashboardAssetsAnalytics
  feedback: DashboardFeedbackAnalytics
}

export type DashboardAnalytics<T extends AnalyticsTabKey> = DashboardAnalyticsMap[T] & {
  generatedAt: string
  tab: T
}
