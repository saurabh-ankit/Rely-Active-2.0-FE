import React from 'react'
import { ClipboardCheck, Loader2, Package } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useResidentMedicationAdministrationsQuery } from '@/hooks/react-query/resident'
import type {
  DoctorNoteFile,
  MedicationAdministrationItem,
  MedicationAdministrationKind,
  MedicationStockStatus,
  ResidentMedicationItem,
} from '@/lib/types/resident'
import { cn, formatDisplayDate, formatDisplayDateTime } from '@/lib/utils'
import { MEAL_TIMING_LABELS, ROUTE_LABELS, TIME_OF_DAY_LABELS } from './clinicalConstants'

const STOCK_STATUS: Record<MedicationStockStatus, { label: string; className: string }> = {
  DEDUCTED: { label: 'Stock issued', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  INSUFFICIENT: { label: 'Insufficient stock', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  NOT_APPLICABLE: { label: 'No deduction', className: 'border-gray-200 bg-slate-50 text-gray-600' },
}

function administrationDoseLabel(item: MedicationAdministrationItem): string {
  const dose = Math.round(item.dose * 100) / 100
  if (item.kind === 'INSULIN') return `${dose} ${dose === 1 ? 'unit' : 'units'}`
  if (!item.isWholePack && item.packUnit) return `${dose} ${item.packUnit}`
  return `${dose} dose`
}

const AdministrationRow: React.FC<{ item: MedicationAdministrationItem }> = ({ item }) => {
  const stock = STOCK_STATUS[item.stockStatus]
  const isCancelled = item.status === 'CANCELLED'
  const details = [
    item.scheduledTime,
    administrationDoseLabel(item),
    ROUTE_LABELS[item.route] || item.route,
    MEAL_TIMING_LABELS[item.mealTiming] || null,
  ].filter(Boolean)

  return (
    <Card className="gap-0 rounded-2xl border-gray-200 bg-white p-4 space-y-2 dark:border-gray-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
              {TIME_OF_DAY_LABELS[item.timeOfDay] || item.timeOfDay}
            </span>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              {formatDisplayDate(item.scheduledDate)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">{details.join(' · ')}</p>
        </div>
        {isCancelled ? (
          <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
            Cancelled
          </span>
        ) : (
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', stock.className)}>
            {item.stockStatus === 'DEDUCTED' && item.deductedQuantity > 0
              ? `${stock.label}: ${item.deductedQuantity} ${item.packUnit || ''}`.trim()
              : stock.label}
          </span>
        )}
      </div>

      {item.cancelledAt && (
        <AdministrationEvent
          label="Cancelled by"
          by={item.cancelledByName}
          at={item.cancelledAt}
          notes={item.cancelReason}
          attachments={item.cancelAttachments}
          voiceNotes={item.cancelVoiceNotes}
        />
      )}
      {!isCancelled && (
        <AdministrationEvent
          label="Given by"
          by={item.nurseName}
          at={item.completedAt}
          notes={item.notes}
          attachments={item.attachments}
          voiceNotes={item.voiceNotes}
        />
      )}
    </Card>
  )
}

const AdministrationEvent: React.FC<{
  label: string
  by: string | null
  at: string | null
  notes: string | null
  attachments: DoctorNoteFile[]
  voiceNotes: DoctorNoteFile[]
}> = ({ label, by, at, notes, attachments, voiceNotes }) => (
  <div className="space-y-2">
    <p className="text-[11px] text-gray-600 dark:text-gray-400">
      {label} <span className="font-semibold text-gray-900 dark:text-white">{by || 'Nurse'}</span>
      {at ? ` on ${formatDisplayDateTime(at)}` : ''}
    </p>

    {notes && (
      <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-2 text-[11px] italic text-gray-600 dark:bg-slate-800/50 dark:text-gray-300">
        {notes}
      </p>
    )}

    {attachments.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {attachments.map((file) => (
          <a key={file.id} href={file.url} target="_blank" rel="noreferrer">
            <img src={file.url} alt={file.name} className="h-16 w-16 rounded-lg border object-cover" />
          </a>
        ))}
      </div>
    )}

    {voiceNotes.map((file) => (
      <audio key={file.id} src={file.url} controls className="h-9 w-full">
        <track kind="captions" />
      </audio>
    ))}
  </div>
)

interface MedicationAdministrationLogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  kind: MedicationAdministrationKind
  medication: ResidentMedicationItem
}

export const MedicationAdministrationLogModal: React.FC<MedicationAdministrationLogModalProps> = ({
  open,
  onOpenChange,
  residentId,
  kind,
  medication,
}) => {
  const { data = [], isLoading } = useResidentMedicationAdministrationsQuery(
    residentId,
    { kind, medicationId: medication.id },
    open,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            {medication.medicineName} — Administration Log
          </DialogTitle>
          <DialogDescription>
            Doses nurses have marked as given or cancelled, with their notes and attachments.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400">
            <Loader2 className="mx-auto size-6 animate-spin text-[#005390]" />
            <p className="mt-2 text-xs">Loading administrations...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Package className="mx-auto size-8 text-gray-300" />
            <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">No doses recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <AdministrationRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default MedicationAdministrationLogModal
