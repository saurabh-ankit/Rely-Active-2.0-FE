import { useState } from 'react'
import { Briefcase, Lock, Users, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useFeedbackRecipientCount, useSendFeedbackForm } from '@/hooks/react-query/feedback'
import { cn } from '@/lib/utils'
import type { FeedbackAudience } from '@/lib/types/feedback'

interface SendFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: { id: string; title: string } | null
  onSent?: () => void
}

const AUDIENCE_OPTIONS: Array<{ value: FeedbackAudience; label: string; icon: LucideIcon }> = [
  { value: 'RESIDENTS', label: 'Residents', icon: Users },
  { value: 'EMPLOYEES', label: 'Employees', icon: Briefcase },
  { value: 'BOTH', label: 'Both', icon: UsersRound },
]

const SendFormDialog = ({ open, onOpenChange, form, onSent }: SendFormDialogProps) => {
  const [audience, setAudience] = useState<FeedbackAudience>('RESIDENTS')
  const { data: countData, isLoading: isCounting } = useFeedbackRecipientCount(open)
  const sendMutation = useSendFeedbackForm()

  const handleOpenChange = (next: boolean) => {
    if (!next) setAudience('RESIDENTS')
    onOpenChange(next)
  }

  const residents = countData?.data?.residents ?? 0
  const employees = countData?.data?.employees ?? 0
  const countFor = (value: FeedbackAudience) =>
    value === 'RESIDENTS' ? residents : value === 'EMPLOYEES' ? employees : residents + employees
  const selectedCount = countFor(audience)

  const handleSend = () => {
    if (!form) return
    sendMutation.mutate(
      { id: form.id, audience },
      {
        onSuccess: () => {
          handleOpenChange(false)
          onSent?.()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback Form</DialogTitle>
          <DialogDescription>Choose who should receive &ldquo;{form?.title}&rdquo;.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          {AUDIENCE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={audience === value}
              onClick={() => setAudience(value)}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-colors',
                audience === value
                  ? 'border-[#2a517c] bg-[#2a517c]/5 text-[#2a517c]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
              <span className="text-xs font-normal text-gray-500">
                {isCounting ? '…' : `${countFor(value)} people`}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            You can still edit this form until the first response comes in. After that it is locked, so every response
            answers the same questions.
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={sendMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending || isCounting || selectedCount === 0}
            className="bg-[#2a517c] hover:bg-[#476587] text-white"
          >
            {sendMutation.isPending
              ? 'Sending...'
              : selectedCount === 0 && !isCounting
                ? 'No one to send to'
                : `Send to ${selectedCount} ${selectedCount === 1 ? 'person' : 'people'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SendFormDialog
