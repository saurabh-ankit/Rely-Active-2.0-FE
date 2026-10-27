import React, { useState } from 'react'
import { Eye, FlaskConical, Plus, Receipt } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { useDeleteResidentLabReportMutation } from '@/hooks/react-query/resident'
import type { LabReportSeverity, ResidentLabReportItem } from '@/lib/types/resident'
import { cn, formatDisplayDate } from '@/lib/utils'
import { ClinicalAddedByCell, ClinicalCard, ClinicalTable } from './ClinicalShared'
import { ClinicalRowActions } from './ClinicalRowActions'
import FilePreviewModal from './FilePreviewModal'
import LabReportFormModal from './LabReportFormModal'

const SEVERITY_STYLES: Record<LabReportSeverity, string> = {
  normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  abnormal: 'border-amber-200 bg-amber-50 text-amber-700',
  severe: 'border-rose-200 bg-rose-50 text-rose-700',
}

const COLUMNS = [
  { label: 'Lab Test' },
  { label: 'Severity' },
  { label: 'Report Date' },
  { label: 'Notes' },
  { label: 'Cost' },
  { label: 'Added By' },
  { label: 'Files', className: 'text-right' },
]

const formatCost = (cost: number | null) =>
  cost === null ? '-' : `₹${cost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/**
 * Where the lab test's cost stands. Billing skips reports paid at the lab (they carry a payment
 * method), so those are "Already paid"; any other report with a cost is billed on the flat's invoice.
 */
const BillingTag: React.FC<{ report: ResidentLabReportItem }> = ({ report }) => {
  const tag = report.paymentMethod
    ? { label: 'Already paid', className: 'border-sky-200 bg-sky-50 text-sky-700' }
    : report.isInvoiced
      ? { label: 'Invoiced', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
      : report.cost
        ? { label: 'To be invoiced', className: 'border-amber-200 bg-amber-50 text-amber-700' }
        : null
  if (!tag) return null
  return (
    <span
      className={cn(
        'mt-1 inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        tag.className,
      )}
    >
      {tag.label}
    </span>
  )
}

interface LabReportsTabProps {
  residentId: string
  canUpdateResident: boolean
  reports: ResidentLabReportItem[]
  isLoading: boolean
}

export const LabReportsTab: React.FC<LabReportsTabProps> = ({ residentId, canUpdateResident, reports, isLoading }) => {
  const [formTarget, setFormTarget] = useState<{ item: ResidentLabReportItem | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentLabReportItem | null>(null)
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null)
  const deleteMutation = useDeleteResidentLabReportMutation(residentId)

  return (
    <>
      <ClinicalCard
        icon={FlaskConical}
        iconClassName="text-violet-500"
        title="Lab Reports"
        count={isLoading ? undefined : reports.length}
        action={
          canUpdateResident ? (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setFormTarget({ item: null })}
              className="rounded-xl"
            >
              Add Lab Report
            </Button>
          ) : undefined
        }
      >
        <ClinicalTable
          columns={canUpdateResident ? [...COLUMNS, { label: 'Actions', className: 'text-right' }] : COLUMNS}
          isLoading={isLoading}
          loadingLabel="Loading lab reports..."
          isEmpty={reports.length === 0}
          empty={{ icon: FlaskConical, title: 'No lab reports', description: 'Uploaded lab reports appear here.' }}
        >
          {reports.map((report) => (
            <TableRow key={report.id} className="align-top hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <TableCell className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">
                {report.labTestName || '-'}
              </TableCell>
              <TableCell className="px-4 py-3.5">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                    SEVERITY_STYLES[report.severity] || 'border-gray-200 bg-gray-50 text-gray-600',
                  )}
                >
                  {report.severity}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3.5 whitespace-nowrap">{formatDisplayDate(report.reportDate)}</TableCell>
              <TableCell className="px-4 py-3.5 max-w-xs whitespace-pre-wrap">{report.notes || '-'}</TableCell>
              <TableCell className="px-4 py-3.5 whitespace-nowrap">
                <div>{formatCost(report.cost)}</div>
                {report.paymentMethod && (
                  <div className="text-[11px] text-gray-400">{report.paymentMethod.replace(/_/g, ' ')}</div>
                )}
                <BillingTag report={report} />
              </TableCell>
              <ClinicalAddedByCell name={report.createdByName} createdAt={report.createdAt} />
              <TableCell className="px-4 py-3.5">
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setPreview({
                        url: report.reportFileUrl,
                        title: `${report.labTestName || 'Lab Report'} — Report`,
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005390] hover:underline"
                  >
                    <Eye className="size-3.5" /> View report
                  </button>
                  {report.receiptFileUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreview({
                          url: report.receiptFileUrl!,
                          title: `${report.labTestName || 'Lab Report'} — Receipt`,
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-[#005390] hover:underline"
                    >
                      <Receipt className="size-3.5" /> View receipt
                    </button>
                  )}
                </div>
              </TableCell>
              {canUpdateResident && (
                <TableCell className="px-4 py-2.5">
                  <ClinicalRowActions
                    label="lab report"
                    onEdit={() => setFormTarget({ item: report })}
                    onDelete={() => setDeleting(report)}
                    lockedReason={
                      report.isInvoiced
                        ? 'Already on an invoice, so this lab report can no longer be changed'
                        : undefined
                    }
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </ClinicalTable>
      </ClinicalCard>

      {formTarget && (
        <LabReportFormModal
          open
          onOpenChange={(open) => !open && setFormTarget(null)}
          residentId={residentId}
          item={formTarget.item}
        />
      )}

      <FilePreviewModal
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
        url={preview?.url ?? null}
        title={preview?.title}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete lab report?"
        description={`The ${deleting?.labTestName ?? ''} report will be removed from this resident's medical records.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

export default LabReportsTab
