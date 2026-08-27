import React from 'react'
import { Check } from 'lucide-react'

export interface ProgressBarStep {
  id: number
  label: string
  icon?: React.ComponentType<{ className?: string }>
  count?: number | string
  description?: string
}

export interface CommonProgressBarProps {
  steps: ProgressBarStep[]
  currentStep: number
  onStepClick?: (stepId: number) => void
  className?: string
}

export const CommonProgressBar: React.FC<CommonProgressBarProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = '',
}) => {
  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="relative flex items-center justify-between w-full">
        {/* Connecting Progress Line */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-gray-100 rounded-full z-0">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${
                steps.length > 1
                  ? (Math.min(Math.max(currentStep - 1, 0), steps.length - 1) / (steps.length - 1)) * 100
                  : 100
              }%`,
            }}
          />
        </div>

        {/* Step Points */}
        {steps.map((step, index) => {
          const stepNumber = step.count ?? step.id ?? index + 1
          const isDone = currentStep > step.id
          const isActive = currentStep === step.id
          const Icon = step.icon

          return (
            <div
              key={step.id || index}
              onClick={() => isDone && onStepClick?.(step.id)}
              className={`relative z-10 flex flex-col items-center group ${
                isDone && onStepClick ? 'cursor-pointer' : ''
              }`}
            >
              {/* Step Circle & Icon */}
              <div
                className={`relative flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 shadow-xs ${
                  isDone
                    ? 'bg-blue-600 text-white shadow-blue-200'
                    : isActive
                      ? 'bg-white border-2 border-blue-600 text-blue-600 ring-4 ring-blue-50 shadow-md scale-105'
                      : 'bg-white border border-gray-200 text-gray-400'
                }`}
              >
                {isDone ? (
                  <Check className="w-5.5 h-5.5 stroke-[2.5]" />
                ) : Icon ? (
                  <Icon className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-bold">{stepNumber}</span>
                )}

                {/* Point Count Badge */}
                <span
                  className={`absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10px] font-bold rounded-full border border-white ${
                    isDone || isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {stepNumber}
                </span>
              </div>

              {/* Point Name & Description */}
              <div className="mt-2.5 flex flex-col items-center text-center">
                <span
                  className={`text-xs font-bold tracking-tight transition-colors ${
                    isActive
                      ? 'text-blue-600 font-extrabold'
                      : isDone
                        ? 'text-gray-900 font-semibold'
                        : 'text-gray-400 font-medium'
                  }`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[10px] text-gray-400 mt-0.5 max-w-[120px] line-clamp-1">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CommonProgressBar
