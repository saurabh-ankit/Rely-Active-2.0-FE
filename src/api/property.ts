import type { CreatePropertyPayload, Property } from '@/pages/Property/types'
import { API_BASE_URL, type ApiResponse } from './api'

const PROPERTY_URL = `${API_BASE_URL}/property`

export const propertyApi = {
  /** Fetch all properties, optionally filtered by companyId */
  getAll: async (companyId?: string): Promise<Property[]> => {
    const url = companyId ? `${PROPERTY_URL}?companyId=${companyId}` : PROPERTY_URL
    const res = await fetch(url)
    const json: ApiResponse<Property[]> = await res.json()
    if (!json.success) throw new Error(json.message)
    return json.data
  },

  /** Fetch a single property by ID with full hierarchy */
  getById: async (id: string): Promise<Property> => {
    const res = await fetch(`${PROPERTY_URL}/${id}`)
    const json: ApiResponse<Property> = await res.json()
    if (!json.success) throw new Error(json.message)
    return json.data
  },

  /** Create a new property with optional nested blocks/floors/units */
  create: async (payload: CreatePropertyPayload): Promise<Property> => {
    const res = await fetch(PROPERTY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json: ApiResponse<Property> = await res.json()
    if (!json.success) throw new Error(json.message)
    return json.data
  },

  /** Update property details with optional nested blocks/floors/units */
  update: async (id: string, payload: Partial<CreatePropertyPayload>): Promise<Property> => {
    const res = await fetch(`${PROPERTY_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json: ApiResponse<Property> = await res.json()
    if (!json.success) throw new Error(json.message)
    return json.data
  },

  /** Soft-delete a property */
  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${PROPERTY_URL}/${id}`, { method: 'DELETE' })
    const json: ApiResponse<null> = await res.json()
    if (!json.success) throw new Error(json.message)
  },
}
