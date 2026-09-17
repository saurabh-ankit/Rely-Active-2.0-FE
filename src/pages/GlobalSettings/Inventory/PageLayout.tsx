import type { ReactNode } from 'react'
import { ArrowLeft, Briefcase, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function InventoryPage({
  title,
  description,
  onBack,
  backLabel = 'Back to Global Settings',
  icon: Icon = Briefcase,
  action,
  children,
}: {
  title: string
  description?: string
  onBack: () => void
  backLabel?: string
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="w-full min-w-0 space-y-6 pb-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>

      {/* Top Header Banner matching other Global Settings pages */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-[#005390]/10 text-[#005390]">
                <Icon className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>
            {description && <p className="text-xs text-gray-500 mt-1.5 ml-1">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>

      {children}
    </div>
  )
}

export function FormSection({
  title,
  description,
  children,
  action,
}: {
  title?: string
  description?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
      {(title || action || description) && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {title && <h2 className="text-lg font-bold text-gray-900">{title}</h2>}
            {action}
          </div>
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

export function InventoryLoading() {
  return <Skeleton className="h-64 w-full rounded-3xl" />
}

export function InventoryLoadError({ retry }: { retry: () => void }) {
  return (
    <Alert variant="destructive" className="rounded-2xl">
      <AlertDescription className="flex items-center justify-between">
        <span>Unable to load inventory.</span>
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )
}
