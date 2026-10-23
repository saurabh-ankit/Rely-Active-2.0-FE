import type { MedicationMealTiming, MedicationRoute } from '@/lib/constants/medication'

export type ResidentType = 'OWNER' | 'TENANT'
export type OwnershipType = 'PRIMARY' | 'CO_OWNER' | 'DEPENDENT'
export type ResidentStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'MOVED_OUT'

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface ResidentFamilyMember {
  id?: string
  residentId?: string
  firstName: string
  lastName?: string | null
  relation: string
  isResiding?: boolean
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
  dob?: string | null
  bloodGroup?: string | null
  photoUrl?: string | null
  phone?: string | null
  username?: string | null
  password?: string
  email?: string | null
  /** The member's own care package ('' / null = none) and its start date (YYYY-MM-DD). */
  carePackageId?: string | null
  carePackageStartDate?: string | null
}

/** One flat a resident lived in, and when (YYYY-MM-DD; `to` null for the current flat). */
export interface ResidentFlatStay {
  unit: {
    id: string
    unit_number: string
    unit_type?: string | null
    floor?: {
      floor_number?: number | null
      floor_name?: string | null
      is_virtual?: boolean
      block?: { block_name?: string | null } | null
    } | null
  } | null
  from: string | null
  to: string | null
  current: boolean
}

export interface ResidentItem {
  id: string
  unitId: string
  locId: string
  companyId?: string | null
  residentType: ResidentType
  ownershipType?: OwnershipType | null
  isResiding: boolean
  firstName: string
  lastName?: string | null
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
  dob?: string | null
  username?: string | null
  email?: string | null
  phone?: string | null
  emergencyContact?: string | null
  bloodGroup?: string | null
  photoUrl?: string | null
  moveInDate?: string | null
  moveOutDate?: string | null
  /** Day they moved into their current flat (the original move-in if they never changed flats). */
  currentFlatMovedIn?: string | null
  /** Flats lived in, oldest first; the last is the current flat. */
  flatHistory?: ResidentFlatStay[]
  rentAmount?: number | null
  payRentToCompany?: boolean
  status: ResidentStatus
  isActive: boolean
  createdAt: string
  property?: {
    id: string
    name?: string
    property_name?: string
    code?: string | null
    city?: string | null
  }
  unit?: {
    id: string
    unit_number: string
    unit_type?: string
    occupancyStatus?: string
    floor?: {
      id: string
      floor_number: number
      floor_name?: string | null
      floor_type?: string | null
      /** Hidden floor of an entity without floors (villas, plots…). */
      is_virtual?: boolean
      block?: {
        id: string
        block_name: string
        is_virtual?: boolean
        entityId?: string | null
        /** Which entity of the property the home is in, e.g. { name: 'Villa', entity_type: 'villa' }. */
        entity?: { id: string; name: string; entity_type: string } | null
      } | null
    }
  }
  familyMembers?: ResidentFamilyMember[]
  carePackageId?: string | null
  packageSubscriptions?: Array<{
    id: string
    /** Set when the subscription is a family member's own care package. */
    familyMemberId?: string | null
    carePackageId: string
    status: string
    startDate: string
    endDate?: string | null
    isPrevious?: boolean
  }>
  carePackage?: {
    id: string
    packageName: string
    description?: string | null
    packageCost: number
    duration: string
  }
}

export interface GetResidentsParams {
  locId?: string
  unitId?: string
  residentType?: string
  isResiding?: boolean | string
  search?: string
}

export interface UnitResidentsPayload {
  allOccupants: ResidentItem[]
  residingOccupant?: ResidentItem | null
  owner?: ResidentItem | null
}

// ── Clinical chart ────────────────────────────────────────────────────────────

export type MedicationTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export interface MedicationTiming {
  timeOfDay: MedicationTimeOfDay
  selected: boolean
  time: string
  dose: number
  route: MedicationRoute
  mealTiming: MedicationMealTiming
}

export interface ResidentMedicationItem {
  id: string
  inventoryItemId: string
  /** Inventory pack type / unit of the linked item, e.g. "sheet" / "piece". */
  packType?: string | null
  packUnit?: string | null
  medicineName: string
  startDate: string
  endDate: string | null
  isUntilDischarge: boolean
  timings: MedicationTiming[]
  note: string | null
  appointmentId: string | null
  createdByName: string | null
  createdAt: string
}

export interface ResidentVitalItem {
  id: string
  vitalSettingId: string
  name: string
  unit: string
  value: string
  note: string | null
  recordedAt: string
  appointmentId: string | null
  createdByName: string | null
  createdAt: string
}

export interface ResidentAllergyItem {
  id: string
  name: string
  note: string | null
  recordedAt: string
  appointmentId: string | null
  createdByName: string | null
  createdAt: string
}

export type LabReportSeverity = 'normal' | 'abnormal' | 'severe'

export interface ResidentLabReportItem {
  id: string
  labTestSettingId: string
  labTestName: string | null
  labTestImageUrl: string | null
  severity: LabReportSeverity
  reportDate: string
  notes: string | null
  cost: number | null
  paymentMethod: string | null
  reportFileUrl: string
  receiptFileUrl: string | null
  isPaid: boolean
  createdByName: string | null
  createdAt: string
}

export interface ResidentDocumentItem {
  id: string
  name: string
  fileUrl: string
  fileName: string | null
  mimeType: string | null
  note: string | null
  createdAt: string
}

/** A non-residing family member who looks after the flat's residents from the resident app. */
export interface ResidentGuardian {
  id: string
  residentId: string
  firstName: string
  lastName: string | null
  fullName: string
  relation: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  phone: string
  email: string | null
  address: string | null
  photoUrl: string | null
  username: string
  lastLoginAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

/** A residing person of the flat a guardian can act for. */
export interface GuardianCareRecipient {
  type: 'RESIDENT' | 'FAMILY_MEMBER'
  id: string
  fullName: string
  relation: string
  age: number | null
  photoUrl: string | null
}

export interface ResidentGuardiansData {
  guardians: ResidentGuardian[]
  careRecipients: GuardianCareRecipient[]
}

export type DoctorNoteFileType = 'IMAGE' | 'PDF' | 'AUDIO'
export type DiagnosisCondition = 'CRITICAL' | 'STABLE' | 'RECOVERING' | 'GOOD'

export interface DoctorNoteFile {
  id: string
  url: string
  key: string
  name: string
  contentType: string
  size: number
  fileType: DoctorNoteFileType
  uploadedAt: string
}

export interface ResidentDoctorNote {
  id: string
  note: string | null
  attachments: DoctorNoteFile[]
  voiceNotes: DoctorNoteFile[]
  condition: DiagnosisCondition | null
  completedAt: string | null
  doctorId: string
  doctorName: string | null
  appointmentId: string
  appointmentDate: string | null
}

export type ResidentConditionSource = 'MANUAL' | 'DOCTOR'

export interface ResidentCurrentCondition {
  condition: DiagnosisCondition
  source: ResidentConditionSource
  note: string | null
  updatedAt: string
  updatedById: string | null
  updatedByName: string | null
}

export interface UpdateResidentConditionPayload {
  condition: DiagnosisCondition
  note?: string | null
}

export interface ResidentMedicationPayload {
  inventoryItemId: string
  startDate: string
  endDate: string | null
  isUntilDischarge: boolean
  timings: MedicationTiming[]
  note: string | null
}

export type MedicationAdministrationKind = 'MEDICATION' | 'INSULIN'

export type MedicationStockStatus = 'DEDUCTED' | 'INSUFFICIENT' | 'NOT_APPLICABLE'

export type MedicationAdministrationStatus = 'COMPLETED' | 'CANCELLED'

/** A medication / insulin dose a nurse marked as given or cancelled. */
export interface MedicationAdministrationItem {
  id: string
  kind: MedicationAdministrationKind
  medicationId: string
  residentId: string
  medicineName: string
  timeOfDay: MedicationTimeOfDay
  scheduledDate: string
  scheduledTime: string
  dose: number
  route: MedicationRoute
  mealTiming: MedicationMealTiming
  status: MedicationAdministrationStatus
  completedAt: string | null
  completedBy: string | null
  nurseName: string | null
  notes: string | null
  attachments: DoctorNoteFile[]
  voiceNotes: DoctorNoteFile[]
  cancelledAt: string | null
  cancelledByName: string | null
  cancelReason: string | null
  cancelAttachments: DoctorNoteFile[]
  cancelVoiceNotes: DoctorNoteFile[]
  stockStatus: MedicationStockStatus
  deductedQuantity: number
  packUnit: string | null
  isWholePack: boolean
}

export interface MedicationAdministrationsParams {
  date?: string
  kind?: MedicationAdministrationKind
  medicationId?: string
  limit?: number
}

export interface ResidentVitalPayload {
  vitalSettingId: string
  value: string
  note: string | null
  recordedAt: string
}

export interface ResidentAllergyPayload {
  name: string
  note: string | null
  recordedAt: string
}

export type FluidBalanceCategory = 'INTAKE' | 'OUTPUT' | 'BOWEL'
export type FluidIntakeType = 'oral_ng' | 'nasal_feed' | 'iv_fluids'
export type FluidOutputType = 'urine' | 'vomit_drain'
export type FluidUnit = 'ml' | 'l'
export type IvFluidType = 'ns' | 'ns_with_injection' | 'dns' | 'rl' | 'd5' | 'd25'
export type StoolType = 'hard' | 'normal' | 'loose'
export type BowelComfortLevel = 'easy' | 'strained' | 'painful'

export interface FluidIntakePayload {
  type: FluidIntakeType
  ivFluidType?: IvFluidType | null
  description?: string | null
  quantity: number
  unit: FluidUnit
}

export interface FluidOutputPayload {
  type: FluidOutputType
  quantity: number
  unit: FluidUnit
  collectedBy?: string | null
}

export interface ResidentFluidBalancePayload {
  recordedAt?: string | null
  intakes: FluidIntakePayload[]
  outputs: FluidOutputPayload[]
  bowel: {
    stoolType: StoolType
    comfortLevel: BowelComfortLevel
    note: string | null
  } | null
}

export interface ResidentFluidBalanceUpdatePayload {
  recordedAt?: string | null
  type?: string | null
  ivFluidType?: IvFluidType | null
  description?: string | null
  quantity?: number
  unit?: FluidUnit
  collectedBy?: string | null
  stoolType?: StoolType | null
  comfortLevel?: BowelComfortLevel | null
  note?: string | null
}

export interface ResidentFluidBalanceItem {
  id: string
  batchId: string
  category: FluidBalanceCategory
  fluidType: string | null
  ivFluidType: IvFluidType | null
  description: string | null
  collectedBy: string | null
  quantity: number | null
  unit: FluidUnit | null
  quantityMl: number | null
  stoolType: StoolType | null
  comfortLevel: BowelComfortLevel | null
  note: string | null
  recordedAt: string
  createdByName: string | null
  recordedByName?: string | null
  createdAt: string | null
}

export interface ResidentFluidBalanceHistory {
  date: string
  entries: ResidentFluidBalanceItem[]
}

export interface ResidentFluidBalanceSummary {
  intakeMl: number
  outputMl: number
  netMl: number
  bowelCount: number
  lastRecordedAt: string | null
  windowStart: string
  windowEnd: string
}

export type IncidentType = 'fall_injury' | 'skin_wound' | 'behavior' | 'env_temp' | 'bathroom' | 'refusal' | 'other'

export type IncidentSeverity = 'low' | 'moderate' | 'high' | 'critical'

export interface IncidentFile {
  id: string
  url: string
  name: string
  contentType?: string
}

export interface IncidentSopSummary {
  total: number
  completed: number
  mandatoryTotal: number
  mandatoryCompleted: number
  isComplete: boolean
}

export interface IncidentSopStep {
  id: string
  stepKey: string
  title: string
  isMandatory: boolean
  sortOrder: number
  isCompleted: boolean
  completedAt: string | null
  completedByName: string | null
  note: string | null
}

export interface IncidentSop {
  incident: {
    id: string
    incidentType: IncidentType
    severity: IncidentSeverity
    incidentAt: string
  }
  steps: IncidentSopStep[]
  summary: IncidentSopSummary
}

export interface UpdateIncidentSopStepPayload {
  isCompleted?: boolean
  note?: string | null
}

export interface ResidentIncidentItem {
  id: string
  incidentType: IncidentType
  severity: IncidentSeverity
  incidentAt: string
  notes: string | null
  photos: IncidentFile[]
  voiceNotes: IncidentFile[]
  reportedByName: string | null
  createdAt: string | null
  sop: IncidentSopSummary | null
}

export interface ResidentIncidentFormValues {
  incidentType: IncidentType
  severity: IncidentSeverity
  incidentAt: string
  notes: string
  photos: File[]
  voiceNote: File | null
}

export interface LocationMedicineOption {
  id: string
  name: string
  packType: string | null
  packQuantity: number | null
  packUnit: string | null
  quantity: number
  stockDisplay: string
}

export interface ResidentMedicinesParams {
  search?: string
  packType?: string
  excludePackType?: string
}

export type ResidentClinicalMutationResponse<T = unknown> = { success: boolean; message?: string; data?: T }

export interface ResidentClinicalData {
  allergies: ResidentAllergyItem[]
  vitals: ResidentVitalItem[]
  medications: ResidentMedicationItem[]
  insulin: ResidentMedicationItem[]
  fluidBalances: ResidentFluidBalanceItem[]
  incidents: ResidentIncidentItem[]
  doctorNotes: ResidentDoctorNote[]
  currentCondition: ResidentCurrentCondition | null
}

export type ResidentTimelineEventType =
  | 'allergy'
  | 'vital'
  | 'medication'
  | 'insulin'
  | 'lab'
  | 'appointment'
  | 'care_task'
  | 'condition'
  | 'incident'
  | 'fluid_balance'

export interface ResidentTimelineEvent {
  id: string
  type: ResidentTimelineEventType
  title: string
  description: string
  at: string
  createdAt: string
  createdBy: { id: string; name: string } | null
  fileUrl?: string | null
  meta: Record<string, unknown>
}

export interface ResidentTimelinePagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ResidentTimelineParams {
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  type?: ResidentTimelineEventType
  /** Comma-separated `ResidentTimelineEventType` values. */
  types?: string
}

export interface ResidentTimelineResponse {
  events: ResidentTimelineEvent[]
  pagination: ResidentTimelinePagination
}

export interface CreateResidentPayload {
  unitId: string
  locId: string
  companyId?: string
  residentType: ResidentType
  ownershipType?: OwnershipType
  isResiding?: boolean
  firstName: string
  lastName?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | ''
  dob?: string
  username?: string
  password?: string
  email?: string
  phone?: string
  emergencyContact?: string
  bloodGroup?: string
  photoUrl?: string
  moveInDate?: string
  rentAmount?: number | null
  payRentToCompany?: boolean
  carePackageId?: string | null
  /** First day of the care package (YYYY-MM-DD); used when the package is new or changed. */
  carePackageStartDate?: string | null
  familyMembers?: ResidentFamilyMember[]
  taskSchedules?: Array<{
    taskId: string
    taskName?: string
    frequency?: number
    times?: string[]
  }>
  /** Edit only, when the flat changes: what to do with the old flat's assets and gate passes. */
  unitChange?: UnitChangeChoices
}

/** Choices in the "Moving from … to …" panel. Left out = default (passes move, assets stay). */
export interface UnitChangeChoices {
  assetAssignmentIds?: string[]
  preapprovalIds?: string[]
}

/** An unbilled charge the resident takes to the new flat. */
export interface UnitChangeChargeLine {
  id: string
  serviceType: string
  name: string
  description: string
  total: number
  date: string
  consumerName: string | null
  fromUnitNumber: string | null
}

export interface UnitChangeTicket {
  id: string
  ticketNumber: string
  title: string
  status: string
  unitId: string | null
}

export interface UnitChangeAsset {
  assignmentId: string
  assetId: string
  name: string
  assetTag: string | null
  assignedAt: string
}

/** What moving a resident to another flat affects (GET /residents/:id/unit-change-impact). */
export interface UnitChangeImpact {
  resident: { id: string; name: string }
  fromUnit: { id: string; unitNumber: string } | null
  toUnit: { id: string; unitNumber: string } | null
  moveDate: string
  canMove: boolean
  /** Why the flat can't change yet (flat taken, open tickets, orders not delivered). Empty = can move. */
  blockers: string[]
  unbilled: { lines: UnitChangeChargeLine[]; total: number }
  openInvoices: {
    id: string
    invoiceNumber: string
    startDate: string
    endDate: string
    status: string
    balance: number
  }[]
  foodOrders: {
    id: string
    date: string
    mealSlot: string | null
    status: string
    totalAmount: number
    consumerName: string
    items: string
  }[]
  eventRegistrations: {
    id: string
    title: string
    startDate: string | null
    status: string
    seatCount: number
    entryFee: number
    consumerName: string
  }[]
  eventRequests: { id: string; requestNumber: string | null; title: string; startDate: string; status: string }[]
  amenityBookings: { id: string; amenity: string; date: string; startMinutes: number }[]
  tickets: { raisedByResident: UnitChangeTicket[]; flatOnly: UnitChangeTicket[] }
  assets: { flat: UnitChangeAsset[]; resident: UnitChangeAsset[] }
  gatePasses: {
    id: string
    visitorName: string
    visitorType: string
    scheduleType: string | null
    startDate: string | null
    endDate: string | null
    status: string
  }[]
  coResidents: { id: string; name: string; residentType: string }[]
}
