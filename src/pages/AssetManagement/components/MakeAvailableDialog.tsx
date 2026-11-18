import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { Asset } from '@/lib/types'

type InspectionCondition = 'good' | 'bad'

export type MakeAvailableInspectionResult = {
  condition: 'good' | 'poor'
  description?: string
  document?: string
  nextAction: 'available' | 'repair' | 'scrap'
}

interface MakeAvailableDialogProps {
  asset: Asset | null
  open: boolean
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (result: MakeAvailableInspectionResult) => void
}

const getAssetOptionLabel = (asset: Asset) =>
  [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && String(value).trim()).join(' - ') ||
  '—'

const statusLabel = (status: string) =>
  status === 'external_use'
    ? 'External use'
    : status === 'pending_inspection'
      ? 'Pending inspection'
      : status.replace(/_/g, ' ')

const MakeAvailableDialog = ({ asset, open, isPending = false, onOpenChange, onConfirm }: MakeAvailableDialogProps) => {
  const [condition, setCondition] = useState<InspectionCondition | ''>('')
  const [description, setDescription] = useState('')
  const [document, setDocument] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* eslint-disable react-hooks/set-state-in-effect -- clear form when dialog closes */
  useEffect(() => {
    if (!open) {
      setCondition('')
      setDescription('')
      setDocument('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!asset) return null

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setDocument(reader.result as string)
    reader.readAsDataURL(file)
  }

  const validateBadFields = () => {
    if (!description.trim()) {
      toast.error('Description is required for bad condition')
      return false
    }
    if (!document) {
      toast.error('Upload is required for bad condition')
      return false
    }
    return true
  }

  const submit = (nextAction: MakeAvailableInspectionResult['nextAction']) => {
    if (!condition) {
      toast.error('Please select condition')
      return
    }
    if (condition === 'bad' && !validateBadFields()) return

    onConfirm({
      condition: condition === 'good' ? 'good' : 'poor',
      description: condition === 'bad' ? description.trim() : undefined,
      document: condition === 'bad' ? document : undefined,
      nextAction,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark as Available</DialogTitle>
          <DialogDescription>Review the asset condition before marking it available again.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm space-y-1.5">
            <p>
              <span className="text-gray-500">Asset:</span>{' '}
              <span className="font-medium text-gray-900">{getAssetOptionLabel(asset)}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-gray-500">Status:</span>
              <Badge variant="outline" className="capitalize">
                {statusLabel(asset.status)}
              </Badge>
            </p>
            <p>
              <span className="text-gray-500">Current condition:</span>{' '}
              <span className="capitalize font-medium text-gray-900">{asset.condition || '—'}</span>
            </p>
          </div>

          <div>
            <Label className="mb-2">
              Condition <span className="text-red-500">*</span>
            </Label>
            <Select
              value={condition || undefined}
              onValueChange={(value) => {
                if (!value) return
                setCondition(value as InspectionCondition)
                if (value === 'good') {
                  setDescription('')
                  setDocument('')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="bad">Bad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {condition === 'bad' && (
            <>
              <div>
                <Label htmlFor="make-available-description" className="mb-2">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="make-available-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                />
              </div>

              <div>
                <Label className="mb-2">
                  Upload <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-start gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                    disabled={isPending}
                  >
                    <Upload className="h-4 w-4" />
                    {document ? 'Change Image' : 'Upload Image'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {document ? (
                    <div className="relative">
                      <img
                        src={document}
                        alt="Inspection evidence"
                        className="h-16 w-16 rounded-md object-cover border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDocument('')
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          {condition === 'good' && (
            <Button onClick={() => submit('available')} disabled={isPending}>
              {isPending ? 'Saving...' : 'Mark as Available'}
            </Button>
          )}
          {condition === 'bad' && (
            <>
              <Button variant="outline" onClick={() => submit('available')} disabled={isPending}>
                Mark as Available
              </Button>
              <Button variant="outline" onClick={() => submit('repair')} disabled={isPending}>
                Repair
              </Button>
              <Button variant="destructive" onClick={() => submit('scrap')} disabled={isPending}>
                Scrap
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MakeAvailableDialog
