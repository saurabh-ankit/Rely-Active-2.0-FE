import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Shield,
  Save,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  KeyRound,
} from 'lucide-react'
import api from '@/lib/api/axios'
import { useAuth } from '@/hooks/useAuth'
import { notifyError, notifySuccess } from '@/utils/toast'
import { cn } from '@/lib/utils'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[6-9][0-9]{9}$/

const profileFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z
      .string()
      .trim()
      .min(1, 'Email address is required')
      .refine((val) => EMAIL_REGEX.test(val), {
        message: 'Invalid email address format',
      }),
    phone: z
      .string()
      .trim()
      .min(1, 'Phone number is required')
      .refine((val) => PHONE_REGEX.test(val) && val.length === 10, {
        message: 'Phone number must be 10 digits starting with 6, 7, 8, or 9',
      }),
    password: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 6, {
        message: 'Password must be at least 6 characters long',
      }),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function UserProfilePage() {
  const navigate = useNavigate()
  const { user, isSuperAdmin, setUser } = useAuth()

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const watchedFirstName = useWatch({ control, name: 'firstName' })
  const watchedLastName = useWatch({ control, name: 'lastName' })
  const watchedEmail = useWatch({ control, name: 'email' })

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/users/profile/me')
      if (res.data?.success && res.data.data) {
        const u = res.data.data
        const profile = u.profile || {}
        reset({
          firstName: profile.firstName || profile.first_name || u.first_name || '',
          lastName: profile.lastName || profile.last_name || u.last_name || '',
          email: u.email || '',
          phone: profile.phone || u.phone || '',
          password: '',
          confirmPassword: '',
        })
        setPhotoPreview(profile.photoUrl || u.avatar_url || null)
      } else if (user) {
        reset({
          firstName: user.profile?.firstName || user.profile?.first_name || '',
          lastName: user.profile?.lastName || user.profile?.last_name || '',
          email: user.email || '',
          phone: user.profile?.phone || user.phone || '',
          password: '',
          confirmPassword: '',
        })
        setPhotoPreview(user.profile?.photoUrl || user.avatar_url || null)
      }
    } catch {
      if (user) {
        reset({
          firstName: user.profile?.firstName || user.profile?.first_name || '',
          lastName: user.profile?.lastName || user.profile?.last_name || '',
          email: user.email || '',
          phone: user.profile?.phone || user.phone || '',
          password: '',
          confirmPassword: '',
        })
        setPhotoPreview(user.profile?.photoUrl || user.avatar_url || null)
      }
    } finally {
      setLoading(false)
    }
  }, [user, reset])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!ignore) {
        await fetchProfile()
      }
    }
    void load()
    return () => {
      ignore = true
    }
  }, [fetchProfile])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (data: ProfileFormValues) => {
    try {
      setSaving(true)

      const formData = new FormData()
      formData.append('firstName', data.firstName.trim())
      formData.append('lastName', data.lastName.trim())
      formData.append('email', data.email.trim())
      formData.append('phone', data.phone.trim())
      if (data.password) {
        formData.append('password', data.password)
      }

      if (photoFile) {
        formData.append('photo', photoFile)
      } else if (photoPreview && photoPreview.startsWith('data:')) {
        formData.append('photoUrl', photoPreview)
      }

      const res = await api.put('/users/profile/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data?.success) {
        notifySuccess('Profile updated successfully!')
        const updatedUser = res.data.data
        if (updatedUser) {
          setUser({
            ...user,
            ...updatedUser,
            profile: {
              ...user?.profile,
              first_name: data.firstName.trim(),
              last_name: data.lastName.trim(),
              phone: data.phone.trim(),
              photoUrl: updatedUser.profile?.photoUrl || photoPreview,
            },
            email: data.email.trim(),
          })
        }
        reset({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          password: '',
          confirmPassword: '',
        })
      } else {
        notifyError(res.data?.message || 'Failed to update profile')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      notifyError(msg || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const fullName =
    `${watchedFirstName || ''} ${watchedLastName || ''}`.trim() || watchedEmail || user?.email || 'User Profile'
  const userInitial = (watchedFirstName || watchedEmail || user?.email || 'A').charAt(0).toUpperCase()
  const roleTitle = isSuperAdmin ? 'Super Admin' : user?.roles?.includes('ADMIN') ? 'Property Admin' : 'Admin'

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <User className="w-5 h-5 text-[#005390]" />
              My Profile
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              View and manage your account details, contact information, and security credentials.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400 font-medium shadow-sm border border-gray-100">
          Loading profile details...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Overview Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center gap-6 z-10 text-center md:text-left">
              {/* Photo Avatar */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-3xl bg-[#005390] text-white flex items-center justify-center font-black text-3xl overflow-hidden shadow-lg ring-4 ring-blue-50">
                  {photoPreview ? (
                    <img src={photoPreview} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <label
                  htmlFor="user-profile-page-avatar-input"
                  className="absolute -bottom-1 -right-1 bg-white border border-gray-200 p-2 rounded-full text-gray-700 hover:text-[#005390] hover:bg-blue-50 cursor-pointer shadow-md transition-transform group-hover:scale-110"
                  title="Upload New Photo"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="user-profile-page-avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* User Title & Info */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-gray-900 flex items-center justify-center md:justify-start gap-2">
                  {fullName}
                  <BadgeCheck className="w-6 h-6 text-blue-600 shrink-0" />
                </h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005390] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    <Shield className="w-3.5 h-3.5" />
                    {roleTitle}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {watchedEmail || user?.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="z-10 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Active Account
              </span>
            </div>
          </div>

          {/* Profile Edit Form */}
          <form onSubmit={handleSubmit(handleSave)} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information Card */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                  <User className="w-4 h-4 text-[#005390]" /> Personal Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="page-profile-first-name" className="block text-xs font-bold text-gray-700 mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="page-profile-first-name"
                      type="text"
                      {...register('firstName')}
                      placeholder="First Name"
                      className={cn(
                        'w-full px-4 py-3 text-xs font-semibold border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-gray-50/50 focus:bg-white transition-all',
                        errors.firstName ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200',
                      )}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-xs font-semibold text-red-500">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="page-profile-last-name" className="block text-xs font-bold text-gray-700 mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="page-profile-last-name"
                      type="text"
                      {...register('lastName')}
                      placeholder="Last Name"
                      className={cn(
                        'w-full px-4 py-3 text-xs font-semibold border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-gray-50/50 focus:bg-white transition-all',
                        errors.lastName ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200',
                      )}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-xs font-semibold text-red-500">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="page-profile-email" className="block text-xs font-bold text-gray-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="page-profile-email"
                        type="email"
                        {...register('email')}
                        placeholder="admin@rely.com"
                        className={cn(
                          'w-full pl-10 pr-4 py-3 text-xs font-semibold border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-gray-50/50 focus:bg-white transition-all',
                          errors.email ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200',
                        )}
                      />
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    </div>
                    {errors.email && <p className="mt-1 text-xs font-semibold text-red-500">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="page-profile-phone" className="block text-xs font-bold text-gray-700 mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="page-profile-phone"
                        type="text"
                        {...register('phone')}
                        placeholder="9876543210"
                        className={cn(
                          'w-full pl-10 pr-4 py-3 text-xs font-semibold border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-gray-50/50 focus:bg-white transition-all',
                          errors.phone ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200',
                        )}
                      />
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    </div>
                    {errors.phone && <p className="mt-1 text-xs font-semibold text-red-500">{errors.phone.message}</p>}
                  </div>
                </div>
              </div>

              {/* Security & Password Card */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                    <KeyRound className="w-4 h-4 text-[#005390]" /> Security & Change Password
                  </h3>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    Update your account login password. Leave these fields blank if you wish to retain your current
                    password.
                  </p>

                  <div className="space-y-4 pt-1">
                    <div>
                      <label
                        htmlFor="page-profile-new-password"
                        className="block text-xs font-bold text-gray-700 mb-1.5"
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          id="page-profile-new-password"
                          type="password"
                          {...register('password')}
                          placeholder="Enter new password"
                          className={cn(
                            'w-full pl-10 pr-4 py-3 text-xs font-semibold border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-gray-50/50 focus:bg-white transition-all',
                            errors.password ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200',
                          )}
                        />
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-xs font-semibold text-red-500">{errors.password.message}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="page-profile-confirm-password"
                        className="block text-xs font-bold text-gray-700 mb-1.5"
                      >
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          id="page-profile-confirm-password"
                          type="password"
                          {...register('confirmPassword')}
                          placeholder="Confirm new password"
                          className={cn(
                            'w-full pl-10 pr-4 py-3 text-xs font-semibold border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-gray-50/50 focus:bg-white transition-all',
                            errors.confirmPassword ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200',
                          )}
                        />
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-xs font-semibold text-red-500">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-5 py-3 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-[#005390] text-white px-7 py-3 rounded-2xl font-bold text-xs hover:bg-[#004070] transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-[#005390]/25"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
