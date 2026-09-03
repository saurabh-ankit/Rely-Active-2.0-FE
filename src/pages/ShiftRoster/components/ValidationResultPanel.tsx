import { AlertTriangle, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ValidationResult } from '@/lib/services/rosterService'

interface ValidationResultPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  results: ValidationResult[]
  mode: 'blocked' | 'override'
  overrideReason: string
  onOverrideReasonChange: (reason: string) => void
  onConfirmOverride?: () => void
}

export function ValidationResultPanel({
  open,
  onOpenChange,
  results,
  mode,
  overrideReason,
  onOverrideReasonChange,
  onConfirmOverride,
}: ValidationResultPanelProps) {
  const allErrors = results.flatMap((r) => r.errors || [])
  const allWarnings = results.flatMap((r) => r.warnings || [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'blocked' ? (
              <>
                <XCircle className="w-5 h-5 text-destructive" /> Validation Blocked
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Validation Warnings
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'blocked'
              ? 'Fix the following issues before publishing.'
              : 'Provide an override reason to proceed with warnings.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {allErrors.map((err, i) => (
            <div
              key={`err-${i}`}
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {err}
            </div>
          ))}
          {allWarnings.map((warn, i) => (
            <div
              key={`warn-${i}`}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {warn}
            </div>
          ))}
        </div>

        {mode === 'override' && (
          <div>
            <Label>Override Reason *</Label>
            <Textarea
              value={overrideReason}
              onChange={(e) => onOverrideReasonChange(e.target.value)}
              placeholder="Explain why you are overriding validation warnings..."
              className="mt-1"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {mode === 'override' && onConfirmOverride && (
            <Button onClick={onConfirmOverride} disabled={!overrideReason.trim()}>
              Confirm & Publish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
