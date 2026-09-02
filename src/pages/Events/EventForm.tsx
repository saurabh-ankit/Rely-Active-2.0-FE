import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateEvent,
  useDeleteEvent,
  useGetEventById,
  useListVenues,
  useUpdateEvent,
} from '@/hooks/react-query/events'
import type { AddOnService, EventType, FrequencyType, Venue } from '@/lib/services/eventService'
import { parseJsonArray } from '@/lib/utils/jsonUtils'
import { ArrowLeft, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { notifyError } from '@/utils/toast'
import {
  createEventFormSchema,
  eventFormDefaultValues,
  type EventFormValues,
  type EventFormValidationContext,
} from '@/validations/eventForm.validation'
import { EventVenueServicesSelect } from './components/EventVenueServicesSelect'
import {
  buildEventOccurrences,
  formatOccurrenceDateLabel,
  getMinEndTime,
  getNoOccurrencesMessage,
  getOccurrenceDates,
  getWeeklyRecurrenceDays,
  isEndTimeAfterStart,
  WEEKDAYS,
} from './utils/eventScheduleUtils'

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

const isRegularRecurring = (eventType?: EventType, frequencyType?: FrequencyType) =>
  eventType === 'regular' && !!frequencyType && frequencyType !== 'once'

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
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: eventFormDefaultValues,
    mode: 'onChange',
  })

  const eventForm = watch()

  const resetForm = () => {
    reset(eventFormDefaultValues)
    setPosterFile(null)
    setPosterPreview(null)
    setScheduleTimes({})
    setSameScheduleStartTime('')
    setSameScheduleEndTime('')
    setRecurrenceDatePicker('')
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

  const selectedVenue = useMemo(
    () => venues.find((v: Venue) => v.id === eventForm.venueId) as Venue | undefined,
    [venues, eventForm.venueId],
  )

  const venueServices = useMemo(() => parseJsonArray<AddOnService>(selectedVenue?.addOnServices), [selectedVenue])

  const event = eventData?.data?.event || eventData?.data || null

  const isRecurring = isRegularRecurring(eventForm.eventType, eventForm.frequencyType)

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
        venueId: event.venueId,
        allowReservation: event.allowReservation,
        frequencyType: event.frequencyType,
        maxCapacity: event.maxCapacity ?? undefined,
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

  const onSubmit = (values: EventFormValues) => {
    if (isEditMode && !eventId) return

    const formData = new FormData()
    formData.append('eventType', values.eventType || 'special')
    formData.append('title', values.title)
    formData.append('description', values.description || '')
    formData.append('venueId', values.venueId)
    formData.append('frequencyType', values.frequencyType || 'once')
    formData.append('allowReservation', String(values.allowReservation))

    if (values.allowReservation && values.maxCapacity) {
      formData.append('maxCapacity', String(values.maxCapacity))
    }
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
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6">
      {errors.root?.message && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5">Event Type *</Label>
          <Controller
            name="eventType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => handleEventTypeChange(value as EventType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Event</SelectItem>
                  <SelectItem value="special">Special Event</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label className="mb-1.5">Frequency Type *</Label>
          <Controller
            name="frequencyType"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                disabled={eventForm.eventType === 'special'}
                onValueChange={(value) => {
                  field.onChange(value as FrequencyType)
                  setValue('recurrenceDaysOfWeek', [])
                  setValue('recurrenceDayOfMonth', undefined)
                  setValue('recurrenceMonth', undefined)
                  setRecurrenceDatePicker('')
                  setScheduleTimes({})
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.frequencyType?.message && <p className="text-sm text-red-600 mt-1">{errors.frequencyType.message}</p>}
        </div>
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

      <div>
        <Label className="mb-1.5">Event Title *</Label>
        <Input
          {...register('title', {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/[0-9]/g, '')
            },
          })}
          error={errors.title?.message}
          placeholder="Event title"
        />
      </div>

      <div>
        <Label className="mb-1.5">Description *</Label>
        <Textarea
          {...register('description')}
          placeholder="Enter description"
          rows={4}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description?.message && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5">{isRecurring ? 'Select Start Date *' : 'Select Start Date & Time *'}</Label>
          <Input
            type={isRecurring ? 'date' : 'datetime-local'}
            min={isEditMode ? undefined : isRecurring ? getMinDate() : getMinDateTimeLocal()}
            max="9999-12-31"
            {...register('startDate', {
              onChange: (e) => {
                const rawValue = e.target.value
                const minNow = isEditMode ? '' : isRecurring ? getMinDate() : getMinDateTimeLocal()
                const newStartDate = isEditMode ? rawValue : clampToMinDateTime(rawValue, minNow)
                setValue('startDate', newStartDate)
                if (eventForm.endDate && eventForm.endDate < newStartDate) {
                  setValue('endDate', '')
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
            min={eventForm.startDate || (isEditMode ? undefined : isRecurring ? getMinDate() : getMinDateTimeLocal())}
            max="9999-12-31"
            {...register('endDate', {
              onChange: (e) => {
                const rawValue = e.target.value
                const minEnd = eventForm.startDate || ''
                setValue('endDate', clampToMinDateTime(rawValue, minEnd))
              },
            })}
            error={errors.endDate?.message}
          />
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Select Venue *</Label>
        <Controller
          name="venueId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value)
                setValue('selectedServices', [])
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue: Venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                    {venue.price != null ? ` — ₹${Number(venue.price).toLocaleString('en-IN')}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.venueId?.message && <p className="text-sm text-red-600 mt-1">{errors.venueId.message}</p>}
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

      <div className="flex items-center gap-2">
        <Controller
          name="allowReservation"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="allowReservation"
              checked={field.value ?? false}
              onCheckedChange={(checked) => {
                const isChecked = checked as boolean
                field.onChange(isChecked)
                if (!isChecked) {
                  setValue('maxCapacity', undefined)
                  setValue('reservationPerFlat', undefined)
                }
              }}
            />
          )}
        />
        <Label htmlFor="allowReservation" className="cursor-pointer text-sm font-medium">
          Allow Reservation
        </Label>
      </div>

      {eventForm.allowReservation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Max Capacity *</Label>
            <Input
              type="number"
              min="1"
              {...register('maxCapacity', { valueAsNumber: true })}
              error={errors.maxCapacity?.message}
              placeholder="Enter max capacity"
            />
          </div>
          <div>
            <Label className="mb-1.5">Reservation Per Flat</Label>
            <Input
              type="number"
              min="1"
              {...register('reservationPerFlat', { valueAsNumber: true })}
              error={errors.reservationPerFlat?.message}
              placeholder="Enter reservation per flat"
            />
          </div>
        </div>
      )}

      {isRecurring && eventForm.startDate && eventForm.endDate && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {occurrenceDates.map((dateKey) => (
                    <div key={dateKey} className="bg-white p-3 rounded border border-gray-200">
                      <div className="font-medium text-sm text-gray-700 mb-2">{formatOccurrenceDateLabel(dateKey)}</div>
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

      <div>
        <Label className="mb-1.5">Poster Image</Label>
        <Input type="file" accept="image/*" onChange={handlePosterFileChange} />
        {posterPreview && (
          <div className="mt-2">
            <img
              src={posterPreview}
              alt="Poster preview"
              className="w-48 h-32 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}
        {!posterPreview && eventForm.poster && (
          <div className="mt-2">
            <img
              src={eventForm.poster}
              alt="Current poster"
              className="w-48 h-32 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}
      </div>

      <div>
        <Label className="mb-1.5">Entry Fee (Optional)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          {...register('entryFee', { valueAsNumber: true })}
          placeholder="0.00"
        />
      </div>

      <div className={`flex pt-4 border-t ${isEditMode ? 'justify-between items-center' : 'justify-end gap-4'}`}>
        {isEditMode && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteEvent}
            disabled={deleteEventMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Event
          </Button>
        )}
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={handleClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="border-[#2a517c] text-white hover:bg-[#2a517c] hover:text-white cursor-pointer"
          >
            {isPending ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Event' : 'Create'}
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
        <DialogContent className="sm:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Event' : 'Create an Event'}</DialogTitle>
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

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent>{formFields}</CardContent>
      </Card>
    </div>
  )
}

export default EventForm
