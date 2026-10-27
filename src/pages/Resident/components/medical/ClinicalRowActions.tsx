import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ClinicalRowActionsProps {
  label: string
  onEdit: () => void
  onDelete: () => void
  /** When set, the row can't be changed: both actions are disabled and this explains why on hover. */
  lockedReason?: string
}

export const ClinicalRowActions: React.FC<ClinicalRowActionsProps> = ({ label, onEdit, onDelete, lockedReason }) => (
  // Disabled buttons don't receive hover, so the reason sits on the wrapper.
  <div className="flex items-center justify-end gap-1" title={lockedReason}>
    <Button variant="ghost" size="sm" aria-label={`Edit ${label}`} onClick={onEdit} disabled={!!lockedReason}>
      <Pencil className="h-4 w-4" />
    </Button>
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Delete ${label}`}
      className="text-red-600 hover:text-red-700"
      onClick={onDelete}
      disabled={!!lockedReason}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
)

export default ClinicalRowActions
