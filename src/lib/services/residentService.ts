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

export const residentService = {
  createResident: createResidentAPI,
  getResidents: getResidentsAPI,
  getResidentById: getResidentByIdAPI,
  getResidentsByUnit: getResidentsByUnitAPI,
  updateResident: updateResidentAPI,
  deleteResident: deleteResidentAPI,
}

export default residentService
