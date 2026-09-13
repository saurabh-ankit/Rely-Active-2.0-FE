import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  BillingAccount,
  BillingEvent,
  BillingEventSourceModule,
  BillingLedgerStatement,
  BillingRun,
  BillingSubscription,
  Invoice,
  UnitBillingSummary,
  UnitBilling360,
} from '@/lib/types/billing'

export interface BillingPaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BillingAccountsResponse {
  success: boolean
  data: BillingAccount[]
  meta?: BillingPaginationMeta
}

export interface InvoicesResponse {
  success: boolean
  data: Invoice[]
  meta?: BillingPaginationMeta
}

export interface BillingRunsResponse {
  success: boolean
  data: BillingRun[]
  meta?: BillingPaginationMeta
}

export interface TaxSettings {
  gstEnabled: boolean
  defaultGstRate: number
  cgstRate: number
  sgstRate: number
  companyGstNumber: string
}

export interface InvoicePreviewPayload {
  billingAccountId: string
  periodStart: string
  periodEnd: string
  issueDate?: string
  dueDate?: string
  isPreview?: boolean
  billingMode?: 'MONTHLY' | 'SUPPLEMENTARY' | 'FINAL_DISCHARGE'
  includeSubscriptions?: boolean
  includePendingEvents?: boolean
  discountType?: 'FIXED' | 'PERCENTAGE'
  discountValue?: number
  discountNote?: string
}

export interface GenerateInvoicePayload {
  billingAccountId: string
  periodStart: string
  periodEnd: string
  issueDate?: string
  dueDate?: string
  includePendingEvents?: boolean
  billingMode?: 'MONTHLY' | 'SUPPLEMENTARY' | 'FINAL_DISCHARGE'
  includeSubscriptions?: boolean
  discountType?: 'FIXED' | 'PERCENTAGE'
  discountValue?: number
  discountNote?: string
}

export interface BatchRunPayload {
  propertyId: string
  billingPeriodStart: string
  billingPeriodEnd: string
  runType?: 'SCHEDULED' | 'MANUAL' | 'PREVIEW'
}

// ── 1. BILLING ACCOUNTS ──────────────────────────────────────────────────────
export const getBillingAccountsAPI = async (params?: {
  propertyId?: string
  unitId?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}): Promise<BillingAccountsResponse> => {
  const response = await api.get<BillingAccountsResponse>(API_ENDPOINTS.billing.accounts, { params })
  return response.data
}

export const getBillingAccountByIdAPI = async (id: string): Promise<{ success: boolean; data: BillingAccount }> => {
  const response = await api.get<{ success: boolean; data: BillingAccount }>(API_ENDPOINTS.billing.accountById(id))
  return response.data
}

export const getAccountLedgerStatementAPI = async (
  accountId: string,
  params?: { startDate?: string; endDate?: string },
): Promise<{ success: boolean; data: BillingLedgerStatement }> => {
  const response = await api.get<{ success: boolean; data: BillingLedgerStatement }>(
    API_ENDPOINTS.billing.accountLedger(accountId),
    { params },
  )
  return response.data
}

export const getAccountSubscriptionsAPI = async (
  accountId: string,
): Promise<{ success: boolean; data: BillingSubscription[] }> => {
  const response = await api.get<{ success: boolean; data: BillingSubscription[] }>(
    API_ENDPOINTS.billing.accountSubscriptions(accountId),
  )
  return response.data
}

export const getAccountPendingEventsAPI = async (
  accountId: string,
): Promise<{ success: boolean; data: BillingEvent[] }> => {
  const response = await api.get<{ success: boolean; data: BillingEvent[] }>(
    API_ENDPOINTS.billing.accountPendingEvents(accountId),
  )
  return response.data
}

// ── 2. INVOICES ─────────────────────────────────────────────────────────────
export const getInvoicesAPI = async (params?: {
  propertyId?: string
  billingAccountId?: string
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

export const previewInvoiceAPI = async (
  payload: InvoicePreviewPayload,
): Promise<{ success: boolean; data: Invoice }> => {
  const response = await api.post<{ success: boolean; data: Invoice }>(API_ENDPOINTS.billing.previewInvoice, {
    ...payload,
    isPreview: true,
  })
  return response.data
}

export const generateInvoiceAPI = async (
  payload: GenerateInvoicePayload,
): Promise<{ success: boolean; data: Invoice }> => {
  const response = await api.post<{ success: boolean; data: Invoice }>(API_ENDPOINTS.billing.generateInvoice, payload)
  return response.data
}

// ── 3. BATCH RUNS ───────────────────────────────────────────────────────────
export const getBillingRunsAPI = async (params?: {
  propertyId?: string
  page?: number
  limit?: number
}): Promise<BillingRunsResponse> => {
  const response = await api.get<BillingRunsResponse>(API_ENDPOINTS.billing.runs, { params })
  return response.data
}

export const triggerBatchRunAPI = async (payload: BatchRunPayload): Promise<{ success: boolean; data: BillingRun }> => {
  const response = await api.post<{ success: boolean; data: BillingRun }>(API_ENDPOINTS.billing.runs, payload)
  return response.data
}

// ── 4. FLAT-CENTRIC DIRECTORY & 360° FOLIO ──────────────────────────────────
export const getUnitsBillingSummaryAPI = async (
  propertyId?: string,
): Promise<{ success: boolean; data: UnitBillingSummary[] }> => {
  const response = await api.get<{ success: boolean; data: UnitBillingSummary[] }>(API_ENDPOINTS.billing.unitsSummary, {
    params: propertyId ? { propertyId } : undefined,
  })
  return response.data
}

export const getUnitBilling360API = async (unitId: string): Promise<{ success: boolean; data: UnitBilling360 }> => {
  const response = await api.get<{ success: boolean; data: UnitBilling360 }>(API_ENDPOINTS.billing.unit360(unitId))
  return response.data
}

// ── 5. GLOBAL GST / TAX SETTINGS ───────────────────────────────────────────
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

// ── 6. BILLING USAGE & MISCELLANEOUS EVENTS ───────────────────────────────
export interface CreateBillingEventPayload {
  billingAccountId?: string
  unitId: string
  residentId?: string
  propertyId?: string
  sourceModule?: BillingEventSourceModule
  sourceType?: string
  chargeType?: string
  description: string
  quantity: number
  unitPrice: number
  amount?: number
  serviceDate: string
}

export const createBillingEventAPI = async (
  payload: CreateBillingEventPayload,
): Promise<{ success: boolean; data: BillingEvent }> => {
  const response = await api.post<{ success: boolean; data: BillingEvent }>(API_ENDPOINTS.billing.events, payload)
  return response.data
}

export const cancelBillingEventAPI = async (
  id: string,
  cancellationReason: string,
): Promise<{ success: boolean; data: BillingEvent }> => {
  const response = await api.post<{ success: boolean; data: BillingEvent }>(API_ENDPOINTS.billing.cancelEvent(id), {
    cancellationReason,
  })
  return response.data
}

export const updateBillingEventAPI = async (
  id: string,
  payload: Partial<CreateBillingEventPayload>,
): Promise<{ success: boolean; data: BillingEvent }> => {
  const response = await api.put<{ success: boolean; data: BillingEvent }>(
    API_ENDPOINTS.billing.updateEvent(id),
    payload,
  )
  return response.data
}

export const uploadBillingEventAttachmentAPI = async (
  id: string,
  file: File,
): Promise<{ success: boolean; data: BillingEvent }> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post<{ success: boolean; data: BillingEvent }>(
    API_ENDPOINTS.billing.eventAttachments(id),
    formData,
  )
  return response.data
}
