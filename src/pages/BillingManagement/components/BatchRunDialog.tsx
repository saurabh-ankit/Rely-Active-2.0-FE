import React, { useState } from 'react'
import { Loader2, PlayCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTriggerBatchRun } from '@/hooks/react-query/billing'

interface BatchRunDialogProps {
  propertyId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const BatchRunDialog: React.FC<BatchRunDialogProps> = ({ propertyId, isOpen, onClose, onSuccess }) => {
  const [periodStart, setPeriodStart] = useState<string>('2026-09-01')
  const [periodEnd, setPeriodEnd] = useState<string>('2026-09-28')
  const triggerMutation = useTriggerBatchRun()

  const handleRun = async () => {
    if (!propertyId) return
    await triggerMutation.mutateAsync({
      propertyId,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      runType: 'MANUAL',
    })
    onClose()
    onSuccess?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-[#005390]" />
            Trigger Monthly Billing Run
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Batch processes subscriptions and unbilled consumption for all active folios in this property via BullMQ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-semibold">Billing Period Start</Label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-xs font-semibold">Billing Period End</Label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="mt-1" />
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRun}
            disabled={!propertyId || triggerMutation.isPending}
            className="bg-[#005390] hover:bg-[#004170] text-white"
          >
            {triggerMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            Run Batch Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
