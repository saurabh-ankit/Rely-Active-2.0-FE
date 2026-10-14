import { ArrowRight } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { TicketStatus } from '@/lib/types'

/** Same wording as the status dropdown on the Tickets page. */
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  RESOLVED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
}

const STATUS_TONES: Record<string, string> = {
  OPEN: 'border-gray-200 bg-gray-50 text-gray-700',
  IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-800',
  ON_HOLD: 'border-amber-200 bg-amber-50 text-amber-800',
  RESOLVED: 'border-blue-200 bg-blue-50 text-blue-800',
  CLOSED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CANCELLED: 'border-rose-200 bg-rose-50 text-rose-700',
}

/** What the change means, so the admin knows what they are confirming. */
const CONSEQUENCES: Record<string, string> = {
  OPEN: 'The ticket goes back to Open and moves out of the assigned staff member’s active work.',
  IN_PROGRESS: 'The ticket will be shown as work in progress.',
  RESOLVED: 'The ticket will be marked as completed and moved to the Completed tab.',
  CLOSED: 'The ticket will be closed and moved to the Closed tab.',
}

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      'rounded-lg border px-2.5 py-1 text-xs font-bold',
      STATUS_TONES[status] ?? 'border-gray-200 bg-gray-50 text-gray-700',
    )}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
)

interface ConfirmStatusChangeDialogProps {
  ticketNumber?: string | null
  fromStatus?: TicketStatus | null
  /** The status picked in the dropdown; the dialog is open while this is set. */
  toStatus: TicketStatus | null
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Asks before a ticket's status is changed from the status dropdown. */
export const ConfirmStatusChangeDialog = ({
  ticketNumber,
  fromStatus,
  toStatus,
  isPending,
  onCancel,
  onConfirm,
}: ConfirmStatusChangeDialogProps) => (
  <AlertDialog
    open={!!toStatus}
    onOpenChange={(open) => {
      if (!open && !isPending) onCancel()
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Change ticket status?</AlertDialogTitle>
        <AlertDialogDescription>
          {ticketNumber ? (
            <>
              Are you sure you want to change the status of{' '}
              <span className="font-mono font-semibold">{ticketNumber}</span>?
            </>
          ) : (
            'Are you sure you want to change the status of this ticket?'
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>

      {toStatus && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 py-3">
            {fromStatus && <StatusBadge status={fromStatus} />}
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <StatusBadge status={toStatus} />
          </div>
          {CONSEQUENCES[toStatus] && <p className="text-xs text-gray-500">{CONSEQUENCES[toStatus]}</p>}
        </div>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={isPending} onClick={onConfirm}>
          {isPending ? 'Updating…' : 'Yes, change status'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
