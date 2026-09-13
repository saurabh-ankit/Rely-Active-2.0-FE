import type { ReactNode } from 'react'
import { errorMessage } from './utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { poStatusLabels, type POStatus } from '@/lib/types/centerInventory'
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {errorMessage(error)}
        {retry && (
          <Button variant="outline" onClick={retry}>
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
export function FormField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700">
        {label}
      </label>
      {children}
    </div>
  )
}
export function Status({ status }: { status: POStatus }) {
  return (
    <Badge
      variant={
        status === 'cancelled' || status === 'rejected' ? 'destructive' : status === 'draft' ? 'outline' : 'secondary'
      }
    >
      {poStatusLabels[status]}
    </Badge>
  )
}
