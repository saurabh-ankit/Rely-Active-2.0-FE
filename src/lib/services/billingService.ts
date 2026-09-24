import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  CreateInvoicePayload,
  CreatePaymentPayload,
  Invoice,
  UnitMiscellaneousItem,
  Receipt,
  UnitBilling360,
  UnitBillingSummary,
} from '@/lib/types/billing'

export interface BillingPaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface InvoicesResponse {
  success: boolean
  data: Invoice[]
  meta?: BillingPaginationMeta
}

// ── 1. FLAT-CENTRIC DIRECTORY & 360° FOLIO ──────────────────────────────────
export const getUnitsBillingSummaryAPI = async (
  locationId?: string,
): Promise<{ success: boolean; data: UnitBillingSummary[] }> => {
  const response = await api.get<{ success: boolean; data: UnitBillingSummary[] }>(API_ENDPOINTS.billing.unitsSummary, {
    params: locationId ? { locationId } : undefined,
  })
  return response.data
}

export const getUnitBilling360API = async (unitId: string): Promise<{ success: boolean; data: UnitBilling360 }> => {
  const response = await api.get<{ success: boolean; data: UnitBilling360 }>(API_ENDPOINTS.billing.unit360(unitId))
  return response.data
}

export const getUnitServicesAPI = async (
  unitId: string,
  startDate?: string,
  endDate?: string,
): Promise<{
  success: boolean
  data: {
    unitId: string
    startDate: string
    endDate: string
    recurringSubscriptions: Array<{
      id: string
      serviceType: string
      packageName: string
      subscriberName: string
      description: string
      monthlyRate: number
      unitPrice: number
      amount: number
      startDate: string
      endDate?: string | null
      product?: { productName: string; productType: string }
    }>
    pendingConsumptionCharges: Array<{
      id: string
      sourceModule?: string
      serviceType: string
      itemName: string
      description?: string
      quantity: number
      unitPrice: number
      amount: number
      date: string
    }>
    summary: {
      recurringSubscriptionsTotal: number
      pendingConsumptionTotal: number
      estimatedSubtotal: number
    }
  }
}> => {
  const response = await api.get(API_ENDPOINTS.billing.unitServices(unitId), {
    params: { startDate, endDate },
  })
  return response.data
}

// ── 2. INVOICES ─────────────────────────────────────────────────────────────
export const getInvoicesAPI = async (params?: {
  locationId?: string
  residentId?: string
  unitId?: string
  status?: string
  page?: number
  limit?: number
}): Promise<InvoicesResponse> => {
  const response = await api.get<InvoicesResponse>(API_ENDPOINTS.billing.invoices, { params })
  return response.data
}

export const getInvoiceByIdAPI = async (id: string): Promise<{ success: boolean; data: Invoice }> => {
  const response = await api.get<{ success: boolean; data: Invoice }>(API_ENDPOINTS.billing.invoiceById(id))
  return response.data
}

export const generateInvoiceAPI = async (
  payload: CreateInvoicePayload,
): Promise<{ success: boolean; data: Invoice; message?: string }> => {
  const response = await api.post<{ success: boolean; data: Invoice; message?: string }>(
    API_ENDPOINTS.billing.generateInvoice,
    payload,
  )
  return response.data
}

// ── 3. PAYMENTS & RECEIPTS ─────────────────────────────────────────────────
export const recordPaymentAPI = async (
  payload: CreatePaymentPayload,
): Promise<{ success: boolean; data: Receipt; invoice?: Invoice; message?: string }> => {
  const response = await api.post<{ success: boolean; data: Receipt; invoice?: Invoice; message?: string }>(
    API_ENDPOINTS.billing.payments,
    payload,
  )
  return response.data
}

// ── 4. MISCELLANEOUS SERVICES ──────────────────────────────────────────────
export const getMiscellaneousServicesAPI = async (params?: {
  unitId?: string
  residentId?: string
  locationId?: string
}): Promise<{ success: boolean; data: UnitMiscellaneousItem[] }> => {
  const response = await api.get<{ success: boolean; data: UnitMiscellaneousItem[] }>(
    API_ENDPOINTS.billing.miscellaneousServices,
    { params },
  )
  return response.data
}

export const createMiscellaneousServiceAPI = async (payload: {
  residentId?: string
  unitId?: string
  loc_id: string
  employeeId?: string
  itemName: string
  totalQuantity?: number
  unitPrice: number
  price?: number
  unit?: string
  date?: string
  time?: string
  notes?: string
}): Promise<{ success: boolean; data: UnitMiscellaneousItem; message?: string }> => {
  const response = await api.post<{ success: boolean; data: UnitMiscellaneousItem; message?: string }>(
    API_ENDPOINTS.billing.miscellaneousServices,
    payload,
  )
  return response.data
}

// ── 5. TAX & GST SETTINGS ───────────────────────────────────────────────────
export interface TaxSettings {
  gstEnabled: boolean
  defaultGstRate: number
  cgstRate: number
  sgstRate: number
  companyGstNumber?: string
}

export const getTaxSettingsAPI = async (): Promise<{ success: boolean; data: TaxSettings }> => {
  const response = await api.get<{ success: boolean; data: TaxSettings }>(API_ENDPOINTS.billing.taxSettings)
  return response.data
}

export const updateTaxSettingsAPI = async (
  payload: Partial<TaxSettings>,
): Promise<{ success: boolean; data: TaxSettings; message?: string }> => {
  const response = await api.put<{ success: boolean; data: TaxSettings; message?: string }>(
    API_ENDPOINTS.billing.taxSettings,
    payload,
  )
  return response.data
}
