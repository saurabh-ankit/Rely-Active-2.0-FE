import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, Clock, Search, CheckCircle2, XCircle, Users, User, Home, UserPlus, Filter } from 'lucide-react'
import { fnbService, fnbAttendanceService } from '@/lib/services/fnbService'
import type {
  FnbFoodAttendanceMember,
  FnbFoodAttendanceFlat,
  FnbAttendanceSummary,
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

interface FnbAttendanceTabProps {
  locId: string
}

export const FnbAttendanceTab: React.FC<FnbAttendanceTabProps> = ({ locId }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]!)
  const [selectedMealSlotKey, setSelectedMealSlotKey] = useState<string>('breakfast')
  const [mealSlots, setMealSlots] = useState<FnbPropertyMealSlot[]>([])
  const [viewMode, setViewMode] = useState<'flat' | 'member'>('flat')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'attended' | 'absent' | 'not_in_package'>('all')

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [members, setMembers] = useState<FnbFoodAttendanceMember[]>([])
  const [flats, setFlats] = useState<FnbFoodAttendanceFlat[]>([])
  const [summary, setSummary] = useState<FnbAttendanceSummary | null>(null)

  // Fetch meal slots for location
  useEffect(() => {
    if (!locId) return
    let isMounted = true
    fnbService
      .getMealSlots(locId)
      .then((slots) => {
        if (!isMounted) return
        setMealSlots(slots)
        if (slots.length > 0 && !slots.some((s) => (s.slotKey || s.name.toLowerCase()) === selectedMealSlotKey)) {
          const firstKey = slots[0]?.slotKey || slots[0]?.name.toLowerCase() || 'breakfast'
          setSelectedMealSlotKey(firstKey)
        }
      })
      .catch((err) => {
        console.error('Error fetching meal slots:', err)
      })
    return () => {
      isMounted = false
    }
  }, [locId, selectedMealSlotKey])

  // Fetch attendance data
  const fetchAttendanceData = useCallback(async () => {
    if (!locId || !selectedDate) return
    setLoading(true)
    setError(null)
    try {
      const data = await fnbAttendanceService.getMembersAndFlats(locId, selectedDate, selectedMealSlotKey, searchQuery)
      setMembers(data.members || [])
      setFlats(data.flats || [])
      setSummary(data.summary || null)
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
  }, [locId, selectedDate, selectedMealSlotKey, searchQuery])

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
      const todayStr = new Date().toISOString().split('T')[0]!
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
        (cleanTarget.includes('snack') &&
          cleanItem.includes('snack') &&
          !cleanTarget.includes('mid') &&
          !cleanItem.includes('mid')) ||
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
            (normTarget.includes('snack') && attKey.includes('snack')) ||
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
                (normTarget.includes('snack') && singleKey.includes('snack')) ||
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

  // Filtered members list for Member-Wise View
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const { attended, isCrossed } = isSlotAttendedForMember(m, selectedMealSlotKey)
      if (statusFilter === 'attended' && !attended) return false
      if (statusFilter === 'absent' && (attended || !isCrossed)) return false
      if (statusFilter === 'not_in_package' && m.isSlotIncludedInPackage) return false
      return true
    })
  }, [members, statusFilter, selectedMealSlotKey, isSlotAttendedForMember])

  const activeMealSlotsList = useMemo(() => {
    if (mealSlots.length > 0) {
      return mealSlots.map((s) => ({
        key: (s.slotKey || s.name).toLowerCase().replace(/\s+/g, '_'),
        label: s.name || s.slotKey || 'Meal Slot',
        time: s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : undefined,
      }))
    }
    return DEFAULT_MEAL_SLOTS
  }, [mealSlots])

  return (
    <div className="space-y-6">
      {/* Header Filters & Slot Selector */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: View Mode Toggle & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'flat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Flat-Wise View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('member')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'member' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Member List View</span>
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by resident name, phone, or flat #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#005390]"
              />
            </div>

            {viewMode === 'member' && (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'attended' | 'absent' | 'not_in_package')}
                  className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Members</option>
                  <option value="attended">Attended Only</option>
                  <option value="absent">Pending / Absent</option>
                  <option value="not_in_package">Package Exceptions</option>
                </select>
              </div>
            )}
          </div>

          {/* Right: Date Picker */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2">
              <Calendar className="w-4 h-4 text-[#005390]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Meal Slot Selection Pills */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Meal Slot:</span>
          {activeMealSlotsList.map((slot) => {
            const isSelected = selectedMealSlotKey === slot.key
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => setSelectedMealSlotKey(slot.key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#005390] text-white shadow-md shadow-blue-900/10'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{slot.label}</span>
                {slot.time && <span className="opacity-75 text-[10px]">({slot.time})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Residing Members</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{summary?.totalResidingMembers ?? 0}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dine-In Attended</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">
              {summary?.attendedCount ?? summary?.attendedMembersCount ?? summary?.totalDinedInToday ?? 0}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Absent / Pending</div>
            <div className="text-2xl font-bold text-amber-600 mt-0.5">
              {summary?.absentCount ?? summary?.absentMembersCount ?? summary?.pendingCount ?? 0}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Meals Recorded</div>
            <div className="text-2xl font-bold text-purple-600 mt-0.5">
              {summary?.guestMealsCount ?? summary?.totalGuestCount ?? summary?.totalGuestDinedInToday ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Clock className="w-8 h-8 animate-spin mx-auto text-[#005390] mb-3 opacity-60" />
          <p className="text-sm font-medium">Loading attendance records...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-2xl border border-red-100 text-sm font-semibold">
          {error}
        </div>
      ) : viewMode === 'flat' ? (
        /* FLAT-WISE VIEW */
        flats.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            No flats or members found for the selected criteria.
          </div>
        ) : (
          <div className="space-y-4">
            {flats.map((flat) => {
              const primaryRes = flat.members.find((m) => m.memberType === 'resident')
              return (
                <div
                  key={flat.unitId}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Flat Header */}
                  <div className="bg-gray-50/80 p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-100 text-[#005390] rounded-xl">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-gray-900 text-base">Flat {flat.unitNumber}</h3>
                          <span className="text-[11px] px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-200">
                            {flat.members.length} Residing Member(s)
                          </span>
                        </div>
                        {primaryRes && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Primary Resident: <span className="font-medium text-gray-700">{primaryRes.fullName}</span>
                            {primaryRes.phone && <span> • {primaryRes.phone}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="divide-y divide-gray-100">
                    {flat.members.map((member) => {
                      return (
                        <div key={member.memberId} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                          {/* Member Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#005390] border border-blue-200 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                {member.fullName.charAt(0)}
                              </div>
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-gray-900 text-sm">{member.fullName}</span>
                                  <span
                                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                                      member.memberType === 'resident'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {member.memberType === 'resident'
                                      ? 'Primary Resident'
                                      : `Family (${member.relation || 'Member'})`}
                                  </span>
                                  {member.dietaryPreference && (
                                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200 uppercase">
                                      {member.dietaryPreference}
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-gray-500 flex flex-wrap items-center gap-3">
                                  {member.phone && <span>Phone: {member.phone}</span>}
                                  <span className="font-medium text-gray-700">
                                    Package:{' '}
                                    <span className="font-semibold text-gray-900">
                                      {member.packageName || member.package?.packageName || 'No Active Package'}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Meal Slots Attendance Grid According to Location Slots */}
                          <div className="pt-2 border-t border-gray-100 space-y-2">
                            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#005390]" />
                                <span>Meal Slots Attendance ({selectedDate}):</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                              {activeMealSlotsList.map((slotObj) => {
                                const slotKey = slotObj.key
                                const slotLabel = slotObj.label || getSlotDisplayLabel(slotKey)
                                const isCoveredInPkg = isSlotCoveredInPackage(member, slotKey)
                                const { attended, isCrossed, time } = isSlotAttendedForMember(member, slotKey)

                                return (
                                  <div
                                    key={slotKey}
                                    className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between gap-2 transition-all ${
                                      attended
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-2xs'
                                        : isCrossed
                                          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                                          : 'bg-gray-50 border-gray-200 text-gray-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1.5">
                                      <div className="font-bold text-xs flex items-center gap-1.5 truncate">
                                        <Clock
                                          className={`w-3.5 h-3.5 shrink-0 ${attended ? 'text-emerald-600' : isCrossed ? 'text-amber-600' : 'text-gray-400'}`}
                                        />
                                        <span className="truncate">{slotLabel}</span>
                                      </div>

                                      {attended ? (
                                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Attended</span>
                                          {time && (
                                            <span className="text-[9px] opacity-80 pl-1 border-l border-emerald-400">
                                              {time}
                                            </span>
                                          )}
                                        </span>
                                      ) : isCrossed ? (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0">
                                          <XCircle className="w-3 h-3 text-amber-600" />
                                          Absent
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-md text-[10px] font-semibold flex items-center gap-1 shrink-0">
                                          <Clock className="w-3 h-3 text-gray-400" />
                                          Pending
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-gray-200/60 mt-0.5">
                                      {isCoveredInPkg ? (
                                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200 shrink-0">
                                          Covered in Package
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100/90 text-amber-800 border border-amber-200 shrink-0">
                                          Extra Meal
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Guest Meals Recorded for this Flat */}
                  {flat.guestAttendances && flat.guestAttendances.length > 0 && (
                    <div className="p-4 bg-purple-50/50 border-t border-purple-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                          <UserPlus className="w-4 h-4 text-purple-600" />
                          <span>
                            Logged Guest Meals (
                            {flat.guestAttendances.reduce(
                              (sum: number, g: FnbGuestAttendance) => sum + (g.guestCount || 1),
                              0,
                            )}{' '}
                            Guest(s))
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {flat.guestAttendances.map((ga: FnbGuestAttendance) => {
                          const slotKey =
                            ga.mealSlotKey || (ga.globalMealSlot?.name || '').toLowerCase().replace(/\s+/g, '_')
                          const slotLabel = getSlotDisplayLabel(slotKey || 'breakfast')
                          const gName = ga.guestName || 'Guest'
                          const gCount = ga.guestCount || 1

                          return (
                            <div
                              key={ga.id}
                              className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs flex items-center justify-between gap-2"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-900 text-xs truncate">{gName}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                                    {gCount} Guest(s)
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                                  <span>
                                    Slot: <strong className="text-gray-800 font-semibold">{slotLabel}</strong>
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Attended</span>
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : /* MEMBER-WISE LIST VIEW */
      filteredMembers.length === 0 ? (
        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          No members found matching the selected filters.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Flat / Location</th>
                  <th className="py-3.5 px-4">Member Type</th>
                  <th className="py-3.5 px-4">Food Package</th>
                  <th className="py-3.5 px-4">Meal Slots Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredMembers.map((member) => {
                  return (
                    <tr key={member.memberId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{member.fullName}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800">{member.fullLocation}</td>
                      <td className="py-3.5 px-4">{member.memberType === 'resident' ? 'Primary' : 'Family'}</td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {member.packageName || member.package?.packageName || 'No Package'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {activeMealSlotsList.map((slotObj) => {
                            const slotKey = slotObj.key
                            const slotLabel = slotObj.label || getSlotDisplayLabel(slotKey)
                            const isCoveredInPkg = isSlotCoveredInPackage(member, slotKey)
                            const { attended, isCrossed } = isSlotAttendedForMember(member, slotKey)
                            return (
                              <span
                                key={slotKey}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 ${
                                  attended
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : isCrossed
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}
                              >
                                {attended ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : isCrossed ? (
                                  <XCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                ) : (
                                  <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                                )}
                                <span>
                                  {slotLabel}: {attended ? 'Attended' : isCrossed ? 'Absent' : 'Pending'}
                                </span>
                                {isCoveredInPkg ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-200/60 text-emerald-900">
                                    Covered
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-200/60 text-amber-900">
                                    Extra
                                  </span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
