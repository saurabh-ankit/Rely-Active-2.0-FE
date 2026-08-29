import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateResidentPayload, ResidentItem, ResidentType, UnitResidentsPayload } from '@/lib/types/resident'

export const createResidentAPI = async (payload: CreateResidentPayload): Promise<ResidentItem> => {
  const response = await api.post(API_ENDPOINTS.resident.create, payload)
  return response.data?.data || response.data
}

export const getResidentsAPI = async (params?: {
  locId?: string
  unitId?: string
  residentType?: ResidentType
  isResiding?: boolean
}): Promise<ResidentItem[]> => {
  const queryParams: Record<string, string> = {}
  if (params?.locId) queryParams.locId = params.locId
  if (params?.unitId) queryParams.unitId = params.unitId
  if (params?.residentType) queryParams.residentType = params.residentType
  if (params?.isResiding !== undefined) queryParams.isResiding = String(params.isResiding)

  const response = await api.get(API_ENDPOINTS.resident.getAll, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  })
  return response.data?.data || response.data
}

export const getResidentsByUnitAPI = async (unitId: string): Promise<UnitResidentsPayload> => {
  const response = await api.get(API_ENDPOINTS.resident.getByUnit(unitId))
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

export const residentService = {
  createResident: createResidentAPI,
  getResidents: getResidentsAPI,
  getResidentsByUnit: getResidentsByUnitAPI,
  updateResident: updateResidentAPI,
  deleteResident: deleteResidentAPI,
}

export default residentService
