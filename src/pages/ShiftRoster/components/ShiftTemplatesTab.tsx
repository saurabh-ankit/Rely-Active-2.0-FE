import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil } from 'lucide-react'

interface ShiftTemplatesTabProps {
  availableShifts: any[]
  onOpenCreateShift: () => void
  onOpenEditShift: (shift: any) => void
}

export function ShiftTemplatesTab({
  availableShifts,
  onOpenCreateShift,
  onOpenEditShift,
}: ShiftTemplatesTabProps) {
  return (
    <Card className="shadow-xs border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Shift Master Templates & Policy Configuration</CardTitle>
            <CardDescription>
              Configure independent shift templates and location rest period parameters.
            </CardDescription>
          </div>
          <Button onClick={onOpenCreateShift} className="gap-2 bg-[#004B87] hover:bg-[#003865]">
            <Plus className="w-4 h-4" /> Create New Shift Master
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableShifts.map((shift) => (
            <Card key={shift.id} className="hover:border-[#004B87]/50 transition-all shadow-xs relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900">{shift.shiftName}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-[10px] font-mono bg-gray-50">
                      {shift.code}
                    </Badge>
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
                  {shift.startTime} - {shift.endTime}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-gray-500 space-y-1">
                {shift.breakStartTime && shift.breakEndTime ? (
                  <p>
                    Break: {shift.breakStartTime} - {shift.breakEndTime}
                  </p>
                ) : (
                  <p>Break: None / Flexible</p>
                )}
                <p className="text-emerald-600 font-medium">{shift.description || 'Custom Operational Shift Pattern'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
