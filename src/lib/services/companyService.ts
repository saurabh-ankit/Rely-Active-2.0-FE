import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CompanyData } from '@/lib/types'

export const getCompaniesAPI = async (): Promise<CompanyData[]> => {
  const response = await api.get(API_ENDPOINTS.company.getAll)
  const data = response.data?.data || response.data
  return Array.isArray(data) ? data : data ? [data] : []
}

export const getCompanyByIdAPI = async (id: string): Promise<CompanyData> => {
  const response = await api.get(API_ENDPOINTS.company.getById(id))
  return response.data?.data || response.data
}

export const createCompanyAPI = async (payload: Partial<CompanyData>): Promise<CompanyData> => {
  const response = await api.post(API_ENDPOINTS.company.create, payload)
  return response.data?.data || response.data
}

export const updateCompanyAPI = async (id: string, payload: Partial<CompanyData>): Promise<CompanyData> => {
  const response = await api.put(API_ENDPOINTS.company.update(id), payload)
  return response.data?.data || response.data
}

export const saveCompanyFormDataAPI = async (formData: FormData, id?: string): Promise<CompanyData> => {
  const url = id ? API_ENDPOINTS.company.update(id) : API_ENDPOINTS.company.create
  const response = id
    ? await api.put(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    : await api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  return response.data?.data || response.data
}

export const getCompanySetupStatusAPI = async (): Promise<{ is_setup_complete: boolean }> => {
  const response = await api.get(API_ENDPOINTS.company.getSetupStatus)
  return response.data?.data || response.data
}
