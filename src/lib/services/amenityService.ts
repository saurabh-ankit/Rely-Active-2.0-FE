import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export interface Amenity {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AmenitySlotSettings {
  availableFrom?: string | null
  availableTo?: string | null
  slotDurationMinutes?: number | null
}

export interface PropertyAmenity {
  id: string
  amenityId: string
  name: string
  description: string | null
  slotBookable: boolean
  /** Payable amenities bill `price` per booked slot to the resident's flat. */
  isPayable?: boolean
  price?: number | null
  settings: AmenitySlotSettings | Record<string, unknown> | null
  isActive: boolean
}

export interface PropertyAmenityInput {
  amenityId: string
  slotBookable?: boolean
  isPayable?: boolean
  price?: number | null
  settings?: AmenitySlotSettings | Record<string, unknown> | null
}

export interface AmenityPayload {
  name: string
  description?: string
  isActive?: boolean
}

export const getAmenitiesAPI = async (params?: { search?: string; isActive?: boolean }): Promise<Amenity[]> => {
  const response = await api.get(API_ENDPOINTS.amenities.list, {
    params: {
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.isActive === undefined ? {} : { isActive: params.isActive }),
    },
  })
  const data = response.data?.data || response.data
  return Array.isArray(data) ? data : []
}

export const createAmenityAPI = async (payload: AmenityPayload): Promise<Amenity> => {
  const response = await api.post(API_ENDPOINTS.amenities.create, payload)
  return response.data?.data || response.data
}

export const updateAmenityAPI = async (id: string, payload: Partial<AmenityPayload>): Promise<Amenity> => {
  const response = await api.put(API_ENDPOINTS.amenities.update(id), payload)
  return response.data?.data || response.data
}

export const updateAmenityStatusAPI = async (id: string, isActive: boolean): Promise<Amenity> => {
  const response = await api.patch(API_ENDPOINTS.amenities.updateStatus(id), { isActive })
  return response.data?.data || response.data
}

export const deleteAmenityAPI = async (id: string): Promise<void> => {
  await api.delete(API_ENDPOINTS.amenities.delete(id))
}

export const getPropertyAmenitiesAPI = async (propertyId: string): Promise<PropertyAmenity[]> => {
  const response = await api.get(API_ENDPOINTS.property.amenities(propertyId))
  const data = response.data?.data || response.data
  return Array.isArray(data) ? data : []
}

export const setPropertyAmenitiesAPI = async (
  propertyId: string,
  amenities: PropertyAmenityInput[],
): Promise<PropertyAmenity[]> => {
  const response = await api.put(API_ENDPOINTS.property.amenities(propertyId), { amenities })
  const data = response.data?.data || response.data
  return Array.isArray(data) ? data : []
}
