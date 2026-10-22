import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCreateResidentGuardianMutation, useUpdateResidentGuardianMutation } from '@/hooks/react-query/resident'
import type { ResidentGuardian } from '@/lib/types/resident'
import { getFileUrl } from '@/lib/utils'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHONE_REGEX = /^[6-9]\d{9}$/
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
const USERNAME_REGEX = /^[A-Za-z0-9._@-]{3,50}$/
const RELATIONS = [
  'Son',
  'Daughter',
  'Son-in-law',
  'Daughter-in-law',
  'Grandson',
  'Granddaughter',
  'Brother',
  'Sister',
  'Other',
]

const PASSWORD_MIN = 6
const PASSWORD_MAX = 100

const guardianSchema = () =>
  z
    .object({
      firstName: z.string().trim().min(1, 'First name is required').max(100),
      lastName: z.string().trim().max(100),
      relation: z.string().trim().min(1, 'Relation is required').max(50),
      gender: z.string(),
      phone: z.string().trim().regex(PHONE_REGEX, 'Must be a 10-digit number starting with 6, 7, 8, or 9'),
      email: z
        .string()
        .trim()
        .max(255)
        .refine((v) => v === '' || EMAIL_REGEX.test(v), 'Enter a valid email address'),
      address: z.string().trim().max(2000),
      username: z.string().trim().regex(USERNAME_REGEX, '3–50 letters, numbers or . _ @ -'),
      // Required when adding and when updating
      password: z
        .string()
        .min(1, 'Password is required')
        .refine((v) => !v || v.length >= PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters long`)
        .refine((v) => v.length <= PASSWORD_MAX, `Password cannot exceed ${PASSWORD_MAX} characters`)
        .refine((v) => !/\s/.test(v), 'Password cannot contain spaces'),
      confirmPassword: z.string().min(1, 'Confirm password is required'),
    })
    .refine((data) => !data.password || !data.confirmPassword || data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })

type GuardianFormValues = z.infer<ReturnType<typeof guardianSchema>>

const phoneDigitsOnly = (value: string) =>
  value
    .replace(/\D/g, '')
    .replace(/^[^6-9]+/, '')
    .slice(0, 10)

interface GuardianFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  item?: ResidentGuardian | null
}

/** Onboards a guardian (family who don't live in the flat) with their resident-app login. */
const GuardianFormModal = ({ open, onOpenChange, residentId, item }: GuardianFormModalProps) => {
  const createMutation = useCreateResidentGuardianMutation(residentId)
  const updateMutation = useUpdateResidentGuardianMutation(residentId)
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = !!item

  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [isActive, setIsActive] = useState(item?.isActive ?? true)

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
  } = useForm<GuardianFormValues>({
    resolver: zodResolver(guardianSchema()),
    mode: 'onTouched',
    defaultValues: {
      firstName: item?.firstName ?? '',
      lastName: item?.lastName ?? '',
      relation: item?.relation ?? 'Son',
      gender: item?.gender ?? '',
      phone: item?.phone ?? '',
      email: item?.email ?? '',
      address: item?.address ?? '',
      username: item?.username ?? '',
      password: '',
      confirmPassword: '',
    },
  })

  const phoneRegistration = register('phone')

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

  const onSubmit = (values: GuardianFormValues) => {
    const formData = new FormData()
    formData.append('firstName', values.firstName)
    formData.append('lastName', values.lastName)
    formData.append('relation', values.relation)
    formData.append('gender', values.gender)
    formData.append('phone', values.phone)
    formData.append('email', values.email.toLowerCase())
    formData.append('address', values.address)
    formData.append('username', values.username)
    formData.append('password', values.password)
    if (isEdit) formData.append('isActive', String(isActive))
    if (photoFile) formData.append('photo', photoFile)
    if (isEdit && removePhoto && !photoFile) formData.append('removePhoto', 'true')

    const onSuccess = () => onOpenChange(false)
    if (item) updateMutation.mutate({ id: item.id, payload: formData }, { onSuccess })
    else createMutation.mutate(formData, { onSuccess })
  }

  const field = (id: string, label: string, required: boolean, input: React.ReactNode, error?: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {input}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="border-b border-gray-300 pb-3 dark:border-gray-700">
          <DialogTitle className="text-lg font-bold">{isEdit ? 'Edit Guardian' : 'Add Guardian'}</DialogTitle>
          <p className="text-xs text-gray-500">
            Family who don&apos;t live in the flat can sign in to the resident app to look after the residents.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="flex items-center gap-3">
            {shownPhoto && (
              <div className="relative">
                <img
                  src={shownPhoto}
                  alt="Guardian"
                  className="h-12 w-12 rounded-full border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove profile picture"
                  onClick={() => (photoFile ? setPhotoFile(null) : setRemovePhoto(true))}
                  disabled={isPending}
                  className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl px-3 text-xs font-semibold"
              onClick={() => photoInputRef.current?.click()}
              disabled={isPending}
              icon={<ImagePlus className="h-4 w-4" />}
            >
              {shownPhoto ? 'Change photo' : 'Upload photo'}
            </Button>
            <input
              ref={photoInputRef}
              type="file"
              accept={ACCEPTED_PHOTO_TYPES.join(',')}
              className="hidden"
              onChange={handlePhotoChange}
            />
            {photoError && <p className="text-xs text-red-500">{photoError}</p>}
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Personal details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field(
                'guardian-first-name',
                'First Name',
                true,
                <Input id="guardian-first-name" placeholder="First name" maxLength={100} {...register('firstName')} />,
                errors.firstName?.message,
              )}
              {field(
                'guardian-last-name',
                'Last Name',
                false,
                <Input id="guardian-last-name" placeholder="Last name" maxLength={100} {...register('lastName')} />,
                errors.lastName?.message,
              )}
              {field(
                'guardian-relation',
                'Relation to Resident',
                true,
                <NativeSelect id="guardian-relation" className="w-full [&_select]:h-9" {...register('relation')}>
                  {RELATIONS.map((relation) => (
                    <NativeSelectOption key={relation} value={relation}>
                      {relation}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>,
                errors.relation?.message,
              )}
              {field(
                'guardian-gender',
                'Gender',
                false,
                <NativeSelect id="guardian-gender" className="w-full [&_select]:h-9" {...register('gender')}>
                  <NativeSelectOption value="">Select</NativeSelectOption>
                  <NativeSelectOption value="MALE">Male</NativeSelectOption>
                  <NativeSelectOption value="FEMALE">Female</NativeSelectOption>
                  <NativeSelectOption value="OTHER">Other</NativeSelectOption>
                </NativeSelect>,
              )}
              {field(
                'guardian-phone',
                'Phone',
                true,
                <Input
                  id="guardian-phone"
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  maxLength={10}
                  {...phoneRegistration}
                  onChange={(e) => {
                    e.target.value = phoneDigitsOnly(e.target.value)
                    return phoneRegistration.onChange(e)
                  }}
                />,
                errors.phone?.message,
              )}
              {field(
                'guardian-email',
                'Email',
                false,
                <Input
                  id="guardian-email"
                  type="email"
                  placeholder="Email address"
                  maxLength={255}
                  {...register('email')}
                />,
                errors.email?.message,
              )}
              <div className="sm:col-span-2">
                {field(
                  'guardian-address',
                  'Address',
                  false,
                  <Textarea
                    id="guardian-address"
                    rows={2}
                    placeholder="Where the guardian lives"
                    {...register('address')}
                  />,
                  errors.address?.message,
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Resident app login</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field(
                'guardian-username',
                'Username',
                true,
                <Input
                  id="guardian-username"
                  placeholder="Login username"
                  autoComplete="off"
                  maxLength={50}
                  {...register('username')}
                />,
                errors.username?.message,
              )}
              {field(
                'guardian-password',
                'Password',
                true,
                <Input
                  id="guardian-password"
                  type="password"
                  placeholder={isEdit ? 'Re-enter or set a new password' : 'At least 6 characters'}
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX}
                  {...register('password')}
                />,
                errors.password?.message,
              )}
              {field(
                'guardian-confirm-password',
                'Confirm Password',
                true,
                <Input
                  id="guardian-confirm-password"
                  type="password"
                  placeholder="Re-enter the password"
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX}
                  {...register('confirmPassword')}
                />,
                errors.confirmPassword?.message,
              )}
            </div>
            {isEdit && (
              <label className="mt-4 flex items-center gap-3 text-sm">
                <Switch checked={isActive} onCheckedChange={setIsActive} disabled={isPending} />
                <span>{isActive ? 'Active — can sign in' : 'Inactive — sign-in blocked'}</span>
              </label>
            )}
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
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Guardian'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default GuardianFormModal
