import { Plus, X } from 'lucide-react'
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { LocationGlobalService } from '@/lib/services/eventService'
import type { VenueFormValues } from '@/utils/event.utils'
import VenueAddOnServicesSelect from './VenueAddOnServicesSelect'

interface VenueFormFieldsProps {
  register: UseFormRegister<VenueFormValues>
  control: Control<VenueFormValues>
  errors: FieldErrors<VenueFormValues>
  watch: UseFormWatch<VenueFormValues>
  setValue: UseFormSetValue<VenueFormValues>
  locationServices: LocationGlobalService[]
  isLoadingServices: boolean
  editingAllocations?: Record<string, number>
  coverPhotoFile: File | null
  coverPhotoPreview: string | null
  existingCoverPhoto?: string
  imagePreviews: (string | null)[]
  onCoverPhotoChange: (file: File | null, preview: string | null) => void
  onAddImage: () => void
  onRemoveImage: (index: number) => void
  onImageFileChange: (index: number, file: File | null, preview: string | null) => void
}

export function VenueFormFields({
  register,
  control,
  errors,
  watch,
  setValue,
  locationServices,
  isLoadingServices,
  editingAllocations,
  coverPhotoFile,
  coverPhotoPreview,
  existingCoverPhoto,
  imagePreviews,
  onCoverPhotoChange,
  onAddImage,
  onRemoveImage,
  onImageFileChange,
}: VenueFormFieldsProps) {
  const images = watch('images') || []

  return (
    <div className="space-y-4">
      {errors.root?.message && <p className="text-sm text-red-600">{errors.root.message}</p>}

      <Input
        id="venue-name-input"
        label="Name *"
        {...register('name')}
        error={errors.name?.message}
        placeholder="Venue name"
      />

      <Input
        id="venue-occupancy-input"
        label="Occupancy *"
        type="number"
        min={1}
        step={1}
        {...register('occupancy', {
          setValueAs: (value) => {
            if (value === '' || value === null || value === undefined) return undefined
            const parsed = Number(value)
            return Number.isNaN(parsed) ? undefined : parsed
          },
        })}
        error={errors.occupancy?.message}
        placeholder="Maximum occupancy"
      />

      <Input
        id="venue-price-input"
        label="Pricing *"
        type="number"
        step="0.01"
        min="0"
        icon={<span className="text-gray-500 text-sm font-medium">₹</span>}
        {...register('price', {
          setValueAs: (value) => {
            if (value === '' || value === null || value === undefined) return undefined
            const parsed = Number(value)
            return Number.isNaN(parsed) ? undefined : parsed
          },
        })}
        error={errors.price?.message}
        placeholder="0.00"
      />

      <div>
        <Label className="mb-1.5">Key Features *</Label>
        <Textarea
          {...register('keyFeatures')}
          placeholder="Stage, Projector, Sound system"
          rows={3}
          className={errors.keyFeatures ? 'border-red-500' : ''}
        />
        {errors.keyFeatures?.message && <p className="text-sm text-red-600 mt-1">{errors.keyFeatures.message}</p>}
      </div>

      <div>
        <Label className="mb-1.5">Cover Photo</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              const reader = new FileReader()
              reader.onloadend = () => onCoverPhotoChange(file, reader.result as string)
              reader.readAsDataURL(file)
            }
          }}
        />
        {coverPhotoPreview && (
          <div className="mt-2">
            <img
              src={coverPhotoPreview}
              alt="Cover preview"
              className="w-48 h-32 object-cover rounded-lg border border-gray-200"
            />
            {coverPhotoFile && <p className="text-sm text-gray-500 mt-1">New cover photo (will replace current)</p>}
          </div>
        )}
        {!coverPhotoPreview && existingCoverPhoto && (
          <div className="mt-2">
            <img
              src={existingCoverPhoto}
              alt="Current cover"
              className="w-48 h-32 object-cover rounded-lg border border-gray-200"
            />
            <p className="text-sm text-gray-500 mt-1">Current cover photo</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Images</Label>
          <Button type="button" variant="outline" size="sm" onClick={onAddImage}>
            <Plus className="h-4 w-4 mr-1" />
            Add Image
          </Button>
        </div>
        {images.map((image, index) => (
          <div key={index} className="space-y-2 mb-4 p-3 border rounded">
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onloadend = () => onImageFileChange(index, file, reader.result as string)
                    reader.readAsDataURL(file)
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveImage(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              value={image.caption || ''}
              onChange={(e) => {
                const newImages = [...images]
                newImages[index] = { ...newImages[index], caption: e.target.value }
                setValue('images', newImages)
              }}
              placeholder="Caption (optional)"
            />
            {(imagePreviews[index] || image.url) && (
              <div className="mt-2">
                <img
                  src={imagePreviews[index] || image.url}
                  alt={`Preview ${index + 1}`}
                  className="w-48 h-32 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Controller
        name="selectedServices"
        control={control}
        render={({ field }) => (
          <div>
            <VenueAddOnServicesSelect
              services={locationServices}
              isLoading={isLoadingServices}
              selectedItems={field.value || []}
              onChange={field.onChange}
              editingAllocations={editingAllocations}
            />
            {errors.selectedServices?.message && (
              <p className="text-sm text-red-600 mt-1">{errors.selectedServices.message}</p>
            )}
          </div>
        )}
      />
    </div>
  )
}
