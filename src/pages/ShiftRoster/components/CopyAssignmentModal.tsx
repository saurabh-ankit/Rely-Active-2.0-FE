import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import { useCopyAssignment, useGetAssignments, usePublishAssignment } from '@/hooks/react-query/rosterManagement'
import { copyAssignmentWithSourceSchema, type CopyAssignmentWithSourceFormValues } from '../schemas/roster.schemas'
import { FieldErrorMessage } from '../utils/FieldErrorMessage'
import { notifyFormValidationErrors } from '../utils/rosterFormHelpers'

interface CopyAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CopyAssignmentModal({ open, onOpenChange, onSuccess }: CopyAssignmentModalProps) {
  const { data: assignmentsResponse } = useGetAssignments({ enabled: open })
  const copyMutation = useCopyAssignment()
  const publishMutation = usePublishAssignment()

  const assignments = (assignmentsResponse?.data ?? assignmentsResponse ?? []) as Array<{
    id: string
    rosterName: string
    effectiveFrom?: string
    effectiveUntil?: string
  }>

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<CopyAssignmentWithSourceFormValues>({
    resolver: zodResolver(copyAssignmentWithSourceSchema),
    defaultValues: {
      assignmentId: '',
      newRosterName: '',
      targetEffectiveFrom: '',
      targetEffectiveUntil: '',
    },
  })

  const assignmentId = useWatch({ control, name: 'assignmentId' })

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const onSubmit = handleSubmit(
    async (values) => {
      if (!values.assignmentId) return

      const copyRes = await copyMutation.mutateAsync({
        id: values.assignmentId,
        payload: {
          targetEffectiveFrom: values.targetEffectiveFrom,
          targetEffectiveUntil: values.targetEffectiveUntil,
          newRosterName: values.newRosterName,
        },
      })

      const newAssignmentId = copyRes?.data?.assignment?.id ?? copyRes?.assignment?.id
      if (newAssignmentId) {
        await publishMutation.mutateAsync({ id: newAssignmentId })
      }

      onOpenChange(false)
      onSuccess?.()
    },
    (fieldErrors) => notifyFormValidationErrors(fieldErrors),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Roster Pattern Forward</DialogTitle>
          <DialogDescription>Select an assignment pattern and copy it to a new date range.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Source Assignment *</Label>
            <Select value={assignmentId || ''} onValueChange={(v: string) => setValue('assignmentId', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select roster assignment" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.rosterName} ({a.effectiveFrom} – {a.effectiveUntil})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>New Roster Name *</Label>
            <Input className="mt-1" {...register('newRosterName')} />
            <FieldErrorMessage message={errors.newRosterName?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target Effective From *</Label>
              <Input type="date" className="mt-1" {...register('targetEffectiveFrom')} />
              <FieldErrorMessage message={errors.targetEffectiveFrom?.message} />
            </div>
            <div>
              <Label>Target Effective Until *</Label>
              <Input type="date" className="mt-1" {...register('targetEffectiveUntil')} />
              <FieldErrorMessage message={errors.targetEffectiveUntil?.message} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={copyMutation.isPending || publishMutation.isPending}>
              Copy & Publish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
