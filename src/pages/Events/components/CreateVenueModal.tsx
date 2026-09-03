import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldErrors } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateVenue, useLocationGlobalServices } from '@/hooks/react-query/events'
import { mapSelectedServicesToAddOns } from '@/lib/services/eventService'
import { notifyError } from '@/utils/toast'
import { createVenueFormSchema, venueFormDefaultValues, type VenueFormValues } from '@/utils/event.utils'
import { VenueFormFields } from './VenueFormFields'

interface CreateVenueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CreateVenueModal = ({ open, onOpenChange }: CreateVenueModalProps) => {
  const createVenueMutation = useCreateVenue()
  const { data: locationServices = [], isLoading: isLoadingServices } = useLocationGlobalServices()
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([])
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([])

  const schema = useMemo(() => createVenueFormSchema({ locationServices }), [locationServices])

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VenueFormValues>({
    resolver: zodResolver(schema),
    defaultValues: venueFormDefaultValues,
    mode: 'onChange',
  })

  const resetAll = useCallback(() => {
    reset(venueFormDefaultValues)
    setCoverPhotoFile(null)
    setCoverPhotoPreview(null)
    setImageFiles([])
    setImagePreviews([])
  }, [reset])

  useEffect(() => {
    if (open) resetAll()
  }, [open, resetAll])

  const handleClose = () => {
    resetAll()
    onOpenChange(false)
  }

  const onInvalid = (fieldErrors: FieldErrors<VenueFormValues>) => {
    const firstError = Object.values(fieldErrors)[0]
    const message =
      (firstError && 'message' in firstError ? firstError.message : undefined) || 'Please fix the form errors'
    notifyError(String(message))
  }

  const addImage = () => {
    const images = watch('images') || []
    setValue('images', [...images, { url: '', caption: '' }])
    setImageFiles([...imageFiles, null])
    setImagePreviews([...imagePreviews, null])
  }

  const removeImage = (index: number) => {
    const images = [...(watch('images') || [])]
    images.splice(index, 1)
    setValue('images', images)
    const newFiles = [...imageFiles]
    newFiles.splice(index, 1)
    setImageFiles(newFiles)
    const newPreviews = [...imagePreviews]
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  const onSubmit = (values: VenueFormValues) => {
    const formData = new FormData()
    formData.append('name', values.name)
    formData.append('occupancy', values.occupancy.toString())
    formData.append('price', String(values.price || 0))
    formData.append('keyFeatures', values.keyFeatures)
    if (coverPhotoFile) formData.append('coverPhoto', coverPhotoFile)

    imageFiles.forEach((file) => {
      if (file) formData.append('images', file)
    })

    if (values.images && values.images.length > 0) {
      const captions = values.images.map((img) => ({ caption: img.caption || '' }))
      formData.append('images', JSON.stringify(captions))
    }

    const mappedServices = mapSelectedServicesToAddOns(locationServices, values.selectedServices || [])
    if (mappedServices.length > 0) {
      formData.append('addOnServices', JSON.stringify(mappedServices))
    }

    createVenueMutation.mutate(formData as FormData, {
      onSuccess: () => handleClose(),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetAll()
        onOpenChange(value)
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Venue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-4 p-3">
          <VenueFormFields
            register={register}
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
            locationServices={locationServices}
            isLoadingServices={isLoadingServices}
            coverPhotoFile={coverPhotoFile}
            coverPhotoPreview={coverPhotoPreview}
            imagePreviews={imagePreviews}
            onCoverPhotoChange={(file, preview) => {
              setCoverPhotoFile(file)
              setCoverPhotoPreview(preview)
            }}
            onAddImage={addImage}
            onRemoveImage={removeImage}
            onImageFileChange={(index, file, preview) => {
              const newFiles = [...imageFiles]
              newFiles[index] = file
              setImageFiles(newFiles)
              const newPreviews = [...imagePreviews]
              newPreviews[index] = preview
              setImagePreviews(newPreviews)
            }}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createVenueMutation.isPending}
              className="border-[#2a517c] text-white hover:bg-[#2a517c] hover:text-white cursor-pointer"
            >
              {createVenueMutation.isPending ? 'Adding...' : 'Add Venue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateVenueModal
