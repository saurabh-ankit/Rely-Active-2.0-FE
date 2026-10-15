import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLocationContext } from '@/hooks/useLocation'
import {
  createInvoiceAPI,
  createMiscItemAPI,
  deleteMiscItemAPI,
  getBillingUnitsAPI,
  getInvoiceDataAPI,
  getMiscItemsAPI,
  getTaxSettingsAPI,
  getUnbilledServicesAPI,
  getUnitInvoicesAPI,
  getUnitReceiptsAPI,
  recordPaymentAPI,
  updateInvoiceAPI,
  updateTaxSettingsAPI,
} from '@/lib/services/billingService'
import type {
  BillingMode,
  CreateMiscItemPayload,
  MonthBillingStatus,
  RecordPaymentPayload,
  SaveInvoicePayload,
  TaxSettings,
} from '@/lib/types/billing'

type ApiError = { response?: { data?: { message?: string } }; message?: string }
export const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiError)?.response?.data?.message || (error as ApiError)?.message || fallback

export const BILLING_KEYS = {
  units: (locationId: string | null, params: Record<string, unknown>) =>
    ['billing', 'units', locationId, params] as const,
  unit: (unitId: string) => ['billing', 'unit', unitId] as const,
  preview: (unitId: string, mode: BillingMode, startDate?: string, endDate?: string, editing?: string) =>
    ['billing', 'unit', unitId, 'preview', mode, startDate ?? '', endDate ?? '', editing ?? ''] as const,
  invoices: (unitId: string, page: number) => ['billing', 'unit', unitId, 'invoices', page] as const,
  receipts: (unitId: string, page: number, limit: number) =>
    ['billing', 'unit', unitId, 'receipts', page, limit] as const,
  unbilled: (unitId: string, startDate: string, endDate: string) =>
    ['billing', 'unit', unitId, 'unbilled', startDate, endDate] as const,
  misc: (unitId: string) => ['billing', 'unit', unitId, 'misc'] as const,
}

export const useBillingUnits = (params: {
  search: string
  page: number
  limit: number
  month: string
  status?: MonthBillingStatus
}) => {
  const { selectedLocationId } = useLocationContext()
  return useQuery({
    queryKey: BILLING_KEYS.units(selectedLocationId, params),
    queryFn: () => getBillingUnitsAPI(selectedLocationId as string, params),
    enabled: !!selectedLocationId,
    placeholderData: (prev) => prev,
  })
}

export const useInvoicePreview = (
  unitId: string,
  params: { billingMode: BillingMode; startDate?: string; endDate?: string; editingInvoiceId?: string },
  enabled = true,
) => {
  const { selectedLocationId } = useLocationContext()
  return useQuery({
    queryKey: BILLING_KEYS.preview(
      unitId,
      params.billingMode,
      params.startDate,
      params.endDate,
      params.editingInvoiceId,
    ),
    queryFn: () => getInvoiceDataAPI(selectedLocationId, unitId, params),
    enabled: !!unitId && enabled,
    retry: false,
  })
}

export const useUnitInvoices = (unitId: string, page = 1) => {
  const { selectedLocationId } = useLocationContext()
  return useQuery({
    queryKey: BILLING_KEYS.invoices(unitId, page),
    queryFn: () => getUnitInvoicesAPI(selectedLocationId, unitId, page),
    enabled: !!unitId,
    placeholderData: (prev) => prev,
  })
}

export const useUnitReceipts = (unitId: string, page = 1, limit = 20) => {
  const { selectedLocationId } = useLocationContext()
  return useQuery({
    queryKey: BILLING_KEYS.receipts(unitId, page, limit),
    queryFn: () => getUnitReceiptsAPI(selectedLocationId, unitId, page, limit),
    enabled: !!unitId,
    placeholderData: (prev) => prev,
  })
}

export const useUnbilledServices = (unitId: string, startDate: string, endDate: string) => {
  const { selectedLocationId } = useLocationContext()
  return useQuery({
    queryKey: BILLING_KEYS.unbilled(unitId, startDate, endDate),
    queryFn: () => getUnbilledServicesAPI(selectedLocationId, unitId, { startDate, endDate }),
    enabled: !!unitId && !!startDate && !!endDate && startDate <= endDate,
  })
}

export const useUnitMiscItems = (unitId: string) => {
  const { selectedLocationId } = useLocationContext()
  return useQuery({
    queryKey: BILLING_KEYS.misc(unitId),
    queryFn: () => getMiscItemsAPI(selectedLocationId, unitId),
    enabled: !!unitId,
  })
}

/** Everything about a flat's billing goes stale together after a write. */
const useInvalidateUnit = () => {
  const queryClient = useQueryClient()
  return (unitId: string) => {
    queryClient.invalidateQueries({ queryKey: BILLING_KEYS.unit(unitId) })
    queryClient.invalidateQueries({ queryKey: ['billing', 'units'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export const useSaveInvoice = (unitId: string) => {
  const { selectedLocationId } = useLocationContext()
  const invalidate = useInvalidateUnit()
  return useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId?: string; payload: SaveInvoicePayload }) =>
      invoiceId
        ? updateInvoiceAPI(selectedLocationId, invoiceId, payload)
        : createInvoiceAPI(selectedLocationId, unitId, payload),
    onSuccess: () => invalidate(unitId),
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not save the invoice')),
  })
}

export const useRecordPayment = (unitId: string) => {
  const { selectedLocationId } = useLocationContext()
  const invalidate = useInvalidateUnit()
  return useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: RecordPaymentPayload }) =>
      recordPaymentAPI(selectedLocationId, invoiceId, payload),
    onSuccess: (res) => {
      toast.success(`Payment recorded – receipt ${res.data.receiptNumber}`)
      invalidate(unitId)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not record the payment')),
  })
}

export const useCreateMiscItem = (unitId: string) => {
  const { selectedLocationId } = useLocationContext()
  const invalidate = useInvalidateUnit()
  return useMutation({
    mutationFn: (payload: CreateMiscItemPayload) => createMiscItemAPI(selectedLocationId, payload),
    onSuccess: () => {
      toast.success('Charge added – it will appear on the next invoice')
      invalidate(unitId)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not add the charge')),
  })
}

export const useDeleteMiscItem = (unitId: string) => {
  const { selectedLocationId } = useLocationContext()
  const invalidate = useInvalidateUnit()
  return useMutation({
    mutationFn: (itemId: string) => deleteMiscItemAPI(selectedLocationId, itemId),
    onSuccess: () => {
      toast.success('Charge removed')
      invalidate(unitId)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not remove the charge')),
  })
}

// ── Global GST / tax settings ───────────────────────────────────────────────
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
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update tax settings')),
  })
}
