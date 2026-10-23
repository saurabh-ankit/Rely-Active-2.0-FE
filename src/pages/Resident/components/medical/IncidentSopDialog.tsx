import React, { useState } from 'react'
import { Check, Circle, CircleCheck, Loader2, NotebookPen, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useResidentIncidentSopQuery, useUpdateResidentIncidentSopStepMutation } from '@/hooks/react-query/resident'
import { INCIDENT_SEVERITY_OPTIONS, INCIDENT_TYPE_OPTIONS } from '@/lib/constants/incident'
import type { IncidentSopStep, UpdateIncidentSopStepPayload } from '@/lib/types/resident'
import { cn, formatDisplayDateTime } from '@/lib/utils'

function SopStepRow({
  step,
  index,
  busy,
  canUpdate,
  onUpdate,
}: {
  step: IncidentSopStep
  index: number
  busy: boolean
  canUpdate: boolean
  onUpdate: (payload: UpdateIncidentSopStepPayload) => Promise<boolean>
}) {
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const done = step.isCompleted

  const startEditing = () => {
    setNoteDraft(step.note ?? '')
    setEditingNote(true)
  }

  const saveNote = async () => {
    const ok = await onUpdate({ note: noteDraft.trim() || null })
    if (ok) setEditingNote(false)
  }

  return (
    <div
      className={cn(
        'rounded-2xl border p-3 transition-colors',
        done
          ? 'border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30'
          : 'border-border/70 bg-card',
      )}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => void onUpdate({ isCompleted: !done })}
          disabled={busy || !canUpdate}
          aria-label={done ? `Mark ${step.title} as pending` : `Mark ${step.title} as done`}
          className="mt-0.5 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {done ? (
            <CircleCheck className="h-5 w-5 fill-emerald-500 text-white dark:text-background" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/70" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={cn('text-xs font-bold', done ? 'text-emerald-800 dark:text-emerald-300' : 'text-foreground')}>
              {index}. {step.title}
            </p>
            {step.isMandatory && (
              <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-red-600 dark:bg-red-950/50 dark:text-red-400">
                MANDATORY
              </span>
            )}
          </div>

          <p className={cn('text-[10px]', done ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
            {done
              ? `Completed by ${step.completedByName || 'Staff'} · ${formatDisplayDateTime(step.completedAt)}`
              : 'Pending'}
          </p>

          {step.note && !editingNote && (
            <p className="break-words text-[11px] italic text-muted-foreground">{step.note}</p>
          )}

          {canUpdate &&
            (editingNote ? (
              <div className="space-y-1.5 pt-1">
                <Textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Add a note for this step"
                  className="rounded-xl text-xs"
                />
                <div className="flex justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNote(false)}
                    disabled={busy}
                    className="h-7 rounded-lg text-[11px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void saveNote()}
                    disabled={busy}
                    className="h-7 rounded-lg bg-[#005390] text-[11px] text-white hover:bg-[#004070]"
                  >
                    {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 pt-0.5">
                <button
                  type="button"
                  onClick={startEditing}
                  disabled={busy}
                  className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#005390] hover:underline disabled:opacity-60 dark:text-blue-400"
                >
                  <NotebookPen className="h-3.5 w-3.5" />
                  {step.note ? 'Edit note' : 'Add note'}
                </button>
                {done ? (
                  <button
                    type="button"
                    onClick={() => void onUpdate({ isCompleted: false })}
                    disabled={busy}
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline disabled:opacity-60 dark:text-orange-400"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Undo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onUpdate({ isCompleted: true })}
                    disabled={busy}
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline disabled:opacity-60 dark:text-emerald-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark done
                  </button>
                )}
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

interface IncidentSopDialogProps {
  residentId: string
  incidentId: string | null
  canUpdate: boolean
  onClose: () => void
}

export const IncidentSopDialog: React.FC<IncidentSopDialogProps> = ({ residentId, incidentId, canUpdate, onClose }) => {
  const sopQuery = useResidentIncidentSopQuery(residentId, incidentId)
  const updateStep = useUpdateResidentIncidentSopStepMutation(residentId, incidentId)
  const sop = sopQuery.data
  const busyStepId = updateStep.isPending ? updateStep.variables?.stepId : null

  const handleUpdate = async (stepId: string, payload: UpdateIncidentSopStepPayload) => {
    try {
      await updateStep.mutateAsync({ stepId, payload })
      return true
    } catch {
      return false
    }
  }

  const typeLabel = sop
    ? (INCIDENT_TYPE_OPTIONS.find((o) => o.value === sop.incident.incidentType)?.label ?? sop.incident.incidentType)
    : 'SOP'
  const severity = sop ? INCIDENT_SEVERITY_OPTIONS.find((o) => o.value === sop.incident.severity) : undefined
  const percent = sop && sop.summary.total > 0 ? Math.round((sop.summary.completed / sop.summary.total) * 100) : 0

  return (
    <Dialog open={Boolean(incidentId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(80vh,700px)] max-w-lg flex-col gap-3 overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-1 pr-6 text-left">
          <p className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Standard Operating Procedure
          </p>
          <DialogTitle className="text-lg font-black text-foreground">{typeLabel}</DialogTitle>
          {sop && (
            <div className="flex items-center gap-2 pt-0.5">
              {severity && (
                <span
                  className={cn(
                    'rounded-md border border-current/30 bg-current/5 px-2 py-0.5 text-[10px] font-bold',
                    severity.textClassName,
                  )}
                >
                  {severity.label}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {formatDisplayDateTime(sop.incident.incidentAt)}
              </span>
            </div>
          )}
        </DialogHeader>

        {sopQuery.isLoading ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : sopQuery.isError || !sop ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-xs font-semibold text-destructive">
              {(sopQuery.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Could not load the SOP'}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void sopQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="shrink-0 space-y-1.5 border-t border-border/60 pt-3">
              <p className="text-[11px] font-semibold text-muted-foreground">
                {sop.summary.completed} of {sop.summary.total} steps completed
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
            <div className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 pb-1">
              {sop.steps.map((step, i) => (
                <SopStepRow
                  key={step.id}
                  step={step}
                  index={i + 1}
                  busy={busyStepId === step.id}
                  canUpdate={canUpdate}
                  onUpdate={(payload) => handleUpdate(step.id, payload)}
                />
              ))}
            </div>
          </>
        )}

        <DialogFooter className="shrink-0">
          <Button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-xl bg-[#005390] text-xs font-extrabold text-white hover:bg-[#004070]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default IncidentSopDialog
