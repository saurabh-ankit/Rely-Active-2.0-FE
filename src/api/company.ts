import { API_BASE_URL, type ApiResponse } from './api'

const COMPANY_URL = `${API_BASE_URL}/company`

export interface CompanyData {
  id?: string
  company_name: string
  trade_name?: string | null
  tax_id?: string | null
  gst_number?: string | null
  company_email?: string | null
  company_phone?: string | null
  website?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  country?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_ifsc?: string | null
  accountant_signature?: string | null
  is_setup_complete?: boolean
}

export const companyApi = {
  /** Fetch all company profiles or first active company */
  getAll: async (): Promise<CompanyData[]> => {
    const res = await fetch(COMPANY_URL)
    const json: ApiResponse<CompanyData[] | CompanyData> = await res.json()
    if (!json.success) throw new Error(json.message || 'Failed to fetch company')
    return Array.isArray(json.data) ? json.data : json.data ? [json.data] : []
  },

  /** Fetch company by ID */
  getById: async (id: string): Promise<CompanyData> => {
    const res = await fetch(`${COMPANY_URL}/${id}`)
    const json: ApiResponse<CompanyData> = await res.json()
    if (!json.success) throw new Error(json.message || 'Failed to fetch company details')
    return json.data
  },

  /** Create company profile */
  create: async (payload: Partial<CompanyData>): Promise<CompanyData> => {
    const res = await fetch(COMPANY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json: ApiResponse<CompanyData> = await res.json()
    if (!json.success) throw new Error(json.message || 'Failed to create company')
    return json.data
  },

  /** Update company profile */
  update: async (id: string, payload: Partial<CompanyData>): Promise<CompanyData> => {
    const res = await fetch(`${COMPANY_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json: ApiResponse<CompanyData> = await res.json()
    if (!json.success) throw new Error(json.message || 'Failed to update company')
    return json.data
  },

  /** Save company profile using FormData (supports file uploads) */
  saveFormData: async (formData: FormData, id?: string): Promise<CompanyData> => {
    const url = id ? `${COMPANY_URL}/${id}` : COMPANY_URL
    const method = id ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      body: formData,
    })
    const json: ApiResponse<CompanyData> = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save company')
    return json.data
  },

  /** Check company setup status */
  getSetupStatus: async (): Promise<{ is_setup_complete: boolean }> => {
    const res = await fetch(`${COMPANY_URL}/company-setup/status`)
    const json: ApiResponse<{ is_setup_complete: boolean }> = await res.json()
    if (!json.success) throw new Error(json.message || 'Failed to fetch setup status')
    return json.data
  },
}
