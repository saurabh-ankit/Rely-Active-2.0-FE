import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  type BatchRunPayload,
  type CreateBillingEventPayload,
  type GenerateInvoicePayload,
  type InvoicePreviewPayload,
  type TaxSettings,
  cancelBillingEventAPI,
  createBillingEventAPI,
  updateBillingEventAPI,
  uploadBillingEventAttachmentAPI,
  generateInvoiceAPI,
  getAccountLedgerStatementAPI,
  getAccountPendingEventsAPI,
  getAccountSubscriptionsAPI,
  getBillingAccountByIdAPI,
  getBillingAccountsAPI,
  getBillingRunsAPI,
  getInvoiceByIdAPI,
  getInvoicesAPI,
  getTaxSettingsAPI,
  getUnitBilling360API,
  getUnitsBillingSummaryAPI,
  previewInvoiceAPI,
  triggerBatchRunAPI,
  updateTaxSettingsAPI,
} from '@/lib/services/billingService'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

export const useGetBillingAccounts = (params?: {
  propertyId?: string
  unitId?: string
  status?: string
  search?: string
  page?: number
  limit?: number
  enabled?: boolean
}) => {
  const { enabled = true, ...queryParams } = params || {}
  return useQuery({
    queryKey: ['billing-accounts', queryParams],
    queryFn: () => getBillingAccountsAPI(queryParams),
    enabled,
    staleTime: 30_000,
  })
}

export const useGetBillingAccountById = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ['billing-account', id],
    queryFn: () => getBillingAccountByIdAPI(id),
    enabled: enabled && !!id,
  })
}

export const useGetAccountLedger = (
  accountId: string,
  params?: { startDate?: string; endDate?: string },
  enabled = true,
) => {
  return useQuery({
    queryKey: ['billing-account-ledger', accountId, params],
    queryFn: () => getAccountLedgerStatementAPI(accountId, params),
    enabled: enabled && !!accountId,
  })
}

export const useGetAccountSubscriptions = (accountId: string, enabled = true) => {
  return useQuery({
    queryKey: ['billing-account-subscriptions', accountId],
    queryFn: () => getAccountSubscriptionsAPI(accountId),
    enabled: enabled && !!accountId,
  })
}

export const useGetAccountPendingEvents = (accountId: string, enabled = true) => {
  return useQuery({
    queryKey: ['billing-account-pending-events', accountId],
    queryFn: () => getAccountPendingEventsAPI(accountId),
    enabled: enabled && !!accountId,
  })
}

export const useGetInvoices = (params?: {
  propertyId?: string
  billingAccountId?: string
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

export const usePreviewInvoice = () => {
  return useMutation({
    mutationFn: (payload: InvoicePreviewPayload) => previewInvoiceAPI(payload),
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to preview invoice')
    },
  })
}

export const useGenerateInvoice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerateInvoicePayload) => generateInvoiceAPI(payload),
    onSuccess: () => {
      toast.success('Invoice generated & posted to ledger successfully!')
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['billing-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['billing-account-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['billing-units-summary'] })
      queryClient.invalidateQueries({ queryKey: ['billing-unit-360'] })
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to generate invoice')
    },
  })
}

export const useGetBillingRuns = (params?: {
  propertyId?: string
  page?: number
  limit?: number
  enabled?: boolean
}) => {
  const { enabled = true, ...queryParams } = params || {}
  return useQuery({
    queryKey: ['billing-runs', queryParams],
    queryFn: () => getBillingRunsAPI(queryParams),
    enabled,
  })
}

export const useTriggerBatchRun = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BatchRunPayload) => triggerBatchRunAPI(payload),
    onSuccess: (data) => {
      toast.success(
        `Batch run completed! Processed: ${data.data.successfulInvoices} invoices. Total: ₹${Number(data.data.totalAmount).toLocaleString('en-IN')}`,
      )
      queryClient.invalidateQueries({ queryKey: ['billing-runs'] })
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['billing-accounts'] })
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Batch billing run failed')
    },
  })
}

// ── 4. FLAT-CENTRIC DIRECTORY & 360° FOLIO ──────────────────────────────────
export const useGetUnitsBillingSummary = (propertyId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['billing-units-summary', propertyId],
    queryFn: () => getUnitsBillingSummaryAPI(propertyId),
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

// ── 5. GLOBAL GST / TAX SETTINGS ───────────────────────────────────────────
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
      toast.success(data.message || 'Tax & GST settings updated successfully')
      queryClient.invalidateQueries({ queryKey: ['billing-tax-settings'] })
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update tax settings')
    },
  })
}

// ── 6. BILLING USAGE & MISCELLANEOUS EVENTS ───────────────────────────────
export const useCreateBillingEvent = (unitId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBillingEventPayload) => createBillingEventAPI(payload),
    onSuccess: () => {
      toast.success('Miscellaneous charge added successfully!')
      if (unitId) {
        queryClient.invalidateQueries({ queryKey: ['billing-unit-360', unitId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['billing-unit-360'] })
      }
      queryClient.invalidateQueries({ queryKey: ['billing-units-summary'] })
      queryClient.invalidateQueries({ queryKey: ['billing-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['billing-account-pending-events'] })
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to add miscellaneous charge')
    },
  })
}

export const useCancelBillingEvent = (unitId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelBillingEventAPI(id, reason),
    onSuccess: () => {
      toast.success('Billing event cancelled successfully')
      if (unitId) {
        queryClient.invalidateQueries({ queryKey: ['billing-unit-360', unitId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['billing-unit-360'] })
      }
      queryClient.invalidateQueries({ queryKey: ['billing-units-summary'] })
      queryClient.invalidateQueries({ queryKey: ['billing-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['billing-account-pending-events'] })
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to cancel billing event')
    },
  })
}

export const useUpdateBillingEvent = (unitId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateBillingEventPayload> }) =>
      updateBillingEventAPI(id, payload),
    onSuccess: () => {
      toast.success('Miscellaneous charge updated')
      queryClient.invalidateQueries({ queryKey: unitId ? ['billing-unit-360', unitId] : ['billing-unit-360'] })
    },
    onError: (error: ApiError) => toast.error(error?.response?.data?.message || 'Failed to update charge'),
  })
}

export const useUploadBillingEventAttachment = (unitId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadBillingEventAttachmentAPI(id, file),
    onSuccess: () => {
      toast.success('Bill uploaded successfully')
      queryClient.invalidateQueries({ queryKey: unitId ? ['billing-unit-360', unitId] : ['billing-unit-360'] })
    },
    onError: (error: ApiError) => toast.error(error?.response?.data?.message || 'Failed to upload bill'),
  })
}
