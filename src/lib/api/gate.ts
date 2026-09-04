import axiosInstance from './axios'
import { API_ENDPOINTS } from './endpoints'

export const getGateStats = async (locationId: string) => {
  const response = await axiosInstance.get(API_ENDPOINTS.gate.stats(locationId))
  return response.data
}

export const getGateEntries = async (
  locationId: string,
  params?: { page?: number; limit?: number; date?: string; status?: string; visitorType?: string },
) => {
  const response = await axiosInstance.get(API_ENDPOINTS.gate.entries(locationId), { params })
  return response.data
}

export const getGatePreapproveds = async (
  locationId: string,
  params?: { page?: number; limit?: number; date?: string; status?: string; visitorType?: string },
) => {
  const response = await axiosInstance.get(API_ENDPOINTS.gate.preapproved(locationId), { params })
  return response.data
}

export const updateGateEntryStatus = async (
  locationId: string,
  entryId: string,
  status: string,
  checkedItems?: string[],
) => {
  const response = await axiosInstance.patch(API_ENDPOINTS.gate.updateEntryStatus(locationId, entryId), {
    status,
    checkedItems,
  })
  return response.data
}

export const addGateEntryItems = async (
  locationId: string,
  entryId: string,
  items: { itemName: string; quantity: number }[],
) => {
  const response = await axiosInstance.post(API_ENDPOINTS.gate.addEntryItems(locationId, entryId), { items })
  return response.data
}
