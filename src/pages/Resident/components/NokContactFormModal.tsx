import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateResidentNokContactMutation, useUpdateResidentNokContactMutation } from '@/hooks/react-query/resident'
import type { ResidentNokContact } from '@/lib/types/resident'
import { getFileUrl } from '@/lib/utils'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHONE_REGEX = /^[6-9]\d{9}$/
const PHONE_MESSAGE = 'Must be a 10-digit number starting with 6, 7, 8, or 9'
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
const LETTERS_ONLY_REGEX = /^[A-Za-z\s]*$/
const LETTERS_ONLY_MESSAGE = 'Only alphabets are allowed'

const nokSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(150, 'Full name must be 150 characters or fewer')
    .regex(LETTERS_ONLY_REGEX, LETTERS_ONLY_MESSAGE),
  relationship: z
    .string()
    .trim()
    .max(50, 'Relationship must be 50 characters or fewer')
    .regex(LETTERS_ONLY_REGEX, LETTERS_ONLY_MESSAGE),
  phone: z.string().trim().min(1, 'Phone is required').regex(PHONE_REGEX, PHONE_MESSAGE),
  alternatePhone: z
    .string()
    .trim()
    .refine((v) => v === '' || PHONE_REGEX.test(v), PHONE_MESSAGE),
  email: z
    .string()
    .trim()
    .max(255, 'Email must be 255 characters or fewer')
    .refine((v) => v === '' || EMAIL_REGEX.test(v), 'Enter a valid email address (e.g. name@example.com)'),
  address: z.string().trim().max(2000, 'Address must be 2000 characters or fewer'),
})

type NokFormValues = z.infer<typeof nokSchema>

const phoneDigitsOnly = (value: string) =>
  value
    .replace(/\D/g, '')
    .replace(/^[^6-9]+/, '')
    .slice(0, 10)

const lettersOnly = (value: string) => value.replace(/[^a-zA-Z\s]/g, '')

interface NokContactFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  item?: ResidentNokContact | null
}

const NokContactFormModal = ({ open, onOpenChange, residentId, item }: NokContactFormModalProps) => {
  const createMutation = useCreateResidentNokContactMutation(residentId)
  const updateMutation = useUpdateResidentNokContactMutation(residentId)
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = !!item

  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const photoPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile])
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const existingPhoto = !removePhoto && item?.photoUrl ? getFileUrl(item.photoUrl) : null
  const shownPhoto = photoPreview || existingPhoto

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NokFormValues>({
    resolver: zodResolver(nokSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: item?.fullName ?? '',
      relationship: item?.relationship ?? '',
      phone: item?.phone ?? '',
      alternatePhone: item?.alternatePhone ?? '',
      email: item?.email ?? '',
      address: item?.address ?? '',
    },
  })

  const registerPhone = (name: 'phone' | 'alternatePhone') => {
    const registration = register(name)
    return {
      ...registration,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        e.target.value = phoneDigitsOnly(e.target.value)
        return registration.onChange(e)
      },
    }
  }

  const registerLettersOnly = (name: 'fullName' | 'relationship') => {
    const registration = register(name)
    return {
      ...registration,
      onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        if (/\d/.test(e.key)) e.preventDefault()
      },
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        e.target.value = lettersOnly(e.target.value)
        return registration.onChange(e)
      },
    }
  }

  const registerEmail = () => {
    const registration = register('email')
    return {
      ...registration,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        e.target.value = e.target.value.replace(/\s/g, '')
        return registration.onChange(e)
      },
    }
  }

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Profile picture must be a JPEG, PNG or WebP image')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Profile picture must be 10 MB or smaller')
      return
    }
    setPhotoError(null)
    setPhotoFile(file)
    setRemovePhoto(false)
  }

  const handleRemovePhoto = () => {
    if (photoFile) setPhotoFile(null)
    else setRemovePhoto(true)
    setPhotoError(null)
  }

  const onSubmit = (values: NokFormValues) => {
    const formData = new FormData()
    formData.append('fullName', values.fullName)
    formData.append('relationship', values.relationship)
    formData.append('phone', values.phone)
    formData.append('alternatePhone', values.alternatePhone)
    formData.append('email', values.email.toLowerCase())
    formData.append('address', values.address)
    if (photoFile) formData.append('photo', photoFile)
    if (isEdit && removePhoto && !photoFile) formData.append('removePhoto', 'true')

    const onSuccess = () => onOpenChange(false)
    if (item) updateMutation.mutate({ id: item.id, payload: formData }, { onSuccess })
    else createMutation.mutate(formData, { onSuccess })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-300 pb-3 dark:border-gray-700">
          <DialogTitle className="text-lg font-bold">{isEdit ? 'Edit NOK Contact' : 'Add NOK Contact'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-3 sm:pt-6">
                {shownPhoto && (
                  <div className="relative">
                    <img
                      src={shownPhoto}
                      alt="NOK profile"
                      className="h-12 w-12 rounded-full border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove profile picture"
                      onClick={handleRemovePhoto}
                      disabled={isPending}
                      className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Label htmlFor="nok-photo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {shownPhoto ? 'Profile Picture' : 'Add Profile Picture'}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl px-3 text-xs font-semibold"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isPending}
                  icon={<ImagePlus className="h-4 w-4" />}
                >
                  {shownPhoto ? 'Change' : 'Upload'}
                </Button>
                <input
                  id="nok-photo"
                  ref={photoInputRef}
                  type="file"
                  accept={ACCEPTED_PHOTO_TYPES.join(',')}
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
              {photoError && <p className="text-xs text-red-500">{photoError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nok-full-name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input id="nok-full-name" placeholder="Full name" maxLength={150} {...registerLettersOnly('fullName')} />
              {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nok-relationship">Relationship</Label>
              <Input
                id="nok-relationship"
                placeholder="e.g. Son, Daughter, Spouse"
                maxLength={50}
                {...registerLettersOnly('relationship')}
              />
              {errors.relationship && <p className="text-xs text-red-500">{errors.relationship.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nok-phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nok-phone"
                placeholder="Primary phone"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                {...registerPhone('phone')}
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nok-alternate-phone">Alternate Phone</Label>
              <Input
                id="nok-alternate-phone"
                placeholder="Alternate phone"
                inputMode="numeric"
                maxLength={10}
                {...registerPhone('alternatePhone')}
              />
              {errors.alternatePhone && <p className="text-xs text-red-500">{errors.alternatePhone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nok-email">Email</Label>
              <Input
                id="nok-email"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                maxLength={255}
                {...registerEmail()}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nok-address">Address</Label>
              <Textarea id="nok-address" rows={3} placeholder="Address" {...register('address')} />
              {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-40 rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="h-10 min-w-40 rounded-xl" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default NokContactFormModal
