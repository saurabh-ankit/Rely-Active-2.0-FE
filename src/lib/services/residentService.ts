import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  CreateResidentPayload,
  GetResidentsParams,
  ResidentItem,
  UnitResidentsPayload,
} from '@/lib/types/resident'

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

export const residentService = {
  createResident: createResidentAPI,
  getResidents: getResidentsAPI,
  getResidentById: getResidentByIdAPI,
  getResidentsByUnit: getResidentsByUnitAPI,
  updateResident: updateResidentAPI,
  deleteResident: deleteResidentAPI,
  getResidentBilling: getResidentBillingAPI,
}

export default residentService
