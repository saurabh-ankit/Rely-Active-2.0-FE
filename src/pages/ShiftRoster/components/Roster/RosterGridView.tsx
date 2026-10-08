import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { EmployeeShiftAssignment, ShiftEmployeeDate, ShiftV2 } from '@/lib/services/rosterService'
import { useListEmployeeShifts, useListShiftEmployeeDates, useListShifts } from '@/hooks/react-query/roster'
import {
  ROSTER_GRID_OFF_LABEL,
  buildDateRange,
  buildRosterGridData,
  computeRosterGridStats,
  exportRosterGridExcel,
  getActiveGridEntries,
  isGridCellOff,
  todayYmdLocal,
} from '../../utils'

const DAYS_IN_VIEW = 7

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Excludes red/rose so a shift cell never looks like a day off. */
const SHIFT_PALETTE = [
  { cell: 'bg-emerald-100 text-emerald-800', badge: 'bg-emerald-600 text-white' },
  { cell: 'bg-sky-100 text-sky-800', badge: 'bg-sky-600 text-white' },
  { cell: 'bg-purple-100 text-purple-800', badge: 'bg-purple-600 text-white' },
  { cell: 'bg-amber-100 text-amber-800', badge: 'bg-amber-600 text-white' },
  { cell: 'bg-teal-100 text-teal-800', badge: 'bg-teal-600 text-white' },
  { cell: 'bg-indigo-100 text-indigo-800', badge: 'bg-indigo-600 text-white' },
  { cell: 'bg-cyan-100 text-cyan-800', badge: 'bg-cyan-600 text-white' },
  { cell: 'bg-violet-100 text-violet-800', badge: 'bg-violet-600 text-white' },
] as const

const getShiftColor = (shiftId: string) => {
  const hash = shiftId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return SHIFT_PALETTE[hash % SHIFT_PALETTE.length]!
}

const getWeekStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())

const navButtonClass =
  'h-8 px-2.5 text-xs text-gray-700 bg-white hover:bg-[#2a517c] hover:text-white border-gray-300 shadow-sm'

interface RosterGridViewProps {
  /** Restrict rows to these employees (department filter); null shows everyone. */
  employeeIds: Set<string> | null
  nameByUserId: Map<string, string>
  onSelectDate: (dateStr: string) => void
}

const RosterGridView = ({ employeeIds, nameByUserId, onSelectDate }: RosterGridViewProps) => {
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [isExporting, setIsExporting] = useState(false)
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set())
  const [showOnlySelected, setShowOnlySelected] = useState(false)

  const { data: shiftsData, isLoading: shiftsLoading } = useListShifts()
  const { data: assignmentsData, isLoading: assignmentsLoading } = useListEmployeeShifts()
  const { data: datesData, isLoading: datesLoading } = useListShiftEmployeeDates({ includeDeleted: 'true' })
  const isLoading = shiftsLoading || assignmentsLoading || datesLoading

  const windowStart = useMemo(() => getWeekStart(anchorDate), [anchorDate])
  const dates = useMemo(() => buildDateRange(windowStart, DAYS_IN_VIEW), [windowStart])
  const dateStrs = useMemo(() => dates.map((d) => todayYmdLocal(d)), [dates])
  const todayStr = todayYmdLocal()

  const { employees, shiftMap, shiftMetaList } = useMemo(
    () =>
      buildRosterGridData({
        assignments: (Array.isArray(assignmentsData?.data) ? assignmentsData.data : []) as EmployeeShiftAssignment[],
        shifts: (shiftsData?.data?.shifts || []) as ShiftV2[],
        shiftDates: (Array.isArray(datesData?.data) ? datesData.data : []) as ShiftEmployeeDate[],
        employeeIds,
        nameByUserId,
      }),
    [assignmentsData, shiftsData, datesData, employeeIds, nameByUserId],
  )

  const displayedEmployees = useMemo(
    () => (showOnlySelected && selectedEmpIds.size > 0 ? employees.filter((e) => selectedEmpIds.has(e.id)) : employees),
    [employees, showOnlySelected, selectedEmpIds],
  )

  const stats = useMemo(
    () =>
      computeRosterGridStats(
        displayedEmployees.map((e) => e.id),
        shiftMap,
        dateStrs,
      ),
    [displayedEmployees, shiftMap, dateStrs],
  )

  const allDisplayedSelected =
    displayedEmployees.length > 0 && displayedEmployees.every((e) => selectedEmpIds.has(e.id))
  const someDisplayedSelected = !allDisplayedSelected && displayedEmployees.some((e) => selectedEmpIds.has(e.id))

  const handleNavigate = (dir: 'prev' | 'next' | 'current') => {
    if (dir === 'current') {
      setAnchorDate(new Date())
      return
    }
    const offset = dir === 'prev' ? -DAYS_IN_VIEW : DAYS_IN_VIEW
    setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + offset))
  }

  const toggleEmployee = (empId: string) => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev)
      if (next.has(empId)) {
        next.delete(empId)
        if (next.size === 0) setShowOnlySelected(false)
      } else {
        next.add(empId)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedEmpIds(new Set())
    setShowOnlySelected(false)
  }

  const handleDownloadExcel = async (selectedOnly: boolean) => {
    const exportEmployees =
      selectedOnly && selectedEmpIds.size > 0 ? employees.filter((e) => selectedEmpIds.has(e.id)) : employees
    const startStr = dateStrs[0]
    const endStr = dateStrs[dateStrs.length - 1]
    const fileName =
      exportEmployees.length < employees.length
        ? `roster_grid_${startStr}_to_${endStr}_(${exportEmployees.length}_staff).xlsx`
        : `roster_grid_${startStr}_to_${endStr}.xlsx`

    setIsExporting(true)
    try {
      await exportRosterGridExcel({
        employees: exportEmployees,
        shiftMap,
        shiftMetaList,
        dates,
        dayNames: DAY_NAMES,
        fileName,
      })
    } catch {
      toast.error('Failed to export roster grid')
    } finally {
      setIsExporting(false)
    }
  }

  const endDate = dates[dates.length - 1]!
  const startMonth = windowStart.toLocaleString('en-US', { month: 'long' })
  const endMonth = endDate.toLocaleString('en-US', { month: 'long' })
  const headerDateLabel =
    startMonth === endMonth
      ? `${startMonth} ${windowStart.getFullYear()}`
      : `${startMonth} – ${endMonth} ${endDate.getFullYear()}`

  if (isLoading) {
    return <p className="text-sm text-gray-500 py-8 text-center">Loading roster grid…</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleNavigate('prev')} className={navButtonClass}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Prev 7 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleNavigate('current')} className={navButtonClass}>
            Current
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleNavigate('next')} className={navButtonClass}>
            Next 7 Days
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          <span className="text-xs font-bold text-gray-700 pl-2">{headerDateLabel}</span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {selectedEmpIds.size > 0 ? (
            <>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-100 text-sky-800 border border-sky-200">
                {selectedEmpIds.size} selected
              </span>
              {showOnlySelected ? (
                <Button
                  size="sm"
                  onClick={() => setShowOnlySelected(false)}
                  className="h-8 px-2.5 text-xs text-white bg-[#2a517c] hover:bg-[#1e3a5a] shadow-sm"
                  title="Show all employees in the grid"
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                  Show All ({employees.length})
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOnlySelected(true)}
                  className="h-8 px-2.5 text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-300 shadow-sm font-medium"
                  title="Only show selected employees"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Focus Selected ({selectedEmpIds.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadExcel(true)}
                disabled={isExporting}
                className="h-8 px-2.5 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 shadow-sm font-medium"
                title="Download Excel for selected employees only"
              >
                <Download className={`h-3.5 w-3.5 mr-1.5 ${isExporting ? 'animate-spin' : ''}`} />
                Download Selected ({selectedEmpIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadExcel(false)}
                disabled={isExporting}
                className="h-8 px-2.5 text-xs text-gray-700 bg-white hover:bg-gray-50 border-gray-300 shadow-sm"
                title="Download Excel for all employees"
              >
                Download All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 px-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50"
                title="Clear employee selection"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadExcel(false)}
              disabled={isExporting || employees.length === 0}
              className={navButtonClass}
              title="Download current grid as Excel"
            >
              <Download className={`h-3.5 w-3.5 mr-1.5 ${isExporting ? 'animate-spin' : ''}`} />
              {isExporting ? 'Exporting…' : 'Download Excel'}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm bg-white mb-8">
        <table className="border-collapse text-xs w-full select-none" style={{ minWidth: '960px' }}>
          <thead>
            <tr className="bg-[#2a517c] text-white border-b border-white/20">
              <th
                rowSpan={2}
                className="sticky left-0 z-30 bg-[#2a517c] text-white px-2.5 py-2 text-left font-bold border-r border-b border-white/20 min-w-[160px] max-w-[160px]"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allDisplayedSelected}
                    indeterminate={someDisplayedSelected}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedEmpIds(new Set(displayedEmployees.map((e) => e.id)))
                      else clearSelection()
                    }}
                    className="border-white/60 bg-white/20 data-checked:border-white data-checked:bg-white data-checked:text-[#2a517c] data-indeterminate:bg-white data-indeterminate:text-[#2a517c] cursor-pointer"
                    aria-label={allDisplayedSelected ? 'Deselect all' : 'Select all'}
                  />
                  <span>Employee Name</span>
                </div>
              </th>
              <th
                rowSpan={2}
                className="sticky left-[160px] z-30 bg-[#2a517c] text-white px-2.5 py-2 text-left font-semibold border-r border-b border-white/20 min-w-[110px]"
              >
                Location
              </th>
              {dates.map((date, idx) => {
                const ds = dateStrs[idx]!
                return (
                  <th
                    key={`day-${ds}`}
                    onClick={() => onSelectDate(ds)}
                    className={`px-1 py-1.5 text-center font-bold border-r border-white/20 min-w-[50px] cursor-pointer hover:bg-white/20 transition-colors ${
                      ds === todayStr ? 'bg-blue-600' : 'bg-[#2a517c]'
                    }`}
                    title={`View rosters for ${date.toLocaleDateString()}`}
                  >
                    {DAY_NAMES[date.getDay()]}
                  </th>
                )
              })}
              <th
                rowSpan={2}
                className="bg-[#2a517c] text-white px-2 py-2 text-center font-bold border-r border-b border-white/20 min-w-[95px]"
                title="Working days / days off in this 7-day period"
              >
                Days / Off
              </th>
            </tr>
            <tr className="bg-[#1e3a5a] text-white border-b border-gray-300">
              {dates.map((date, idx) => {
                const ds = dateStrs[idx]!
                return (
                  <th
                    key={`date-${ds}`}
                    onClick={() => onSelectDate(ds)}
                    className={`px-1 py-1 text-center font-extrabold text-sm border-r border-white/20 min-w-[50px] cursor-pointer hover:bg-white/20 transition-colors ${
                      ds === todayStr ? 'bg-blue-700 ring-2 ring-sky-300' : 'bg-[#1e3a5a]'
                    }`}
                    title={`View rosters for ${date.toLocaleDateString()}`}
                  >
                    {date.getDate()}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {displayedEmployees.length === 0 ? (
              <tr>
                <td colSpan={3 + DAYS_IN_VIEW} className="text-center py-12 text-gray-400 italic">
                  No employee shift assignments found for the current selection.
                </td>
              </tr>
            ) : (
              displayedEmployees.map((employee, rowIdx) => {
                const isSelected = selectedEmpIds.has(employee.id)
                const empStat = stats.empStats[employee.id]
                return (
                  <tr
                    key={employee.id}
                    className={`border-b border-gray-300 transition-colors ${
                      isSelected ? 'bg-sky-50/70' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-20 px-2.5 py-1.5 font-bold border-r whitespace-nowrap min-w-[160px] max-w-[160px] ${
                        isSelected
                          ? 'bg-sky-100 text-sky-950 border-sky-200'
                          : 'bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                      title={employee.name}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEmployee(employee.id)}
                          className="border-slate-400 bg-white data-checked:border-[#2a517c] data-checked:bg-[#2a517c] data-checked:text-white cursor-pointer"
                          aria-label={`Select ${employee.name}`}
                        />
                        <span className="truncate">{employee.name}</span>
                      </div>
                    </td>
                    <td
                      className={`sticky left-[160px] z-20 px-2.5 py-1.5 font-medium border-r border-gray-300 whitespace-nowrap min-w-[110px] max-w-[160px] truncate ${
                        isSelected ? 'bg-sky-50 text-sky-900' : 'bg-white text-gray-800'
                      }`}
                      title={employee.location}
                    >
                      {employee.location}
                    </td>

                    {dates.map((date, idx) => {
                      const ds = dateStrs[idx]!
                      const entries = shiftMap[employee.id]?.[ds] || []
                      const isToday = ds === todayStr

                      if (entries.length === 0) {
                        return (
                          <td
                            key={ds}
                            onClick={() => onSelectDate(ds)}
                            className={`p-0 text-center border-r border-gray-300 min-w-[50px] h-8 align-middle text-gray-300 cursor-pointer hover:bg-slate-100 transition-colors ${
                              isToday ? 'bg-blue-50/50' : ''
                            }`}
                            title={`View rosters for ${date.toLocaleDateString()}`}
                          >
                            —
                          </td>
                        )
                      }

                      if (isGridCellOff(entries)) {
                        return (
                          <td
                            key={ds}
                            onClick={() => onSelectDate(ds)}
                            className={`p-0 border-r border-gray-300 min-w-[50px] h-8 align-middle cursor-pointer ${
                              isToday ? 'ring-1 ring-sky-400' : ''
                            }`}
                          >
                            <div
                              className="w-full h-full min-h-[30px] flex items-center justify-center bg-red-600 text-white font-bold text-xs hover:opacity-90 transition-opacity"
                              title="Day off"
                            >
                              {ROSTER_GRID_OFF_LABEL}
                            </div>
                          </td>
                        )
                      }

                      return (
                        <td
                          key={ds}
                          className={`p-0 border-r border-gray-300 min-w-[50px] h-8 align-middle ${
                            isToday ? 'ring-1 ring-sky-400' : ''
                          }`}
                        >
                          <div className="w-full h-full min-h-[30px] flex items-stretch divide-x divide-white/60">
                            {getActiveGridEntries(entries).map((entry) => (
                              <button
                                key={entry.shiftId}
                                type="button"
                                onClick={() => onSelectDate(ds)}
                                className={`flex-1 flex items-center justify-center px-1 font-bold text-xs whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 transition-transform ${getShiftColor(entry.shiftId).cell}`}
                                title={entry.shiftTime ? `${entry.shiftName} (${entry.shiftTime})` : entry.shiftName}
                              >
                                {entry.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      )
                    })}

                    <td className="px-2 py-1.5 text-center font-semibold text-xs border-r border-gray-300 bg-slate-50/70 whitespace-nowrap min-w-[95px]">
                      <span className="font-bold text-slate-800" title={`${empStat?.workDays ?? 0} working days`}>
                        {empStat?.workDays ?? 0}d
                      </span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="font-bold text-red-600" title={`${empStat?.offDays ?? 0} days off`}>
                        {empStat?.offDays ?? 0} off
                      </span>
                    </td>
                  </tr>
                )
              })
            )}

            {displayedEmployees.length > 0 && (
              <>
                {shiftMetaList.map((meta) => {
                  const tooltip = meta.shiftTime ? `${meta.shiftName} (${meta.shiftTime})` : meta.shiftName
                  return (
                    <tr key={`count-${meta.label}`} className="bg-slate-100 font-semibold border-b border-slate-200">
                      <td
                        className="sticky left-0 z-20 bg-slate-100 px-2.5 py-1.5 border-r border-slate-200 font-bold text-slate-800 whitespace-nowrap min-w-[160px] max-w-[160px] truncate"
                        title={tooltip}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${getShiftColor(meta.shiftId).badge}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider truncate">
                            Count
                          </span>
                        </div>
                      </td>
                      <td className="sticky left-[160px] z-20 bg-slate-100 border-r border-slate-200 min-w-[110px]" />
                      {dateStrs.map((ds) => {
                        const count = stats.countsByDate[ds]?.[meta.label] ?? 0
                        return (
                          <td
                            key={`count-${meta.label}-${ds}`}
                            onClick={() => onSelectDate(ds)}
                            className="px-1 py-1.5 text-center font-bold text-slate-800 border-r border-slate-200 text-xs cursor-pointer hover:bg-slate-200 transition-colors"
                            title={`${count} assigned to ${meta.shiftName}`}
                          >
                            {count}
                          </td>
                        )
                      })}
                      <td
                        className="px-2 py-1.5 text-center font-bold text-slate-800 border-r border-slate-200 text-xs bg-slate-100"
                        title={`${stats.totalByLabel[meta.label] ?? 0} ${meta.shiftName} shifts in this 7-day period`}
                      >
                        {stats.totalByLabel[meta.label] ?? 0}
                      </td>
                    </tr>
                  )
                })}

                <tr className="bg-[#2a517c] text-white font-extrabold border-t-2 border-slate-300">
                  <td className="sticky left-0 z-20 bg-[#2a517c] px-2.5 py-1.5 border-r border-[#1e3a5a] font-black text-white whitespace-nowrap min-w-[160px] max-w-[160px] uppercase text-xs tracking-wider">
                    Total
                  </td>
                  <td className="sticky left-[160px] z-20 bg-[#2a517c] border-r border-[#1e3a5a] min-w-[110px]" />
                  {dateStrs.map((ds) => {
                    const total = stats.totalByDate[ds] ?? 0
                    return (
                      <td
                        key={`total-${ds}`}
                        onClick={() => onSelectDate(ds)}
                        className="px-1 py-1.5 text-center font-black text-white border-r border-[#1e3a5a] text-xs bg-[#1e3a5a] cursor-pointer hover:bg-blue-900 transition-colors"
                        title={`${total} staff scheduled`}
                      >
                        {total}
                      </td>
                    )
                  })}
                  <td
                    className="px-2 py-1.5 text-center font-black text-white border-r border-[#1e3a5a] text-xs bg-[#1e3a5a] whitespace-nowrap"
                    title={`${stats.grandTotalWorkDays} working days, ${stats.grandTotalOffDays} days off across all staff`}
                  >
                    {stats.grandTotalWorkDays}d / {stats.grandTotalOffDays} off
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RosterGridView
