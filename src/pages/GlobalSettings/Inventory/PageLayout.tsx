import type { ReactNode } from 'react'
import { Briefcase, type LucideIcon } from 'lucide-react'
import { BackButton } from '@/components/common/BackButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="w-full min-w-0 space-y-4 pb-10">
      <div>
        <BackButton onClick={onBack}>{backLabel}</BackButton>
      </div>

      {/* Top Header Banner matching other Global Settings pages */}
      <Card className="gap-0 bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
        <CardHeader className="p-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-[#005390]/10 text-[#005390] shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">{title}</CardTitle>
            </div>
            {description && (
              <CardDescription className="text-xs text-gray-500 mt-1.5 ml-1">{description}</CardDescription>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
      </Card>

      {children}
    </div>
  )
}

export function FormSection({
  title,
  description,
  children,
  action,
  icon: Icon,
}: {
  title?: string
  description?: string
  children: ReactNode
  action?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <Card className="gap-0 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
      {(title || action || description) && (
        <CardHeader className="p-0 mb-5 flex flex-wrap flex-row items-start justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
                <Icon className="size-4.5" />
              </span>
            )}
            <div>
              {title && <CardTitle className="text-base font-bold text-gray-900">{title}</CardTitle>}
              {description && <CardDescription className="mt-0.5 text-xs text-gray-500">{description}</CardDescription>}
            </div>
          </div>
          {action}
        </CardHeader>
      )}
      <CardContent className="p-0">{children}</CardContent>
    </Card>
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
