import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  GateStats,
  GateEntry,
  GatePreapproved,
  GateQueryParams,
  GatePaginatedData,
  GateApiResponse,
  GateItemInput,
} from '@/lib/types/gate'

export const getGateStats = async (locationId: string): Promise<GateApiResponse<GateStats>> => {
  const response = await api.get(API_ENDPOINTS.gate.stats(locationId))
  return response.data
}

export const getGateEntries = async (
  locationId: string,
  params?: GateQueryParams,
): Promise<GateApiResponse<GatePaginatedData<GateEntry>>> => {
  const response = await api.get(API_ENDPOINTS.gate.entries(locationId), { params })
  return response.data
}

export const getGatePreapproveds = async (
  locationId: string,
  params?: GateQueryParams,
): Promise<GateApiResponse<GatePaginatedData<GatePreapproved>>> => {
  const response = await api.get(API_ENDPOINTS.gate.preapproved(locationId), { params })
  return response.data
}

export const updateGateEntryStatus = async (
  locationId: string,
  entryId: string,
  status: string,
  checkedItems?: string[],
): Promise<GateApiResponse<GateEntry>> => {
  const response = await api.patch(API_ENDPOINTS.gate.updateEntryStatus(locationId, entryId), {
    status,
    checkedItems,
  })
  return response.data
}

export const addGateEntryItems = async (
  locationId: string,
  entryId: string,
  items: GateItemInput[],
): Promise<GateApiResponse<unknown>> => {
  const response = await api.post(API_ENDPOINTS.gate.addEntryItems(locationId, entryId), { items })
  return response.data
}

export const gateService = {
  getStats: getGateStats,
  getEntries: getGateEntries,
  getPreapproveds: getGatePreapproveds,
  updateEntryStatus: updateGateEntryStatus,
  addEntryItems: addGateEntryItems,
}
