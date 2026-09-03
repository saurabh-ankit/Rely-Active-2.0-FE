import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil } from 'lucide-react'

import type { RosterShiftItem } from '../types'

interface ShiftTemplatesTabProps {
  availableShifts: RosterShiftItem[]
  departments?: Array<{ id: string; name: string }>
  onOpenCreateShift: () => void
  onOpenEditShift: (shift: RosterShiftItem) => void
}

type CategoryFilter = 'ALL' | 'GENERAL' | 'DEPARTMENT' | 'OPD'

export function ShiftTemplatesTab({
  availableShifts,
  departments = [],
  onOpenCreateShift,
  onOpenEditShift,
}: ShiftTemplatesTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')

  const filteredShifts = availableShifts.filter((shift) => {
    if (categoryFilter === 'ALL') return true
    return (shift.shiftCategory as string) === categoryFilter || (!shift.shiftCategory && categoryFilter === 'GENERAL')
  })

  const getDeptName = (departmentId?: string) => departments.find((d) => d.id === departmentId)?.name || departmentId

  return (
    <Card className="shadow-xs border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-xl font-bold">Shift Master Templates & Policy Configuration</CardTitle>
            <CardDescription>Configure shift templates by category: General, Department, or OPD.</CardDescription>
          </div>
          <Button onClick={onOpenCreateShift} className="gap-2 bg-[#004B87] hover:bg-[#003865]">
            <Plus className="w-4 h-4" /> Create New Shift Master
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          {(['ALL', 'GENERAL', 'DEPARTMENT', 'OPD'] as CategoryFilter[]).map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={categoryFilter === cat ? 'default' : 'outline'}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredShifts.map((shift) => (
            <Card key={String(shift.id)} className="hover:border-[#004B87]/50 transition-all shadow-xs relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900">{String(shift.shiftName)}</CardTitle>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono bg-gray-50">
                        {String(shift.code)}
                      </Badge>
                      {shift.shiftCategory && (
                        <Badge variant="secondary" className="text-[10px]">
                          {String(shift.shiftCategory)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenEditShift(shift)}
                    title="Edit Shift Template"
                    className="h-8 w-8 text-gray-500 hover:text-[#004B87] hover:bg-blue-50"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription className="text-sm font-semibold text-gray-800 pt-1">
                  {String(shift.startTime)} - {String(shift.endTime)}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-gray-500 space-y-1">
                {shift.departmentId && <p>Department: {getDeptName(String(shift.departmentId))}</p>}
                {shift.breakStartTime && shift.breakEndTime ? (
                  <p>
                    Break: {String(shift.breakStartTime)} - {String(shift.breakEndTime)}
                  </p>
                ) : (
                  <p>Break: None / Flexible</p>
                )}
                <p className="text-emerald-600 font-medium">
                  {String(shift.description || 'Custom Operational Shift Pattern')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
