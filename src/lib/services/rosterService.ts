import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export interface DoctorEngagementPayload {
  companyId?: string
  locationId?: string
  validFrom: string
  validUntil: string
  serviceCategory: string
  clinicRoomId?: string
  defaultSlotCapacity?: number
}

export interface OnboardDoctorPayload {
  userId?: string
  doctorType: 'IN_HOUSE' | 'VISITING'
  specialization: string
  medicalLicenseNumber: string
  licenseExpiryDate?: string
  consultationFee?: number
  maxPatientsPerSlot?: number
  defaultSlotDurationMinutes?: number
  engagement?: DoctorEngagementPayload
}

export interface CreateShiftPayload {
  shiftName: string
  code: string
  description?: string
  startTime: string
  endTime: string
  breakStartTime?: string
  breakEndTime?: string
  slotGenerationMode?: 'AUTO_GENERATE' | 'MANUAL'
  slotDurationMinutes?: number
  numberOfSlots?: number
  departmentId?: string
  shiftCategory?: 'GENERAL' | 'DEPARTMENT' | 'OPD'
}

export interface CreateFrequencyPayload {
  frequencyName: string
  frequencyType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'CUSTOM'
  interval?: number
  timeUnit?: 'DAYS' | 'WEEKS' | 'MONTHS'
  allowedDaysOfWeek?: string[]
  description?: string
}

export interface ValidationResult {
  valid: boolean
  requiresOverride: boolean
  errors: string[]
  warnings: string[]
}

export interface SchedulingResourceItem {
  id: string
  resourceType: 'EMPLOYEE' | 'DOCTOR'
  departmentId?: string
  userId?: string
  status?: string
  name?: string
  email?: string
}

export interface CreateAssignmentPayload {
  rosterName: string
  dutyType?: 'SHIFT' | 'OPD_SESSION'
  schedulingResourceId: string
  schedulingResourceIds?: string[]
  shiftId?: string
  slotTimeRange?: string
  frequencyId?: string
  effectiveFrom: string
  effectiveUntil: string
  selectedWorkingDays?: string[]
  instructions?: string
  holidayPolicy?: 'IGNORE' | 'SKIP' | 'RESCHEDULE' | 'REQUIRE_COVERAGE'
  enableOpdSlots?: boolean
  slotDurationMinutes?: number
  slotBufferMinutes?: number
  overrideReason?: string
  targets: Array<{
    targetType: string
    targetId: string
  }>
}

export const rosterService = {
  onboardDoctor: async (companyId: string, locationId: string, payload: OnboardDoctorPayload) => {
    const res = await api.post(API_ENDPOINTS.roster.onboardDoctor(companyId, locationId), payload)
    return res.data
  },

  getDoctors: async (companyId: string, locationId: string) => {
    const res = await api.get(API_ENDPOINTS.roster.getDoctors(companyId, locationId))
    return res.data
  },

  addDoctorLocation: async (
    doctorProfileId: string,
    payload: { locationId: string; validFrom?: string; validUntil?: string },
  ) => {
    const res = await api.post(API_ENDPOINTS.roster.addDoctorLocation(doctorProfileId), payload)
    return res.data
  },

  addDoctorEngagement: async (
    doctorProfileId: string,
    payload: DoctorEngagementPayload & { companyId?: string; locationId?: string },
  ) => {
    const res = await api.post(API_ENDPOINTS.roster.addDoctorEngagement(doctorProfileId), payload)
    return res.data
  },

  getAssignments: async (companyId: string, locationId: string) => {
    const res = await api.get(API_ENDPOINTS.roster.getAssignments(companyId, locationId))
    return res.data
  },

  getFrequencies: async (companyId: string, locationId: string) => {
    const res = await api.get(API_ENDPOINTS.roster.getFrequencies(companyId, locationId))
    return res.data
  },

  getSchedulingResources: async (
    companyId: string,
    locationId: string,
    params?: { departmentId?: string; resourceType?: 'EMPLOYEE' | 'DOCTOR' },
  ) => {
    const res = await api.get(API_ENDPOINTS.roster.getSchedulingResources(companyId, locationId), { params })
    return res.data
  },

  syncSchedulingResources: async (companyId: string, locationId: string) => {
    const res = await api.post(API_ENDPOINTS.roster.syncSchedulingResources(companyId, locationId))
    return res.data
  },

  createShift: async (companyId: string, locationId: string, payload: CreateShiftPayload) => {
    const res = await api.post(API_ENDPOINTS.roster.createShift(companyId, locationId), payload)
    return res.data
  },

  updateShift: async (companyId: string, locationId: string, shiftId: string, payload: Partial<CreateShiftPayload>) => {
    const res = await api.put(API_ENDPOINTS.roster.updateShift(companyId, locationId, shiftId), payload)
    return res.data
  },

  getShifts: async (
    companyId: string,
    locationId: string,
    params?: { departmentId?: string; shiftCategory?: string },
  ) => {
    const res = await api.get(API_ENDPOINTS.roster.getShifts(companyId, locationId), { params })
    return res.data
  },

  createFrequency: async (companyId: string, locationId: string, payload: CreateFrequencyPayload) => {
    const res = await api.post(API_ENDPOINTS.roster.createFrequency(companyId, locationId), payload)
    return res.data
  },

  validateAssignment: async (companyId: string, locationId: string, payload: Partial<CreateAssignmentPayload>) => {
    const res = await api.post(API_ENDPOINTS.roster.validateAssignment(companyId, locationId), payload)
    return res.data
  },

  createAssignment: async (companyId: string, locationId: string, payload: CreateAssignmentPayload) => {
    const res = await api.post(API_ENDPOINTS.roster.createAssignment(companyId, locationId), payload)
    return res.data
  },

  publishAssignment: async (companyId: string, locationId: string, id: string, overrideReason?: string) => {
    const res = await api.post(API_ENDPOINTS.roster.publishAssignment(companyId, locationId, id), { overrideReason })
    return res.data
  },

  copyAssignment: async (
    companyId: string,
    locationId: string,
    id: string,
    payload: { targetEffectiveFrom: string; targetEffectiveUntil: string; newRosterName?: string },
  ) => {
    const res = await api.post(API_ENDPOINTS.roster.copyAssignment(companyId, locationId, id), payload)
    return res.data
  },

  getRosterDates: async (companyId: string, locationId: string, params?: Record<string, unknown>) => {
    const res = await api.get(API_ENDPOINTS.roster.getRosterDates(companyId, locationId), { params })
    return res.data
  },

  getOpdSlots: async (companyId: string, locationId: string, dateId: string) => {
    const res = await api.get(API_ENDPOINTS.roster.getOpdSlots(companyId, locationId, dateId))
    return res.data
  },

  bookOpdSlot: async (
    companyId: string,
    locationId: string,
    slotId: string,
    payload: { residentId: string; notes?: string },
  ) => {
    const res = await api.post(API_ENDPOINTS.roster.bookOpdSlot(companyId, locationId, slotId), payload)
    return res.data
  },

  cancelOpdBooking: async (
    companyId: string,
    locationId: string,
    bookingId: string,
    payload: { cancelledReason: string },
  ) => {
    const res = await api.delete(API_ENDPOINTS.roster.cancelOpdBooking(companyId, locationId, bookingId), {
      data: payload,
    })
    return res.data
  },

  deleteRosterDate: async (
    companyId: string,
    locationId: string,
    dateInstanceId: string,
    payload?: { cancellationReason: string },
  ) => {
    const res = await api.delete(`${API_ENDPOINTS.roster.getRosterDates(companyId, locationId)}/${dateInstanceId}`, {
      data: payload,
    })
    return res.data
  },

  createSingleDayAssignment: async (
    companyId: string,
    locationId: string,
    payload: Omit<CreateAssignmentPayload, 'effectiveFrom' | 'effectiveUntil' | 'selectedWorkingDays'> & {
      date: string
    },
  ) => {
    const dayCodes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
    const dayOfWeek = dayCodes[new Date(payload.date).getDay()]
    const { date, ...rest } = payload
    return rosterService.createAssignment(companyId, locationId, {
      ...rest,
      effectiveFrom: date,
      effectiveUntil: date,
      selectedWorkingDays: [dayOfWeek],
    })
  },

  requestReplacement: async (
    companyId: string,
    locationId: string,
    dateInstanceId: string,
    payload: { replacementResourceId: string; reason: string },
  ) => {
    const res = await api.post(API_ENDPOINTS.roster.requestReplacement(companyId, locationId, dateInstanceId), payload)
    return res.data
  },

  getSpecializations: async () => {
    const res = await api.get('/roster/specializations')
    return res.data
  },

  createSpecialization: async (payload: { name: string; code?: string; category?: string; description?: string }) => {
    const res = await api.post('/roster/specializations', payload)
    return res.data
  },

  deleteSpecialization: async (id: string) => {
    const res = await api.delete(`/roster/specializations/${id}`)
    return res.data
  },
}
