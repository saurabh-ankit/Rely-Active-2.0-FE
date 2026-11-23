import { ArrowRight, Building2, FileSpreadsheet, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useReportsQuery } from '@/hooks/react-query/reports'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from '@/hooks/useLocation'
import { cn } from '@/lib/utils'
import { REPORT_CARD_STYLE } from './reportCards'
import { REPORT_ROLES } from './roles'

/** Excel reports for the selected property: one card per module, each opening its preview and download page. */
export default function ReportsPage() {
  const { roles, isSuperAdmin } = useAuth()
  const { selectedLocationId, selectedLocationName } = useLocation()
  const canView = isSuperAdmin || roles.some((r) => REPORT_ROLES.includes(r))
  const { data, isLoading, isError, error, refetch } = useReportsQuery(selectedLocationId, canView)

  const propertyName = data?.property.name ?? selectedLocationName ?? 'this property'

  if (!canView) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="mb-4 h-12 w-12 text-rose-500" />
        <h2 className="mb-1 text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="max-w-md text-sm text-gray-500">Only a Super Admin or Admin can view and download reports.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileSpreadsheet}
        title="Reports"
        description="Open a module to preview its data for a date range, then download it as an Excel sheet."
        actions={
          <span className="flex max-w-full items-center gap-2 rounded-full border border-slate-300/70 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-2xs dark:bg-slate-900">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-[#005390]" />
            <span className="truncate">{propertyName}</span>
          </span>
        }
      />

      {isError ? (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <span>
            {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Failed to load reports.'}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => refetch()}
            className="ml-2 h-auto p-0 font-bold text-rose-700 underline hover:bg-transparent hover:text-rose-900"
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            Reports cover <span className="font-semibold text-gray-700">{propertyName}</span> only. Switch the property
            from the top bar to download another property&apos;s reports.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {isLoading || !data
              ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)
              : data.reports.map((report) => {
                  const { icon: Icon, tile } = REPORT_CARD_STYLE[report.key]
                  return (
                    <Link
                      key={report.key}
                      to={`/admin/reports/${report.key}`}
                      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#005390]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005390]/40 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', tile)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <FileSpreadsheet className="h-3 w-3" />
                          XLSX
                        </span>
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-gray-900 dark:text-white">{report.title}</h3>
                      <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-500">{report.description}</p>
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-slate-800">
                        <span className="truncate text-[11px] text-gray-400">
                          {report.sections.length > 0
                            ? `${report.sections.length} tabs`
                            : report.dateBasis
                              ? `By ${report.dateBasis.toLowerCase()}`
                              : 'Current list'}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#005390] group-hover:underline">
                          View &amp; download
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  )
                })}
          </div>
        </>
      )}
    </div>
  )
}
