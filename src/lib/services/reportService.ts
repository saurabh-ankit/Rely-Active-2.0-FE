import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { ExportReportParams, ReportKey, ReportPreview, ReportPreviewParams, ReportsList } from '@/lib/types/report'

export const getReportsAPI = async (locationId: string): Promise<ReportsList> => {
  const response = await api.get(API_ENDPOINTS.reports.list(locationId))
  return response.data?.data || response.data
}

/** One page of a report, as the Excel file would have it. */
export const getReportPreviewAPI = async (
  locationId: string,
  report: ReportKey,
  params: ReportPreviewParams,
  signal?: AbortSignal,
): Promise<ReportPreview> => {
  const response = await api.get(API_ENDPOINTS.reports.preview(locationId, report), { params, signal })
  return response.data?.data || response.data
}

/** The Excel file and the server's file name for it. */
export const exportReportAPI = async (
  locationId: string,
  report: ReportKey,
  params: ExportReportParams,
): Promise<{ blob: Blob; filename: string | null; rows: number | null }> => {
  try {
    const response = await api.get(API_ENDPOINTS.reports.export(locationId, report), {
      params,
      responseType: 'blob',
    })
    const disposition = String(response.headers['content-disposition'] ?? '')
    const rows = response.headers['x-report-rows']
    return {
      blob: response.data as Blob,
      filename: /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? null,
      rows: rows === undefined ? null : Number(rows),
    }
  } catch (error) {
    // Errors come back as a Blob too; read the JSON message out of it.
    const data = (error as { response?: { data?: unknown } })?.response?.data
    if (data instanceof Blob) {
      try {
        const body = JSON.parse(await data.text()) as { message?: string }
        if (body.message) throw new Error(body.message)
      } catch (parsed) {
        if (parsed instanceof Error && !(parsed instanceof SyntaxError)) throw parsed
      }
    }
    throw error
  }
}
