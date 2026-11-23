import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useRejectAssetTransfer } from '@/hooks/react-query/assetManagement'
import type { Asset } from '@/lib/types'
import { toast } from 'sonner'

interface RejectTransferDialogProps {
  asset: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RejectTransferDialog({ asset, open, onOpenChange }: RejectTransferDialogProps) {
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rejectMutation = useRejectAssetTransfer()

  const resetForm = () => {
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

  const handleReject = async () => {
    if (!asset) return
    if (!description.trim()) {
      toast.error('Description is required')
      return
    }
    await rejectMutation.mutateAsync({
      assetId: asset.id,
      data: { description: description.trim(), image: image || undefined },
    })
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject transferred asset</DialogTitle>
          <DialogDescription>
            The asset will stay at this center and will not be available for assignment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
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
                  <img src={image} alt="Reject" className="h-16 w-16 rounded border object-cover" />
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={rejectMutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleReject()} disabled={rejectMutation.isPending}>
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
