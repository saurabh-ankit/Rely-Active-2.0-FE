import React from 'react'
import { Check, ChevronDown, HeartPulse, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateResidentConditionMutation } from '@/hooks/react-query/resident'
import type { DiagnosisCondition, ResidentCurrentCondition } from '@/lib/types/resident'
import { cn, formatDisplayDate } from '@/lib/utils'
import { CONDITION_DOT_STYLES, CONDITION_OPTIONS, CONDITION_STYLES } from './clinicalConstants'

interface ResidentConditionMenuProps {
  residentId: string
  currentCondition: ResidentCurrentCondition | null | undefined
  canUpdate: boolean
}

const BADGE_CLASS = 'inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold'

function describeCondition(current: ResidentCurrentCondition): string {
  const source = current.source === 'DOCTOR' ? 'Doctor visit' : 'Manual update'
  const by = current.updatedByName ? ` by ${current.updatedByName}` : ''
  return `${source}${by} on ${formatDisplayDate(current.updatedAt)}${current.note ? ` - ${current.note}` : ''}`
}

export const ResidentConditionMenu: React.FC<ResidentConditionMenuProps> = ({
  residentId,
  currentCondition,
  canUpdate,
}) => {
  const updateMutation = useUpdateResidentConditionMutation(residentId)
  const condition = currentCondition?.condition ?? null

  if (!canUpdate) {
    if (!currentCondition) return null
    return (
      <span
        title={describeCondition(currentCondition)}
        className={cn(BADGE_CLASS, CONDITION_STYLES[currentCondition.condition])}
      >
        <HeartPulse className="h-4 w-4" />
        Condition:
        <span className="capitalize">{currentCondition.condition.toLowerCase()}</span>
      </span>
    )
  }

  const handleSelect = (value: DiagnosisCondition) => {
    if (value === condition || updateMutation.isPending) return
    updateMutation.mutate({ condition: value })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={updateMutation.isPending}
        title={currentCondition ? describeCondition(currentCondition) : 'Set resident condition'}
        className={cn(
          BADGE_CLASS,
          'cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60',
          condition
            ? CONDITION_STYLES[condition]
            : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200',
        )}
      >
        {updateMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
        {condition ? (
          <>
            Condition:
            <span className="capitalize">{condition.toLowerCase()}</span>
          </>
        ) : (
          'Set Condition'
        )}
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 text-[11px]">Update condition</DropdownMenuLabel>
          {CONDITION_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            >
              <span className={cn('h-2 w-2 rounded-full', CONDITION_DOT_STYLES[option.value])} />
              {option.label}
              {option.value === condition && <Check className="ml-auto h-3.5 w-3.5 text-[#005390]" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ResidentConditionMenu
