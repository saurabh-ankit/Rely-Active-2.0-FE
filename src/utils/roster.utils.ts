import { z } from 'zod'
import { AREA_TYPES, WEEK_DAYS } from '@/pages/ShiftRoster/utils'
import type { LeaveType, RosterAreaType, SlotGenerationMode, WeekDay } from '@/lib/types/roster'

const timeHHmm = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format')

const dateYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

const leaveTypes = ['week_off', 'sick', 'casual', 'planned', 'holiday'] as const

export const createShiftFormSchema = z.object({
  name: z.string().trim().min(1, 'Shift name is required').max(255),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  startTime: timeHHmm,
  endTime: timeHHmm,
})

export type CreateShiftFormValues = z.infer<typeof createShiftFormSchema>

export const createShiftFormDefaultValues: CreateShiftFormValues = {
  name: '',
  description: '',
  startTime: '08:00',
  endTime: '16:00',
}

export const manageSlotTimeFormSchema = z
  .object({
    mode: z.enum(['Auto Generate', 'Manual']),
    numberOfSlotsInput: z.string().regex(/^\d+$/, 'Enter a valid number of slots'),
    slotDurationInput: z.string().regex(/^\d+$/, 'Enter a valid slot duration'),
  })
  .superRefine((data, ctx) => {
    const slots = Number(data.numberOfSlotsInput)
    const duration = Number(data.slotDurationInput)
    if (!Number.isFinite(slots) || slots < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Number of slots must be at least 1',
        path: ['numberOfSlotsInput'],
      })
    }
    if (!Number.isFinite(duration) || duration < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Slot duration must be at least 1 minute',
        path: ['slotDurationInput'],
      })
    }
  })

export type ManageSlotTimeFormValues = z.infer<typeof manageSlotTimeFormSchema>

export const manageSlotTimeFormDefaultValues: ManageSlotTimeFormValues = {
  mode: 'Auto Generate',
  numberOfSlotsInput: '2',
  slotDurationInput: '60',
}

export const assignShiftFormSchema = z
  .object({
    departmentId: z.string().min(1, 'Department is required'),
    employeeIds: z.array(z.string().uuid()).min(1, 'Select at least one employee'),
    shiftId: z.string().min(1, 'Shift is required'),
    slotValue: z.string().min(1),
    startDate: dateYmd,
    endDate: dateYmd,
    targetType: z.enum(['area', 'unit']),
    areaId: z.string().optional().or(z.literal('')),
    blockId: z.string().optional().or(z.literal('')),
    floorSelection: z.string().optional().or(z.literal('')),
    flatSelection: z.string().optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal('')),
    workingDays: z.array(z.enum(WEEK_DAYS as unknown as [WeekDay, ...WeekDay[]])),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date must be on or after start date',
        path: ['endDate'],
      })
    }
    if (data.workingDays.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select at least one working day',
        path: ['workingDays'],
      })
    }
    if (data.targetType === 'area' && !data.areaId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Area is required',
        path: ['areaId'],
      })
    }
    if (data.targetType === 'unit' && !data.blockId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Block is required',
        path: ['blockId'],
      })
    }
  })

export type AssignShiftFormValues = z.infer<typeof assignShiftFormSchema>

export const assignShiftFormDefaultValues: AssignShiftFormValues = {
  departmentId: '',
  employeeIds: [],
  shiftId: '',
  slotValue: '__full__',
  startDate: '',
  endDate: '',
  targetType: 'area',
  areaId: '',
  blockId: '',
  floorSelection: '',
  flatSelection: '',
  notes: '',
  workingDays: [],
}

export const areaFormSchema = z.object({
  areaName: z.string().trim().min(2, 'Area name is required').max(255),
  areaType: z.enum(AREA_TYPES as unknown as [RosterAreaType, ...RosterAreaType[]]),
  location: z.string().trim().min(2, 'Location is required').max(255),
  status: z.enum(['Active', 'Inactive']).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
})

export type AreaFormValues = z.infer<typeof areaFormSchema>

export const areaFormDefaultValues: AreaFormValues = {
  areaName: '',
  areaType: 'Lobby Area',
  location: '',
  status: 'Active',
  description: '',
}

export const dayOffFormSchema = z.object({
  leaveType: z.enum(leaveTypes),
  leaveNote: z.string().max(500).optional().or(z.literal('')),
})

export type DayOffFormValues = z.infer<typeof dayOffFormSchema>

export const dayOffFormDefaultValues: DayOffFormValues = {
  leaveType: 'casual',
  leaveNote: '',
}

export const coverFormSchema = z.object({
  coveredByEmployeeId: z.string().min(1, 'Cover employee is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type CoverFormValues = z.infer<typeof coverFormSchema>

export const coverFormDefaultValues: CoverFormValues = {
  coveredByEmployeeId: '',
  notes: '',
}

export const swapFormSchema = z.object({
  targetDateId: z.string().min(1, 'Target shift date is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type SwapFormValues = z.infer<typeof swapFormSchema>

export const swapFormDefaultValues: SwapFormValues = {
  targetDateId: '',
  notes: '',
}

export const residentPoolFormSchema = z
  .object({
    residentId: z.string().min(1, 'Resident is required'),
    fromTime: z.string().optional().or(z.literal('')),
    toTime: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.fromTime && !/^\d{2}:\d{2}$/.test(data.fromTime)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use HH:mm format',
        path: ['fromTime'],
      })
    }
    if (data.toTime && !/^\d{2}:\d{2}$/.test(data.toTime)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use HH:mm format',
        path: ['toTime'],
      })
    }
    if ((data.fromTime && !data.toTime) || (!data.fromTime && data.toTime)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide both from and to time, or leave both empty',
        path: ['toTime'],
      })
    }
  })

export type ResidentPoolFormValues = z.infer<typeof residentPoolFormSchema>

export const residentPoolFormDefaultValues: ResidentPoolFormValues = {
  residentId: '',
  fromTime: '',
  toTime: '',
}

export type { LeaveType, SlotGenerationMode }
