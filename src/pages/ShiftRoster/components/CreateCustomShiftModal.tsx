import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ShiftFormState {
  shiftName: string
  code: string
  startTime: string
  endTime: string
  breakStartTime: string
  breakEndTime: string
  description: string
}

interface CreateCustomShiftModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editingShiftId: string | null
  formState: ShiftFormState
  onFormChange: (state: ShiftFormState) => void
  onSave: () => void
  isSubmitting: boolean
}

export function CreateCustomShiftModal({
  isOpen,
  onOpenChange,
  editingShiftId,
  formState,
  onFormChange,
  onSave,
  isSubmitting,
}: CreateCustomShiftModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingShiftId ? 'Edit Shift Master Template' : 'Create New Shift Master Template'}
          </DialogTitle>
          <DialogDescription>
            {editingShiftId
              ? 'Modify operational times, breaks, and location scope policy parameters.'
              : 'Define a master shift pattern to assign across staff and doctor schedules.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Shift Name *</Label>
              <Input
                placeholder="e.g. Afternoon OPD Slot"
                value={formState.shiftName}
                onChange={(e) => onFormChange({ ...formState, shiftName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Shift Code *</Label>
              <Input
                placeholder="e.g. OPD-AFT"
                value={formState.code}
                onChange={(e) => onFormChange({ ...formState, code: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formState.startTime}
                onChange={(e) => onFormChange({ ...formState, startTime: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input
                type="time"
                value={formState.endTime}
                onChange={(e) => onFormChange({ ...formState, endTime: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Break Start Time</Label>
              <Input
                type="time"
                value={formState.breakStartTime}
                onChange={(e) => onFormChange({ ...formState, breakStartTime: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Break End Time</Label>
              <Input
                type="time"
                value={formState.breakEndTime}
                onChange={(e) => onFormChange({ ...formState, breakEndTime: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Description / Operational Notes</Label>
            <Input
              placeholder="e.g. Mandatory for Memory Care floor coverage."
              value={formState.description}
              onChange={(e) => onFormChange({ ...formState, description: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSubmitting} className="bg-[#004B87] hover:bg-[#003865]">
            {isSubmitting ? 'Saving...' : editingShiftId ? 'Update Shift Master' : 'Create Shift Master'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
