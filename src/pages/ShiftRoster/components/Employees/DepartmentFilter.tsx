import { Building2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export const ALL_DEPARTMENTS = 'all'

type DepartmentOption = {
  id: string
  name: string
  code?: string | null
}

interface DepartmentFilterProps {
  id: string
  value: string
  onChange: (value: string) => void
  departments: DepartmentOption[]
  className?: string
  triggerClassName?: string
  showLabel?: boolean
}

const DepartmentFilter = ({
  id,
  value,
  onChange,
  departments,
  className,
  triggerClassName,
  showLabel = false,
}: DepartmentFilterProps) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel ? (
        <Label htmlFor={id} className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Department
        </Label>
      ) : null}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className={cn(
            'h-9 w-[220px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-xs',
            'hover:bg-gray-50 hover:border-gray-400',
            'focus-visible:border-[#2a517c] focus-visible:ring-2 focus-visible:ring-[#2a517c]/20',
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
            <SelectValue placeholder="All departments" />
          </span>
        </SelectTrigger>
        <SelectContent className="min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <SelectItem value={ALL_DEPARTMENTS} className="cursor-pointer">
            All departments
          </SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id} className="cursor-pointer">
              {d.name}
              {d.code ? ` (${d.code})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default DepartmentFilter
