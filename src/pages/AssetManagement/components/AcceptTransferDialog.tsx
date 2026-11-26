import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaveButton } from '@/components/common/SaveButton'
import { useSavedFlash } from '@/hooks/useSavedFlash'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAcceptAssetTransfer } from '@/hooks/react-query/assetManagement'
import type { Asset, TransferSendCondition } from '@/lib/types'

const CONDITION_OPTIONS: { value: TransferSendCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'bad', label: 'Bad' },
  { value: 'partially_damage', label: 'Partially damage' },
]

interface AcceptTransferDialogProps {
  asset: Asset | null
  defaultSendCondition?: TransferSendCondition | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AcceptTransferDialog({ asset, defaultSendCondition, open, onOpenChange }: AcceptTransferDialogProps) {
  const [receiveCondition, setReceiveCondition] = useState<TransferSendCondition>(defaultSendCondition || 'good')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const acceptMutation = useAcceptAssetTransfer()
  const { saved, flashSaved } = useSavedFlash()

  /* eslint-disable react-hooks/set-state-in-effect -- reset receive condition when dialog opens */
  useEffect(() => {
    if (open) {
      setReceiveCondition(defaultSendCondition || 'good')
    }
  }, [open, defaultSendCondition])
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setReceiveCondition(defaultSendCondition || 'good')
    setDescription('')
    setImage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Which outcome was clicked, so only that button shows the spinner / ✓
  const [choice, setChoice] = useState<'available' | 'not_available' | null>(null)

  const submit = async (availability: 'available' | 'not_available') => {
    if (!asset) return
    setChoice(availability)
    await acceptMutation.mutateAsync({
      assetId: asset.id,
      data: {
        receiveCondition,
        description: description.trim() || undefined,
        image: image || undefined,
        availability,
      },
    })
    // ✓ on the clicked button for a moment, then reset and close
    flashSaved(() => {
      resetForm()
      onOpenChange(false)
    })
  }

  if (!asset) return null

  const label = [asset.item?.name, asset.serialNumber, asset.assetTag].filter(Boolean).join(' - ')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Accept transferred asset</DialogTitle>
          <DialogDescription>Review details and record receive condition.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
            <p>
              <span className="font-medium text-gray-700">Asset:</span> {label || asset.id}
            </p>
            {asset.item?.category?.name ? (
              <p>
                <span className="font-medium text-gray-700">Category:</span> {asset.item.category.name}
              </p>
            ) : null}
            {asset.warrantyDocumentUrl ? (
              <a
                href={asset.warrantyDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                View warranty document
              </a>
            ) : null}
          </div>
          <div>
            <Label className="mb-2">
              Receive condition <span className="text-red-500">*</span>
            </Label>
            <Select value={receiveCondition} onValueChange={(v) => setReceiveCondition(v as TransferSendCondition)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label className="mb-2">Upload</Label>
            <div className="flex items-start gap-3">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" />
                {image ? 'Change Image' : 'Upload Image'}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {image ? (
                <div className="relative">
                  <img src={image} alt="Receive" className="h-16 w-16 rounded border object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImage('')
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={acceptMutation.isPending}>
            Cancel
          </Button>
          <SaveButton
            variant="secondary"
            onClick={() => void submit('not_available')}
            saving={acceptMutation.isPending && choice === 'not_available'}
            saved={saved && choice === 'not_available'}
            savedLabel="Accepted"
            disabled={acceptMutation.isPending || saved}
            className="gap-2"
          >
            Mark as Not Available
          </SaveButton>
          <SaveButton
            onClick={() => void submit('available')}
            saving={acceptMutation.isPending && choice === 'available'}
            saved={saved && choice === 'available'}
            savedLabel="Accepted"
            disabled={acceptMutation.isPending || saved}
            className="gap-2"
          >
            Mark as Available
          </SaveButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
