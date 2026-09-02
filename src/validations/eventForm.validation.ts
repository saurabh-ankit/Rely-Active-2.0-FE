import { z } from 'zod'
import type { AddOnService, EventType, FrequencyType } from '@/lib/services/eventService'
import {
  getNoOccurrencesMessage,
  getOccurrenceDates,
  getWeeklyRecurrenceDays,
  isEndTimeAfterStart,
  type RecurrenceConfig,
} from '@/pages/Events/utils/eventScheduleUtils'

const eventTypeSchema = z.enum(['regular', 'special'])
const frequencyTypeSchema = z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom'])

const selectedServiceSchema = z.object({
  name: z.string(),
  quantity: z.number().int().optional(),
  globalServiceId: z.string().optional(),
  price: z.number().optional(),
})

export const eventFormBaseSchema = z.object({
  eventType: eventTypeSchema,
  title: z.string().trim().min(1, 'Event title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  startDate: z.string().min(1, 'Start date and time is required'),
  endDate: z.string().min(1, 'End date and time is required'),
  venueId: z.string().min(1, 'Venue is required'),
  allowReservation: z.boolean(),
  frequencyType: frequencyTypeSchema,
  maxCapacity: z.number().int().optional(),
  reservationPerFlat: z.number().int().optional(),
  recurrenceDaysOfWeek: z.array(z.number().int()),
  recurrenceDayOfMonth: z.number().int().optional(),
  recurrenceMonth: z.number().int().optional(),
  sameScheduleForAllDates: z.boolean(),
  poster: z.string().optional(),
  entryFee: z.number().optional(),
  selectedServices: z.array(selectedServiceSchema),
})

export type EventFormValues = z.infer<typeof eventFormBaseSchema>

export interface EventScheduleContext {
  occurrenceDates: string[]
  scheduleTimes: Record<string, { startTime: string; endTime: string }>
  sameScheduleStartTime: string
  sameScheduleEndTime: string
  noOccurrencesMessage?: string
}

export interface EventFormValidationContext extends EventScheduleContext {
  isEditMode: boolean
  venueServices: AddOnService[]
}

const isRegularRecurring = (eventType: EventType, frequencyType: FrequencyType) =>
  eventType === 'regular' && frequencyType !== 'once'

export function validateEventSchedule(values: EventFormValues, ctx: EventScheduleContext): string | null {
  const isRecurring = isRegularRecurring(values.eventType, values.frequencyType)
  if (!isRecurring) return null

  if (ctx.occurrenceDates.length === 0) {
    const recurrenceConfig: RecurrenceConfig = {
      recurrenceDaysOfWeek: values.recurrenceDaysOfWeek,
      recurrenceDayOfMonth: values.recurrenceDayOfMonth,
      recurrenceMonth: values.recurrenceMonth,
    }
    return (
      ctx.noOccurrencesMessage ||
      getNoOccurrencesMessage(values.frequencyType, recurrenceConfig) ||
      'No occurrences fall within the selected date range'
    )
  }

  const timesToUse = values.sameScheduleForAllDates
    ? Object.fromEntries(
        ctx.occurrenceDates.map((dateKey) => [
          dateKey,
          {
            startTime: ctx.sameScheduleStartTime,
            endTime: ctx.sameScheduleEndTime,
          },
        ]),
      )
    : ctx.scheduleTimes

  for (const dateKey of ctx.occurrenceDates) {
    const slot = timesToUse[dateKey]
    if (!slot?.startTime || !slot?.endTime) {
      return 'Please set start and end time for all scheduled dates'
    }
    if (slot.startTime === '00:00' && slot.endTime === '00:00') {
      return 'Please set valid start and end times for the schedule'
    }
    if (!isEndTimeAfterStart(slot.startTime, slot.endTime)) {
      return 'End time must be after start time for each scheduled date'
    }
  }

  return null
}

function getAddOnServiceKey(service: { globalServiceId?: string; name: string }): string {
  return service.globalServiceId || service.name
}

export function createEventFormSchema(getContext: () => EventFormValidationContext) {
  return eventFormBaseSchema.superRefine((data, refineCtx) => {
    const ctx = getContext()
    const isRecurring = isRegularRecurring(data.eventType, data.frequencyType)

    if (data.eventType === 'special' && data.frequencyType !== 'once') {
      refineCtx.addIssue({
        code: 'custom',
        message: 'Special events must have frequency type "once"',
        path: ['frequencyType'],
      })
    }

    if (data.eventType === 'regular' && data.frequencyType === 'once') {
      refineCtx.addIssue({
        code: 'custom',
        message: 'Regular events cannot have frequency type "once"',
        path: ['frequencyType'],
      })
    }

    if (!data.startDate) {
      refineCtx.addIssue({
        code: 'custom',
        message: isRecurring ? 'Start date is required' : 'Start date and time is required',
        path: ['startDate'],
      })
    }

    if (!data.endDate) {
      refineCtx.addIssue({
        code: 'custom',
        message: isRecurring ? 'End date is required' : 'End date and time is required',
        path: ['endDate'],
      })
    }

    if (
      data.frequencyType === 'weekly' &&
      getWeeklyRecurrenceDays({
        recurrenceDaysOfWeek: data.recurrenceDaysOfWeek,
      }).length === 0
    ) {
      refineCtx.addIssue({
        code: 'custom',
        message: 'Please select at least one day for weekly events',
        path: ['recurrenceDaysOfWeek'],
      })
    }

    if (data.frequencyType === 'monthly' && !data.recurrenceDayOfMonth) {
      refineCtx.addIssue({
        code: 'custom',
        message: 'Please select a date for monthly events',
        path: ['recurrenceDayOfMonth'],
      })
    }

    if (data.frequencyType === 'yearly' && (!data.recurrenceMonth || !data.recurrenceDayOfMonth)) {
      refineCtx.addIssue({
        code: 'custom',
        message: 'Please select a date for yearly events',
        path: ['recurrenceMonth'],
      })
    }

    if (data.allowReservation && (!data.maxCapacity || data.maxCapacity <= 0)) {
      refineCtx.addIssue({
        code: 'custom',
        message: 'Max Capacity is required when Allow Reservation is enabled',
        path: ['maxCapacity'],
      })
    }

    if (data.reservationPerFlat !== undefined && data.reservationPerFlat <= 0) {
      refineCtx.addIssue({
        code: 'custom',
        message: 'Reservation per flat must be a positive integer',
        path: ['reservationPerFlat'],
      })
    }

    for (const service of data.selectedServices || []) {
      const venueService = ctx.venueServices.find((s) => getAddOnServiceKey(s) === getAddOnServiceKey(service))
      const quantity = service.quantity ?? 1
      if (quantity < 1) {
        refineCtx.addIssue({
          code: 'custom',
          message: `Quantity must be at least 1 for service "${service.name}"`,
          path: ['selectedServices'],
        })
        break
      }
      const maxQty = venueService?.quantity ?? 1
      if (quantity > maxQty) {
        refineCtx.addIssue({
          code: 'custom',
          message: `Quantity for "${service.name}" exceeds venue allocation (${maxQty} max)`,
          path: ['selectedServices'],
        })
        break
      }
    }

    if (data.startDate && data.endDate) {
      const startYear = new Date(data.startDate).getFullYear()
      const endYear = new Date(data.endDate).getFullYear()
      if (startYear > 9999 || startYear < 1000 || endYear > 9999 || endYear < 1000) {
        refineCtx.addIssue({
          code: 'custom',
          message: 'Invalid year format in Start or End Date',
          path: ['startDate'],
        })
      }

      const startDateObj = new Date(isRecurring ? `${data.startDate}T00:00:00` : data.startDate)
      const endDateObj = new Date(isRecurring ? `${data.endDate}T23:59:59` : data.endDate)

      if (!ctx.isEditMode && startDateObj < new Date()) {
        refineCtx.addIssue({
          code: 'custom',
          message: 'Start date must be in the future',
          path: ['startDate'],
        })
      }

      if (endDateObj < startDateObj) {
        refineCtx.addIssue({
          code: 'custom',
          message: 'End date must be on or after start date',
          path: ['endDate'],
        })
      }
    }

    const scheduleError = validateEventSchedule(data, ctx)
    if (scheduleError) {
      refineCtx.addIssue({
        code: 'custom',
        message: scheduleError,
        path: ['root'],
      })
    }
  })
}

export function getEventOccurrenceDatesFromValues(values: EventFormValues): string[] {
  const isRecurring = isRegularRecurring(values.eventType, values.frequencyType)
  if (!isRecurring || !values.startDate || !values.endDate) return []
  return getOccurrenceDates(values.frequencyType, values.startDate, values.endDate, {
    recurrenceDaysOfWeek: values.recurrenceDaysOfWeek,
    recurrenceDayOfMonth: values.recurrenceDayOfMonth,
    recurrenceMonth: values.recurrenceMonth,
  })
}

export const eventFormDefaultValues: EventFormValues = {
  eventType: 'special',
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  venueId: '',
  allowReservation: false,
  frequencyType: 'once',
  recurrenceDaysOfWeek: [],
  sameScheduleForAllDates: false,
  poster: '',
  selectedServices: [],
}
