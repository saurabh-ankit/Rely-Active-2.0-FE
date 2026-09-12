import React, { useState } from 'react'
import { Check, Eye, Loader2, Sparkles } from 'lucide-react'

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BillingAccount, Invoice } from '@/lib/types/billing'
import { useGenerateInvoice, usePreviewInvoice } from '@/hooks/react-query/billing'

interface GenerateInvoiceDialogProps {
  accounts: BillingAccount[]
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const GenerateInvoiceDialog: React.FC<GenerateInvoiceDialogProps> = ({
  accounts,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null

  const [selectedAccountId, setSelectedAccountId] = useState<string>('')

  const [periodStart, setPeriodStart] = useState<string>('2026-09-01')
  const [periodEnd, setPeriodEnd] = useState<string>('2026-09-28')
  const [issueDate, setIssueDate] = useState<string>('2026-09-28')
  const [dueDate, setDueDate] = useState<string>('2026-10-05')
  const [previewResult, setPreviewResult] = useState<Invoice | null>(null)

  const previewMutation = usePreviewInvoice()
  const generateMutation = useGenerateInvoice()

  const handlePreview = async () => {
    if (!selectedAccountId) return
    const res = await previewMutation.mutateAsync({
      billingAccountId: selectedAccountId,
      periodStart,
      periodEnd,
      issueDate,
      dueDate,
      isPreview: true,
    })
    if (res?.data) {
      setPreviewResult(res.data)
    }
  }

  const handleGenerate = async () => {
    if (!selectedAccountId) return
    await generateMutation.mutateAsync({
      billingAccountId: selectedAccountId,
      periodStart,
      periodEnd,
      issueDate,
      dueDate,
    })
    onClose()
    onSuccess?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#005390]" />
            Generate Monthly Invoice
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Preview prorated subscriptions and unbilled consumption in real-time, then finalize and post to the ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-semibold">Select Billing Folio / Account</Label>
            <Select value={selectedAccountId} onValueChange={(val) => setSelectedAccountId(val as string)}>
              <SelectTrigger className="mt-1">

                <SelectValue placeholder="Choose resident folio..." />
              </SelectTrigger>
              <SelectContent>
                {accounts && accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.accountNumber} — {acc.accountName} ({acc.unit?.unit_number ? `Unit ${acc.unit.unit_number}` : 'No Unit'})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No active folios available
                  </SelectItem>
                )}
              </SelectContent>

            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Issue Date</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={!selectedAccountId || previewMutation.isPending}
              className="flex-1 border-[#005390] text-[#005390] hover:bg-[#005390]/10"
            >
              {previewMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Preview Calculation (In-Memory)
            </Button>
          </div>

          {/* Preview Output */}
          {previewResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Live Preview Calculation
                </span>
                <span className="text-xs text-gray-400 font-mono">Zero DB mutations</span>
              </div>

              <div className="text-xs space-y-1.5">
                <div className="font-semibold text-gray-800">
                  Bill To: {previewResult.billToName}
                </div>
                {previewResult.lines?.map((line, idx) => (
                  <div key={idx} className="flex justify-between text-gray-600 border-b border-gray-100 py-1">
                    <span>{line.description}</span>
                    <span className="font-mono font-medium">₹{Number(line.totalAmount).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-sm text-gray-900">
                <span>Estimated Grand Total:</span>
                <span className="text-[#005390]">₹{Number(previewResult.grandTotal).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedAccountId || generateMutation.isPending}
            className="bg-[#005390] hover:bg-[#004170] text-white"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Generate & Finalize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
