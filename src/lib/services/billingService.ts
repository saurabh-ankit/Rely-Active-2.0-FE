import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  BillingMode,
  BillingUnitsResponse,
  CreateMiscItemPayload,
  Invoice,
  InvoicePreview,
  MonthBillingStatus,
  BillingPagination,
  PreviewService,
  ReceiptListItem,
  RecordPaymentPayload,
  SaveInvoicePayload,
  TaxSettings,
  UnitMiscItem,
} from '@/lib/types/billing'

export type { TaxSettings } from '@/lib/types/billing'

type Envelope<T> = { success: boolean; message?: string; data: T }

/** Billing access is granted per property, so every call names the property it acts on. */
const withLocation = (locationId: string | null | undefined, params: Record<string, unknown> = {}) => ({
  params: { ...params, ...(locationId ? { locationId } : {}) },
})

export const getBillingUnitsAPI = async (
  locationId: string,
  params: { search?: string; page?: number; limit?: number; month: string; status?: MonthBillingStatus },
) => {
  const res = await api.get<Envelope<BillingUnitsResponse>>(
    API_ENDPOINTS.billing.units,
    withLocation(locationId, params),
  )
  return res.data.data
}

export const getInvoiceDataAPI = async (
  locationId: string | null,
  unitId: string,
  params: { billingMode: BillingMode; startDate?: string; endDate?: string; editingInvoiceId?: string },
) => {
  const res = await api.get<Envelope<{ invoice: InvoicePreview }>>(
    API_ENDPOINTS.billing.invoiceData(unitId),
    withLocation(locationId, params),
  )
  return res.data.data.invoice
}

export const getUnbilledServicesAPI = async (
  locationId: string | null,
  unitId: string,
  params: { startDate: string; endDate: string },
) => {
  const res = await api.get<Envelope<{ services: PreviewService[]; total: number }>>(
    API_ENDPOINTS.billing.unbilledServices(unitId),
    withLocation(locationId, params),
  )
  return res.data.data
}

export const createInvoiceAPI = async (locationId: string | null, unitId: string, payload: SaveInvoicePayload) => {
  const res = await api.post<Envelope<Invoice>>(
    API_ENDPOINTS.billing.createInvoice(unitId),
    payload,
    withLocation(locationId),
  )
  return res.data
}

export const updateInvoiceAPI = async (locationId: string | null, invoiceId: string, payload: SaveInvoicePayload) => {
  const res = await api.patch<Envelope<Invoice>>(
    API_ENDPOINTS.billing.updateInvoice(invoiceId),
    payload,
    withLocation(locationId),
  )
  return res.data
}

export const getUnitInvoicesAPI = async (locationId: string | null, unitId: string, page = 1, limit = 20) => {
  const res = await api.get<
    Envelope<{ invoices: Invoice[]; fromPreviousFlats?: Invoice[]; pagination: BillingPagination }>
  >(API_ENDPOINTS.billing.invoices(unitId), withLocation(locationId, { page, limit }))
  return res.data.data
}

export const getUnitReceiptsAPI = async (locationId: string | null, unitId: string, page = 1, limit = 20) => {
  const res = await api.get<Envelope<{ receipts: ReceiptListItem[]; pagination: BillingPagination }>>(
    API_ENDPOINTS.billing.receipts(unitId),
    withLocation(locationId, { page, limit }),
  )
  return res.data.data
}

export const recordPaymentAPI = async (locationId: string | null, invoiceId: string, payload: RecordPaymentPayload) => {
  const res = await api.post<
    Envelope<{ invoice: Invoice; receiptId: string; receiptNumber: string; receiptPdfUrl: string | null }>
  >(API_ENDPOINTS.billing.recordPayment(invoiceId), payload, withLocation(locationId))
  return res.data
}

/** URL of the invoice PDF, or of a receipt PDF when receiptId is given (generated on first request). */
export const getBillingDocumentAPI = async (locationId: string | null, invoiceId: string, receiptId?: string) => {
  const res = await api.get<Envelope<{ pdfUrl: string }>>(
    API_ENDPOINTS.billing.document(invoiceId, receiptId ? 'RECEIPT' : 'INVOICE'),
    withLocation(locationId, receiptId ? { receiptId } : {}),
  )
  return res.data.data.pdfUrl
}

export const uploadBillingAttachmentAPI = async (locationId: string | null, file: File) => {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<Envelope<{ url: string }>>(API_ENDPOINTS.billing.attachments, form, {
    ...withLocation(locationId),
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data.url
}

export const getMiscItemsAPI = async (locationId: string | null, unitId: string) => {
  const res = await api.get<Envelope<UnitMiscItem[]>>(API_ENDPOINTS.billing.miscItems(unitId), withLocation(locationId))
  return res.data.data
}

export const createMiscItemAPI = async (locationId: string | null, payload: CreateMiscItemPayload) => {
  const res = await api.post<Envelope<UnitMiscItem>>(
    API_ENDPOINTS.billing.createMiscItem,
    payload,
    withLocation(locationId),
  )
  return res.data
}

export const deleteMiscItemAPI = async (locationId: string | null, itemId: string) => {
  const res = await api.delete<Envelope<null>>(API_ENDPOINTS.billing.deleteMiscItem(itemId), withLocation(locationId))
  return res.data
}

export const getTaxSettingsAPI = async (): Promise<Envelope<TaxSettings>> => {
  const response = await api.get<Envelope<TaxSettings>>(API_ENDPOINTS.billing.taxSettings)
  return response.data
}

export const updateTaxSettingsAPI = async (payload: Partial<TaxSettings>): Promise<Envelope<TaxSettings>> => {
  const response = await api.put<Envelope<TaxSettings>>(API_ENDPOINTS.billing.taxSettings, payload)
  return response.data
}
