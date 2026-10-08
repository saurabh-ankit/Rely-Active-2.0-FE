import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  Search,
  User,
  UserPlus,
  Users,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fnbService, fnbAttendanceService } from '@/lib/services/fnbService'
import type {
  FnbFoodAttendanceMember,
  FnbFoodAttendanceFlat,
  FnbPropertyMealSlot,
  FnbGuestAttendance,
} from '@/lib/types/fnb'

const DEFAULT_MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', time: '07:30 - 09:30' },
  { key: 'lunch', label: 'Lunch', time: '12:30 - 14:30' },
  { key: 'evening_snacks', label: 'Evening Snacks', time: '16:30 - 17:30' },
  { key: 'dinner', label: 'Dinner', time: '19:30 - 21:30' },
  { key: 'midnight_snacks', label: 'Midnight Snacks', time: '23:30 - 00:00' },
]

const ALL_SLOTS = 'all'

type SlotStatus = 'attended' | 'missed' | 'upcoming'
type StatusFilter = 'all' | SlotStatus | 'extra'

interface MealSlotOption {
  key: string
  label: string
  time?: string | undefined
}

interface SlotResult {
  slot: MealSlotOption
  status: SlotStatus
  covered: boolean
  time?: string | undefined
}

/** YYYY-MM-DD in the browser's timezone (toISOString would give the UTC date). */
const toLocalDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const normaliseSlotKey = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '_')

const formatSlotTime = (value?: string) => (value ? value.slice(0, 5) : '')

const STATUS_META: Record<SlotStatus, { label: string; chip: string; icon: typeof CheckCircle2; iconClass: string }> = {
  attended: {
    label: 'Attended',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  missed: {
    label: 'Missed',
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: XCircle,
    iconClass: 'text-rose-500',
  },
  upcoming: {
    label: 'Upcoming',
    chip: 'border-gray-200 bg-gray-50 text-gray-500',
    icon: Clock,
    iconClass: 'text-gray-400',
  },
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'attended', label: 'Attended' },
  { value: 'missed', label: 'Missed' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'extra', label: 'Extra meals' },
]

/** One meal slot's result for a member: status, time and whether the package covers it. */
const SlotChip = ({ result, showLabel }: { result: SlotResult; showLabel: boolean }) => {
  const meta = STATUS_META[result.status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold whitespace-nowrap',
        meta.chip,
      )}
      title={`${result.slot.label}: ${meta.label}${result.time ? ` at ${result.time}` : ''} · ${
        result.covered ? 'Covered by package' : 'Extra meal (not in package)'
      }`}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', meta.iconClass)} />
      {showLabel ? result.slot.label : meta.label}
      {result.time && <span className="font-medium opacity-70">{result.time}</span>}
      {!result.covered && (
        <span className="rounded bg-amber-100 px-1 text-[9px] font-bold uppercase tracking-wide text-amber-800">
          Extra
        </span>
      )}
    </span>
  )
}

const StatTile = ({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Users
  label: string
  value: number
  hint: string
  tone: string
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold leading-tight text-gray-900">{value}</p>
      <p className="truncate text-[11px] text-gray-400">{hint}</p>
    </div>
  </div>
)

interface FnbAttendanceTabProps {
  locId: string
}

export const FnbAttendanceTab: React.FC<FnbAttendanceTabProps> = ({ locId }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateKey(new Date()))
  // Every slot by default; picking a slot narrows the whole page to that slot.
  const [selectedSlot, setSelectedSlot] = useState<string>(ALL_SLOTS)
  const [mealSlots, setMealSlots] = useState<FnbPropertyMealSlot[]>([])
  const [viewMode, setViewMode] = useState<'flat' | 'member'>('flat')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [members, setMembers] = useState<FnbFoodAttendanceMember[]>([])
  const [flats, setFlats] = useState<FnbFoodAttendanceFlat[]>([])

  // Fetch meal slots for location
  useEffect(() => {
    if (!locId) return
    let isMounted = true
    fnbService
      .getMealSlots(locId)
      .then((slots) => {
        if (isMounted) setMealSlots(slots)
      })
      .catch((err) => {
        console.error('Error fetching meal slots:', err)
      })
    return () => {
      isMounted = false
    }
  }, [locId])

  // The response carries every attendance for the date, so slot switching is done client-side.
  const fetchAttendanceData = useCallback(async () => {
    if (!locId || !selectedDate) return
    setLoading(true)
    setError(null)
    try {
      const data = await fnbAttendanceService.getMembersAndFlats(locId, selectedDate, undefined, searchQuery)
      setMembers(data.members || [])
      setFlats(data.flats || [])
    } catch (err: unknown) {
      console.error('Failed to load attendance data:', err)
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : undefined
      setError(msg || 'Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }, [locId, selectedDate, searchQuery])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      await Promise.resolve()
      if (!ignore) {
        await fetchAttendanceData()
      }
    }
    void load()
    return () => {
      ignore = true
    }
  }, [fetchAttendanceData])

  // Helper to format slot labels
  const getSlotDisplayLabel = (slotKey: string): string => {
    const clean = slotKey.toLowerCase().replace(/\s+/g, '_')
    if (clean.includes('break') || clean.includes('fast') || clean.includes('morn')) return 'Breakfast'
    if (clean.includes('lunch') || clean.includes('noon')) return 'Lunch'
    if (clean.includes('mid') || clean.includes('night') || clean.includes('late')) return 'Midnight Snacks'
    if (clean.includes('snack') || clean.includes('even') || clean.includes('tea')) return 'Evening Snacks'
    if (clean.includes('dinn')) return 'Dinner'
    return slotKey.charAt(0).toUpperCase() + slotKey.slice(1).replace(/_/g, ' ')
  }

  // Time parsing helper with midnight handling for end times
  const parseTimeToMinutes = (timeStr?: string, isEndTime = false): number => {
    if (!timeStr) return isEndTime ? 1440 : 0
    let clean = timeStr.trim().toLowerCase()
    if (clean.includes('-')) {
      const parts = clean.split('-')
      clean = (isEndTime ? parts[1] || parts[0] : parts[0])?.trim() || clean
    }
    let isPM = false
    let isAM = false
    if (clean.includes('pm')) {
      isPM = true
      clean = clean.replace('pm', '').trim()
    } else if (clean.includes('am')) {
      isAM = true
      clean = clean.replace('am', '').trim()
    }
    const parts = clean.split(':')
    let hours = parseInt(parts[0] || '0', 10)
    const minutes = parseInt(parts[1] || '0', 10)
    if (isNaN(hours)) hours = 0
    if (isPM && hours < 12) hours += 12
    else if (isAM && hours === 12) hours = 0
    let totalMin = hours * 60 + (isNaN(minutes) ? 0 : minutes)
    if (isEndTime && (totalMin === 0 || clean === '00:00' || clean === '00:00:00' || clean === '24:00')) {
      totalMin = 1440
    }
    return totalMin
  }

  // Check if slot end time has passed for selected date
  const isSlotTimeCrossed = useCallback(
    (slotKey: string): boolean => {
      const todayStr = toLocalDateKey(new Date())
      if (selectedDate < todayStr) return true
      if (selectedDate > todayStr) return false

      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      const normKey = slotKey.toLowerCase().replace(/\s+/g, '_')
      const matchedSlot = mealSlots.find((s) => {
        const sKey = (s.slotKey || s.name || '').toLowerCase().replace(/\s+/g, '_')
        return sKey === normKey || normKey.includes(sKey) || sKey.includes(normKey)
      })

      let endTimeStr = matchedSlot?.endTime
      let startTimeStr = matchedSlot?.startTime

      if (!endTimeStr) {
        if (normKey.includes('mid') || normKey.includes('night') || normKey.includes('late')) {
          endTimeStr = '23:59'
          startTimeStr = '23:30'
        } else if (normKey.includes('break') || normKey.includes('fast')) {
          endTimeStr = '09:30'
        } else if (normKey.includes('lunch')) {
          endTimeStr = '14:30'
        } else if (normKey.includes('snack') || normKey.includes('even') || normKey.includes('tea')) {
          endTimeStr = '17:30'
        } else if (normKey.includes('dinner')) {
          endTimeStr = '21:30'
        } else {
          endTimeStr = '23:59'
        }
      }

      const startMin = parseTimeToMinutes(startTimeStr, false)
      let endMin = parseTimeToMinutes(endTimeStr, true)
      if (endMin <= startMin && startMin > 0) {
        endMin += 1440
      }

      return currentMinutes > endMin
    },
    [selectedDate, mealSlots],
  )

  // Helper to check if a meal slot is covered in member's active package
  const isSlotCoveredInPackage = useCallback((member: FnbFoodAttendanceMember, slotKey: string): boolean => {
    const activePkgName = member.packageName || member.package?.packageName
    if (!member.hasActivePackage && !activePkgName) return false

    const allowed = member.allowedMealSlots || member.package?.includedMealSlots || []
    if (!Array.isArray(allowed) || allowed.length === 0) {
      return Boolean(member.hasActivePackage)
    }

    const normTarget = slotKey.toLowerCase().replace(/\s+/g, '_')
    const cleanTarget = normTarget.replace(/[^a-z0-9]/g, '')

    return allowed.some((item) => {
      const itemStr = String(item).toLowerCase().trim()
      const cleanItem = itemStr.replace(/[^a-z0-9]/g, '')
      const normItem = itemStr.replace(/\s+/g, '_')
      return (
        itemStr === slotKey.toLowerCase() ||
        cleanItem === cleanTarget ||
        normItem === normTarget ||
        (cleanTarget.includes('break') && cleanItem.includes('break')) ||
        (cleanTarget.includes('lunch') && cleanItem.includes('lunch')) ||
        // Snack slots only match the same kind (morning snacks is not evening snacks)
        (cleanTarget.includes('snack') &&
          cleanItem.includes('snack') &&
          cleanTarget.split('snack')[0] === cleanItem.split('snack')[0]) ||
        (cleanTarget.includes('dinner') && cleanItem.includes('dinner')) ||
        ((cleanTarget.includes('mid') || cleanTarget.includes('night')) &&
          (cleanItem.includes('mid') || cleanItem.includes('night')))
      )
    })
  }, [])

  // Helper to check attendance status for a specific meal slot
  const isSlotAttendedForMember = useCallback(
    (member: FnbFoodAttendanceMember, slotKey: string): { attended: boolean; isCrossed: boolean; time?: string } => {
      const normTarget = slotKey.toLowerCase().replace(/\s+/g, '_')
      const isCrossed = isSlotTimeCrossed(slotKey)
      const list = member.attendances || []
      if (Array.isArray(list) && list.length > 0) {
        const matched = list.find((att) => {
          if (!att) return false
          const statusLower = String(att.status || '').toLowerCase()
          const isAtt = statusLower ? statusLower === 'attended' : att.attended === true
          if (!isAtt) return false

          const attSlotId = String(att.mealSlotId || att.meal_slot_id || att.mealSlot?.id || '').toLowerCase()
          if (attSlotId && attSlotId === slotKey.toLowerCase()) return true

          const attKey = (att.mealSlotKey || att.meal_slot_key || att.slotKey || '').toLowerCase().replace(/\s+/g, '_')
          if (!attKey || attKey === 'slot') return false

          const targetIsMidnight = normTarget.includes('mid') || normTarget.includes('night')
          const attIsMidnight = attKey.includes('mid') || attKey.includes('night')
          if (targetIsMidnight || attIsMidnight) {
            return targetIsMidnight && attIsMidnight
          }
          return (
            attKey === normTarget ||
            (normTarget.length > 2 && attKey.length > 2 && normTarget.includes(attKey)) ||
            (normTarget.length > 2 && attKey.length > 2 && attKey.includes(normTarget)) ||
            (normTarget.includes('break') && attKey.includes('break')) ||
            (normTarget.includes('lunch') && attKey.includes('lunch')) ||
            (normTarget.includes('snack') &&
              attKey.includes('snack') &&
              normTarget.split('_')[0] === attKey.split('_')[0]) ||
            (normTarget.includes('dinner') && attKey.includes('dinner'))
          )
        })
        if (matched) {
          const timeVal = matched.attendedAt || matched.createdAt || matched.created_at
          const timeStr = timeVal
            ? new Date(timeVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined
          return { attended: true, isCrossed, time: timeStr }
        }
      }
      if (member.attendance) {
        const statusLower = String(member.attendance.status || '').toLowerCase()
        const isAtt = statusLower ? statusLower === 'attended' : member.attendance.attended === true
        if (isAtt) {
          const singleKey = (
            member.attendance.mealSlotKey ||
            member.attendance.slotKey ||
            member.attendance.meal_slot_key ||
            ''
          )
            .toLowerCase()
            .replace(/\s+/g, '_')
          if (!singleKey || singleKey === 'slot') return { attended: false, isCrossed }

          const targetIsMidnight = normTarget.includes('mid') || normTarget.includes('night')
          const singleIsMidnight = singleKey.includes('mid') || singleKey.includes('night')
          const isMatch =
            targetIsMidnight || singleIsMidnight
              ? targetIsMidnight && singleIsMidnight
              : singleKey === normTarget ||
                (normTarget.length > 2 && singleKey.length > 2 && normTarget.includes(singleKey)) ||
                (normTarget.length > 2 && singleKey.length > 2 && singleKey.includes(normTarget)) ||
                (normTarget.includes('break') && singleKey.includes('break')) ||
                (normTarget.includes('lunch') && singleKey.includes('lunch')) ||
                (normTarget.includes('snack') &&
                  singleKey.includes('snack') &&
                  normTarget.split('_')[0] === singleKey.split('_')[0]) ||
                (normTarget.includes('dinner') && singleKey.includes('dinner'))
          if (isMatch) {
            const timeVal = member.attendance.attendedAt
            const timeStr = timeVal
              ? new Date(timeVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined
            return { attended: true, isCrossed, time: timeStr }
          }
        }
      }
      return { attended: false, isCrossed }
    },
    [isSlotTimeCrossed],
  )

  const activeMealSlotsList = useMemo<MealSlotOption[]>(() => {
    if (mealSlots.length > 0) {
      return mealSlots.map((s) => ({
        key: normaliseSlotKey(s.slotKey || s.name),
        label: s.name || s.slotKey || 'Meal Slot',
        time: s.startTime && s.endTime ? `${formatSlotTime(s.startTime)} - ${formatSlotTime(s.endTime)}` : undefined,
      }))
    }
    return DEFAULT_MEAL_SLOTS
  }, [mealSlots])

  const isAllSlots = selectedSlot === ALL_SLOTS
  const slotsInScope = useMemo(
    () => (isAllSlots ? activeMealSlotsList : activeMealSlotsList.filter((s) => s.key === selectedSlot)),
    [isAllSlots, activeMealSlotsList, selectedSlot],
  )
  const selectedSlotLabel = slotsInScope[0]?.label ?? ''

  const getSlotResults = useCallback(
    (member: FnbFoodAttendanceMember): SlotResult[] =>
      slotsInScope.map((slot) => {
        const { attended, isCrossed, time } = isSlotAttendedForMember(member, slot.key)
        return {
          slot,
          status: attended ? 'attended' : isCrossed ? 'missed' : 'upcoming',
          covered: isSlotCoveredInPackage(member, slot.key),
          time,
        }
      }),
    [slotsInScope, isSlotAttendedForMember, isSlotCoveredInPackage],
  )

  const matchesStatusFilter = useCallback(
    (results: SlotResult[]) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'extra') return results.some((r) => r.status === 'attended' && !r.covered)
      return results.some((r) => r.status === statusFilter)
    },
    [statusFilter],
  )

  const guestMatchesScope = useCallback(
    (ga: FnbGuestAttendance) => {
      if (isAllSlots) return true
      const key = normaliseSlotKey(ga.mealSlotKey || ga.globalMealSlot?.name || '')
      return key === selectedSlot || getSlotDisplayLabel(key) === getSlotDisplayLabel(selectedSlot)
    },

    [isAllSlots, selectedSlot],
  )

  const guestSlotLabel = (ga: FnbGuestAttendance) => {
    const key = normaliseSlotKey(ga.mealSlotKey || ga.globalMealSlot?.name || '')
    return activeMealSlotsList.find((s) => s.key === key)?.label ?? getSlotDisplayLabel(key || 'breakfast')
  }

  // Counts for the selected scope, computed from the same data the list shows.
  const stats = useMemo(() => {
    let attended = 0
    let missed = 0
    let upcoming = 0
    members.forEach((m) => {
      getSlotResults(m).forEach((r) => {
        if (r.status === 'attended') attended += 1
        else if (r.status === 'missed') missed += 1
        else upcoming += 1
      })
    })
    const guests = flats
      .flatMap((f) => f.guestAttendances || [])
      .filter(guestMatchesScope)
      .reduce((sum, g) => sum + (g.guestCount || 1), 0)
    return { members: members.length, attended, missed, upcoming, guests }
  }, [members, flats, getSlotResults, guestMatchesScope])

  const visibleFlats = useMemo(
    () =>
      flats
        .map((flat) => ({
          flat,
          members: flat.members.filter((m) => matchesStatusFilter(getSlotResults(m))),
          guests: (flat.guestAttendances || []).filter(guestMatchesScope),
        }))
        .filter((f) => f.members.length > 0 || (statusFilter === 'all' && f.guests.length > 0)),
    [flats, getSlotResults, matchesStatusFilter, guestMatchesScope, statusFilter],
  )

  const filteredMembers = useMemo(
    () => members.filter((m) => matchesStatusFilter(getSlotResults(m))),
    [members, getSlotResults, matchesStatusFilter],
  )

  const scopeHint = isAllSlots ? `All ${slotsInScope.length} meal slots` : selectedSlotLabel
  const mealUnit = isAllSlots ? 'meals' : 'members'

  const renderStatus = (results: SlotResult[]) =>
    isAllSlots ? (
      <div className="flex flex-wrap gap-1.5">
        {results.map((r) => (
          <SlotChip key={r.slot.key} result={r} showLabel />
        ))}
      </div>
    ) : results[0] ? (
      <SlotChip result={results[0]} showLabel={false} />
    ) : null

  const emptyState = (message: string) => (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
      <UtensilsCrossed className="h-8 w-8 text-gray-300" />
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
              {(
                [
                  { value: 'flat', label: 'By Flat', icon: Home },
                  { value: 'member', label: 'By Member', icon: User },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={viewMode === value}
                  onClick={() => setViewMode(value)}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                    viewMode === value ? 'bg-white text-[#005390] shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Search residents"
                placeholder="Search name, phone or flat…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs font-medium focus:border-[#005390] focus:outline-none"
              />
            </div>
          </div>

          <label className="flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2">
            <Calendar className="h-4 w-4 text-[#005390]" />
            <span className="sr-only">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="cursor-pointer bg-transparent text-sm font-semibold text-gray-800 focus:outline-none"
            />
          </label>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Meal slot</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Meal slot">
            {[{ key: ALL_SLOTS, label: 'All slots', time: undefined } as MealSlotOption, ...activeMealSlotsList].map(
              (slot) => {
                const isSelected = selectedSlot === slot.key
                return (
                  <button
                    key={slot.key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedSlot(slot.key)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all',
                      isSelected
                        ? 'border-[#005390] bg-[#005390] text-white shadow-md shadow-blue-900/10'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-[#005390]/40 hover:text-[#005390]',
                    )}
                  >
                    {slot.key === ALL_SLOTS ? (
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    {slot.label}
                    {slot.time && (
                      <span className={cn('text-[10px] font-medium', isSelected ? 'text-white/75' : 'text-gray-400')}>
                        {slot.time}
                      </span>
                    )}
                  </button>
                )
              },
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status filter">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={statusFilter === f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'h-7 cursor-pointer rounded-full border px-3 text-[11px] font-semibold transition-colors',
                  statusFilter === f.value
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            {(Object.keys(STATUS_META) as SlotStatus[]).map((s) => {
              const Icon = STATUS_META[s].icon
              return (
                <span key={s} className="flex items-center gap-1">
                  <Icon className={cn('h-3.5 w-3.5', STATUS_META[s].iconClass)} />
                  {STATUS_META[s].label}
                </span>
              )
            })}
            <span className="flex items-center gap-1">
              <span className="rounded bg-amber-100 px-1 text-[9px] font-bold uppercase text-amber-800">Extra</span>
              Not in package
            </span>
          </div>
        </div>
      </div>

      {/* Summary for the selected slot (or every slot) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          icon={Users}
          label="Residing members"
          value={stats.members}
          hint="In this property"
          tone="bg-blue-50 text-blue-600"
        />
        <StatTile
          icon={CheckCircle2}
          label="Attended"
          value={stats.attended}
          hint={`${mealUnit} · ${scopeHint}`}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatTile
          icon={XCircle}
          label="Missed"
          value={stats.missed}
          hint={`${mealUnit} · slot already over`}
          tone="bg-rose-50 text-rose-500"
        />
        <StatTile
          icon={Clock}
          label="Upcoming"
          value={stats.upcoming}
          hint={`${mealUnit} · slot not over yet`}
          tone="bg-gray-100 text-gray-500"
        />
        <StatTile
          icon={UserPlus}
          label="Guest meals"
          value={stats.guests}
          hint={scopeHint}
          tone="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-16 text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin text-[#005390]" />
          <p className="text-sm font-medium">Loading attendance…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : viewMode === 'flat' ? (
        visibleFlats.length === 0 ? (
          emptyState('No flats match the selected filters.')
        ) : (
          <div className="space-y-4">
            {visibleFlats.map(({ flat, members: flatMembers, guests }) => {
              const primaryRes = flat.members.find((m) => m.memberType === 'resident')
              const guestTotal = guests.reduce((sum: number, g: FnbGuestAttendance) => sum + (g.guestCount || 1), 0)
              return (
                <div
                  key={flat.unitId}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xs"
                >
                  <div className="flex flex-col gap-1 border-b border-gray-100 bg-gray-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
                        <Home className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Flat {flat.unitNumber}</h3>
                        {primaryRes && (
                          <p className="text-[11px] text-gray-500">
                            {primaryRes.fullName}
                            {primaryRes.phone && ` · ${primaryRes.phone}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                      {flat.members.length} {flat.members.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {flatMembers.map((member) => (
                      <div
                        key={member.memberId}
                        className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold uppercase text-[#005390]">
                            {member.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold text-gray-900">{member.fullName}</span>
                              <span
                                className={cn(
                                  'rounded-full border px-2 py-px text-[10px] font-semibold',
                                  member.memberType === 'resident'
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-gray-50 text-gray-600',
                                )}
                              >
                                {member.memberType === 'resident' ? 'Primary' : member.relation || 'Family'}
                              </span>
                              {member.dietaryPreference && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-px text-[10px] font-semibold uppercase text-amber-700">
                                  {member.dietaryPreference}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-gray-500">
                              {member.packageName || member.package?.packageName || 'No active package'}
                            </p>
                          </div>
                        </div>
                        <div className="lg:max-w-[60%]">{renderStatus(getSlotResults(member))}</div>
                      </div>
                    ))}
                  </div>

                  {guests.length > 0 && (
                    <div className="space-y-2 border-t border-purple-100 bg-purple-50/40 px-4 py-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-800">
                        <UserPlus className="h-3.5 w-3.5" />
                        Guest meals · {guestTotal}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {guests.map((ga: FnbGuestAttendance) => (
                          <span
                            key={ga.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-100 bg-white px-2.5 py-1 text-[11px]"
                          >
                            <span className="font-semibold text-gray-900">{ga.guestName || 'Guest'}</span>
                            <span className="text-gray-400">×{ga.guestCount || 1}</span>
                            <span className="text-purple-700">{guestSlotLabel(ga)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : filteredMembers.length === 0 ? (
        emptyState('No members match the selected filters.')
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Flat</th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">{isAllSlots ? 'Meal slots' : selectedSlotLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredMembers.map((member) => (
                  <tr key={member.memberId} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{member.fullName}</p>
                      <p className="text-[11px] text-gray-500">
                        {member.memberType === 'resident' ? 'Primary resident' : member.relation || 'Family'}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{member.fullLocation}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {member.packageName || member.package?.packageName || 'No package'}
                    </td>
                    <td className="px-4 py-3">{renderStatus(getSlotResults(member))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
