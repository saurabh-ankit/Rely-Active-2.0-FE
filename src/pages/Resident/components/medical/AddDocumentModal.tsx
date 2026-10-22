import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateResidentDocumentMutation } from '@/hooks/react-query/resident'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const documentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name must be 255 characters or fewer'),
  note: z.string().trim().max(5000, 'Note must be 5000 characters or fewer'),
})

type DocumentFormValues = z.infer<typeof documentSchema>

const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

interface AddDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
}

const AddDocumentModal = ({ open, onOpenChange, residentId }: AddDocumentModalProps) => {
  const createMutation = useCreateResidentDocumentMutation(residentId)
  const isPending = createMutation.isPending

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: '', note: '' },
  })

  const handleFileChange = (selected: File | undefined) => {
    if (!selected) return
    if (!ACCEPTED_FILE_TYPES.includes(selected.type)) {
      setFileError('File must be a PDF, image (JPEG, PNG, WebP) or Word document')
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      setFileError('File must be 10 MB or smaller')
      return
    }
    setFileError(null)
    setFile(selected)
  }

  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onSubmit = (values: DocumentFormValues) => {
    if (!file) {
      setFileError('Please upload a file')
      return
    }

    const formData = new FormData()
    formData.append('name', values.name)
    formData.append('note', values.note)
    formData.append('file', file)

    createMutation.mutate(formData, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
          <DialogDescription>Upload a document to this resident&apos;s medical records.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input id="document-name" placeholder="e.g. Discharge Summary" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>
              Upload File <span className="text-red-500">*</span>
            </Label>
            {file ? (
              <div className="flex items-center gap-3 rounded-xl border bg-gray-50 p-3">
                <FileText className="h-8 w-8 shrink-0 text-[#005390]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                >
                  Change
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Remove selected file"
                  onClick={clearFile}
                  disabled={isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition-colors hover:border-[#005390] hover:text-[#005390]"
              >
                <Upload className="h-7 w-7" />
                <span className="text-sm font-medium">Click to upload a file</span>
                <span className="text-xs">PDF, JPEG, PNG, WebP, DOC or DOCX, up to 10 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            {fileError && <p className="text-xs text-red-500">{fileError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-note">Note</Label>
            <Textarea id="document-note" rows={3} placeholder="Add a note (optional)" {...register('note')} />
            {errors.note && <p className="text-xs text-red-500">{errors.note.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#005390] hover:bg-[#004a80] text-white">
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddDocumentModal
