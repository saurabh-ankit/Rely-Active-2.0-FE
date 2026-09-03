import { z } from 'zod'

const dayOfWeekEnum = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])

const targetScopeTypeEnum = z.enum([
  'PROPERTY',
  'BLOCK',
  'FLOOR',
  'AREA',
  'ROOM_UNIT',
  'DEPARTMENT',
  'CLINIC_VENUE',
  'SERVICE',
])

export const createShiftFormSchema = z.object({
  shiftName: z.string().trim().min(1, 'Shift name is required'),
  code: z.string().trim().min(1, 'Shift code is required'),
  description: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  breakStartTime: z.string().optional(),
  breakEndTime: z.string().optional(),
  slotGenerationMode: z.enum(['AUTO_GENERATE', 'MANUAL']).optional(),
  slotDurationMinutes: z.number().optional(),
  numberOfSlots: z.number().optional(),
  shiftCategory: z.enum(['GENERAL', 'DEPARTMENT', 'OPD']).optional(),
  departmentId: z.string().optional(),
})

export const addTargetLocationSchema = z.object({
  name: z.string().trim().min(1, 'Location or department name is required'),
  type: targetScopeTypeEnum,
})

export const requestReplacementFormSchema = z.object({
  replacementResourceId: z.string().min(1, 'Replacement staff is required'),
  reason: z.string().trim().min(1, 'Replacement reason is required'),
})

export const cancelRosterDateFormSchema = z.object({
  cancellationReason: z.string().trim().min(1, 'Cancellation reason is required'),
})

export const addStaffToRosterSchema = z
  .object({
    date: z.string().min(1, 'Duty date is required'),
    dutyType: z.enum(['SHIFT', 'OPD_SESSION']),
    resourceId: z.string(),
    resourceName: z.string(),
    resourceType: z.enum(['EMPLOYEE', 'DOCTOR']),
    shiftId: z.string().min(1, 'Shift pattern is required'),
    shiftName: z.string().min(1, 'Shift pattern is required'),
    shiftTime: z.string().min(1, 'Shift pattern is required'),
    targetId: z.string().min(1, 'Target location is required'),
    targetName: z.string().min(1, 'Target location is required'),
    isEmployeeLocked: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isEmployeeLocked && !data.resourceId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Staff member is required',
        path: ['resourceId'],
      })
    }
    if (!data.isEmployeeLocked && !data.resourceName.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Staff member is required',
        path: ['resourceName'],
      })
    }
    if (data.isEmployeeLocked && !data.resourceName.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Staff member is required',
        path: ['resourceName'],
      })
    }
  })

const copyAssignmentFormSchemaInner = z
  .object({
    newRosterName: z.string().trim().min(1, 'Target roster name is required'),
    targetEffectiveFrom: z.string().min(1, 'Target effective from date is required'),
    targetEffectiveUntil: z.string().min(1, 'Target effective until date is required'),
  })
  .refine((data) => new Date(data.targetEffectiveUntil) > new Date(data.targetEffectiveFrom), {
    message: 'Target effective until must be after effective from',
    path: ['targetEffectiveUntil'],
  })

export const copyAssignmentFormSchema = copyAssignmentFormSchemaInner

export const copyAssignmentWithSourceSchema = copyAssignmentFormSchemaInner.extend({
  assignmentId: z.string().min(1, 'Select a source assignment'),
})

export const rosterBuilderStep1Schema = z
  .object({
    dutyType: z.enum(['SHIFT', 'OPD_SESSION']),
    effectiveFrom: z.string().min(1, 'Effective from date is required'),
    effectiveUntil: z.string().min(1, 'Effective until date is required'),
    selectedDaysOfWeek: z.array(dayOfWeekEnum).min(1, 'Select at least one working day'),
    selectedShiftId: z.string().min(1, 'Shift template is required'),
    frequencyId: z.string().optional(),
    targetScopeType: targetScopeTypeEnum,
    selectedTargetId: z.string().min(1, 'Target location is required'),
  })
  .refine((data) => new Date(data.effectiveUntil) >= new Date(data.effectiveFrom), {
    message: 'Effective until must be on or after effective from',
    path: ['effectiveUntil'],
  })

export const rosterBuilderStep2Schema = z.object({
  selectedResourceIds: z.array(z.string()).min(1, 'Select at least one staff member'),
})

export const rosterBuilderSchema = rosterBuilderStep1Schema.and(rosterBuilderStep2Schema)

export type CreateShiftFormValues = z.infer<typeof createShiftFormSchema>
export type AddTargetLocationFormValues = z.infer<typeof addTargetLocationSchema>
export type RequestReplacementFormValues = z.infer<typeof requestReplacementFormSchema>
export type CancelRosterDateFormValues = z.infer<typeof cancelRosterDateFormSchema>
export type AddStaffToRosterFormValues = z.infer<typeof addStaffToRosterSchema>
export type CopyAssignmentFormValues = z.infer<typeof copyAssignmentFormSchema>
export type CopyAssignmentWithSourceFormValues = z.infer<typeof copyAssignmentWithSourceSchema>
