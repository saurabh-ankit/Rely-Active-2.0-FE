/** Reports page: one Excel export per module, for the selected property. */
export type ReportKey =
  | 'residents'
  | 'employees'
  | 'roster'
  | 'tickets'
  | 'visitors'
  | 'inventory'
  | 'assets'
  | 'medical'
  | 'dining'
  | 'billing'
  | 'events'
  | 'amenities'
  | 'feedback'

export interface ReportFilterOption {
  value: string
  label: string
}

export interface ReportFilterInfo {
  label: string
  options: ReportFilterOption[]
}

/** One of a tab's further filters, sent as its own query param `key`. */
export interface ReportExtraFilterInfo extends ReportFilterInfo {
  key: string
}

export interface ReportSectionInfo {
  key: string
  title: string
  description: string
  /** What the date range applies to, e.g. "Date raised"; null for a current list the range doesn't apply to. */
  dateBasis: string | null
  /** Sent as `status`. */
  filter: ReportFilterInfo | null
  /** Further filters (e.g. Role, Department in Employees), each sent as its own query param. */
  filters: ReportExtraFilterInfo[]
  /** Whether the tab can be filtered by flat. */
  flatFilter: boolean
}

export interface ReportInfo {
  key: ReportKey
  title: string
  description: string
  /** What the date range applies to, e.g. "Date raised"; null for a current list. */
  dateBasis: string | null
  filter: ReportFilterInfo | null
  filters: ReportExtraFilterInfo[]
  flatFilter: boolean
  /** The report's tabs (e.g. Vitals under Medical); empty when it has one table. */
  sections: ReportSectionInfo[]
}

/** A flat of the property, for the Flat filter. */
export interface ReportFlat {
  id: string
  /** The flat number, e.g. `B-101`. */
  label: string
  block: string | null
  /** Residents living there now, comma-separated. Only occupied flats are listed. */
  people: string
}

export interface ReportsList {
  property: { id: string; name: string }
  maxRangeDays: number
  flats: ReportFlat[]
  reports: ReportInfo[]
}

export interface ExportReportParams {
  from: string
  to: string
  status?: string
  /** Only rows for these flats: comma-separated ids. */
  flat?: string
  /** A tab of a report with several; its first tab when left out. */
  section?: string
  /** The tab's further filters, by their key (e.g. `role`). */
  [filter: string]: string | number | undefined
}

export type ReportColumnType = 'text' | 'number' | 'money' | 'date' | 'datetime'

export interface ReportPreviewColumn {
  key: string
  header: string
  type: ReportColumnType
  /** Added up in the totals row. */
  total: boolean
}

/** Cell values as the Excel file has them; dates are `YYYY-MM-DD[ HH:MM:SS]` local time. */
export type ReportPreviewRow = Record<string, string | number | null>

export interface ReportPreview {
  report: { key: ReportKey; title: string; description: string }
  section: { key: string; title: string; description: string }
  property: { id: string; name: string }
  dateBasis: string | null
  filter: { label: string; value: string; optionLabel: string } | null
  filters: { key: string; label: string; value: string; optionLabel: string }[]
  flats: { id: string; label: string }[]
  columns: ReportPreviewColumn[]
  rows: ReportPreviewRow[]
  /** Column totals over every row in the range, not just this page. */
  totals: Record<string, number>
  total: number
  page: number
  limit: number
  pageSizes: number[]
  maxExportRows: number
}

export interface ReportPreviewParams extends ExportReportParams {
  page: number
  limit: number
}
