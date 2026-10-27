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
import BannerImageCropper from './BannerImageCropper'
import {
  BANNER_HEIGHT,
  BANNER_MIN_HEIGHT,
  BANNER_MIN_WIDTH,
  BANNER_WIDTH,
  centredCrop,
  exportBannerFile,
  loadImageFile,
  type BannerCrop,
} from './bannerImage'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
// GIFs aren't offered: the banner is cropped to the app's frame, which would drop the animation
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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
  /** A newly picked image, shown in the cropper until it's uploaded */
  const [picked, setPicked] = useState<{ file: File; image: HTMLImageElement } | null>(null)
  const [crop, setCrop] = useState<BannerCrop | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const existingImageUrl = advertisement?.imageUrl ?? null

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdvertisementFormValues>({
    resolver: zodResolver(advertisementSchema),
    defaultValues: { title: advertisement?.title ?? '', description: advertisement?.description ?? '' },
  })

  // Release the blob URL of the picked image.
  useEffect(() => {
    return () => {
      if (picked) URL.revokeObjectURL(picked.image.src)
    }
  }, [picked])

  const handleFileChange = async (file: File | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Image must be a JPEG, PNG or WebP file')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image must be 10 MB or smaller')
      return
    }
    try {
      const image = await loadImageFile(file)
      if (image.naturalWidth < BANNER_MIN_WIDTH || image.naturalHeight < BANNER_MIN_HEIGHT) {
        URL.revokeObjectURL(image.src)
        setImageError(
          `Image is too small (${image.naturalWidth} × ${image.naturalHeight} px). Use at least ${BANNER_MIN_WIDTH} × ${BANNER_MIN_HEIGHT} px; ${BANNER_WIDTH} × ${BANNER_HEIGHT} px is best.`,
        )
        return
      }
      setImageError(null)
      setPicked({ file, image })
      setCrop(centredCrop(image))
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'This image could not be read')
    }
  }

  const clearImage = () => setPicked(null)

  const onSubmit = async (values: AdvertisementFormValues) => {
    if (!isEdit && !picked) {
      setImageError('Advertisement image is required')
      return
    }

    const formData = new FormData()
    formData.append('title', values.title)
    formData.append('description', values.description)
    if (picked && crop) {
      // Upload exactly what the preview shows, at the app's banner size
      try {
        setPreparing(true)
        formData.append('image', await exportBannerFile(picked.image, picked.file, crop))
      } catch (error) {
        setImageError(error instanceof Error ? error.message : 'The banner could not be prepared')
        return
      } finally {
        setPreparing(false)
      }
    }

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
            {picked && crop ? (
              <div className="space-y-2">
                <BannerImageCropper image={picked.image} crop={crop} onCropChange={setCrop} />
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Change image
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearImage}
                    aria-label="Remove selected image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : existingImageUrl ? (
              // Shown the way the resident app crops it (16:7, cover)
              <div className="relative overflow-hidden rounded-xl border bg-gray-50">
                <img src={existingImageUrl} alt="Advertisement" className="aspect-[16/7] w-full object-cover" />
                <div className="absolute top-2 right-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="bg-white/90"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[16/7] h-auto w-full cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition-colors hover:border-[#2a517c] hover:text-[#2a517c] hover:bg-gray-50 whitespace-normal font-normal"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">Click to upload an image</span>
                <span className="text-xs">JPEG, PNG or WebP, up to 10 MB</span>
              </Button>
            )}
            <p className="text-xs text-gray-500">
              Banners appear in the resident app at 16:7 and are saved at {BANNER_WIDTH} × {BANNER_HEIGHT} px. Drag and
              zoom the preview to choose what is shown.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => void handleFileChange(e.target.files?.[0])}
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
            <Button
              type="submit"
              disabled={isPending || preparing}
              className="bg-[#2a517c] hover:bg-[#476587] text-white"
            >
              {preparing
                ? 'Preparing image...'
                : isPending
                  ? 'Saving...'
                  : isEdit
                    ? 'Save Changes'
                    : 'Upload Advertisement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AdvertisementModal
