import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ClinicalRowActionsProps {
  label: string
  onEdit: () => void
  onDelete: () => void
}

export const ClinicalRowActions: React.FC<ClinicalRowActionsProps> = ({ label, onEdit, onDelete }) => (
  <div className="flex items-center justify-end gap-1">
    <Button variant="ghost" size="sm" aria-label={`Edit ${label}`} onClick={onEdit}>
      <Pencil className="h-4 w-4" />
    </Button>
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Delete ${label}`}
      className="text-red-600 hover:text-red-700"
      onClick={onDelete}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
)

export default ClinicalRowActions
