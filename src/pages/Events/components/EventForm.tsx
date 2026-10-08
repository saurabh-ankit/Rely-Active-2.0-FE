import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  useCreateEvent,
  useDeleteEvent,
  useGetEventById,
  useListVenues,
  useUpdateEvent,
} from '@/hooks/react-query/events'
import type { AddOnService, EventType, FrequencyType, Venue } from '@/lib/services/eventService'
import { checkVenueAvailabilityAPI } from '@/lib/services/eventService'
import { parseJsonArray } from '@/lib/utils/jsonUtils'
import { useLocationStore } from '@/lib/stores/locationStore'
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  ImagePlus,
  IndianRupee,
  MapPin,
  Repeat,
  Sparkles,
  Ticket,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { notifyError } from '@/utils/toast'
import { z } from 'zod'
import { EventVenueServicesSelect } from './EventVenueServicesSelect'
import {
  buildEventOccurrences,
  formatOccurrenceDateLabel,
  getMinEndTime,
  getNoOccurrencesMessage,
  getOccurrenceDates,
  getWeeklyRecurrenceDays,
  isEndTimeAfterStart,
  WEEKDAYS,
  type RecurrenceConfig,
} from '@/utils/event.utils'

/** A titled card that groups related form fields. */
const FormSection = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
  children: React.ReactNode
}) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
)

const EVENT_TYPE_OPTIONS: { value: EventType; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'regular', label: 'Regular Event', hint: 'Repeats daily, weekly, monthly or yearly', icon: Repeat },
  { value: 'special', label: 'Special Event', hint: 'A one-time occasion', icon: Sparkles },
]

const eventTypeSchema = z.enum(['regular', 'special'])
const frequencyTypeSchema = z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom'])

// Empty/NaN are normalized to undefined via register setValueAs — avoid z.preprocess so RHF input/output types match.
const optionalNumber = z.number().optional()
const optionalInt = z.number().int().optional()

const selectedServiceSchema = z.object({
  name: z.string(),
  quantity: optionalInt,
  globalServiceId: z.string().optional(),
  price: optionalNumber,
})

const eventFormBaseSchema = z.object({
  eventType: eventTypeSchema,
  title: z.string().trim().min(1, 'Event title is required'),
  description: z.string().trim(),
  startDate: z.string().min(1, 'Start date and time is required'),
  endDate: z.string().min(1, 'End date and time is required'),
  occupancy: z.number({ error: 'Occupancy is required' }).int().positive('Occupancy must be greater than 0'),
  venueId: z.string().min(1, 'Venue is required'),
  allowReservation: z.boolean(),
  frequencyType: frequencyTypeSchema,
  reservationPerFlat: optionalInt,
  recurrenceDaysOfWeek: z.array(z.number().int()),
  recurrenceDayOfMonth: optionalInt,
  recurrenceMonth: optionalInt,
  sameScheduleForAllDates: z.boolean(),
  poster: z.string().optional(),
  entryFee: optionalNumber,
  selectedServices: z.array(selectedServiceSchema),
})

type EventFormValues = z.infer<typeof eventFormBaseSchema>

interface EventScheduleContext {
  occurrenceDates: string[]
  scheduleTimes: Record<string, { startTime: string; endTime: string }>
  sameScheduleStartTime: string
  sameScheduleEndTime: string
  noOccurrencesMessage?: string
}

interface EventFormValidationContext extends EventScheduleContext {
  isEditMode: boolean
  venueServices: AddOnService[]
}

const isRegularRecurring = (eventType?: EventType, frequencyType?: FrequencyType) =>
  eventType === 'regular' && !!frequencyType && frequencyType !== 'once'

function validateEventSchedule(values: EventFormValues, ctx: EventScheduleContext): string | null {
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

function createEventFormSchema(getContext: () => EventFormValidationContext) {
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

    if (data.allowReservation && (!data.reservationPerFlat || data.reservationPerFlat <= 0)) {
      refineCtx.addIssue({
        code: 'custom',
        message: 'Reservation per flat is required when Allow Reservation is enabled',
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
      const now = new Date()

      if (isRecurring) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startDay = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate())
        if (startDay < today) {
          refineCtx.addIssue({
            code: 'custom',
            message: 'Start date cannot be in the past',
            path: ['startDate'],
          })
        }
      } else if (startDateObj < now) {
        refineCtx.addIssue({
          code: 'custom',
          message: 'Start date and time cannot be in the past',
          path: ['startDate'],
        })
      }

      if (endDateObj < startDateObj) {
        refineCtx.addIssue({
          code: 'custom',
          message: isRecurring
            ? 'End date must be on or after start date'
            : 'End date and time must be on or after start date and time',
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

const eventFormDefaultValues: EventFormValues = {
  eventType: 'special',
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  occupancy: undefined as unknown as number,
  venueId: '',
  allowReservation: false,
  frequencyType: 'once',
  recurrenceDaysOfWeek: [],
  sameScheduleForAllDates: false,
  poster: '',
  selectedServices: [],
}

type WeekdayOption = (typeof WEEKDAYS)[number]

const getMinDateTimeLocal = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

const getMinDate = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const clampToMinDateTime = (value: string, minValue: string): string => {
  if (!value || !minValue) return value
  return value < minValue ? minValue : value
}

interface EventFormProps {
  asModal?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  eventId?: string
}

const EventForm = ({ asModal = false, open = false, onOpenChange, eventId: eventIdProp }: EventFormProps = {}) => {
  const navigate = useNavigate()
  const { eventId: eventIdParam } = useParams<{ eventId: string }>()
  const eventId = eventIdProp || eventIdParam
  const isEditMode = !!eventId

  const { data: eventData } = useGetEventById(eventId || '', isEditMode)
  const { data: venuesData } = useListVenues()
  const createEventMutation = useCreateEvent()
  const updateEventMutation = useUpdateEvent()
  const deleteEventMutation = useDeleteEvent()
  const locationId = useLocationStore((s) => s.selectedLocationId)

  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const [scheduleTimes, setScheduleTimes] = useState<Record<string, { startTime: string; endTime: string }>>({})
  const [sameScheduleStartTime, setSameScheduleStartTime] = useState('')
  const [sameScheduleEndTime, setSameScheduleEndTime] = useState('')
  const [recurrenceDatePicker, setRecurrenceDatePicker] = useState('')

  const validationCtxRef = useRef<EventFormValidationContext>({
    isEditMode: !!eventId,
    venueServices: [],
    occurrenceDates: [],
    scheduleTimes: {},
    sameScheduleStartTime: '',
    sameScheduleEndTime: '',
    noOccurrencesMessage: '',
  })

  const eventFormSchema = useMemo(() => createEventFormSchema(() => validationCtxRef.current), [])

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: eventFormDefaultValues,
    mode: 'onChange',
  })

  const eventForm = watch()

  type VenueAvailabilityInfo = {
    available: boolean
    message?: string | null
  }
  const [venueAvailability, setVenueAvailability] = useState<Record<string, VenueAvailabilityInfo>>({})
  const [loadingVenueAvailability, setLoadingVenueAvailability] = useState(false)

  const resetForm = () => {
    reset(eventFormDefaultValues)
    setPosterFile(null)
    setPosterPreview(null)
    setScheduleTimes({})
    setSameScheduleStartTime('')
    setSameScheduleEndTime('')
    setRecurrenceDatePicker('')
    setVenueAvailability({})
  }

  const handleClose = () => {
    if (asModal) {
      resetForm()
      onOpenChange?.(false)
    } else {
      navigate('/admin/events')
    }
  }

  const handleSuccess = () => {
    if (asModal) {
      resetForm()
      onOpenChange?.(false)
    } else {
      navigate('/admin/events')
    }
  }

  useEffect(() => {
    if (asModal && open && !eventIdProp) {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asModal, open, eventIdProp])

  const venues = useMemo(
    () =>
      Array.isArray(venuesData?.data?.venues)
        ? venuesData.data.venues
        : Array.isArray(venuesData?.data?.records)
          ? venuesData.data.records
          : Array.isArray(venuesData?.data)
            ? venuesData.data
            : [],
    [venuesData],
  )

  const occupancyValue = Number(eventForm.occupancy)
  const hasValidOccupancy = Number.isFinite(occupancyValue) && occupancyValue > 0

  const filteredVenues = useMemo(() => {
    if (!hasValidOccupancy) return venues
    return venues.filter((venue: Venue) => Number(venue.occupancy) >= occupancyValue)
  }, [venues, hasValidOccupancy, occupancyValue])

  const isRecurring = isRegularRecurring(eventForm.eventType, eventForm.frequencyType)

  useEffect(() => {
    if (!eventForm.venueId) return
    const stillValid = filteredVenues.some((venue: Venue) => venue.id === eventForm.venueId)
    if (!stillValid) {
      setValue('venueId', '')
      setValue('selectedServices', [])
    }
  }, [filteredVenues, eventForm.venueId, setValue])

  useEffect(() => {
    if (!locationId || isRecurring || !eventForm.startDate || !eventForm.endDate || filteredVenues.length === 0) {
      setVenueAvailability({})
      return
    }

    let ignore = false
    const loadAvailability = async () => {
      try {
        setLoadingVenueAvailability(true)
        const startIso = new Date(eventForm.startDate).toISOString()
        const endIso = new Date(eventForm.endDate).toISOString()
        const results = await Promise.all(
          filteredVenues.map(async (venue: Venue) => {
            try {
              const res = await checkVenueAvailabilityAPI(locationId, {
                venueId: venue.id,
                startDate: startIso,
                endDate: endIso,
                excludeEventId: eventId || undefined,
              })
              const data = res?.data
              return [
                venue.id,
                {
                  available: data?.available !== false,
                  message: data?.message || null,
                } satisfies VenueAvailabilityInfo,
              ] as const
            } catch {
              return [venue.id, { available: true, message: null } satisfies VenueAvailabilityInfo] as const
            }
          }),
        )
        if (ignore) return
        const next: Record<string, VenueAvailabilityInfo> = {}
        for (const [id, info] of results) {
          next[id] = info
        }
        setVenueAvailability(next)

        const selectedId = eventForm.venueId
        if (selectedId && next[selectedId] && next[selectedId].available === false) {
          setValue('venueId', '')
          setValue('selectedServices', [])
          clearErrors('venueId')
        }
      } finally {
        if (!ignore) setLoadingVenueAvailability(false)
      }
    }

    void loadAvailability()
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, isRecurring, eventForm.startDate, eventForm.endDate, filteredVenues, eventId, setValue, clearErrors])

  const selectedVenue = useMemo(
    () => filteredVenues.find((v: Venue) => v.id === eventForm.venueId) as Venue | undefined,
    [filteredVenues, eventForm.venueId],
  )

  const venueServices = useMemo(() => parseJsonArray<AddOnService>(selectedVenue?.addOnServices), [selectedVenue])

  const event = eventData?.data?.event || eventData?.data || null

  const recurrenceConfig = useMemo(
    () => ({
      recurrenceDaysOfWeek: eventForm.recurrenceDaysOfWeek,
      recurrenceDayOfMonth: eventForm.recurrenceDayOfMonth,
      recurrenceMonth: eventForm.recurrenceMonth,
    }),
    [eventForm.recurrenceDaysOfWeek, eventForm.recurrenceDayOfMonth, eventForm.recurrenceMonth],
  )

  const selectedWeekdays = useMemo(
    () =>
      (eventForm.recurrenceDaysOfWeek || [])
        .map((value) => WEEKDAYS.find((day) => day.value === value))
        .filter((day): day is WeekdayOption => !!day),
    [eventForm.recurrenceDaysOfWeek],
  )

  const occurrenceDates = useMemo(() => {
    if (!isRecurring || !eventForm.startDate || !eventForm.endDate) return []
    return getOccurrenceDates(eventForm.frequencyType!, eventForm.startDate, eventForm.endDate, recurrenceConfig)
  }, [isRecurring, eventForm.frequencyType, eventForm.startDate, eventForm.endDate, recurrenceConfig])

  const noOccurrencesMessage = useMemo(() => {
    if (!isRecurring || !eventForm.startDate || !eventForm.endDate) return ''
    if (occurrenceDates.length > 0) return ''
    if (eventForm.frequencyType === 'weekly' && getWeeklyRecurrenceDays(recurrenceConfig).length === 0) {
      return ''
    }
    if (eventForm.frequencyType === 'monthly' && !eventForm.recurrenceDayOfMonth) {
      return ''
    }
    if (eventForm.frequencyType === 'yearly' && (!eventForm.recurrenceMonth || !eventForm.recurrenceDayOfMonth)) {
      return ''
    }
    return getNoOccurrencesMessage(eventForm.frequencyType!, recurrenceConfig)
  }, [
    isRecurring,
    eventForm.startDate,
    eventForm.endDate,
    eventForm.frequencyType,
    eventForm.recurrenceDayOfMonth,
    eventForm.recurrenceMonth,
    occurrenceDates.length,
    recurrenceConfig,
  ])

  validationCtxRef.current = {
    isEditMode,
    venueServices,
    occurrenceDates,
    scheduleTimes,
    sameScheduleStartTime,
    sameScheduleEndTime,
    noOccurrencesMessage,
  }

  useEffect(() => {
    if (event && isEditMode) {
      const formatDateTimeLocal = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }

      const formatDateOnly = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const start = new Date(event.startDate)
      const end = new Date(event.endDate)
      const eventType = (event.eventType === 'regular' ? 'regular' : 'special') as EventType
      const recurring = isRegularRecurring(eventType, event.frequencyType)

      reset({
        eventType,
        title: event.title,
        description: event.description || '',
        startDate: recurring ? formatDateOnly(start) : formatDateTimeLocal(start),
        endDate: recurring ? formatDateOnly(end) : formatDateTimeLocal(end),
        occupancy: event.occupancy ?? undefined,
        venueId: event.venueId,
        allowReservation: event.allowReservation,
        frequencyType: event.frequencyType,
        reservationPerFlat: event.reservationPerFlat ?? undefined,
        recurrenceDaysOfWeek: event.recurrenceDaysOfWeek?.length
          ? event.recurrenceDaysOfWeek
          : event.recurrenceDayOfWeek != null
            ? [event.recurrenceDayOfWeek]
            : [],
        recurrenceDayOfMonth: event.recurrenceDayOfMonth ?? undefined,
        recurrenceMonth: event.recurrenceMonth ?? undefined,
        poster: event.poster || '',
        entryFee: event.entryFee,
        selectedServices: parseJsonArray<AddOnService>(event.selectedServices),
        sameScheduleForAllDates: false,
      })

      if (event.recurrenceDayOfMonth && event.recurrenceMonth) {
        const year = start.getFullYear()
        const month = String(event.recurrenceMonth).padStart(2, '0')
        const day = String(event.recurrenceDayOfMonth).padStart(2, '0')
        setRecurrenceDatePicker(`${year}-${month}-${day}`)
      } else if (event.recurrenceDayOfMonth) {
        const year = start.getFullYear()
        const month = String(start.getMonth() + 1).padStart(2, '0')
        const day = String(event.recurrenceDayOfMonth).padStart(2, '0')
        setRecurrenceDatePicker(`${year}-${month}-${day}`)
      }

      if (recurring) {
        const pad = (n: number) => String(n).padStart(2, '0')
        const dateKey = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
        setScheduleTimes({
          [dateKey]: {
            startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
            endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
          },
        })
      }
    }
  }, [event, isEditMode, reset])

  useEffect(() => {
    if (!isRecurring || occurrenceDates.length === 0) {
      setScheduleTimes({})
      return
    }

    setScheduleTimes((prev) => {
      const next = { ...prev }
      let changed = false
      occurrenceDates.forEach((dateKey) => {
        if (!next[dateKey]) {
          next[dateKey] = { startTime: '00:00', endTime: '00:00' }
          changed = true
        }
      })
      Object.keys(next).forEach((key) => {
        if (!occurrenceDates.includes(key)) {
          delete next[key]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [isRecurring, occurrenceDates])

  useEffect(() => {
    if (eventForm.sameScheduleForAllDates && sameScheduleStartTime && sameScheduleEndTime) {
      setScheduleTimes((prev) => {
        const next = { ...prev }
        occurrenceDates.forEach((dateKey) => {
          next[dateKey] = {
            startTime: sameScheduleStartTime,
            endTime: sameScheduleEndTime,
          }
        })
        return next
      })
    }
  }, [eventForm.sameScheduleForAllDates, sameScheduleStartTime, sameScheduleEndTime, occurrenceDates])

  const handleEventTypeChange = (value: EventType) => {
    if (value === 'special') {
      setValue('eventType', value)
      setValue('frequencyType', 'once')
      setValue('recurrenceDaysOfWeek', [])
      setValue('recurrenceDayOfMonth', undefined)
      setValue('recurrenceMonth', undefined)
      setValue('sameScheduleForAllDates', false)
    } else {
      setValue('eventType', value)
      setValue('frequencyType', eventForm.frequencyType === 'once' ? 'daily' : eventForm.frequencyType)
    }
    setRecurrenceDatePicker('')
    setScheduleTimes({})
  }

  const handleRecurrenceDateChange = (value: string) => {
    setRecurrenceDatePicker(value)
    if (!value) return
    const date = new Date(`${value}T00:00:00`)
    if (eventForm.frequencyType === 'monthly') {
      setValue('recurrenceDayOfMonth', date.getDate())
    } else if (eventForm.frequencyType === 'yearly') {
      setValue('recurrenceMonth', date.getMonth() + 1)
      setValue('recurrenceDayOfMonth', date.getDate())
    }
  }

  const appendRecurrenceFields = (formData: FormData, values: EventFormValues) => {
    if (values.recurrenceDaysOfWeek && values.recurrenceDaysOfWeek.length > 0) {
      formData.append('recurrenceDaysOfWeek', JSON.stringify(values.recurrenceDaysOfWeek))
    }
    if (values.recurrenceDayOfMonth !== undefined) {
      formData.append('recurrenceDayOfMonth', String(values.recurrenceDayOfMonth))
    }
    if (values.recurrenceMonth !== undefined) {
      formData.append('recurrenceMonth', String(values.recurrenceMonth))
    }
  }

  const handleSameScheduleStartTimeChange = (value: string) => {
    setSameScheduleStartTime(value)
    if (sameScheduleEndTime && !isEndTimeAfterStart(value, sameScheduleEndTime)) {
      setSameScheduleEndTime(getMinEndTime(value))
    }
  }

  const handleSameScheduleEndTimeChange = (value: string) => {
    if (sameScheduleStartTime && value && !isEndTimeAfterStart(sameScheduleStartTime, value)) {
      toast.error('End time must be after start time')
      setSameScheduleEndTime(getMinEndTime(sameScheduleStartTime))
      return
    }
    setSameScheduleEndTime(value)
  }

  const handleOccurrenceStartTimeChange = (dateKey: string, value: string) => {
    setScheduleTimes((prev) => {
      const currentEnd = prev[dateKey]?.endTime || ''
      const nextEnd = currentEnd && !isEndTimeAfterStart(value, currentEnd) ? getMinEndTime(value) : currentEnd
      return {
        ...prev,
        [dateKey]: {
          startTime: value,
          endTime: nextEnd,
        },
      }
    })
  }

  const handleOccurrenceEndTimeChange = (dateKey: string, value: string) => {
    const startTime = scheduleTimes[dateKey]?.startTime || ''
    if (startTime && value && !isEndTimeAfterStart(startTime, value)) {
      toast.error('End time must be after start time')
      setScheduleTimes((prev) => ({
        ...prev,
        [dateKey]: {
          startTime,
          endTime: getMinEndTime(startTime),
        },
      }))
      return
    }
    setScheduleTimes((prev) => ({
      ...prev,
      [dateKey]: {
        startTime,
        endTime: value,
      },
    }))
  }

  const onInvalid = (fieldErrors: FieldErrors<EventFormValues>) => {
    const rootMessage = fieldErrors.root?.message
    if (rootMessage) {
      notifyError(String(rootMessage))
      return
    }
    const firstError = Object.values(fieldErrors).find((err) => err && typeof err === 'object' && 'message' in err)
    notifyError(String(firstError?.message || 'Please fix the form errors'))
  }

  const onSubmit = async (values: EventFormValues) => {
    if (isEditMode && !eventId) return

    if (locationId && values.venueId) {
      try {
        if (!isRecurring && values.startDate && values.endDate) {
          const availabilityRes = await checkVenueAvailabilityAPI(locationId, {
            venueId: values.venueId,
            startDate: new Date(values.startDate).toISOString(),
            endDate: new Date(values.endDate).toISOString(),
            excludeEventId: eventId || undefined,
          })
          const availability = availabilityRes?.data
          if (availability && availability.available === false) {
            setError('venueId', {
              type: 'manual',
              message:
                availability.message || availabilityRes?.message || 'This Venue is booked for the selected schedule',
            })
            return
          }
        } else if (isRecurring && occurrenceDates.length > 0) {
          const timesToUse = values.sameScheduleForAllDates
            ? Object.fromEntries(
                occurrenceDates.map((dateKey) => [
                  dateKey,
                  { startTime: sameScheduleStartTime, endTime: sameScheduleEndTime },
                ]),
              )
            : scheduleTimes
          const eventOccurrences = buildEventOccurrences(occurrenceDates, timesToUse)
          for (const occurrence of eventOccurrences) {
            const availabilityRes = await checkVenueAvailabilityAPI(locationId, {
              venueId: values.venueId,
              startDate: new Date(occurrence.startDate).toISOString(),
              endDate: new Date(occurrence.endDate).toISOString(),
              excludeEventId: eventId || undefined,
            })
            const availability = availabilityRes?.data
            if (availability && availability.available === false) {
              setError('venueId', {
                type: 'manual',
                message:
                  availability.message || availabilityRes?.message || 'This Venue is booked for the selected schedule',
              })
              return
            }
          }
        }
      } catch (err) {
        console.error(err)
        setError('venueId', { type: 'manual', message: 'Failed to check venue availability' })
        return
      }
    }

    const formData = new FormData()
    formData.append('eventType', values.eventType || 'special')
    formData.append('title', values.title)
    formData.append('description', values.description || '')
    formData.append('venueId', values.venueId)
    formData.append('frequencyType', values.frequencyType || 'once')
    formData.append('allowReservation', String(values.allowReservation))
    formData.append('occupancy', String(values.occupancy))

    if (values.allowReservation && values.reservationPerFlat) {
      formData.append('reservationPerFlat', String(values.reservationPerFlat))
    }

    if (values.entryFee !== undefined && values.entryFee !== null) {
      formData.append('entryFee', values.entryFee.toString())
    }

    formData.append('selectedServices', JSON.stringify(values.selectedServices || []))

    if (posterFile) {
      formData.append('poster', posterFile)
    }

    appendRecurrenceFields(formData, values)

    if (isRecurring) {
      const timesToUse = values.sameScheduleForAllDates
        ? Object.fromEntries(
            occurrenceDates.map((dateKey) => [
              dateKey,
              {
                startTime: sameScheduleStartTime,
                endTime: sameScheduleEndTime,
              },
            ]),
          )
        : scheduleTimes

      const eventOccurrences = buildEventOccurrences(occurrenceDates, timesToUse)
      eventOccurrences.forEach((occurrence, index) => {
        formData.append(`eventOccurrences[${index}][startDate]`, occurrence.startDate)
        formData.append(`eventOccurrences[${index}][endDate]`, occurrence.endDate)
      })

      formData.append('startDate', new Date(`${values.startDate}T00:00:00`).toISOString())
      formData.append('endDate', new Date(`${values.endDate}T23:59:59`).toISOString())
    } else {
      formData.append('startDate', new Date(values.startDate).toISOString())
      formData.append('endDate', new Date(values.endDate).toISOString())
    }

    if (isEditMode) {
      updateEventMutation.mutate(
        { eventId: eventId!, data: formData as unknown as FormData },
        { onSuccess: handleSuccess },
      )
    } else {
      createEventMutation.mutate(formData as unknown as FormData, {
        onSuccess: handleSuccess,
      })
    }
  }

  const handlePosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPosterFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPosterPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteEvent = () => {
    if (!eventId) return
    if (confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(eventId, {
        onSuccess: () => {
          if (event?.startDate) {
            const eventDate = new Date(event.startDate)
            navigate(`/admin/events?year=${eventDate.getFullYear()}&month=${eventDate.getMonth() + 1}`)
          } else {
            navigate('/admin/events')
          }
        },
      })
    }
  }

  if (isEditMode && !event && eventData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Event not found</div>
      </div>
    )
  }

  const isPending = createEventMutation.isPending || updateEventMutation.isPending

  const frequencyOptions: { value: FrequencyType; label: string }[] =
    eventForm.eventType === 'special'
      ? [{ value: 'once', label: 'Once' }]
      : [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: 'Yearly' },
        ]

  const formFields = (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/60 p-4 sm:p-5">
        {errors.root?.message && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </p>
        )}
        <FormSection
          icon={CalendarDays}
          title="Event details"
          description="What kind of event is this and what is it about?"
        >
          <div>
            <Label className="mb-1.5">Event Type *</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EVENT_TYPE_OPTIONS.map(({ value, label, hint, icon: TypeIcon }) => {
                const active = eventForm.eventType === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleEventTypeChange(value)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                      active
                        ? value === 'special'
                          ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-400/20'
                          : 'border-[#005390] bg-[#005390]/5 ring-2 ring-[#005390]/20'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        active
                          ? value === 'special'
                            ? 'bg-purple-500 text-white'
                            : 'bg-[#005390] text-white'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      <TypeIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{label}</span>
                      <span className="block text-xs text-gray-500">{hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label className="mb-1.5">Event Title *</Label>
            <Input
              {...register('title', {
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/[0-9]/g, '')
                },
              })}
              error={errors.title?.message}
              placeholder="e.g. Diwali Celebration"
            />
          </div>

          <div>
            <Label className="mb-1.5">Description</Label>
            <Textarea
              {...register('description')}
              placeholder="Tell residents what to expect"
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description?.message && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
          </div>
        </FormSection>

        <FormSection
          icon={CalendarClock}
          title="Schedule"
          description={
            isRecurring ? 'How often it repeats and the date range it runs over.' : 'When the event starts and ends.'
          }
        >
          <div>
            <Label className="mb-1.5">Frequency *</Label>
            {eventForm.eventType === 'special' ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Special events happen <span className="font-semibold text-gray-700">once</span>.
              </p>
            ) : (
              <Controller
                name="frequencyType"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Frequency">
                    {frequencyOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={field.value === opt.value}
                        onClick={() => {
                          field.onChange(opt.value)
                          setValue('recurrenceDaysOfWeek', [])
                          setValue('recurrenceDayOfMonth', undefined)
                          setValue('recurrenceMonth', undefined)
                          setRecurrenceDatePicker('')
                          setScheduleTimes({})
                        }}
                        className={cn(
                          'h-8 cursor-pointer rounded-lg border px-3.5 text-xs font-semibold transition-colors',
                          field.value === opt.value
                            ? 'border-[#005390] bg-[#005390] text-white shadow-xs'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-[#005390]/40 hover:text-[#005390]',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            )}
            {errors.frequencyType?.message && (
              <p className="text-sm text-red-600 mt-1">{errors.frequencyType.message}</p>
            )}
          </div>

          {eventForm.frequencyType === 'weekly' && eventForm.eventType === 'regular' && (
            <div className="space-y-2">
              <Label className="mb-1.5">Select Days *</Label>
              <Combobox
                multiple
                items={WEEKDAYS}
                value={selectedWeekdays}
                onValueChange={(days) =>
                  setValue(
                    'recurrenceDaysOfWeek',
                    days.map((day) => day.value).sort((a, b) => a - b),
                  )
                }
                itemToStringLabel={(item) => item.label}
                isItemEqualToValue={(a, b) => a.value === b.value}
              >
                <ComboboxInput placeholder="Select days..." className="w-full rounded-xl" showTrigger />
                <ComboboxContent side="bottom" align="start" className="w-[var(--anchor-width)]">
                  <ComboboxList className="max-h-60">
                    {(day: WeekdayOption) => (
                      <ComboboxItem key={day.value} value={day} className="text-xs py-2">
                        {day.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                  <ComboboxEmpty className="text-xs text-gray-500 py-2">No days found</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
              {selectedWeekdays.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedWeekdays.map((day) => (
                    <span
                      key={day.value}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-[#005390] border border-blue-100"
                    >
                      {day.label}
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            'recurrenceDaysOfWeek',
                            (eventForm.recurrenceDaysOfWeek || []).filter((value) => value !== day.value),
                          )
                        }
                        className="p-0.5 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                        aria-label={`Remove ${day.label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {(eventForm.frequencyType === 'monthly' || eventForm.frequencyType === 'yearly') &&
            eventForm.eventType === 'regular' && (
              <div>
                <Label className="mb-1.5">Select Date *</Label>
                <Input
                  type="date"
                  value={recurrenceDatePicker}
                  onChange={(e) => handleRecurrenceDateChange(e.target.value)}
                />
              </div>
            )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5">{isRecurring ? 'Select Start Date *' : 'Select Start Date & Time *'}</Label>
              <Input
                type={isRecurring ? 'date' : 'datetime-local'}
                min={isRecurring ? getMinDate() : getMinDateTimeLocal()}
                max="9999-12-31"
                {...register('startDate', {
                  onChange: (e) => {
                    const rawValue = e.target.value
                    const minNow = isRecurring ? getMinDate() : getMinDateTimeLocal()
                    const newStartDate = clampToMinDateTime(rawValue, minNow)
                    setValue('startDate', newStartDate, { shouldValidate: true })
                    if (eventForm.endDate && eventForm.endDate < newStartDate) {
                      setValue('endDate', '', { shouldValidate: true })
                    }
                  },
                })}
                error={errors.startDate?.message}
              />
            </div>
            <div>
              <Label className="mb-1.5">{isRecurring ? 'Select End Date *' : 'Select End Date & Time *'}</Label>
              <Input
                type={isRecurring ? 'date' : 'datetime-local'}
                min={eventForm.startDate || (isRecurring ? getMinDate() : getMinDateTimeLocal())}
                max="9999-12-31"
                {...register('endDate', {
                  onChange: (e) => {
                    const rawValue = e.target.value
                    const minEnd = eventForm.startDate || (isRecurring ? getMinDate() : getMinDateTimeLocal())
                    setValue('endDate', clampToMinDateTime(rawValue, minEnd), { shouldValidate: true })
                  },
                })}
                error={errors.endDate?.message}
              />
            </div>
          </div>

          {isRecurring && eventForm.startDate && eventForm.endDate && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
              {noOccurrencesMessage ? (
                <p className="text-sm text-red-600">{noOccurrencesMessage}</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="sameScheduleForAllDates"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="sameSchedule"
                          checked={field.value ?? false}
                          onCheckedChange={(checked) => field.onChange(checked as boolean)}
                        />
                      )}
                    />
                    <Label htmlFor="sameSchedule" className="cursor-pointer text-sm font-medium">
                      Same schedule for all dates
                    </Label>
                  </div>

                  {eventForm.sameScheduleForAllDates ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="mb-1.5">Select Start Time *</Label>
                        <Input
                          type="time"
                          value={sameScheduleStartTime}
                          onChange={(e) => handleSameScheduleStartTimeChange(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5">Select End Time *</Label>
                        <Input
                          type="time"
                          value={sameScheduleEndTime}
                          min={sameScheduleStartTime ? getMinEndTime(sameScheduleStartTime) : undefined}
                          disabled={!sameScheduleStartTime}
                          onChange={(e) => handleSameScheduleEndTimeChange(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                      {occurrenceDates.map((dateKey) => (
                        <div key={dateKey} className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="mb-2 text-sm font-semibold text-gray-800">
                            {formatOccurrenceDateLabel(dateKey)}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs mb-1.5">Select Start Time *</Label>
                              <Input
                                type="time"
                                value={scheduleTimes[dateKey]?.startTime || ''}
                                onChange={(e) => handleOccurrenceStartTimeChange(dateKey, e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5">Select End Time *</Label>
                              <Input
                                type="time"
                                value={scheduleTimes[dateKey]?.endTime || ''}
                                min={
                                  scheduleTimes[dateKey]?.startTime
                                    ? getMinEndTime(scheduleTimes[dateKey]!.startTime)
                                    : undefined
                                }
                                disabled={!scheduleTimes[dateKey]?.startTime}
                                onChange={(e) => handleOccurrenceEndTimeChange(dateKey, e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.root?.message && <p className="text-sm text-red-600">{errors.root.message}</p>}
                </>
              )}
            </div>
          )}
        </FormSection>

        <FormSection icon={MapPin} title="Venue" description="Enter the expected headcount to see venues that fit.">
          <Input
            id="event-occupancy-input"
            label="Occupancy *"
            type="number"
            min={1}
            step={1}
            {...register('occupancy', {
              setValueAs: (value) => {
                if (value === '' || value === null || value === undefined) return undefined
                const parsed = Number(value)
                return Number.isNaN(parsed) ? undefined : parsed
              },
            })}
            error={errors.occupancy?.message}
            placeholder="e.g. 50"
          />

          <div>
            <Label className="mb-1.5">Select Venue *</Label>
            {!hasValidOccupancy ? (
              <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
                Enter occupancy first to see matching venues
              </p>
            ) : filteredVenues.length === 0 ? (
              <p className="text-sm text-red-600 mt-1">No Venue is available for {occupancyValue} occupancy</p>
            ) : (
              <div className="space-y-2">
                {loadingVenueAvailability && !isRecurring && eventForm.startDate && eventForm.endDate && (
                  <p className="text-xs text-muted-foreground">Checking venue availability...</p>
                )}
                <div className="max-h-72 overflow-y-auto space-y-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2">
                  {filteredVenues.map((venue: Venue) => {
                    const availability = venueAvailability[venue.id]
                    const isBooked = availability?.available === false
                    const isSelected = eventForm.venueId === venue.id
                    return (
                      <button
                        key={venue.id}
                        type="button"
                        disabled={isBooked}
                        onClick={() => {
                          if (isBooked) return
                          setValue('venueId', venue.id, { shouldValidate: true })
                          setValue('selectedServices', [])
                          clearErrors('venueId')
                        }}
                        className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                          isBooked
                            ? 'bg-red-50/80 border-red-200 cursor-not-allowed opacity-90'
                            : isSelected
                              ? 'bg-white border-[#005390] ring-2 ring-[#005390]/20 shadow-sm'
                              : 'bg-white border-gray-200 hover:border-[#005390]/50 hover:bg-white cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold truncate ${isBooked ? 'text-gray-500' : 'text-gray-900'}`}>
                              {venue.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span>
                                <span className="font-semibold text-gray-400">Occupancy </span>
                                <span className={`font-semibold ${isBooked ? 'text-gray-500' : 'text-[#005390]'}`}>
                                  {venue.occupancy}
                                </span>
                              </span>
                              {venue.price != null && (
                                <span>
                                  <span className="font-semibold text-gray-400">Cost </span>
                                  <span className={`font-semibold ${isBooked ? 'text-gray-500' : 'text-[#005390]'}`}>
                                    ₹{Number(venue.price).toLocaleString('en-IN')}
                                  </span>
                                </span>
                              )}
                            </div>
                            {isBooked && (
                              <p className="mt-2 text-xs font-medium text-red-600 leading-snug">
                                {availability?.message || 'This Venue is booked for the selected schedule'}
                              </p>
                            )}
                          </div>
                          {isSelected && !isBooked && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#005390] bg-blue-50 px-2 py-1 rounded-md">
                              Selected
                            </span>
                          )}
                          {isBooked && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-100 px-2 py-1 rounded-md">
                              Unavailable
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {errors.venueId?.message && filteredVenues.length > 0 && (
              <p className="text-sm text-red-600 mt-1">{errors.venueId.message}</p>
            )}
          </div>

          {eventForm.venueId && (
            <Controller
              name="selectedServices"
              control={control}
              render={({ field }) => (
                <div>
                  <EventVenueServicesSelect
                    services={venueServices}
                    selectedServices={field.value || []}
                    onChange={field.onChange}
                  />
                  {errors.selectedServices?.message && (
                    <p className="text-sm text-red-600 mt-1">{errors.selectedServices.message}</p>
                  )}
                </div>
              )}
            />
          )}
        </FormSection>

        <FormSection icon={Ticket} title="Reservations & pricing" description="Control sign-ups and any entry fee.">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3">
            <div>
              <Label htmlFor="allowReservation" className="cursor-pointer text-sm font-semibold text-gray-900">
                Allow reservations
              </Label>
              <p className="text-xs text-gray-500">Residents must book a spot before attending.</p>
            </div>
            <Controller
              name="allowReservation"
              control={control}
              render={({ field }) => (
                <Switch
                  id="allowReservation"
                  checked={field.value ?? false}
                  className="data-checked:bg-green-600"
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    if (!checked) {
                      setValue('reservationPerFlat', undefined)
                    }
                  }}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {eventForm.allowReservation && (
              <div>
                <Label className="mb-1.5">Reservations per flat *</Label>
                <Input
                  type="number"
                  min="1"
                  {...register('reservationPerFlat', {
                    setValueAs: (value) => {
                      if (value === '' || value === null || value === undefined) return undefined
                      const parsed = Number(value)
                      return Number.isNaN(parsed) ? undefined : parsed
                    },
                  })}
                  error={errors.reservationPerFlat?.message}
                  placeholder="Enter reservation per flat"
                />
              </div>
            )}

            <div>
              <Label className="mb-1.5">Entry fee (optional)</Label>
              <Input
                icon={<IndianRupee className="h-4 w-4" />}
                type="number"
                step="0.01"
                min="0"
                {...register('entryFee', {
                  setValueAs: (value) => {
                    if (value === '' || value === null || value === undefined) return undefined
                    const parsed = Number(value)
                    return Number.isNaN(parsed) ? undefined : parsed
                  },
                })}
                placeholder="0.00"
              />
            </div>
          </div>
        </FormSection>

        <FormSection icon={ImagePlus} title="Poster" description="Shown to residents on the event card.">
          {(() => {
            const posterSrc = posterPreview || eventForm.poster
            return (
              <label
                htmlFor="event-poster-input"
                className={cn(
                  'group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors',
                  posterSrc
                    ? 'h-48 border-gray-200'
                    : 'h-36 border-gray-300 bg-gray-50 hover:border-[#005390]/50 hover:bg-blue-50/40',
                )}
              >
                {posterSrc ? (
                  <>
                    <img src={posterSrc} alt="Poster preview" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Upload className="h-4 w-4" />
                      Change poster
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#005390] shadow-xs">
                      <Upload className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-gray-700">Click to upload a poster</span>
                    <span className="text-xs text-gray-400">PNG or JPG, landscape works best</span>
                  </span>
                )}
                <input
                  id="event-poster-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePosterFileChange}
                />
              </label>
            )
          })()}
        </FormSection>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        {isEditMode ? (
          <Button
            type="button"
            variant="ghost"
            onClick={handleDeleteEvent}
            disabled={deleteEventMutation.isPending}
            className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Event
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1 cursor-pointer sm:flex-none">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 cursor-pointer bg-[#005390] text-white hover:bg-[#004273] sm:flex-none sm:min-w-32"
          >
            {isPending ? (isEditMode ? 'Saving...' : 'Creating...') : isEditMode ? 'Save Changes' : 'Create Event'}
          </Button>
        </div>
      </div>
    </form>
  )

  if (asModal) {
    return (
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) resetForm()
          onOpenChange?.(value)
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[760px]">
          <DialogHeader className="flex-row items-center gap-3 border-b border-gray-100 px-5 py-4 pr-12">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#005390] text-white">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-gray-900">
                {isEditMode ? 'Edit Event' : 'Create an Event'}
              </DialogTitle>
              <DialogDescription className="truncate text-xs">
                {isEditMode && event?.title ? event.title : 'Fill in the details residents will see.'}
              </DialogDescription>
            </div>
          </DialogHeader>
          {formFields}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div>
      <div>
        <Button variant="ghost" onClick={() => navigate('/admin/events/list')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
        <h2 className="text-2xl font-bold text-gray-700">{isEditMode ? 'Edit Event' : 'Create an Event'}</h2>
      </div>

      <div className="mt-5 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">{formFields}</div>
    </div>
  )
}

export default EventForm
