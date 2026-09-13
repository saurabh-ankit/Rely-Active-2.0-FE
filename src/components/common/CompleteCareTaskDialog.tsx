import React, { useState, useMemo } from 'react'
import { CheckCircle2, Loader2, X, Sparkles, AlertCircle } from 'lucide-react'
import { useCompleteCareTaskMutation, useCareTaskAssignmentByIdQuery } from '@/hooks/react-query/medical'
import type { CareTaskAssignment } from '@/lib/types/medical'
import { notifyError, notifySuccess } from '@/utils/toast'
import { Button } from '@/components/ui/button'
import { formatDisplayDate, cn } from '@/lib/utils'

export interface CompleteCareTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: CareTaskAssignment | null
  onSuccess?: () => void
}

interface CompleteCareTaskDialogContentProps {
  onOpenChange: (open: boolean) => void
  assignment: CareTaskAssignment
  onSuccess?: () => void
}

const CompleteCareTaskDialogContent: React.FC<CompleteCareTaskDialogContentProps> = ({
  onOpenChange,
  assignment: initialAssignment,
  onSuccess,
}) => {
  // Query live assignment details
  const { data: liveAssignment } = useCareTaskAssignmentByIdQuery(initialAssignment.id)
  const assignment = liveAssignment || initialAssignment

  // Form states initialized on mount
  const [notes, setNotes] = useState<string>('')

  const completeMutation = useCompleteCareTaskMutation()

  const taskName = assignment.task?.careTaskName || 'Care Task'
  const residentName =
    `${assignment.resident?.firstName || ''} ${assignment.resident?.lastName || ''}`.trim() || 'Resident'
  const rate = Number(assignment.price || 0)
  const taskSessionRate = Number(assignment.task?.price || rate || 0)
  const isPackageTask =
    assignment.source === 'PACKAGE' && Boolean(assignment.packageSubscriptionId || assignment.carePackageId)
  const packageInfo = isPackageTask ? assignment.packageInfo : null

  const isPackageStopped =
    Boolean(assignment.isStopped) ||
    assignment.status === 'STOPPED' ||
    assignment.status === 'CANCELLED' ||
    (isPackageTask &&
      (packageInfo?.isPackageStopped ||
        packageInfo?.subscriptionStatus === 'INACTIVE' ||
        packageInfo?.subscriptionStatus === 'CANCELLED'))

  const billingTypeDisplay = useMemo(() => {
    if (packageInfo?.isIncludedInPackage) {
      return `Package Plan (${packageInfo.packageName || 'Included'})`
    }
    const b = (assignment.billingType || '').toUpperCase()
    if (b.startsWith('MONTH')) return 'Monthly Tier'
    if (b.startsWith('SESS')) return 'Session Wise'
    return assignment.billingType || 'Session Wise'
  }, [assignment.billingType, packageInfo])

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isPackageStopped) {
      notifyError('The care package has been stopped. This task cannot be completed.')
      return
    }

    try {
      const res = await completeMutation.mutateAsync({
        id: assignment.id,
        payload: {
          notes: notes.trim() || null,
          remarks: notes.trim() || null,
        },
      })

      notifySuccess(res?.message || 'Care task session completed successfully!')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete care task'
      notifyError(msg)
    }
  }

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/40 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-slate-900 sm:p-7">
      {/* Close Button */}
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="absolute top-5 right-5 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 cursor-pointer"
      >
        <X className="size-5" />
      </button>

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Complete Care Task</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Verify completion and record clinical session notes
          </p>
        </div>
      </div>

      {/* Task Summary Card */}
      <div className="mt-5 rounded-2xl border border-gray-100 bg-slate-50/70 p-4 dark:border-gray-800 dark:bg-slate-800/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Resident:</span>
          <span className="font-bold text-gray-900 dark:text-white">{residentName}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Care Task:</span>
          <span className="font-bold text-gray-900 dark:text-white">{taskName}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Billing Category:</span>
          <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#005390] dark:bg-blue-900/40 dark:text-blue-300">
            {billingTypeDisplay} — ₹{packageInfo?.isIncludedInPackage ? 0 : rate.toLocaleString('en-IN')}
          </span>
        </div>

        {packageInfo?.isIncludedInPackage && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Complimentary Quota:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {packageInfo.complimentaryCount > 0
                ? `${packageInfo.remainingCount} / ${packageInfo.complimentaryCount} free sessions remaining`
                : 'Free / Included'}
            </span>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Scheduled Time:</span>
          <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{assignment.time || '12:00 PM'}</span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Duration:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {formatDisplayDate(assignment.startDate)} →{' '}
            {assignment.endDate ? formatDisplayDate(assignment.endDate) : 'Lifetime'}
          </span>
        </div>
      </div>

      {/* Quota Policy Notice / Stopped Package Alert */}
      {isPackageStopped ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-rose-900 dark:text-rose-200">Package has been stopped</span>
            <p className="text-[11px] text-rose-700 dark:text-rose-300">
              The care package associated with this task has been stopped or cancelled. This task cannot be completed.
            </p>
          </div>
        </div>
      ) : packageInfo?.isIncludedInPackage ? (
        taskSessionRate <= 0 ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50/80 p-3 text-[11px] text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span>
              Covered by active Care Package <strong>({packageInfo.packageName || 'Package Plan'})</strong>.
              Complimentary free service (₹0 charge).
            </span>
          </div>
        ) : packageInfo.remainingCount > 0 ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50/80 p-3 text-[11px] text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span>
              Covered by active Care Package <strong>({packageInfo.packageName || 'Package Plan'})</strong>. 1
              complimentary session will be deducted ({packageInfo.remainingCount - 1} remaining). ₹0 charge.
            </span>
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/80 p-3 text-[11px] text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span>
              Complimentary quota exhausted ({packageInfo.complimentaryCount}/{packageInfo.complimentaryCount} used).
              This session will be recorded as an additional overage charge of <strong>₹{taskSessionRate}</strong>.
            </span>
          </div>
        )
      ) : (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50/70 p-3 text-[11px] text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Sparkles className="size-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <span>
            Custom Assigned Task: Recording completion session for {residentName}. Billed at ₹{rate} per{' '}
            {billingTypeDisplay}.
          </span>
        </div>
      )}

      <form onSubmit={handleComplete} className="mt-4 space-y-4">
        {/* Clinical Remarks / Notes */}
        <div className="space-y-1.5">
          <label htmlFor="completion-remarks-input" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Session Remarks / Observation Notes (Optional)
          </label>
          <textarea
            id="completion-remarks-input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Vitals normal, resident comfortable..."
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 transition-colors focus:border-[#005390] focus:outline-none dark:border-gray-800 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <Button
            type="submit"
            disabled={completeMutation.isPending || isPackageStopped}
            className={cn(
              'rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors',
              isPackageStopped
                ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400 opacity-70'
                : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer',
            )}
          >
            {completeMutation.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            Complete & Record Session
          </Button>
        </div>
      </form>
    </div>
  )
}

export const CompleteCareTaskDialog: React.FC<CompleteCareTaskDialogProps> = ({
  open,
  onOpenChange,
  assignment,
  onSuccess,
}) => {
  if (!open || !assignment) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <CompleteCareTaskDialogContent
        key={assignment.id}
        onOpenChange={onOpenChange}
        assignment={assignment}
        onSuccess={onSuccess}
      />
    </div>
  )
}

export default CompleteCareTaskDialog
