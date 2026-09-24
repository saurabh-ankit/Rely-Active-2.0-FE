import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createMiscellaneousServiceAPI,
  generateInvoiceAPI,
  getInvoiceByIdAPI,
  getInvoicesAPI,
  getMiscellaneousServicesAPI,
  getTaxSettingsAPI,
  getUnitBilling360API,
  getUnitServicesAPI,
  getUnitsBillingSummaryAPI,
  recordPaymentAPI,
  updateTaxSettingsAPI,
} from '@/lib/services/billingService'
import type { TaxSettings } from '@/lib/services/billingService'
import type { CreateInvoicePayload, CreateMiscellaneousServicePayload, CreatePaymentPayload } from '@/lib/types/billing'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

// ── 1. FLAT-CENTRIC DIRECTORY & 360° FOLIO ──────────────────────────────────
export const useGetUnitsBillingSummary = (locationId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['billing-units-summary', locationId],
    queryFn: () => getUnitsBillingSummaryAPI(locationId),
    enabled,
    staleTime: 15_000,
  })
}

export const useGetUnitBilling360 = (unitId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['billing-unit-360', unitId],
    queryFn: () => getUnitBilling360API(unitId!),
    enabled: enabled && !!unitId,
    staleTime: 15_000,
  })
}

export const useGetUnitServices = (unitId: string | null, startDate?: string, endDate?: string, enabled = true) => {
  return useQuery({
    queryKey: ['billing-unit-services', unitId, startDate, endDate],
    queryFn: () => getUnitServicesAPI(unitId!, startDate, endDate),
    enabled: enabled && !!unitId,
    staleTime: 10_000,
  })
}

// ── 2. INVOICES ─────────────────────────────────────────────────────────────
export const useGetInvoices = (params?: {
  locationId?: string
  residentId?: string
  unitId?: string
  status?: string
  page?: number
  limit?: number
  enabled?: boolean
}) => {
  const { enabled = true, ...queryParams } = params || {}
  return useQuery({
    queryKey: ['billing-invoices', queryParams],
    queryFn: () => getInvoicesAPI(queryParams),
    enabled,
    staleTime: 30_000,
  })
}

export const useGetInvoiceById = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ['billing-invoice', id],
    queryFn: () => getInvoiceByIdAPI(id),
    enabled: enabled && !!id,
  })
}

export const useGenerateInvoice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => generateInvoiceAPI(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Invoice generated successfully!')
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['billing-units-summary'] })
      queryClient.invalidateQueries({ queryKey: ['billing-unit-360'] })
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to generate invoice')
    },
  })
}

// ── 3. PAYMENTS & RECEIPTS ─────────────────────────────────────────────────
export const useRecordPayment = (unitId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => recordPaymentAPI(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Payment recorded successfully!')
      if (unitId) {
        queryClient.invalidateQueries({ queryKey: ['billing-unit-360', unitId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['billing-unit-360'] })
      }
      queryClient.invalidateQueries({ queryKey: ['billing-units-summary'] })
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] })
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to record payment')
    },
  })
}

// ── 4. MISCELLANEOUS SERVICES ──────────────────────────────────────────────
export const useGetMiscellaneousServices = (
  params?: { unitId?: string; residentId?: string; locationId?: string },
  enabled = true,
) => {
  return useQuery({
    queryKey: ['billing-miscellaneous-services', params],
    queryFn: () => getMiscellaneousServicesAPI(params),
    enabled,
  })
}

export const useCreateMiscellaneousService = (unitId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMiscellaneousServicePayload) => createMiscellaneousServiceAPI(payload),
    onSuccess: () => {
      toast.success('Miscellaneous item recorded successfully!')
      if (unitId) {
        queryClient.invalidateQueries({ queryKey: ['billing-unit-360', unitId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['billing-unit-360'] })
      }
      queryClient.invalidateQueries({ queryKey: ['billing-units-summary'] })
      queryClient.invalidateQueries({ queryKey: ['billing-miscellaneous-services'] })
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to record item')
    },
  })
}

export const useCreateBillingEvent = useCreateMiscellaneousService

// ── 5. TAX & GST SETTINGS ───────────────────────────────────────────────────
export const useGetTaxSettings = (enabled = true) => {
  return useQuery({
    queryKey: ['billing-tax-settings'],
    queryFn: () => getTaxSettingsAPI(),
    enabled,
    staleTime: 60_000,
  })
}

export const useUpdateTaxSettings = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<TaxSettings>) => updateTaxSettingsAPI(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'GST & Tax Settings updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['billing-tax-settings'] })
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update tax settings')
    },
  })
}
