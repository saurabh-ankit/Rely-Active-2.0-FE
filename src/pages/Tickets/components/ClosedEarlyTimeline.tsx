import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TimelineStep {
  title: string
  desc: string
  /** The final "Closed" step of a ticket closed without completion. */
  closed?: boolean
}

/**
 * Timeline of a ticket closed without completion: only the steps that happened
 * (Raised, then Assigned / Work Started if they did), ending in Closed.
 */
export function ClosedEarlyTimeline({ steps }: { steps: TimelineStep[] }) {
  const circle = (step: TimelineStep, size: string) => (
    <div
      className={cn(
        'rounded-full text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0',
        size,
        step.closed ? 'bg-rose-500' : 'bg-emerald-500',
      )}
    >
      {step.closed ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
    </div>
  )

  // The line runs between the first and last step centres
  const edge = `${50 / steps.length}%`

  return (
    <>
      {/* Desktop / tablet: horizontal */}
      <div
        className="hidden sm:grid relative"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        <div className="absolute top-4 -translate-y-1/2 h-0.5 bg-emerald-500 z-0" style={{ left: edge, right: edge }} />
        {steps.map((step) => (
          <div key={step.title} className="flex flex-col items-center z-10 space-y-1.5 text-center px-1">
            {circle(step, 'w-8 h-8')}
            <span className={cn('text-xs font-bold', step.closed ? 'text-rose-700' : 'text-gray-900')}>
              {step.title}
            </span>
            <span className="text-[10px] font-medium text-gray-500 leading-tight">{step.desc}</span>
          </div>
        ))}
      </div>

      {/* Mobile: vertical */}
      <div className="sm:hidden space-y-0 relative pl-1">
        {steps.map((step, idx) => (
          <div key={step.title} className="flex items-start gap-3 relative">
            <div className="flex flex-col items-center shrink-0">
              {circle(step, 'w-7 h-7')}
              {idx < steps.length - 1 && <div className="w-0.5 min-h-[22px] my-1 bg-emerald-500" />}
            </div>
            <div className="min-w-0 flex-1 pt-0.5 pb-2">
              <span className={cn('text-xs font-bold block', step.closed ? 'text-rose-700' : 'text-gray-900')}>
                {step.title}
              </span>
              <span className="text-[11px] font-medium text-gray-500 leading-snug block mt-0.5">{step.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
