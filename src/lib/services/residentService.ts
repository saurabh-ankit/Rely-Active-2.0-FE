import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  CreateResidentPayload,
  GetResidentsParams,
  LocationMedicineOption,
  MedicationAdministrationItem,
  MedicationAdministrationsParams,
  ResidentAllergyItem,
  ResidentAllergyPayload,
  ResidentClinicalData,
  ResidentClinicalMutationResponse,
  ResidentCurrentCondition,
  ResidentDocumentItem,
  ResidentItem,
  ResidentLabReportItem,
  ResidentMedicationItem,
  ResidentMedicationPayload,
  ResidentMedicinesParams,
  ResidentGuardian,
  ResidentGuardiansData,
  ResidentTimelineParams,
  ResidentVitalItem,
  ResidentVitalPayload,
  ResidentTimelineResponse,
  UnitResidentsPayload,
  UpdateResidentConditionPayload,
} from '@/lib/types/resident'

// ── Care Team types (local, shared between service + hooks) ───────────────────
export type CareTeamRole = 'DOCTOR' | 'NURSE'

export interface CareTeamMember {
  id: string
  residentId: string
  userId: string
  role: CareTeamRole
  locId: string
  note?: string | null
  isActive: boolean
  user?: {
    id: string
    username?: string | null
    profile?: {
      firstName?: string
      lastName?: string
      photoUrl?: string | null
      employeeCode?: string
    }
    userLocations?: Array<{
      role?: { code?: string; name?: string }
    }>
  }
}

export interface AssignCareTeamPayload {
  userId: string
  role: CareTeamRole
  locId: string
  note?: string | null
}

export const createResidentAPI = async (payload: CreateResidentPayload): Promise<ResidentItem> => {
  const response = await api.post(API_ENDPOINTS.resident.create, payload)
  return response.data?.data || response.data
}

export const getResidentsAPI = async (params?: GetResidentsParams): Promise<ResidentItem[]> => {
  const queryParams: Record<string, string> = {}
  if (params?.locId) queryParams.locId = params.locId
  if (params?.unitId) queryParams.unitId = params.unitId
  if (params?.residentType && params.residentType !== 'ALL') queryParams.residentType = params.residentType
  if (params?.isResiding !== undefined && params.isResiding !== 'ALL')
    queryParams.isResiding = String(params.isResiding)
  if (params?.search && params.search.trim()) queryParams.search = params.search.trim()

  const response = await api.get(API_ENDPOINTS.resident.getAll, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  })
  return response.data?.data || response.data
}

export const getResidentsByUnitAPI = async (unitId: string): Promise<UnitResidentsPayload> => {
  const response = await api.get(API_ENDPOINTS.resident.getByUnit(unitId))
  return response.data?.data || response.data
}

export const getResidentByIdAPI = async (id: string): Promise<ResidentItem> => {
  const response = await api.get(API_ENDPOINTS.resident.getById(id))
  return response.data?.data || response.data
}

export const updateResidentAPI = async (id: string, payload: Partial<CreateResidentPayload>): Promise<ResidentItem> => {
  const response = await api.put(API_ENDPOINTS.resident.update(id), payload)
  return response.data?.data || response.data
}

export const deleteResidentAPI = async (id: string): Promise<void> => {
  const response = await api.delete(API_ENDPOINTS.resident.delete(id))
  return response.data?.data || response.data
}

export interface ResidentBillingItem {
  id: string
  name: string
  category: 'Advance' | 'Arrears' | 'Add-on' | 'Refund' | string
  description: string
  quantity: string | number
  price: number
  total: number
  monthlyPrice?: number
  type: string
  isEditable?: boolean
  date?: string
  formattedDate?: string
  nurseName?: string | null
}

export interface ResidentBillingData {
  resident: {
    id: string
    firstName: string
    lastName?: string
    fullName: string
    residentType: string
    status: string
    unitNumber: string
    unitId?: string
    propertyName?: string
    moveInDate?: string
    package?: {
      id: string
      name: string
      price: number
    } | null
  }
  billingMode: string
  invoice: {
    admissionDate?: string | null
    startDate: string
    endDate: string
    roomStartDate: string
    roomEndDate: string
    servicesStartDate: string
    servicesEndDate: string
    billableDays: number
    daysInMonth: number
    isProrated: boolean
    services: ResidentBillingItem[]
    grossTotal?: number
    refundTotal?: number
    subtotal: number
    total: number
    currency: string
  }
}

export const getResidentBillingAPI = async (
  residentId: string,
  params?: { month?: number; year?: number },
): Promise<ResidentBillingData> => {
  const response = await api.get(API_ENDPOINTS.resident.billing(residentId), { params })
  return response.data?.data || response.data
}

// ── Care Team API functions ───────────────────────────────────────────────────

export const getCareTeamAPI = async (residentId: string): Promise<CareTeamMember[]> => {
  const response = await api.get(API_ENDPOINTS.resident.careTeam(residentId))
  return response.data?.data || response.data
}

export const assignCareTeamMemberAPI = async (
  residentId: string,
  payload: AssignCareTeamPayload,
): Promise<CareTeamMember> => {
  const response = await api.post(API_ENDPOINTS.resident.careTeam(residentId), payload)
  return response.data?.data || response.data
}

export const removeCareTeamMemberAPI = async (residentId: string, memberId: string): Promise<void> => {
  await api.delete(API_ENDPOINTS.resident.removeCareTeamMember(residentId, memberId))
}

// ── Clinical chart API functions ──────────────────────────────────────────────

export const getResidentClinicalAPI = async (residentId: string): Promise<ResidentClinicalData> => {
  const response = await api.get(API_ENDPOINTS.resident.clinical(residentId))
  return response.data?.data || response.data
}

export const updateResidentConditionAPI = async (
  residentId: string,
  payload: UpdateResidentConditionPayload,
): Promise<{ success: boolean; message?: string; data: ResidentCurrentCondition | null }> => {
  const response = await api.post(API_ENDPOINTS.resident.condition(residentId), payload)
  return response.data
}

export const getResidentLabReportsAPI = async (residentId: string): Promise<ResidentLabReportItem[]> => {
  const response = await api.get(API_ENDPOINTS.resident.labReports(residentId))
  return response.data?.data || response.data
}

export const createResidentLabReportAPI = async (
  residentId: string,
  data: FormData,
): Promise<ResidentClinicalMutationResponse<ResidentLabReportItem>> => {
  const response = await api.post(API_ENDPOINTS.resident.labReports(residentId), data, { timeout: 60_000 })
  return response.data
}

export const updateResidentLabReportAPI = async (
  residentId: string,
  id: string,
  data: FormData,
): Promise<ResidentClinicalMutationResponse<ResidentLabReportItem>> => {
  const response = await api.put(API_ENDPOINTS.resident.labReport(residentId, id), data, { timeout: 60_000 })
  return response.data
}

export const deleteResidentLabReportAPI = async (
  residentId: string,
  id: string,
): Promise<ResidentClinicalMutationResponse> => {
  const response = await api.delete(API_ENDPOINTS.resident.labReport(residentId, id))
  return response.data
}

export const getResidentMedicinesAPI = async (
  residentId: string,
  params: ResidentMedicinesParams = {},
): Promise<LocationMedicineOption[]> => {
  const response = await api.get(API_ENDPOINTS.resident.medicines(residentId), { params })
  return response.data?.data?.medicines || []
}

export const createResidentMedicationAPI = async (
  residentId: string,
  payload: ResidentMedicationPayload,
): Promise<ResidentClinicalMutationResponse<ResidentMedicationItem>> => {
  const response = await api.post(API_ENDPOINTS.resident.medications(residentId), payload)
  return response.data
}

export const updateResidentMedicationAPI = async (
  residentId: string,
  id: string,
  payload: Partial<ResidentMedicationPayload>,
): Promise<ResidentClinicalMutationResponse<ResidentMedicationItem>> => {
  const response = await api.put(API_ENDPOINTS.resident.medication(residentId, id), payload)
  return response.data
}

export const deleteResidentMedicationAPI = async (
  residentId: string,
  id: string,
): Promise<ResidentClinicalMutationResponse> => {
  const response = await api.delete(API_ENDPOINTS.resident.medication(residentId, id))
  return response.data
}

export const createResidentInsulinAPI = async (
  residentId: string,
  payload: ResidentMedicationPayload,
): Promise<ResidentClinicalMutationResponse<ResidentMedicationItem>> => {
  const response = await api.post(API_ENDPOINTS.resident.insulin(residentId), payload)
  return response.data
}

export const updateResidentInsulinAPI = async (
  residentId: string,
  id: string,
  payload: Partial<ResidentMedicationPayload>,
): Promise<ResidentClinicalMutationResponse<ResidentMedicationItem>> => {
  const response = await api.put(API_ENDPOINTS.resident.insulinItem(residentId, id), payload)
  return response.data
}

export const deleteResidentInsulinAPI = async (
  residentId: string,
  id: string,
): Promise<ResidentClinicalMutationResponse> => {
  const response = await api.delete(API_ENDPOINTS.resident.insulinItem(residentId, id))
  return response.data
}

export const getResidentMedicationAdministrationsAPI = async (
  residentId: string,
  params: MedicationAdministrationsParams = {},
): Promise<MedicationAdministrationItem[]> => {
  const response = await api.get(API_ENDPOINTS.resident.medicationAdministrations(residentId), { params })
  return response.data?.data || []
}

export const createResidentVitalAPI = async (
  residentId: string,
  payload: ResidentVitalPayload,
): Promise<ResidentClinicalMutationResponse<ResidentVitalItem>> => {
  const response = await api.post(API_ENDPOINTS.resident.vitals(residentId), payload)
  return response.data
}

export const updateResidentVitalAPI = async (
  residentId: string,
  id: string,
  payload: Partial<ResidentVitalPayload>,
): Promise<ResidentClinicalMutationResponse<ResidentVitalItem>> => {
  const response = await api.put(API_ENDPOINTS.resident.vital(residentId, id), payload)
  return response.data
}

export const deleteResidentVitalAPI = async (
  residentId: string,
  id: string,
): Promise<ResidentClinicalMutationResponse> => {
  const response = await api.delete(API_ENDPOINTS.resident.vital(residentId, id))
  return response.data
}

export const createResidentAllergyAPI = async (
  residentId: string,
  payload: ResidentAllergyPayload,
): Promise<ResidentClinicalMutationResponse<ResidentAllergyItem>> => {
  const response = await api.post(API_ENDPOINTS.resident.allergies(residentId), payload)
  return response.data
}

export const updateResidentAllergyAPI = async (
  residentId: string,
  id: string,
  payload: Partial<ResidentAllergyPayload>,
): Promise<ResidentClinicalMutationResponse<ResidentAllergyItem>> => {
  const response = await api.put(API_ENDPOINTS.resident.allergy(residentId, id), payload)
  return response.data
}

export const deleteResidentAllergyAPI = async (
  residentId: string,
  id: string,
): Promise<ResidentClinicalMutationResponse> => {
  const response = await api.delete(API_ENDPOINTS.resident.allergy(residentId, id))
  return response.data
}

export const getResidentDocumentsAPI = async (residentId: string): Promise<ResidentDocumentItem[]> => {
  const response = await api.get(API_ENDPOINTS.resident.documents(residentId))
  return response.data?.data || response.data
}

export const createResidentDocumentAPI = async (
  residentId: string,
  data: FormData,
): Promise<{ success: boolean; message?: string; data: ResidentDocumentItem }> => {
  const response = await api.post(API_ENDPOINTS.resident.documents(residentId), data, { timeout: 60_000 })
  return response.data
}

type ResidentGuardianMutationResponse = { success: boolean; message?: string; data?: ResidentGuardian }

export const getResidentGuardiansAPI = async (residentId: string): Promise<ResidentGuardiansData> => {
  const response = await api.get(API_ENDPOINTS.resident.guardians(residentId))
  return response.data?.data ?? { guardians: [], careRecipients: [] }
}

export const createResidentGuardianAPI = async (
  residentId: string,
  data: FormData,
): Promise<ResidentGuardianMutationResponse> => {
  const response = await api.post(API_ENDPOINTS.resident.guardians(residentId), data, { timeout: 60_000 })
  return response.data
}

export const updateResidentGuardianAPI = async (
  residentId: string,
  id: string,
  data: FormData,
): Promise<ResidentGuardianMutationResponse> => {
  const response = await api.put(API_ENDPOINTS.resident.guardian(residentId, id), data, { timeout: 60_000 })
  return response.data
}

export const deleteResidentGuardianAPI = async (
  residentId: string,
  id: string,
): Promise<ResidentGuardianMutationResponse> => {
  const response = await api.delete(API_ENDPOINTS.resident.guardian(residentId, id))
  return response.data
}

export const getResidentTimelineAPI = async (
  residentId: string,
  params: ResidentTimelineParams = {},
): Promise<ResidentTimelineResponse> => {
  const response = await api.get(API_ENDPOINTS.resident.timeline(residentId), { params })
  return response.data?.data || response.data
}

export const residentService = {
  createResident: createResidentAPI,
  getResidents: getResidentsAPI,
  getResidentById: getResidentByIdAPI,
  getResidentsByUnit: getResidentsByUnitAPI,
  updateResident: updateResidentAPI,
  deleteResident: deleteResidentAPI,
  getResidentBilling: getResidentBillingAPI,
  getCareTeam: getCareTeamAPI,
  assignCareTeamMember: assignCareTeamMemberAPI,
  removeCareTeamMember: removeCareTeamMemberAPI,
  getResidentClinical: getResidentClinicalAPI,
  updateResidentCondition: updateResidentConditionAPI,
  getResidentLabReports: getResidentLabReportsAPI,
  createResidentLabReport: createResidentLabReportAPI,
  updateResidentLabReport: updateResidentLabReportAPI,
  deleteResidentLabReport: deleteResidentLabReportAPI,
  getResidentMedicines: getResidentMedicinesAPI,
  createResidentMedication: createResidentMedicationAPI,
  updateResidentMedication: updateResidentMedicationAPI,
  deleteResidentMedication: deleteResidentMedicationAPI,
  createResidentInsulin: createResidentInsulinAPI,
  updateResidentInsulin: updateResidentInsulinAPI,
  deleteResidentInsulin: deleteResidentInsulinAPI,
  getResidentMedicationAdministrations: getResidentMedicationAdministrationsAPI,
  createResidentVital: createResidentVitalAPI,
  updateResidentVital: updateResidentVitalAPI,
  deleteResidentVital: deleteResidentVitalAPI,
  createResidentAllergy: createResidentAllergyAPI,
  updateResidentAllergy: updateResidentAllergyAPI,
  deleteResidentAllergy: deleteResidentAllergyAPI,
  getResidentDocuments: getResidentDocumentsAPI,
  createResidentDocument: createResidentDocumentAPI,
  getResidentGuardians: getResidentGuardiansAPI,
  createResidentGuardian: createResidentGuardianAPI,
  updateResidentGuardian: updateResidentGuardianAPI,
  deleteResidentGuardian: deleteResidentGuardianAPI,
  getResidentTimeline: getResidentTimelineAPI,
}

export default residentService
