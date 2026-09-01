import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export interface OnboardDoctorPayload {
  userId?: string
  doctorType: 'IN_HOUSE' | 'VISITING'
  specialization: string
  medicalLicenseNumber: string
  licenseExpiryDate?: string
  consultationFee?: number
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
}

export interface CreateFrequencyPayload {
  frequencyName: string
  frequencyType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'CUSTOM'
  interval?: number
  timeUnit?: 'DAYS' | 'WEEKS' | 'MONTHS'
  allowedDaysOfWeek?: string[]
  description?: string
}

export interface CreateAssignmentPayload {
  rosterName: string
  dutyType?: 'SHIFT' | 'OPD_SESSION' | 'ON_CALL' | 'EMERGENCY' | 'AD_HOC'
  schedulingResourceId: string
  schedulingResourceIds?: string[]
  shiftId?: string
  slotTimeRange?: string
  frequencyId: string
  effectiveFrom: string
  effectiveUntil: string
  selectedWorkingDays?: string[]
  instructions?: string
  holidayPolicy?: 'IGNORE' | 'SKIP' | 'RESCHEDULE' | 'REQUIRE_COVERAGE'
  targets: Array<{
    targetType: string
    targetId: string
  }>
}

export const rosterService = {
  // Doctor Onboarding & Management
  onboardDoctor: async (companyId: string, locationId: string, payload: OnboardDoctorPayload) => {
    const res = await api.post(API_ENDPOINTS.roster.onboardDoctor(companyId, locationId), payload)
    return res.data
  },

  getDoctors: async (companyId: string, locationId: string) => {
    const res = await api.get(API_ENDPOINTS.roster.getDoctors(companyId, locationId))
    return res.data
  },

  // Shift Master Management
  createShift: async (companyId: string, locationId: string, payload: CreateShiftPayload) => {
    const res = await api.post(API_ENDPOINTS.roster.createShift(companyId, locationId), payload)
    return res.data
  },

  updateShift: async (companyId: string, locationId: string, shiftId: string, payload: Partial<CreateShiftPayload>) => {
    const res = await api.put(`${API_ENDPOINTS.roster.getShifts(companyId, locationId)}/${shiftId}`, payload)
    return res.data
  },

  getShifts: async (companyId: string, locationId: string) => {
    const res = await api.get(API_ENDPOINTS.roster.getShifts(companyId, locationId))
    return res.data
  },

  // Frequency Patterns
  createFrequency: async (companyId: string, locationId: string, payload: CreateFrequencyPayload) => {
    const res = await api.post(API_ENDPOINTS.roster.createFrequency(companyId, locationId), payload)
    return res.data
  },

  // Roster Assignments & Pre-Flight Validation
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

  copyAssignment: async (companyId: string, locationId: string, id: string, payload: { targetEffectiveFrom: string; targetEffectiveUntil: string; newRosterName?: string }) => {
    const res = await api.post(API_ENDPOINTS.roster.copyAssignment(companyId, locationId, id), payload)
    return res.data
  },

  getRosterDates: async (companyId: string, locationId: string, params?: Record<string, unknown>) => {
    const res = await api.get(API_ENDPOINTS.roster.getRosterDates(companyId, locationId), { params })
    return res.data
  },

  // Roster Maintenance (Add single date & Delete single date)
  deleteRosterDate: async (companyId: string, locationId: string, dateInstanceId: string) => {
    const res = await api.delete(`${API_ENDPOINTS.roster.getRosterDates(companyId, locationId)}/${dateInstanceId}`)
    return res.data
  },

  addSingleRosterDate: async (companyId: string, locationId: string, payload: any) => {
    const res = await api.post(`${API_ENDPOINTS.roster.getRosterDates(companyId, locationId)}/single`, payload)
    return res.data
  },

  // Replacement Request
  requestReplacement: async (
    companyId: string,
    locationId: string,
    dateInstanceId: string,
    payload: { replacementResourceId: string; reason: string }
  ) => {
    const res = await api.post(API_ENDPOINTS.roster.requestReplacement(companyId, locationId, dateInstanceId), payload)
    return res.data
  },
}
