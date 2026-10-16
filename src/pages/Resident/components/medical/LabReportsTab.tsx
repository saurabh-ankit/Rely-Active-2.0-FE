import React, { useState } from 'react'
import { ExternalLink, FlaskConical, Plus, Receipt } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useDeleteResidentLabReportMutation } from '@/hooks/react-query/resident'
import type { LabReportSeverity, ResidentLabReportItem } from '@/lib/types/resident'
import { cn, formatDisplayDate, getFileUrl } from '@/lib/utils'
import { ClinicalAddedByCell, ClinicalCard, ClinicalTable } from './ClinicalShared'
import { ClinicalRowActions } from './ClinicalRowActions'
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

interface LabReportsTabProps {
  residentId: string
  canUpdateResident: boolean
  reports: ResidentLabReportItem[]
  isLoading: boolean
}

export const LabReportsTab: React.FC<LabReportsTabProps> = ({ residentId, canUpdateResident, reports, isLoading }) => {
  const [formTarget, setFormTarget] = useState<{ item: ResidentLabReportItem | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentLabReportItem | null>(null)
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
            <tr key={report.id} className="align-top hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">{report.labTestName || '-'}</td>
              <td className="px-4 py-3.5">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                    SEVERITY_STYLES[report.severity] || 'border-gray-200 bg-gray-50 text-gray-600',
                  )}
                >
                  {report.severity}
                </span>
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap">{formatDisplayDate(report.reportDate)}</td>
              <td className="px-4 py-3.5 max-w-xs whitespace-pre-wrap">{report.notes || '-'}</td>
              <td className="px-4 py-3.5 whitespace-nowrap">
                <div>{formatCost(report.cost)}</div>
                {report.paymentMethod && (
                  <div className="text-[11px] text-gray-400">{report.paymentMethod.replace(/_/g, ' ')}</div>
                )}
              </td>
              <ClinicalAddedByCell name={report.createdByName} createdAt={report.createdAt} />
              <td className="px-4 py-3.5">
                <div className="flex flex-col items-end gap-1.5">
                  <a
                    href={getFileUrl(report.reportFileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005390] hover:underline"
                  >
                    <ExternalLink className="size-3.5" /> View report
                  </a>
                  {report.receiptFileUrl && (
                    <a
                      href={getFileUrl(report.receiptFileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-[#005390] hover:underline"
                    >
                      <Receipt className="size-3.5" /> View receipt
                    </a>
                  )}
                </div>
              </td>
              {canUpdateResident && (
                <td className="px-4 py-2.5">
                  <ClinicalRowActions
                    label="lab report"
                    onEdit={() => setFormTarget({ item: report })}
                    onDelete={() => setDeleting(report)}
                  />
                </td>
              )}
            </tr>
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
