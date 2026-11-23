import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ColorVariant = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'cyan' | 'red' | 'yellow'

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  isLoading?: boolean
  color?: ColorVariant
  /** Optional right-side metric shown in the same row as value/description. */
  secondaryValue?: string | number
  secondaryDescription?: string
  onClick?: () => void
}

const colorClasses: Record<ColorVariant, { bg: string; border: string; icon: string; text: string }> = {
  blue: {
    bg: 'bg-blue-50/80 hover:bg-blue-100/80',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-900',
  },
  green: {
    bg: 'bg-green-50/80 hover:bg-green-100/80',
    border: 'border-green-200',
    icon: 'text-green-600',
    text: 'text-green-900',
  },
  orange: {
    bg: 'bg-orange-50/80 hover:bg-orange-100/80',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    text: 'text-orange-900',
  },
  purple: {
    bg: 'bg-purple-50/80 hover:bg-purple-100/80',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    text: 'text-purple-900',
  },
  pink: {
    bg: 'bg-pink-50/80 hover:bg-pink-100/80',
    border: 'border-pink-200',
    icon: 'text-pink-600',
    text: 'text-pink-900',
  },
  cyan: {
    bg: 'bg-cyan-50/80 hover:bg-cyan-100/80',
    border: 'border-cyan-200',
    icon: 'text-cyan-600',
    text: 'text-cyan-900',
  },
  red: {
    bg: 'bg-red-50/80 hover:bg-red-100/80',
    border: 'border-red-200',
    icon: 'text-red-600',
    text: 'text-red-900',
  },
  yellow: {
    bg: 'bg-yellow-50/80 hover:bg-yellow-100/80',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    text: 'text-yellow-900',
  },
}

export const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  isLoading = false,
  color,
  secondaryValue,
  secondaryDescription,
  onClick,
}: StatCardProps) => {
  const colors = color
    ? colorClasses[color]
    : {
        bg: 'bg-white/20 hover:bg-white/30',
        border: 'border-white/30',
        icon: 'text-gray-700',
        text: 'text-gray-900',
      }
  const hasSecondary = secondaryValue !== undefined || secondaryDescription !== undefined

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        `backdrop-blur-xl ${colors.bg} border ${colors.border} shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`,
        onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300',
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${colors.text}`}>{title}</CardTitle>
        <Icon className={`h-5 w-5 ${colors.icon}`} />
      </CardHeader>
      <CardContent>
        {hasSecondary ? (
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className={`text-2xl font-bold ${colors.text}`}>{isLoading ? '...' : value}</div>
              <p className="text-xs text-gray-600">{description}</p>
            </div>
            <div className="min-w-0 text-right">
              <div className={`text-2xl font-bold ${colors.text}`}>{isLoading ? '...' : (secondaryValue ?? '—')}</div>
              {secondaryDescription ? <p className="text-xs text-gray-600">{secondaryDescription}</p> : null}
            </div>
          </div>
        ) : (
          <>
            <div className={`text-2xl font-bold ${colors.text}`}>{isLoading ? '...' : value}</div>
            <p className="text-xs text-gray-600">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default StatCard
