import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { addTargetLocationSchema, type AddTargetLocationFormValues } from '../schemas/roster.schemas'
import { FieldErrorMessage } from '../utils/FieldErrorMessage'
import { notifyFormValidationErrors } from '../utils/rosterFormHelpers'

interface AddTargetLocationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  defaultValues: AddTargetLocationFormValues
  onSubmit: (values: AddTargetLocationFormValues) => void
}

export function AddTargetLocationModal({ isOpen, onOpenChange, defaultValues, onSubmit }: AddTargetLocationModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddTargetLocationFormValues>({
    resolver: zodResolver(addTargetLocationSchema),
    defaultValues,
  })

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues)
    }
  }, [isOpen, defaultValues, reset])

  const onInvalid = (fieldErrors: typeof errors) => {
    notifyFormValidationErrors(fieldErrors)
  }

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

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold text-gray-700">Location / Department Name *</Label>
            <Input
              placeholder="e.g. Cardiology OPD Dept, Flat 501, West Wing"
              className="mt-1 text-sm"
              {...register('name')}
            />
            <FieldErrorMessage message={errors.name?.message} />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700">Target Category Scope *</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
              )}
            />
            <FieldErrorMessage message={errors.type?.message} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#004B87] hover:bg-[#003865] gap-2 shadow-xs">
              <Plus className="w-4 h-4" />
              Save & Select Target
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
