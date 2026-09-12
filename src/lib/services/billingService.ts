import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  BillingAccount,
  BillingEvent,
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

export interface InvoicePreviewPayload {
  billingAccountId: string
  periodStart: string
  periodEnd: string
  issueDate?: string
  dueDate?: string
  isPreview?: boolean
}

export interface GenerateInvoicePayload {
  billingAccountId: string
  periodStart: string
  periodEnd: string
  issueDate?: string
  dueDate?: string
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

export const getBillingAccountByIdAPI = async (
  id: string,
): Promise<{ success: boolean; data: BillingAccount }> => {
  const response = await api.get<{ success: boolean; data: BillingAccount }>(
    API_ENDPOINTS.billing.accountById(id),
  )
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
  const response = await api.post<{ success: boolean; data: Invoice }>(
    API_ENDPOINTS.billing.previewInvoice,
    { ...payload, isPreview: true },
  )
  return response.data
}

export const generateInvoiceAPI = async (
  payload: GenerateInvoicePayload,
): Promise<{ success: boolean; data: Invoice }> => {
  const response = await api.post<{ success: boolean; data: Invoice }>(
    API_ENDPOINTS.billing.generateInvoice,
    payload,
  )
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

export const triggerBatchRunAPI = async (
  payload: BatchRunPayload,
): Promise<{ success: boolean; data: BillingRun }> => {
  const response = await api.post<{ success: boolean; data: BillingRun }>(
    API_ENDPOINTS.billing.runs,
    payload,
  )
  return response.data
}

// ── 4. FLAT-CENTRIC DIRECTORY & 360° FOLIO ──────────────────────────────────
export const getUnitsBillingSummaryAPI = async (
  propertyId?: string,
): Promise<{ success: boolean; data: UnitBillingSummary[] }> => {
  const response = await api.get<{ success: boolean; data: UnitBillingSummary[] }>(
    API_ENDPOINTS.billing.unitsSummary,
    { params: propertyId ? { propertyId } : undefined },
  )
  return response.data
}

export const getUnitBilling360API = async (
  unitId: string,
): Promise<{ success: boolean; data: UnitBilling360 }> => {
  const response = await api.get<{ success: boolean; data: UnitBilling360 }>(
    API_ENDPOINTS.billing.unit360(unitId),
  )
  return response.data
}

