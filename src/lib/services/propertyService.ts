import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CreatePropertyPayload, Property } from '@/lib/types'

export const getPropertiesAPI = async (companyId?: string): Promise<Property[]> => {
  const url = companyId ? `${API_ENDPOINTS.property.getAll}?companyId=${companyId}` : API_ENDPOINTS.property.getAll
  const response = await api.get(url)
  return response.data?.data || response.data
}

export const getPropertyByIdAPI = async (id: string): Promise<Property> => {
  const response = await api.get(API_ENDPOINTS.property.getById(id))
  return response.data?.data || response.data
}

export const createPropertyAPI = async (payload: CreatePropertyPayload): Promise<Property> => {
  const response = await api.post(API_ENDPOINTS.property.create, payload)
  return response.data?.data || response.data
}

export const updatePropertyAPI = async (id: string, payload: Partial<CreatePropertyPayload>): Promise<Property> => {
  const response = await api.put(API_ENDPOINTS.property.update(id), payload)
  return response.data?.data || response.data
}

export const deletePropertyAPI = async (id: string): Promise<void> => {
  await api.delete(API_ENDPOINTS.property.delete(id))
}
