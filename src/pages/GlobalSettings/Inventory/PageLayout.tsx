import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
export function InventoryPage({
  title,
  description,
  onBack,
  children,
}: {
  title: string
  description?: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <div>
          <h1 className="break-words text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-600 md:text-base">{description}</p>}
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
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <Card className="min-w-0 [--card-spacing:--spacing(6)]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {action}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
export function InventoryLoading() {
  return <Skeleton className="h-64 w-full" />
}
export function InventoryLoadError({ retry }: { retry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        Unable to load inventory.{' '}
        <Button variant="outline" onClick={retry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )
}
