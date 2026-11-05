import { AlertTriangle, Building2, CalendarRange, Download, FileSearch, Loader2, ShieldAlert } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useExportReport, useReportPreviewQuery, useReportsQuery } from '@/hooks/react-query/reports'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from '@/hooks/useLocation'
import type { ReportKey } from '@/lib/types/report'
import { cn } from '@/lib/utils'
import { ReportFilters } from './components/ReportFilters'
import { ReportTable } from './components/ReportTable'
import { presetRange, prettyDay, rangeDays, rangeError } from './dateRange'
import { REPORT_CARD_STYLE } from './reportCards'
import { REPORT_ROLES } from './roles'

const PAGE_SIZES = [25, 50, 100]
const DEFAULT_LIMIT = 25

/**
 * One report: its tabs (when it has several, e.g. Vitals under Medical), the date range and filter, a Download
 * button, and a table of exactly what the Excel file will hold. The tab and filters live in the URL, so a
 * refresh or a shared link reopens the same view.
 */
export default function ReportPreviewPage() {
  const { reportKey } = useParams<{ reportKey: ReportKey }>()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { roles, isSuperAdmin } = useAuth()
  const { selectedLocationId, selectedLocationName } = useLocation()
  const canView = isSuperAdmin || roles.some((r) => REPORT_ROLES.includes(r))

  const { data: list, isLoading: listLoading } = useReportsQuery(selectedLocationId, canView)
  const info = list?.reports.find((r) => r.key === reportKey)
  const known = Boolean(reportKey && reportKey in REPORT_CARD_STYLE)
  const tabs = info?.sections ?? []
  const active = tabs.find((t) => t.key === params.get('section')) ?? tabs[0] ?? info
  const section = tabs.length > 0 ? active?.key : undefined
  /** A current list (e.g. a catalogue) that the date range doesn't apply to. */
  const dateless = active?.dateBasis === null
  /** A tab not about residents can't be filtered by flat; the chosen flat stays for the tabs that can. */
  const flatDisabled = !active?.flatFilter

  const [defaultFrom, defaultTo] = presetRange('thisMonth')
  const from = params.get('from') || defaultFrom
  const to = params.get('to') || defaultTo
  const status = params.get('status') || ''
  /** The tab's further filters chosen in the URL, by key. */
  const filterValues = Object.fromEntries(
    (active?.filters ?? []).flatMap((f) => (params.get(f.key) ? [[f.key, params.get(f.key)!]] : [])),
  )
  /** The Flat filter shows when any tab of the report is about residents. */
  const showFlat = (tabs.length > 0 ? tabs : info ? [info] : []).some((t) => t.flatFilter)
  /** The chosen flats that are still occupied (a link may name one that has since been vacated). */
  const chosenFlats = flatDisabled
    ? []
    : (list?.flats ?? []).filter((f) => (params.get('flat') || '').split(',').includes(f.id))
  const flat = chosenFlats.map((f) => f.id).join(',')
  const flatText =
    chosenFlats.length === 1
      ? `Flat ${chosenFlats[0]!.label}`
      : chosenFlats.length > 1
        ? `${chosenFlats.length} flats`
        : ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const limitParam = Number(params.get('limit'))
  const limit = PAGE_SIZES.includes(limitParam) ? limitParam : DEFAULT_LIMIT
  const maxDays = list?.maxRangeDays ?? 366
  const invalid = dateless ? null : rangeError(from, to, maxDays)

  /** Change filters in the URL; anything but a page change starts again from page 1. */
  const update = (changes: Record<string, string | number | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(changes).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, String(v))))
        if (!('page' in changes)) next.delete('page')
        if (next.get('page') === '1') next.delete('page')
        if (next.get('limit') === String(DEFAULT_LIMIT)) next.delete('limit')
        return next
      },
      { replace: true },
    )

  const filters = {
    from,
    to,
    ...(status ? { status } : {}),
    ...filterValues,
    ...(flat ? { flat } : {}),
    ...(section ? { section } : {}),
  }
  const preview = useReportPreviewQuery(
    selectedLocationId,
    reportKey,
    { ...filters, page, limit },
    canView && known && !invalid,
  )
  const data = preview.data
  const exportReport = useExportReport(selectedLocationId)

  const style = reportKey && known ? REPORT_CARD_STYLE[reportKey] : null
  const Icon = style?.icon ?? FileSearch
  const title = info?.title ?? data?.report.title ?? 'Report'
  const propertyName = data?.property.name ?? list?.property.name ?? selectedLocationName ?? 'this property'
  const statusLabel = active?.filter?.options.find((o) => o.value === status)?.label
  const filterLabels = (active?.filters ?? []).flatMap((f) => {
    const label = f.options.find((o) => o.value === filterValues[f.key])?.label
    return label ? [label] : []
  })
  const days = rangeDays(from, to)

  const download = () =>
    reportKey &&
    exportReport.mutate({
      report: reportKey,
      params: filters,
      fallbackName: `${title}${section && active ? `_${active.title}` : ''}${flatText ? `_${flatText.replace(' ', '_')}` : ''}_${from}_to_${to}.xlsx`,
    })

  if (!canView) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="mb-4 h-12 w-12 text-rose-500" />
        <h2 className="mb-1 text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="max-w-md text-sm text-gray-500">Only a Super Admin or Admin can view and download reports.</p>
      </div>
    )
  }

  if (!known || (!listLoading && list && !info)) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-6 text-center">
        <FileSearch className="mb-4 h-12 w-12 text-gray-400" />
        <h2 className="mb-1 text-xl font-bold text-gray-900">Report not found</h2>
        <p className="mb-4 max-w-md text-sm text-gray-500">This report does not exist.</p>
        <Link to="/admin/reports" className="text-sm font-semibold text-[#005390] hover:underline">
          Back to Reports
        </Link>
      </div>
    )
  }

  const total = data?.total ?? 0
  const errorMessage =
    (preview.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message ||
    'Failed to load the report preview.'

  return (
    <div className="space-y-4">
      <PageHeader
        onBack={() => navigate('/admin/reports')}
        backLabel="Back to Reports"
        icon={Icon}
        title={`${title} report`}
        description={info?.description}
        actions={
          <span className="flex max-w-full items-center gap-2 rounded-full border border-slate-300/70 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-2xs dark:bg-slate-900">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-[#005390]" />
            <span className="truncate">{propertyName}</span>
          </span>
        }
      />

      {/* Tabs, date range, filter, summary and download */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs dark:border-gray-800 dark:bg-slate-900">
        {tabs.length > 0 && active && (
          <div className="mb-4 border-b border-gray-100 pb-4 dark:border-slate-800">
            <div role="tablist" aria-label={`${title} tabs`} className="flex flex-wrap gap-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={tab.key === active.key}
                  onClick={() =>
                    update({
                      section: tab.key === tabs[0]?.key ? null : tab.key,
                      status: null,
                      ...Object.fromEntries((active.filters ?? []).map((f) => [f.key, null])),
                    })
                  }
                  className={cn(
                    'h-8 rounded-lg border px-3 text-xs font-semibold transition-colors',
                    tab.key === active.key
                      ? 'border-[#005390]/30 bg-sky-50 text-[#005390] dark:bg-sky-950/40 dark:text-sky-300'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-slate-400 dark:hover:bg-slate-800',
                  )}
                >
                  {tab.title}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-gray-500 dark:text-slate-400">{active.description}</p>
          </div>
        )}
        {info && active ? (
          <ReportFilters
            from={from}
            to={to}
            status={status}
            filter={active.filter}
            filters={active.filters ?? []}
            filterValues={filterValues}
            showFlat={showFlat}
            flat={chosenFlats.map((f) => f.id)}
            flats={list?.flats ?? []}
            rangeDisabled={dateless}
            flatDisabled={flatDisabled}
            onRangeChange={(f, t) => update({ from: f, to: t })}
            onStatusChange={(s) => update({ status: s })}
            onFilterChange={(key, value) => update({ [key]: value })}
            onFlatChange={(ids) => update({ flat: ids.join(',') })}
          />
        ) : (
          <Skeleton className="h-16 rounded-xl" />
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                invalid ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-[#005390]',
              )}
            >
              {invalid ? <AlertTriangle className="h-4 w-4" /> : <CalendarRange className="h-4 w-4" />}
            </span>
            <div className="min-w-0 text-xs text-gray-500 dark:text-slate-400">
              {invalid ? (
                <p className="pt-2.5 font-semibold text-rose-700">{invalid}</p>
              ) : (
                <>
                  <p className="text-gray-700 dark:text-slate-300">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {data && !preview.isPlaceholderData ? total.toLocaleString('en-IN') : '…'}{' '}
                      {statusLabel ? `${statusLabel.toLowerCase()} ` : ''}
                      {total === 1 ? 'record' : 'records'}
                    </span>
                    {filterLabels.length > 0 && (
                      <>
                        <span className="mx-1.5 text-gray-300">|</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{filterLabels.join(' · ')}</span>
                      </>
                    )}
                    {flatText && (
                      <>
                        <span className="mx-1.5 text-gray-300">|</span>
                        <span
                          className="font-semibold text-gray-900 dark:text-white"
                          title={chosenFlats.map((f) => f.label).join(', ')}
                        >
                          {flatText}
                        </span>
                      </>
                    )}
                    <span className="mx-1.5 text-gray-300">|</span>
                    {dateless ? (
                      'Current list'
                    ) : (
                      <>
                        {prettyDay(from)} – {prettyDay(to)} ({days} {days === 1 ? 'day' : 'days'})
                      </>
                    )}
                  </p>
                  <p className="mt-0.5">
                    {dateless
                      ? 'The date range does not apply to this tab.'
                      : `Based on ${active?.dateBasis?.toLowerCase() ?? '…'}.`}{' '}
                    The Excel file has the same rows and columns as the table below.
                  </p>
                </>
              )}
              {data && total > data.maxExportRows && (
                <p className="mt-1 flex items-center gap-1 font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Only the first {data.maxExportRows.toLocaleString('en-IN')} rows fit in one file. Choose a shorter
                  range for the rest.
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            onClick={download}
            disabled={Boolean(invalid) || !data || total === 0 || preview.isPlaceholderData || exportReport.isPending}
            className="h-9 shrink-0 gap-2 rounded-full bg-[#005390] px-5 text-white hover:bg-[#00467a] disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-100"
          >
            {exportReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exportReport.isPending ? 'Preparing…' : 'Download Excel'}
          </Button>
        </div>
      </div>

      {/* Preview */}
      {invalid ? null : preview.isError && !data ? (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <span>{errorMessage}</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => preview.refetch()}
            className="ml-2 h-auto p-0 font-bold text-rose-700 underline hover:bg-transparent hover:text-rose-900"
          >
            Retry
          </Button>
        </div>
      ) : data ? (
        <ReportTable
          preview={data}
          isFetching={preview.isFetching}
          onPageChange={(p) => update({ page: p })}
          onLimitChange={(l) => update({ limit: l })}
        />
      ) : (
        <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      )}
    </div>
  )
}
