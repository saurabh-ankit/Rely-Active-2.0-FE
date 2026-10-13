import { Check, Minus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { WeekDay } from '@/lib/types/roster'
import type { UserItem } from '@/lib/types'
import { getUserDisplayName } from '../../utils'

interface EmployeeAvailabilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: UserItem[]
  days: WeekDay[]
  /** Working days picked for the roster; other days are shown as not rostered. Omit to treat all as picked. */
  selectedDays?: WeekDay[]
}

const getWeekOffSet = (emp: UserItem): Set<string> => {
  const raw = emp.profile?.weekOffDays || emp.profile?.week_off_days || []
  if (!Array.isArray(raw)) return new Set()
  return new Set(raw.map((d) => String(d).toLowerCase()))
}

const EmployeeAvailabilityDialog = ({
  open,
  onOpenChange,
  employees,
  days,
  selectedDays,
}: EmployeeAvailabilityDialogProps) => {
  const isSelected = (day: WeekDay) => !selectedDays || selectedDays.includes(day)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee availability</DialogTitle>
          <p className="text-xs text-gray-500">
            Which days each selected employee will work on this roster, based on the working days you picked and their
            weekly off days.
          </p>
        </DialogHeader>

        {employees.length === 0 || days.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            Select employees and a date range to view availability.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-gray-600 px-2 py-2 border-b border-gray-200 sticky left-0 bg-white">
                    Employee
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className={`text-center font-semibold px-2 py-2 border-b border-gray-200 capitalize ${
                        isSelected(day) ? 'text-gray-700' : 'text-gray-300'
                      }`}
                      title={isSelected(day) ? undefined : 'Not a working day on this roster'}
                    >
                      {day.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const offs = getWeekOffSet(emp)
                  return (
                    <tr key={emp.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-2 py-2.5 font-medium text-[#1e3a5a] sticky left-0 bg-white whitespace-nowrap">
                        {getUserDisplayName(emp)}
                      </td>
                      {days.map((day) => {
                        // Week off wins: the employee isn't rostered that day even if it's picked.
                        const weekOff = offs.has(day)
                        const picked = isSelected(day)
                        return (
                          <td key={day} className={`px-2 py-2.5 text-center ${picked ? '' : 'bg-gray-50'}`}>
                            {weekOff ? (
                              <X className="inline-block h-4 w-4 text-rose-500" aria-label="Week off" />
                            ) : picked ? (
                              <Check className="inline-block h-4 w-4 text-emerald-600" aria-label="On roster" />
                            ) : (
                              <Minus className="inline-block h-4 w-4 text-gray-300" aria-label="Not rostered" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-[11px] text-gray-500 mt-3">
              <Check className="inline-block h-3 w-3 text-emerald-600 align-text-bottom" /> On roster ·{' '}
              <Minus className="inline-block h-3 w-3 text-gray-400 align-text-bottom" /> Not rostered (day not picked) ·{' '}
              <X className="inline-block h-3 w-3 text-rose-500 align-text-bottom" /> Week off
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default EmployeeAvailabilityDialog
