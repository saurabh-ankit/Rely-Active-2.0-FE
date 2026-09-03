import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { rosterService, type CreateAssignmentPayload, type ValidationResult } from '@/lib/services/rosterService'
import { generateRosterAssignmentName } from '../types'
import type { RosterBuilderState } from '../types'

export interface PublishResult {
  assignmentCount: number
  generatedCount: number
  opdSlotsGenerated: number
}

export interface PublishRosterOptions {
  companyId: string
  locationId: string
  builderForm: RosterBuilderState
  resourceNames: Record<string, string>
  onValidationBlocked?: (results: ValidationResult[]) => void
  onRequiresOverride?: (results: ValidationResult[]) => Promise<string | null>
}

export function usePublishRosterAssignment() {
  const [isPublishing, setIsPublishing] = useState(false)

  const publish = useCallback(async (options: PublishRosterOptions): Promise<PublishResult | null> => {
    const { companyId, locationId, builderForm, resourceNames, onValidationBlocked, onRequiresOverride } = options

    if (builderForm.selectedResourceIds.length === 0) {
      toast.error('Select at least one staff member.')
      return null
    }

    setIsPublishing(true)
    try {
      const basePayload = {
        dutyType: builderForm.dutyType,
        shiftId: builderForm.selectedShiftId,
        slotTimeRange: builderForm.selectedShiftTime || undefined,
        frequencyId: builderForm.frequencyId || undefined,
        effectiveFrom: builderForm.effectiveFrom,
        effectiveUntil: builderForm.effectiveUntil,
        selectedWorkingDays: builderForm.selectedDaysOfWeek,
        instructions: builderForm.instructions,
        holidayPolicy: builderForm.holidayPolicy,
        enableOpdSlots: builderForm.enableOpdSlots ?? builderForm.dutyType === 'OPD_SESSION',
        slotDurationMinutes: builderForm.opdSlotDurationMinutes,
        slotBufferMinutes: builderForm.opdBufferMinutes,
        targets: [{ targetType: builderForm.targetScopeType, targetId: builderForm.selectedTargetId }],
      }

      const validationResults: ValidationResult[] = []
      for (const resourceId of builderForm.selectedResourceIds) {
        const res = await rosterService.validateAssignment(companyId, locationId, {
          ...basePayload,
          schedulingResourceId: resourceId,
        })
        const result = (res?.data ?? res) as ValidationResult
        validationResults.push(result)
      }

      const hasBlocks = validationResults.some((r) => r.errors?.length > 0)
      if (hasBlocks) {
        onValidationBlocked?.(validationResults)
        toast.error('Publish blocked by validation errors.')
        return null
      }

      let overrideReason = builderForm.overrideReason || undefined
      const requiresOverride = validationResults.some((r) => r.requiresOverride || (r.warnings?.length ?? 0) > 0)
      if (requiresOverride && !overrideReason) {
        const reason = await onRequiresOverride?.(validationResults)
        if (!reason) {
          toast.error('Override reason is required to publish with warnings.')
          return null
        }
        overrideReason = reason
      }

      let assignmentCount = 0
      let generatedCount = 0
      let opdSlotsGenerated = 0

      for (const resourceId of builderForm.selectedResourceIds) {
        const resourceName = resourceNames[resourceId] || 'Staff'
        const payload: CreateAssignmentPayload = {
          rosterName: `${generateRosterAssignmentName(builderForm.effectiveFrom)} — ${resourceName}`,
          ...basePayload,
          schedulingResourceId: resourceId,
          overrideReason,
        }

        const res = await rosterService.createAssignment(companyId, locationId, payload)
        assignmentCount += 1
        const publishResult = res?.data?.publishResult ?? res?.publishResult
        generatedCount += publishResult?.generatedCount ?? 0
        opdSlotsGenerated += publishResult?.opdSlotsGenerated ?? 0
      }

      toast.success(
        `Published ${assignmentCount} assignment(s), ${generatedCount} dates, ${opdSlotsGenerated} OPD slots.`,
      )

      return { assignmentCount, generatedCount, opdSlotsGenerated }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Failed to publish roster assignment.'
      toast.error(message)
      return null
    } finally {
      setIsPublishing(false)
    }
  }, [])

  return { publish, isPublishing }
}
