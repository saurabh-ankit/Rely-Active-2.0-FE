import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateAdvertisement, useUpdateAdvertisement } from '@/hooks/react-query/feedback'
import type { Advertisement } from '@/lib/types/feedback'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const advertisementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title must be 255 characters or fewer'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer'),
})

type AdvertisementFormValues = z.infer<typeof advertisementSchema>

interface AdvertisementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the modal edits this advertisement; otherwise it creates a new one. Mount fresh for each open. */
  advertisement?: Advertisement | null
}

const AdvertisementModal = ({ open, onOpenChange, advertisement }: AdvertisementModalProps) => {
  const isEdit = !!advertisement
  const createMutation = useCreateAdvertisement()
  const updateMutation = useUpdateAdvertisement()
  const isPending = createMutation.isPending || updateMutation.isPending

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(advertisement?.imageUrl ?? null)
  const [imageError, setImageError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdvertisementFormValues>({
    resolver: zodResolver(advertisementSchema),
    defaultValues: { title: advertisement?.title ?? '', description: advertisement?.description ?? '' },
  })

  // Release blob URLs created for local previews.
  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const handleFileChange = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Image must be a JPEG, PNG, WebP or GIF file')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image must be 10 MB or smaller')
      return
    }
    setImageError(null)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(isEdit ? (advertisement?.imageUrl ?? null) : null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onSubmit = (values: AdvertisementFormValues) => {
    if (!isEdit && !imageFile) {
      setImageError('Advertisement image is required')
      return
    }

    const formData = new FormData()
    formData.append('title', values.title)
    formData.append('description', values.description)
    if (imageFile) formData.append('image', imageFile)

    const onSuccess = () => onOpenChange(false)
    if (isEdit) {
      updateMutation.mutate({ id: advertisement.id, data: formData }, { onSuccess })
    } else {
      createMutation.mutate(formData, { onSuccess })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Advertisement' : 'Upload New Advertisement'}</DialogTitle>
          <DialogDescription>Shown to residents of the selected property in the resident app.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>
              Image <span className="text-red-500">*</span>
            </Label>
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-xl border bg-gray-50">
                <img src={imagePreview} alt="Advertisement preview" className="h-48 w-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="bg-white/90"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change
                  </Button>
                  {imageFile && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-white/90"
                      aria-label="Remove selected image"
                      onClick={clearImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-48 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition-colors hover:border-[#2a517c] hover:text-[#2a517c]"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">Click to upload an image</span>
                <span className="text-xs">JPEG, PNG, WebP or GIF, up to 10 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            {imageError && <p className="text-xs text-red-500">{imageError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ad-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input id="ad-title" placeholder="e.g. Diwali Special Dinner" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ad-description">Description</Label>
            <Textarea
              id="ad-description"
              rows={4}
              placeholder="Tell residents what this is about"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#2a517c] hover:bg-[#476587] text-white">
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Upload Advertisement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AdvertisementModal
