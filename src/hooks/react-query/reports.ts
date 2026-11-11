import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/hooks/react-query/billing'
import { exportReportAPI, getReportPreviewAPI, getReportsAPI } from '@/lib/services/reportService'
import type { ExportReportParams, ReportKey, ReportPreviewParams } from '@/lib/types/report'

export const REPORT_KEYS = {
  list: (locationId?: string | null) => ['reports', locationId] as const,
  preview: (locationId: string | null | undefined, report: ReportKey | undefined, params: ReportPreviewParams) =>
    ['reports', locationId, 'preview', report, params] as const,
}

export const useReportsQuery = (locationId?: string | null, enabled = true) =>
  useQuery({
    queryKey: REPORT_KEYS.list(locationId),
    queryFn: () => getReportsAPI(locationId!),
    enabled: enabled && Boolean(locationId),
    staleTime: 5 * 60_000,
  })

/** One page of a report. The previous page stays on screen while the next one loads. */
export const useReportPreviewQuery = (
  locationId: string | null | undefined,
  report: ReportKey | undefined,
  params: ReportPreviewParams,
  enabled = true,
) =>
  useQuery({
    queryKey: REPORT_KEYS.preview(locationId, report, params),
    queryFn: ({ signal }) => getReportPreviewAPI(locationId!, report!, params, signal),
    enabled: enabled && Boolean(locationId && report),
    placeholderData: keepPreviousData,
  })

export const useExportReport = (locationId?: string | null) =>
  useMutation({
    mutationFn: ({ report, params }: { report: ReportKey; params: ExportReportParams; fallbackName: string }) =>
      exportReportAPI(locationId!, report, params),
    onSuccess: ({ blob, filename, rows }, { fallbackName }) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || fallbackName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(
        rows === 0
          ? 'Report downloaded. There are no records in this date range.'
          : `Report downloaded${rows ? ` with ${rows.toLocaleString('en-IN')} rows` : ''}`,
      )
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to download the report'))
    },
  })
