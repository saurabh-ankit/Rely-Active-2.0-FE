import React from 'react'
import { ChevronRight, ListChecks } from 'lucide-react'
import type { IncidentSopSummary } from '@/lib/types/resident'
import { cn } from '@/lib/utils'

interface IncidentSopBarProps {
  sop: IncidentSopSummary
  onClick: () => void
}

export const IncidentSopBar: React.FC<IncidentSopBarProps> = ({ sop, onClick }) => {
  const percent = sop.total > 0 ? Math.round((sop.completed / sop.total) * 100) : 0
  const done = sop.isComplete

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer',
        done
          ? 'border-emerald-300/70 bg-emerald-50 hover:bg-emerald-100/70 dark:border-emerald-900/60 dark:bg-emerald-950/30'
          : 'border-orange-300/70 bg-orange-50 hover:bg-orange-100/70 dark:border-orange-900/60 dark:bg-orange-950/30',
      )}
    >
      <ListChecks
        className={cn(
          'h-4 w-4 shrink-0',
          done ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400',
        )}
      />
      <span
        className={cn(
          'shrink-0 text-[11px] font-bold',
          done ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300',
        )}
      >
        {done ? 'SOP completed' : `SOP pending · ${sop.completed}/${sop.total} steps done`}
      </span>
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn('block h-full rounded-full transition-all', done ? 'bg-emerald-500' : 'bg-orange-500')}
          style={{ width: `${percent}%` }}
        />
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

export default IncidentSopBar
