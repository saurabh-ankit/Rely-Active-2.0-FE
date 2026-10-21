import { Label } from '@/components/ui/label'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Search, UserRound, X } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { getResidentsAPI } from '@/lib/services/residentService'
import {
  blockAmenitySlotAPI,
  cancelAmenitySlotBookingAPI,
  createAmenitySlotBookingAPI,
  getAmenitySlotConfigAPI,
  getAmenitySlotsForDateAPI,
  type AmenitySlotConfigResponse,
  type AmenitySlotItem,
  type AmenitySlotSetup,
  type AmenitySlotsForDateResponse,
  unblockAmenitySlotAPI,
  updateAmenitySlotConfigAPI,
} from '@/lib/services/amenitySlotService'
import type { ResidentItem } from '@/lib/types'
import { notifyError, notifySuccess } from '@/utils/toast'

interface AmenitySummary {
  id: string
  name: string
  slotBookable: boolean
  availableFrom?: string | null
  availableTo?: string | null
}

interface SlotManagerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amenity: AmenitySummary | null
  locationId: string
  onConfigUpdated: (amenityId: string, configResponse: AmenitySlotConfigResponse) => void
}

type SlotTab = 'bookings' | 'setup'

interface SlotConfigDraft {
  openMinutes: number
  closeMinutes: number
  durationMin: number
  capacity: number
  daysOfWeek: number[]
}

const MINUTES_PER_DAY = 24 * 60

const toYmd = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const parseTimeToMinutes = (value: string): number | null => {
  const parts = value.split(':').map((part) => Number(part))
  const h = parts[0]
  const m = parts[1]
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

const formatMinutesToInput = (minutes: number): string => {
  const safe = Math.max(0, Math.min(minutes, MINUTES_PER_DAY - 1))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const formatMinutesAmPm = (minutes: number): string => {
  const safe = Math.max(0, Math.min(minutes, MINUTES_PER_DAY))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}

const startOfWeekMonday = (date: Date): Date => {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const next = new Date(date)
  next.setDate(date.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const dayMon0 = (date: Date): number => {
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}

const generateSlotStarts = (openMinutes: number, closeMinutes: number, durationMin: number): number[] => {
  if (closeMinutes <= openMinutes || durationMin <= 0) return []
  const starts: number[] = []
  for (let cursor = openMinutes; cursor + durationMin <= closeMinutes; cursor += durationMin) {
    starts.push(cursor)
  }
  return starts
}

const normalizeDays = (days: number[]): number[] => Array.from(new Set(days)).sort((a, b) => a - b)

const defaultDraft = (): SlotConfigDraft => ({
  openMinutes: 7 * 60,
  closeMinutes: 22 * 60,
  durationMin: 60,
  capacity: 1,
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
})

const slotStatusClasses: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:border-emerald-400',
  PARTIALLY_BOOKED: 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:border-emerald-400',
  BOOKED: 'bg-amber-50 border-amber-200 text-amber-900 hover:border-amber-300',
  BLOCKED: 'bg-gray-100 border-gray-300 text-gray-600',
  PAST: 'bg-gray-100 border-gray-300 text-gray-500 opacity-70 cursor-not-allowed',
  LEGACY_BOOKED: 'bg-orange-50 border-orange-200 text-orange-900 hover:border-orange-300',
}

const groupedPeriodOrder = ['MORNING', 'AFTERNOON', 'EVENING'] as const
const periodLabel: Record<(typeof groupedPeriodOrder)[number], string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
}

export function SlotManagerDrawer({
  open,
  onOpenChange,
  amenity,
  locationId,
  onConfigUpdated,
}: SlotManagerDrawerProps) {
  const [activeTab, setActiveTab] = useState<SlotTab>('bookings')
  const [configResponse, setConfigResponse] = useState<AmenitySlotConfigResponse | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [slotsResponse, setSlotsResponse] = useState<AmenitySlotsForDateResponse | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [draft, setDraft] = useState<SlotConfigDraft>(defaultDraft())
  const [savingConfig, setSavingConfig] = useState(false)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const [activeSlot, setActiveSlot] = useState<AmenitySlotItem | null>(null)
  const [residentQuery, setResidentQuery] = useState('')
  const [residentResults, setResidentResults] = useState<ResidentItem[]>([])
  const [residentLoading, setResidentLoading] = useState(false)
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
  const [bookingPending, setBookingPending] = useState(false)
  const initialLoadKeyRef = useRef<string | null>(null)

  const selectedDateYmd = useMemo(() => toYmd(selectedDate), [selectedDate])

  const loadConfig = useCallback(
    async (targetAmenityId: string, availableFrom?: string | null, availableTo?: string | null) => {
      setConfigLoading(true)
      try {
        const data = await getAmenitySlotConfigAPI(locationId, targetAmenityId)
        setConfigResponse(data)
        onConfigUpdated(targetAmenityId, data)

        if (data.hasSetup && data.config) {
          setDraft({
            openMinutes: data.config.openMinutes,
            closeMinutes: data.config.closeMinutes,
            durationMin: data.config.durationMin,
            capacity: data.config.capacity,
            daysOfWeek: normalizeDays(data.config.daysOfWeek),
          })
        } else {
          const base = defaultDraft()
          const fallback = data.suggestedWindow
          if (fallback && fallback.closeMinutes > fallback.openMinutes) {
            base.openMinutes = fallback.openMinutes
            base.closeMinutes = fallback.closeMinutes
          } else if (availableFrom && availableTo) {
            const from = parseTimeToMinutes(availableFrom)
            const to = parseTimeToMinutes(availableTo)
            if (from !== null && to !== null && to > from) {
              base.openMinutes = from
              base.closeMinutes = to
            }
          }
          setDraft(base)
        }
      } catch (error) {
        const err = error as { response?: { data?: { message?: string } }; message?: string }
        notifyError(err?.response?.data?.message || err?.message || 'Failed to load slot setup')
      } finally {
        setConfigLoading(false)
      }
    },
    [locationId, onConfigUpdated],
  )

  const loadSlots = useCallback(
    async (targetAmenityId: string, dateYmd: string) => {
      setSlotsLoading(true)
      try {
        const data = await getAmenitySlotsForDateAPI(locationId, targetAmenityId, dateYmd)
        setSlotsResponse(data)
      } catch (error) {
        const err = error as { response?: { data?: { message?: string } }; message?: string }
        notifyError(err?.response?.data?.message || err?.message || 'Failed to load slots')
        setSlotsResponse(null)
      } finally {
        setSlotsLoading(false)
      }
    },
    [locationId],
  )

  useEffect(() => {
    if (!open) {
      initialLoadKeyRef.current = null
      return
    }
    if (!amenity) return
    const loadKey = `${locationId}:${amenity.id}`
    if (initialLoadKeyRef.current === loadKey) return

    const handle = window.setTimeout(() => {
      initialLoadKeyRef.current = loadKey
      void loadConfig(amenity.id, amenity.availableFrom, amenity.availableTo)
      void loadSlots(amenity.id, toYmd(today))
    }, 0)
    return () => window.clearTimeout(handle)
  }, [open, amenity, locationId, today, loadConfig, loadSlots])

  useEffect(() => {
    if (!open || !activeSlot) return
    const shouldSearch =
      !activeSlot.isPast &&
      !activeSlot.isBlocked &&
      activeSlot.remainingCount > 0 &&
      (activeSlot.status === 'AVAILABLE' || activeSlot.status === 'PARTIALLY_BOOKED' || activeSlot.status === 'BOOKED')
    if (!shouldSearch) return

    const handle = window.setTimeout(async () => {
      setResidentLoading(true)
      try {
        const residents = await getResidentsAPI({ locId: locationId, search: residentQuery || undefined })
        setResidentResults(Array.isArray(residents) ? residents.slice(0, 30) : [])
      } catch {
        setResidentResults([])
      } finally {
        setResidentLoading(false)
      }
    }, 280)

    return () => window.clearTimeout(handle)
  }, [residentQuery, activeSlot, open, locationId])

  useEffect(() => {
    if (!open || !activeSlot) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setActiveSlot(null)
    }
    window.addEventListener('keydown', onEscape, true)
    return () => window.removeEventListener('keydown', onEscape, true)
  }, [open, activeSlot])

  const currentConfig: AmenitySlotSetup | null = configResponse?.config || null
  const dayClosedByConfig =
    currentConfig && !currentConfig.daysOfWeek.includes(dayMon0(selectedDate)) && toYmd(selectedDate) >= toYmd(today)

  const weekDays = useMemo(() => {
    const base = addDays(startOfWeekMonday(today), weekOffset * 7)
    return Array.from({ length: 7 }, (_, index) => addDays(base, index))
  }, [today, weekOffset])

  const groupedSlots = useMemo(() => {
    const allSlots = slotsResponse?.slots || []
    return groupedPeriodOrder.map((period) => ({
      period,
      slots: allSlots.filter((slot) => slot.period === period),
    }))
  }, [slotsResponse])

  const statusText = (slot: AmenitySlotItem): string => {
    if (slot.status === 'BLOCKED') return 'Blocked'
    if (slot.status === 'PAST') return 'Past'
    if (slot.status === 'LEGACY_BOOKED') return 'Outside current setup'
    if (slot.status === 'BOOKED') {
      if (slot.capacity === 1 && slot.bookings[0]) return slot.bookings[0].residentName
      return 'Full'
    }
    if (slot.status === 'PARTIALLY_BOOKED') return `${slot.bookedCount} of ${slot.capacity} booked`
    if (slot.capacity > 1 && slot.remainingCount < slot.capacity)
      return `${slot.remainingCount} of ${slot.capacity} left`
    return 'Available'
  }

  const residentLocationLabel = (floorNumber: number | null, unitNumber: string | null): string => {
    const parts = [floorNumber !== null ? String(floorNumber) : null, unitNumber || null].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'Unit not assigned'
  }

  const openSlotPanel = (slot: AmenitySlotItem) => {
    if (slot.status === 'PAST') return
    setActiveSlot(slot)
    setSelectedResidentId(null)
    setResidentQuery('')
  }

  const refreshSlots = async () => {
    if (!amenity) return
    await loadSlots(amenity.id, selectedDateYmd)
  }

  const handleBook = async () => {
    if (!amenity || !activeSlot || !selectedResidentId) return
    try {
      setBookingPending(true)
      const response = await createAmenitySlotBookingAPI(locationId, amenity.id, {
        date: selectedDateYmd,
        startMinutes: activeSlot.startMinutes,
        residentId: selectedResidentId,
      })
      notifySuccess(response?.message || `Booked ${activeSlot.startLabel}`)
      setActiveSlot(null)
      await refreshSlots()
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      notifyError(err?.response?.data?.message || err?.message || 'Failed to book slot')
      await refreshSlots()
    } finally {
      setBookingPending(false)
    }
  }

  const handleCancelBooking = async (bookingId: string, residentName: string) => {
    if (!amenity) return
    try {
      const response = await cancelAmenitySlotBookingAPI(locationId, amenity.id, bookingId)
      notifySuccess(response?.message || `Cancelled booking for ${residentName}`)
      setActiveSlot(null)
      await refreshSlots()
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      notifyError(err?.response?.data?.message || err?.message || 'Failed to cancel booking')
      await refreshSlots()
    }
  }

  const handleBlock = async () => {
    if (!amenity || !activeSlot) return
    try {
      const response = await blockAmenitySlotAPI(locationId, amenity.id, {
        date: selectedDateYmd,
        startMinutes: activeSlot.startMinutes,
      })
      notifySuccess(response?.message || `Blocked ${activeSlot.startLabel}`)
      setActiveSlot(null)
      await refreshSlots()
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      notifyError(err?.response?.data?.message || err?.message || 'Failed to block slot')
      await refreshSlots()
    }
  }

  const handleUnblock = async () => {
    if (!amenity || !activeSlot?.blockId) return
    try {
      const response = await unblockAmenitySlotAPI(locationId, amenity.id, activeSlot.blockId)
      notifySuccess(response?.message || `Unblocked ${activeSlot.startLabel}`)
      setActiveSlot(null)
      await refreshSlots()
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      notifyError(err?.response?.data?.message || err?.message || 'Failed to unblock slot')
      await refreshSlots()
    }
  }

  const invalidHours = draft.closeMinutes <= draft.openMinutes
  const slotsPerDay = generateSlotStarts(draft.openMinutes, draft.closeMinutes, draft.durationMin).length

  const saveSetup = async () => {
    if (!amenity || invalidHours || draft.daysOfWeek.length === 0) return

    const payload = {
      openMinutes: draft.openMinutes,
      closeMinutes: draft.closeMinutes,
      durationMin: draft.durationMin,
      capacity: draft.capacity,
      daysOfWeek: normalizeDays(draft.daysOfWeek),
      force: false,
    }

    try {
      setSavingConfig(true)
      const data = await updateAmenitySlotConfigAPI(locationId, amenity.id, payload)
      const next = { hasSetup: true, config: data.config || null, summary: data.summary }
      setConfigResponse(next)
      onConfigUpdated(amenity.id, next)
      notifySuccess('Slot setup saved')
      await refreshSlots()
      return
    } catch (error) {
      const err = error as {
        response?: {
          status?: number
          data?: { message?: string; data?: { impactedBookings?: { residentName: string }[] } }
        }
      }

      const impacted = err?.response?.data?.data?.impactedBookings || []
      if (err?.response?.status === 409 && impacted.length > 0) {
        const sample = impacted
          .slice(0, 3)
          .map((item) => item.residentName)
          .join(', ')
        const proceed = window.confirm(
          `${impacted.length} future booking(s) fall outside this setup (${sample}${impacted.length > 3 ? ', ...' : ''}). Save anyway?`,
        )
        if (!proceed) return

        try {
          const forced = await updateAmenitySlotConfigAPI(locationId, amenity.id, { ...payload, force: true })
          const next = { hasSetup: true, config: forced.config || null, summary: forced.summary }
          setConfigResponse(next)
          onConfigUpdated(amenity.id, next)
          notifySuccess('Slot setup saved')
          await refreshSlots()
          return
        } catch (forcedError) {
          const forcedErr = forcedError as { response?: { data?: { message?: string } }; message?: string }
          notifyError(forcedErr?.response?.data?.message || forcedErr?.message || 'Failed to save slot setup')
          return
        }
      }

      notifyError(err?.response?.data?.message || 'Failed to save slot setup')
    } finally {
      setSavingConfig(false)
    }
  }

  const setupView = (
    <div className="flex h-full flex-col">
      <div className="space-y-5 p-4 pb-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bookable hours</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="slot-open-time" className="mb-1 block text-xs text-gray-500">
                From
              </Label>
              <input
                id="slot-open-time"
                type="time"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                value={formatMinutesToInput(draft.openMinutes)}
                onChange={(event) => {
                  const val = parseTimeToMinutes(event.target.value)
                  if (val === null) return
                  setDraft((prev) => ({ ...prev, openMinutes: val }))
                }}
              />
            </div>
            <div>
              <Label htmlFor="slot-close-time" className="mb-1 block text-xs text-gray-500">
                To
              </Label>
              <input
                id="slot-close-time"
                type="time"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                value={formatMinutesToInput(draft.closeMinutes)}
                onChange={(event) => {
                  const val = parseTimeToMinutes(event.target.value)
                  if (val === null) return
                  setDraft((prev) => ({ ...prev, closeMinutes: val }))
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Slot length</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[30, 45, 60, 90, 120].map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, durationMin: duration }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  draft.durationMin === duration
                    ? 'border-[#005390] bg-[#005390] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-[#005390]/40'
                }`}
              >
                {duration} min
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bookings per slot</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="h-9 w-9 rounded-full border border-gray-200 text-lg"
              onClick={() => setDraft((prev) => ({ ...prev, capacity: Math.max(1, prev.capacity - 1) }))}
            >
              -
            </button>
            <p className="min-w-8 text-center text-lg font-bold text-gray-900">{draft.capacity}</p>
            <button
              type="button"
              className="h-9 w-9 rounded-full border border-gray-200 text-lg"
              onClick={() => setDraft((prev) => ({ ...prev, capacity: Math.min(20, prev.capacity + 1) }))}
            >
              +
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Use 1 for a court, more for shared spaces like a gym.</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Open on</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayLabel, index) => {
              const on = draft.daysOfWeek.includes(index)
              return (
                <button
                  key={dayLabel}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      daysOfWeek: on
                        ? prev.daysOfWeek.filter((value) => value !== index)
                        : normalizeDays([...prev.daysOfWeek, index]),
                    }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    on ? 'border-[#005390] bg-[#005390] text-white' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {dayLabel}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[#005390]/20 bg-[#005390]/10 px-3 py-2 text-sm font-medium text-[#005390]">
          {invalidHours
            ? 'Closing time must be after opening time'
            : `${slotsPerDay} slots a day · ${formatMinutesAmPm(draft.openMinutes)} to ${formatMinutesAmPm(draft.closeMinutes)}`}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
        <button
          type="button"
          className="w-full rounded-xl bg-[#005390] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          onClick={saveSetup}
          disabled={savingConfig || invalidHours || draft.daysOfWeek.length === 0}
        >
          {savingConfig ? 'Saving...' : 'Save slot setup'}
        </button>
      </div>
    </div>
  )

  const bookingsView = (
    <div className="relative flex h-full flex-col p-4 pb-40">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
          disabled={weekOffset <= 0}
          className="h-9 w-9 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40"
          aria-label="Previous week"
        >
          <ChevronLeft className="mx-auto h-4 w-4" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {weekDays.map((date) => {
            const dateYmd = toYmd(date)
            const isPastDate = dateYmd < toYmd(today)
            const disabledByOpenDays = currentConfig ? !currentConfig.daysOfWeek.includes(dayMon0(date)) : false
            const disabled = isPastDate || disabledByOpenDays
            const selected = dateYmd === selectedDateYmd
            return (
              <button
                key={dateYmd}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSelectedDate(date)
                  setActiveSlot(null)
                  if (amenity) void loadSlots(amenity.id, dateYmd)
                }}
                className={`rounded-lg border px-1 py-1 text-center text-[11px] ${
                  selected
                    ? 'border-[#005390] bg-[#005390] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-[#005390]/30'
                } disabled:opacity-35`}
              >
                <span className="block text-[10px]">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="block text-sm font-semibold">{date.getDate()}</span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((prev) => prev + 1)}
          className="h-9 w-9 rounded-lg border border-gray-200 text-gray-700"
          aria-label="Next week"
        >
          <ChevronRight className="mx-auto h-4 w-4" />
        </button>
      </div>

      <p className="mb-2 text-sm font-semibold text-gray-900">
        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gray-400" /> Blocked or past
        </span>
      </div>

      {slotsLoading ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !slotsResponse?.hasSetup ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No slots set up yet. Open Slot setup to add hours.
        </div>
      ) : dayClosedByConfig ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          This amenity is closed on the selected day.
        </div>
      ) : (
        <div className="space-y-3">
          {groupedSlots.map((group) => {
            if (!group.slots.length) return null
            return (
              <div key={group.period}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {periodLabel[group.period]}
                </p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {group.slots.map((slot) => {
                    const selected =
                      activeSlot?.startMinutes === slot.startMinutes && activeSlot?.status === slot.status
                    return (
                      <button
                        key={`${slot.startMinutes}-${slot.status}`}
                        type="button"
                        onClick={() => openSlotPanel(slot)}
                        disabled={slot.status === 'PAST'}
                        className={`rounded-xl border p-2 text-left transition ${slotStatusClasses[slot.status]} ${selected ? 'ring-2 ring-[#005390]' : ''}`}
                      >
                        <p className="text-sm font-semibold">{slot.startLabel}</p>
                        <p className="mt-1 text-[11px] font-medium opacity-85">{statusText(slot)}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 max-h-[72%] overflow-auto border-t border-gray-200 bg-white p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.08)] transition-transform duration-200 ${
          activeSlot ? 'translate-y-0' : 'translate-y-[105%]'
        }`}
      >
        {!activeSlot ? null : activeSlot.status === 'BLOCKED' ? (
          <div className="space-y-3">
            <div>
              <p className="text-base font-semibold text-gray-900">
                {activeSlot.startLabel} to {activeSlot.endLabel}
              </p>
              <p className="text-sm text-gray-500">Blocked, so residents cannot book this slot.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUnblock}
                className="flex-1 rounded-lg bg-[#005390] px-3 py-2 text-sm font-semibold text-white"
              >
                Unblock slot
              </button>
              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-gray-900">
                  Book {activeSlot.startLabel} to {activeSlot.endLabel}
                </p>
                <p className="text-sm text-gray-500">
                  {activeSlot.bookedCount} of {activeSlot.capacity} booked
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                aria-label="Close slot panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeSlot.bookings.length > 0 && (
              <div className="space-y-2">
                {activeSlot.bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{booking.residentName}</p>
                      <p className="truncate text-xs text-gray-500">
                        from {residentLocationLabel(booking.floorNumber, booking.unitNumber)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCancelBooking(booking.id, booking.residentName)}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!activeSlot.isPast &&
              !activeSlot.isBlocked &&
              activeSlot.remainingCount > 0 &&
              activeSlot.status !== 'LEGACY_BOOKED' && (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={residentQuery}
                      onChange={(event) => setResidentQuery(event.target.value)}
                      placeholder="Search by name or flat number"
                      className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
                    />
                  </div>

                  <div className="max-h-44 space-y-1 overflow-auto rounded-lg border border-gray-200 p-1.5">
                    {residentLoading ? (
                      <div className="flex items-center justify-center py-3 text-xs text-gray-500">
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Loading residents...
                      </div>
                    ) : residentResults.length === 0 ? (
                      <div className="py-3 text-center text-xs text-gray-500">No resident found</div>
                    ) : (
                      residentResults.map((resident) => {
                        const name = `${resident.firstName || ''} ${resident.lastName || ''}`.trim() || 'Resident'
                        const floorNumber = resident.unit?.floor?.floor_number ?? null
                        const unitNumber = resident.unit?.unit_number || null
                        const selected = selectedResidentId === resident.id
                        return (
                          <button
                            key={resident.id}
                            type="button"
                            onClick={() => setSelectedResidentId(resident.id)}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                              selected ? 'bg-[#005390]/10 text-[#005390]' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#005390]/10 text-[11px] font-bold text-[#005390]">
                                <UserRound className="h-3.5 w-3.5" />
                              </span>
                              <span className="truncate">{name}</span>
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {residentLocationLabel(floorNumber, unitNumber)}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              )}

            <div className="flex flex-wrap gap-2">
              {!activeSlot.isPast &&
              !activeSlot.isBlocked &&
              activeSlot.remainingCount > 0 &&
              activeSlot.status !== 'LEGACY_BOOKED' ? (
                <button
                  type="button"
                  onClick={handleBook}
                  disabled={!selectedResidentId || bookingPending}
                  className="flex-1 rounded-lg bg-[#005390] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {bookingPending ? 'Booking...' : 'Confirm booking'}
                </button>
              ) : null}

              {!activeSlot.isPast && activeSlot.bookings.length === 0 && !activeSlot.isBlocked ? (
                <button
                  type="button"
                  onClick={handleBlock}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
                >
                  Block
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full min-w-3xl p-0">
        <SheetHeader className="border-b border-gray-200 pb-3">
          <SheetTitle>{amenity?.name || 'Amenity'}</SheetTitle>
          <SheetDescription>Manage slots and bookings for this amenity.</SheetDescription>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeTab === 'bookings' ? 'bg-[#005390] text-white' : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => {
                setActiveTab('bookings')
                if (amenity) void loadSlots(amenity.id, selectedDateYmd)
              }}
            >
              Bookings
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeTab === 'setup' ? 'bg-[#005390] text-white' : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setActiveTab('setup')}
            >
              Slot setup
            </button>
          </div>
        </SheetHeader>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {configLoading && !configResponse ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-8 w-44 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : activeTab === 'bookings' ? (
            bookingsView
          ) : (
            setupView
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default SlotManagerDrawer
