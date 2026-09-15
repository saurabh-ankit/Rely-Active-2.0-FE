import type { ReactNode } from 'react'
import { errorMessage } from './utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { InventoryStatus } from '@/components/inventory/InventoryStatus'
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
    <Card className="min-w-0 [--card-spacing:--spacing(6)]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
export function FormField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
    </Field>
  )
}
export function Status({ status }: { status: POStatus }) {
  const tone = {
    draft: 'neutral',
    approval_pending: 'amber',
    pending: 'amber',
    partially_received: 'amber',
    approved: 'blue',
    received: 'green',
    rejected: 'red',
    cancelled: 'red',
  } as const
  return <InventoryStatus tone={tone[status]}>{poStatusLabels[status]}</InventoryStatus>
}
