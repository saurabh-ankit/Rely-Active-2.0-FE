import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import type { TargetLocation } from '../types'

interface AddTargetLocationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  formState: { name: string; type: TargetLocation['type'] }
  onFormChange: (state: { name: string; type: TargetLocation['type'] }) => void
  onSave: () => void
}

export function AddTargetLocationModal({
  isOpen,
  onOpenChange,
  formState,
  onFormChange,
  onSave,
}: AddTargetLocationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Plus className="h-5 w-5 text-[#004B87]" /> Add New Location / Department
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Create a new operational location or department to target in duty roster assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold text-gray-700">Location / Department Name *</Label>
            <Input
              value={formState.name}
              onChange={(e) => onFormChange({ ...formState, name: e.target.value })}
              placeholder="e.g. Cardiology OPD Dept, Flat 501, West Wing"
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700">Target Category Scope *</Label>
            <Select
              value={formState.type}
              onValueChange={(val: any) => onFormChange({ ...formState, type: val })}
            >
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="Select scope category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROOM_UNIT">Flat / Unit (Resident Apartment)</SelectItem>
                <SelectItem value="FLOOR">Floor / Wing (Caregiver Zone)</SelectItem>
                <SelectItem value="CLINIC_VENUE">Clinic Suite (OPD Consultation Room)</SelectItem>
                <SelectItem value="DEPARTMENT">Department (Clinical & Med Dept)</SelectItem>
                <SelectItem value="BLOCK">Block Tower (Building Complex)</SelectItem>
                <SelectItem value="AREA">Area Zone (Facility Area)</SelectItem>
                <SelectItem value="PROPERTY">Property Campus (Main Campus)</SelectItem>
                <SelectItem value="SERVICE">Service (Specialty Service Pool)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} className="bg-[#004B87] hover:bg-[#003865] gap-2 shadow-xs">
            <Plus className="w-4 h-4" />
            Save & Select Target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
