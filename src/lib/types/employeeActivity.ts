/** Which activity view an employee gets, derived server-side from department and role. */
export type EmployeeActivityKind = 'tickets' | 'gate' | 'fnb' | 'medical-care' | 'medical-doctor' | 'none'

export interface EmployeeActivityRange {
  from: string
  to: string
}

/** Ticket counts using the admin Tickets page stages. */
export interface TicketActivityStats {
  total: number
  /** Assigned, started or on hold (current work, not limited to the range). */
  inProgress: number
  /** Of inProgress: assigned but "Start Work" not tapped yet. */
  notStarted: number
  /** Resolved by staff, awaiting admin verification (not limited to the range). */
  completed: number
  /** Verified & closed within the range. */
  closed: number
  /** Cancelled within the range. */
  cancelled: number
  avgResolutionHours: number | null
}

export interface GateActivityStats {
  /** Walk-in passes this employee raised for a resident's approval. */
  raised: number
  /** Entries this employee approved / rejected themselves (most are approved by residents). */
  approved: number
  rejected: number
  checkIns: number
  checkOuts: number
  byVisitorType: Record<string, number>
}

export interface FnbActivityStats {
  total: number
  delivered: number
  failed: number
  pending: number
}

export interface CareActivityStats {
  completed: number
  cancelled: number
  residentsServed: number
  activeAssignments: number
}

export interface DoctorActivityStats {
  appointments: number
  attended: number
  upcoming: number
  missed: number
  labReports: number
  medications: number
}

export type EmployeeActivityStats =
  TicketActivityStats | GateActivityStats | FnbActivityStats | CareActivityStats | DoctorActivityStats

export interface EmployeeActivitySummary {
  kind: EmployeeActivityKind
  departmentCode: string | null
  departmentName: string | null
  range: EmployeeActivityRange
  stats: EmployeeActivityStats | null
}

export interface TicketActivityRecord {
  id: string
  ticketNumber: string
  title: string
  category: string | null
  priority: string
  status: string
  unitNumber: string | null
  residentName: string | null
  createdAt: string
  workStartedAt: string | null
  /** Assigned but the employee hasn't tapped "Start Work" yet. */
  notStarted: boolean
  completedAt: string | null
  verifiedAt: string | null
  cancelledAt: string | null
  /** Time from work start (or raise) to completion; null while the ticket is open. */
  resolutionHours: number | null
  completedByMe: boolean
}

export interface GatePersonAction {
  at: string
  by: string | null
  byMe: boolean
}

export interface GateActivityRecord {
  id: string
  entrySource: 'Preapproved' | 'Walkin' | string
  visitorType: string
  visitorName: string
  visitorPhone: string | null
  photo: string | null
  numberOfPeople: number | null
  vehicleNumber: string | null
  company: string | null
  personToMeet: string | null
  notes: string | null
  status: string
  unitNumber: string | null
  requestedAt: string
  /** Who raised it: the resident behind a pre-approval, or the guard who raised a walk-in. */
  raisedBy: {
    type: 'STAFF' | 'RESIDENT' | 'FAMILY_MEMBER'
    typeLabel: string
    name: string | null
    residentName: string | null
    byMe: boolean
  } | null
  /** Who approved (or rejected) the entry; null when it was never recorded. */
  approval: {
    type: 'STAFF' | 'RESIDENT' | 'FAMILY_MEMBER'
    typeLabel: string
    name: string | null
    at: string | null
    byMe: boolean
  } | null
  checkIn: GatePersonAction | null
  checkOut: GatePersonAction | null
  minutesInside: number | null
  /** This employee's part: raised | approved | rejected | checked_in | checked_out. */
  myRoles: string[]
}

export interface FnbActivityRecord {
  id: string
  orderId: string
  deliveryStatus: 'assigned' | 'delivering' | 'delivered' | 'failed'
  deliveryDate: string | null
  deliveredAt: string | null
  deliveryCharge: number
  mealSlot: string | null
  orderType: string | null
  quantity: number | null
  residentName: string | null
  unitNumber: string | null
  createdAt: string
}

export interface MedicalActivityRecord {
  id: string
  type: 'care-task' | 'appointment'
  title: string
  status: string
  residentName: string | null
  unitNumber: string | null
  at: string
  appointmentDate?: string
  slotTimeRange?: string
  notes: string | null
}

export type EmployeeActivityRecord =
  TicketActivityRecord | GateActivityRecord | FnbActivityRecord | MedicalActivityRecord

export interface EmployeeActivityRecordsPage {
  kind: EmployeeActivityKind
  rows: EmployeeActivityRecord[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface WorkLogEvent {
  id: string
  at: string
  module: 'ticket' | 'gate' | 'fnb' | 'care' | 'clinical'
  action: string
  title: string
  subtitle: string | null
  /** Short reference shown as a chip, e.g. the ticket number. */
  code?: string | null
  fromStatus?: string | null
  toStatus?: string | null
  note?: string | null
  /** Who performed the action, when it was someone else (e.g. the admin who assigned a ticket). */
  actor?: string | null
  refId: string | null
}

export interface WorkLogPage {
  rows: WorkLogEvent[]
  pagination: { page: number; limit: number; hasMore: boolean }
}

export interface EmployeeActivityParams {
  from: string
  to: string
  locId?: string | null
  page?: number
  limit?: number
  status?: string
}
