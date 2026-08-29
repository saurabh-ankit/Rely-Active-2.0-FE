import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import {
  ArrowLeft,
  Building2,
  Check,
  Key,
  Lock,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { usePropertiesQuery } from '@/hooks/react-query/property'
import { useDepartmentsQuery, useRolesQuery } from '@/hooks/react-query/rbac'
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserPropertiesMutation,
  useUserByIdQuery,
  useUsersQuery,
} from '@/hooks/react-query/user'
import { useLocationStore } from '@/lib/stores/locationStore'
import type { RoleItem, UserItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { notifyError, notifySuccess } from '@/utils/toast'
import { RoleModuleManagement } from './RoleModuleManagement'

const ROLE_HIERARCHY_ORDER: Record<string, number> = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  DOCTOR: 4,
  NURSE: 5,
  EMPLOYEE: 6,
  CARETAKER: 7,
  VENDOR: 8,
  RESIDENT: 9,
}

const sortRolesByHierarchy = (roleList: RoleItem[]) => {
  return [...roleList].sort((a, b) => {
    const rankA = ROLE_HIERARCHY_ORDER[a.code] ?? 99
    const rankB = ROLE_HIERARCHY_ORDER[b.code] ?? 99
    if (rankA !== rankB) return rankA - rankB
    return a.name.localeCompare(b.name)
  })
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[6-9][0-9]{9}$/

const userFormSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z
      .string()
      .min(1, 'Email address is required')
      .refine((val) => EMAIL_REGEX.test(val.trim()), {
        message: 'Invalid email address format',
      }),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .refine((val) => PHONE_REGEX.test(val.trim()) && val.trim().length === 10, {
        message: 'Contact number must start with a digit between 6-9 and be exactly 10 digits',
      }),
    password: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 6, {
        message: 'Password must be at least 6 characters long',
      }),
    dateOfJoining: z.string().min(1, 'Date of joining is required'),
    employeeCode: z.string().optional(),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
    emergencyContact: z
      .string()
      .optional()
      .refine((val) => !val || (PHONE_REGEX.test(val.trim()) && val.trim().length === 10), {
        message: 'Contact number must start with a digit between 6-9 and be exactly 10 digits',
      }),
    bloodGroup: z.string().optional(),
    qualification: z.string().optional(),
    experience: z.string().optional(),
    address: z.string().optional(),
    selectedRoleCode: z.string().min(1, 'Role is required'),
    selectedDepartmentId: z.string().optional(),
    selectedJobCategoryId: z.string().optional(),
    selectedManagerId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isSpecialRole = ['SUPER_ADMIN', 'ADMIN'].includes((data.selectedRoleCode || '').toUpperCase())
    if (!isSpecialRole) {
      if (!data.selectedDepartmentId || !data.selectedDepartmentId.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Operational department is required',
          path: ['selectedDepartmentId'],
        })
      }
      if (!data.selectedJobCategoryId || !data.selectedJobCategoryId.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Job category is required',
          path: ['selectedJobCategoryId'],
        })
      }
    }
  })

type UserFormValues = z.infer<typeof userFormSchema>

interface AdminUserManagementProps {
  initialMode?: 'list' | 'create' | 'edit' | 'permissions'
  isLocationScoped?: boolean
}

export function AdminUserManagement({ initialMode = 'list', isLocationScoped = false }: AdminUserManagementProps) {
  const navigate = useNavigate()
  const { id: paramId, userId: paramUserId } = useParams<{ id?: string; userId?: string }>()

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 400)

  const selectedLocationId = useLocationStore((state) => state.selectedLocationId)
  const selectedLocationName = useLocationStore((state) => state.selectedLocationName)

  // React Query Hooks
  const { data: users = [], isLoading: isLoadingUsers } = useUsersQuery(
    debouncedSearch,
    isLocationScoped ? selectedLocationId : null,
  )
  const { data: fetchedUser } = useUserByIdQuery(paramId)
  const { data: rawRoles = [] } = useRolesQuery()
  const { data: departments = [] } = useDepartmentsQuery()
  const { data: availableProperties = [] } = usePropertiesQuery()

  const createUserMutation = useCreateUserMutation()
  const updateUserMutation = useUpdateUserMutation()
  const updateUserPropertiesMutation = useUpdateUserPropertiesMutation()

  const roles = sortRolesByHierarchy(rawRoles)

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(paramId || null)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [propertySelectionError, setPropertySelectionError] = useState<string | null>(null)

  // React Hook Form + Zod
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset: resetHookForm,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      dateOfJoining: new Date().toISOString().split('T')[0],
      employeeCode: '',
      gender: '',
      dateOfBirth: '',
      emergencyContact: '',
      bloodGroup: '',
      qualification: '',
      experience: '',
      address: '',
      selectedRoleCode: 'EMPLOYEE',
      selectedDepartmentId: '',
      selectedJobCategoryId: '',
      selectedManagerId: '',
    },
  })

  const selectedRoleCode = useWatch({ control, name: 'selectedRoleCode' })
  const selectedDepartmentId = useWatch({ control, name: 'selectedDepartmentId' })
  const selectedDepartment = departments.find((d) => d.id === selectedDepartmentId)
  const availableJobCategories = selectedDepartment?.jobCategories || []

  const populateFormForUser = (u: UserItem) => {
    setEditingUserId(u.id)
    setValue('username', u.username || '')
    setValue('firstName', u.profile?.firstName || u.profile?.first_name || '')
    setValue('lastName', u.profile?.lastName || u.profile?.last_name || '')
    setValue('email', u.email || '')
    setValue('phone', u.phone || u.profile?.phone || '')
    setValue('password', '')
    setValue(
      'dateOfJoining',
      u.profile?.dateOfJoining || u.profile?.date_of_joining || new Date().toISOString().split('T')[0],
    )
    setValue('employeeCode', u.profile?.employeeCode || u.profile?.employee_code || '')
    setValue('gender', u.profile?.gender || '')
    setValue('dateOfBirth', u.profile?.dateOfBirth || u.profile?.date_of_birth || '')
    setValue('emergencyContact', u.profile?.emergencyContact || u.profile?.emergency_contact || '')
    setValue('bloodGroup', u.profile?.bloodGroup || u.profile?.blood_group || '')
    setValue('qualification', u.profile?.qualification || '')
    setValue('experience', u.profile?.experience || '')
    setValue('address', u.profile?.address || '')
    const userLoc = (u.userLocations?.[0] || u.userRoles?.[0]) as Record<string, unknown> | undefined
    const userLocRole = userLoc?.role as { code?: string } | undefined
    const firstRole = userLocRole?.code || 'EMPLOYEE'
    const firstDept = (userLoc?.departmentId || userLoc?.department_id || '') as string
    const firstJobCat = (userLoc?.jobCategoryId ||
      userLoc?.job_category_id ||
      (userLoc?.jobCategory as { id?: string } | undefined)?.id ||
      '') as string
    const firstMgr = (u.userLocations
      ?.map(
        (ul: Record<string, unknown>) =>
          ul.managerId || ul.manager_id || (ul.manager as { id?: string } | undefined)?.id,
      )
      .find(Boolean) ||
      userLoc?.managerId ||
      userLoc?.manager_id ||
      (userLoc?.manager as { id?: string } | undefined)?.id ||
      '') as string
    setValue('selectedRoleCode', firstRole)
    setValue('selectedDepartmentId', firstDept)
    setValue('selectedJobCategoryId', firstJobCat)
    setValue('selectedManagerId', firstMgr)

    setTimeout(() => {
      setValue('selectedJobCategoryId', firstJobCat)
    }, 100)

    const propIdList =
      u.assignedProperties
        ?.map((p: Record<string, unknown>) => p.id || p.propertyId || p.property_id || p.locationId || p.location_id)
        .filter((id): id is string => typeof id === 'string') || []
    const userLocIdList =
      u.userLocations
        ?.map(
          (ul: Record<string, unknown>) =>
            ul.locId ||
            ul.loc_id ||
            ul.locationId ||
            ul.location_id ||
            (ul.property as { id?: string } | undefined)?.id ||
            (ul.location as { id?: string } | undefined)?.id,
        )
        .filter((id): id is string => typeof id === 'string') || []
    const initialPropIds = Array.from(new Set([...propIdList, ...userLocIdList]))
    setSelectedPropertyIds(new Set(initialPropIds))
  }

  useEffect(() => {
    if ((initialMode === 'edit' || paramId) && paramId) {
      const target = fetchedUser || users.find((u) => u.id === paramId)
      if (target && loadedUserId !== paramId) {
        const timer = setTimeout(() => {
          populateFormForUser(target)
          setLoadedUserId(paramId)
        }, 0)
        return () => clearTimeout(timer)
      }
    } else if (!paramId && loadedUserId !== null) {
      const timer = setTimeout(() => setLoadedUserId(null), 0)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode, paramId, fetchedUser, users, loadedUserId])

  useEffect(() => {
    if (!editingUserId && !paramId && isLocationScoped && selectedLocationId && selectedPropertyIds.size === 0) {
      const timer = setTimeout(() => {
        setSelectedPropertyIds(new Set([selectedLocationId]))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isLocationScoped, selectedLocationId, editingUserId, paramId, selectedPropertyIds.size])

  const resetForm = () => {
    setEditingUserId(null)
    setLoadedUserId(null)
    resetHookForm()
    if (departments.length > 0) setValue('selectedDepartmentId', departments[0].id)
    setValue('selectedJobCategoryId', '')
    setValue('selectedManagerId', '')
    if (selectedLocationId) {
      setSelectedPropertyIds(new Set([selectedLocationId]))
    } else {
      setSelectedPropertyIds(new Set())
    }
    setErrorMsg(null)
    setPropertySelectionError(null)
  }

  const togglePropertySelection = (pId: string) => {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev)
      if (next.has(pId)) next.delete(pId)
      else next.add(pId)
      if (next.size === 0) {
        setPropertySelectionError('At least one property location is mandatory.')
      } else {
        setPropertySelectionError(null)
      }
      return next
    })
  }

  const onSubmit = async (values: UserFormValues) => {
    setErrorMsg(null)

    const propertyIdsToSave = Array.from(selectedPropertyIds)

    if (propertyIdsToSave.length === 0) {
      const msg = 'At least one property location is mandatory.'
      setErrorMsg(msg)
      setPropertySelectionError(msg)
      notifyError('Validation Error', msg)
      return
    }

    setPropertySelectionError(null)

    try {
      const payload = {
        username: values.username?.trim() || undefined,
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password || undefined,
        dateOfJoining: values.dateOfJoining || new Date().toISOString().split('T')[0],
        gender: values.gender || undefined,
        date_of_birth: values.dateOfBirth || undefined,
        emergency_contact: values.emergencyContact || undefined,
        blood_group: values.bloodGroup || undefined,
        qualification: values.qualification || undefined,
        experience: values.experience || undefined,
        address: values.address || undefined,
        roleCode: values.selectedRoleCode,
        departmentId: !['SUPER_ADMIN', 'ADMIN'].includes((values.selectedRoleCode || '').toUpperCase())
          ? values.selectedDepartmentId || undefined
          : undefined,
        jobCategoryId: !['SUPER_ADMIN', 'ADMIN'].includes((values.selectedRoleCode || '').toUpperCase())
          ? values.selectedJobCategoryId || undefined
          : undefined,
        managerId: values.selectedManagerId || undefined,
        propertyIds: propertyIdsToSave,
      }

      console.log('[FE AdminUserManagement] Submitting unified form payload:', payload)

      const isEditMode = initialMode === 'edit' || !!editingUserId || !!paramId
      const targetId = editingUserId || paramId

      if (isEditMode && targetId) {
        await updateUserMutation.mutateAsync({ id: targetId, payload })
        notifySuccess(`Employee ${values.firstName} updated successfully!`)
      } else {
        await createUserMutation.mutateAsync(payload)
        notifySuccess(`Employee ${values.firstName} created successfully!`)
      }

      resetForm()
      navigate(isLocationScoped ? '/admin/employees' : '/global-settings/users')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save user.'
      setErrorMsg(message)
      notifyError('Failed to Save User', message)
    }
  }

  // If mode is permissions, render Role & Module Permissions screen directly
  if (initialMode === 'permissions' || paramUserId) {
    return (
      <div className="space-y-6 pb-10">
        <button
          type="button"
          onClick={() => navigate('/global-settings/users')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employee Directory
        </button>

        <RoleModuleManagement onClose={() => navigate('/global-settings/users')} />
      </div>
    )
  }

  // If mode is create or edit, render FULL PAGE form view directly
  if (initialMode === 'create' || initialMode === 'edit' || paramId) {
    const isEditMode = initialMode === 'edit' || !!editingUserId || !!paramId
    const isSubmitting =
      createUserMutation.isPending || updateUserMutation.isPending || updateUserPropertiesMutation.isPending

    return (
      <div className="space-y-6 pb-12">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            resetForm()
            navigate(isLocationScoped ? '/admin/employees' : '/global-settings/users')
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />{' '}
          {isLocationScoped ? 'Back to Employee Directory' : 'Back to User Management'}
        </button>

        {/* Page Header */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#005390]/10 text-[#005390] shadow-xs">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                {isEditMode
                  ? isLocationScoped
                    ? 'Edit Employee Profile'
                    : 'Edit Employee & Assign Properties'
                  : isLocationScoped
                    ? 'Add New Employee'
                    : 'Create Employee & Assign Properties'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEditMode
                  ? isLocationScoped
                    ? `Update staff profile details and role assigned to ${selectedLocationName || 'this location'}.`
                    : 'Update staff member profile details, authorization role, operational department, and property locations.'
                  : isLocationScoped
                    ? `Add a new staff member account for ${selectedLocationName || 'this location'}.`
                    : 'Add a new staff member account, assign system authorization role, operational department, credentials, and property locations.'}
              </p>
            </div>
          </div>
        </div>

        {/* Full Page Form Container (React Hook Form + Zod) */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errorMsg && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 font-bold flex items-center gap-2 shadow-xs">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Personal Details */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="w-5 h-5 text-[#005390]" />
              Personal & Employee Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="First Name"
                required
                {...register('firstName')}
                error={errors.firstName?.message}
                placeholder="e.g. Ravi"
              />
              <Input
                label="Last Name"
                required
                {...register('lastName')}
                error={errors.lastName?.message}
                placeholder="e.g. Kumar"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Email Address"
                required
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="admin.hyd@rely.com"
                icon={<Mail className="h-4 w-4 text-gray-400" />}
              />
              <Input
                label="Phone Number"
                required
                {...register('phone')}
                error={errors.phone?.message}
                placeholder="98765 43210"
                icon={<Phone className="h-4 w-4 text-gray-400" />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Date of Joining"
                required
                type="date"
                {...register('dateOfJoining')}
                error={errors.dateOfJoining?.message}
              />
              <div>
                <label htmlFor="gender-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Gender
                </label>
                <select
                  id="gender-select"
                  {...register('gender')}
                  className={`w-full rounded-xl border ${errors.gender?.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#005390] focus:ring-[#005390]/20'} bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:outline-none focus:ring-2 font-medium shadow-2xs`}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.gender?.message && (
                  <p className="mt-1 text-xs font-semibold text-red-500">{errors.gender.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Date of Birth"
                type="date"
                {...register('dateOfBirth')}
                error={errors.dateOfBirth?.message}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Emergency Contact"
                {...register('emergencyContact')}
                error={errors.emergencyContact?.message}
                placeholder="98765 00000"
                icon={<Phone className="h-4 w-4 text-gray-400" />}
              />
              <div>
                <label htmlFor="bloodgroup-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Blood Group
                </label>
                <select
                  id="bloodgroup-select"
                  {...register('bloodGroup')}
                  className={`w-full rounded-xl border ${errors.bloodGroup?.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#005390] focus:ring-[#005390]/20'} bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:outline-none focus:ring-2 font-medium shadow-2xs`}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
                {errors.bloodGroup?.message && (
                  <p className="mt-1 text-xs font-semibold text-red-500">{errors.bloodGroup.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Qualification"
                {...register('qualification')}
                error={errors.qualification?.message}
                placeholder="e.g. B.Sc Nursing, MBBS, MBA"
              />
              <Input
                label="Experience (Years)"
                {...register('experience')}
                error={errors.experience?.message}
                placeholder="e.g. 5"
              />
            </div>

            <div>
              <Input
                label="Residential Address"
                type="textarea"
                rows={2}
                {...register('address')}
                error={errors.address?.message}
                placeholder="Enter full residential address..."
              />
            </div>
          </div>

          {/* Section 2: Role & Department Assignment */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-[#005390]" />
              Role & Operational Department
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="role-select-page" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Assigned System Role <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  id="role-select-page"
                  {...register('selectedRoleCode')}
                  className={`w-full rounded-xl border ${errors.selectedRoleCode?.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#005390] focus:ring-[#005390]/20'} bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:outline-none focus:ring-2 font-medium shadow-2xs`}
                >
                  {roles
                    .filter((r) => r.code !== 'SUPER_ADMIN')
                    .map((r) => (
                      <option key={r.id} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                </select>
                {errors.selectedRoleCode?.message && (
                  <p className="mt-1 text-xs font-semibold text-red-500">{errors.selectedRoleCode.message}</p>
                )}
              </div>

              {!['SUPER_ADMIN', 'ADMIN'].includes((selectedRoleCode || '').toUpperCase()) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dept-select-page" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Assign Operational Department <span className="text-red-500 font-bold">*</span>
                      </label>
                      <select
                        id="dept-select-page"
                        {...register('selectedDepartmentId')}
                        className={`w-full rounded-xl border ${errors.selectedDepartmentId?.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#005390] focus:ring-[#005390]/20'} bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:outline-none focus:ring-2 font-medium shadow-2xs`}
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                      {errors.selectedDepartmentId?.message && (
                        <p className="mt-1 text-xs font-semibold text-red-500">{errors.selectedDepartmentId.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="job-cat-select-page" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Select Job Category <span className="text-red-500 font-bold">*</span>
                      </label>
                      <select
                        id="job-cat-select-page"
                        {...register('selectedJobCategoryId')}
                        disabled={availableJobCategories.length === 0}
                        className={`w-full rounded-xl border ${errors.selectedJobCategoryId?.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#005390] focus:ring-[#005390]/20'} bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:outline-none focus:ring-2 font-medium shadow-2xs disabled:bg-gray-100 disabled:text-gray-400`}
                      >
                        <option value="">
                          {availableJobCategories.length > 0 ? 'Select Job Category' : 'Select a department first'}
                        </option>
                        {availableJobCategories.map((jc) => (
                          <option key={jc.id} value={jc.id}>
                            {jc.name} ({jc.code})
                          </option>
                        ))}
                      </select>
                      {errors.selectedJobCategoryId?.message && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.selectedJobCategoryId.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: User Account Credentials (positioned directly ABOVE Property Locations) */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Key className="w-5 h-5 text-[#005390]" />
              Employee Account Credentials
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Username (Login Handle)"
                required
                {...register('username')}
                error={errors.username?.message}
                placeholder="e.g. ravi_kumar"
                icon={<User className="h-4 w-4 text-gray-400" />}
              />
              <Input
                label={isEditMode ? 'New Password (Optional)' : 'Login Password'}
                type="password"
                {...register('password')}
                placeholder={
                  isEditMode
                    ? 'Leave blank to keep existing password'
                    : 'Set custom password (defaults to Password@123)'
                }
                icon={<Lock className="h-4 w-4 text-gray-400" />}
              />
            </div>
          </div>

          {/* Section 4: Property Location Scopes (user_locations mapping) */}
          {!isLocationScoped && (
            <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Building2 className="w-5 h-5 text-[#005390]" />
                  Assign Property <span className="text-red-500 font-bold">*</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Select the property locations this user is authorized to access and operate.
                </p>
                {propertySelectionError && (
                  <p className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {propertySelectionError}
                  </p>
                )}
              </div>

              {availableProperties.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 bg-gray-50/50 rounded-2xl">
                  No properties created yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-2">
                  {availableProperties.map((p) => {
                    const isChecked = selectedPropertyIds.has(p.id)

                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePropertySelection(p.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                          isChecked
                            ? 'bg-[#005390]/5 border-[#005390] shadow-sm'
                            : 'bg-white border-gray-200 hover:border-[#005390]/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                              isChecked ? 'bg-[#005390] text-white' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`text-sm font-bold truncate ${isChecked ? 'text-[#005390]' : 'text-gray-900'}`}
                            >
                              {p.property_name}
                            </h4>
                            <span className="text-xs text-gray-500 block truncate">
                              {p.city || 'Facility Property'}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                            isChecked ? 'bg-[#005390] text-white' : 'border border-gray-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Full Page Footer Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200/80">
            <Button
              variant="cancel"
              type="button"
              onClick={() => {
                resetForm()
                navigate(isLocationScoped ? '/admin/employees' : '/global-settings/users')
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              {isEditMode ? 'Update Employee & Save Properties' : 'Create Employee & Save Properties'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  const displayUsers = users.filter((u) => {
    if (u.username === 'superadmin') return false
    const isSa =
      u.userLocations?.some((ur) => ur.role?.code === 'SUPER_ADMIN') ||
      u.userRoles?.some((ur) => ur.role?.code === 'SUPER_ADMIN')
    return !isSa
  })

  const userColumns: ColumnDef<UserItem>[] = [
    {
      accessorKey: 'username',
      header: 'Employee',
      cell: ({ row }) => {
        const u = row.original
        const fName = u.profile?.firstName || u.profile?.first_name || ''
        const lName = u.profile?.lastName || u.profile?.last_name || ''
        const fullName = `${fName} ${lName}`.trim() || u.username || 'System User'
        const empCode = u.profile?.employeeCode || u.profile?.employee_code

        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#005390]/10 text-[#005390] flex items-center justify-center font-bold text-xs">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">{fullName}</div>
              {empCode && <div className="text-[10px] text-gray-400">Code: {empCode}</div>}
            </div>
          </div>
        )
      },
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => {
        const u = row.original
        return (
          <div>
            <div className="text-gray-800 font-semibold">{u.email || u.phone || u.profile?.phone || 'N/A'}</div>
            {(u.phone || u.profile?.phone) && u.email && (
              <div className="text-[10px] text-gray-400">{u.phone || u.profile?.phone}</div>
            )}
          </div>
        )
      },
    },
    {
      id: 'dateOfJoining',
      header: 'Date of Joining',
      cell: ({ row }) => (
        <span className="text-gray-700 font-medium font-mono text-xs">
          {row.original.profile?.dateOfJoining || row.original.profile?.date_of_joining || 'N/A'}
        </span>
      ),
    },
    {
      id: 'employeeCode',
      header: 'Employee Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-[#005390] bg-[#005390]/10 px-2.5 py-1 rounded-md">
          {row.original.profile?.employeeCode || row.original.profile?.employee_code || 'N/A'}
        </span>
      ),
    },
    {
      id: 'roles',
      header: 'Assigned Roles',
      cell: ({ row }) => {
        const user = row.original
        const roleSet = new Set<string>()

        const uObj = user as unknown as Record<string, unknown>
        const uRole = uObj.role as { name?: string; code?: string } | undefined
        if (uRole?.name) roleSet.add(uRole.name)
        else if (uRole?.code) roleSet.add(uRole.code)

        user.userRoles?.forEach((ur) => {
          const urObj = ur as unknown as Record<string, unknown>
          const rObj = ur.role as { name?: string; code?: string } | undefined
          const rName = rObj?.name || rObj?.code || (urObj.name as string) || (urObj.code as string)
          if (rName && typeof rName === 'string' && rName.trim()) {
            roleSet.add(rName.trim())
          }
        })

        user.userLocations?.forEach((ul) => {
          const ulObj = ul as unknown as Record<string, unknown>
          const rObj = ul.role as { name?: string; code?: string } | undefined
          const rName = rObj?.name || rObj?.code || (ulObj.name as string) || (ulObj.code as string)
          if (rName && typeof rName === 'string' && rName.trim()) {
            roleSet.add(rName.trim())
          }
        })

        const rolesList = Array.from(roleSet)

        return (
          <div className="flex flex-wrap gap-1.5">
            {rolesList.length > 0 ? (
              rolesList.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#005390]/10 text-[#005390] border border-[#005390]/20"
                >
                  <Shield className="w-3 h-3 shrink-0 text-[#005390]" />
                  {r}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-[10px]">Staff</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'properties',
      header: 'Assigned Properties',
      cell: ({ row }) => {
        const u = row.original
        const isSa = u.userRoles?.some((ur) => ur.role?.code === 'SUPER_ADMIN')
        const propNames = u.assignedProperties?.map((p) => p.property_name) || []
        const userLocNames =
          u.userLocations
            ?.map(
              (ul: Record<string, unknown>) =>
                (ul.location as { name?: string } | undefined)?.name ||
                (ul.location_name as string) ||
                (ul.property as { property_name?: string } | undefined)?.property_name,
            )
            .filter((name): name is string => typeof name === 'string') || []
        const allProps = Array.from(new Set([...propNames, ...userLocNames]))

        let displayedProps = allProps
        if (isLocationScoped) {
          const locName = selectedLocationName || 'NCL'
          const matched = allProps.filter((pName) => pName.toLowerCase() === locName.toLowerCase())
          displayedProps = matched.length > 0 ? matched : [locName]
        }

        return (
          <div className="flex flex-wrap gap-1">
            {isSa ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Building2 className="w-3 h-3" />
                All Properties (Super Admin)
              </span>
            ) : displayedProps.length > 0 ? (
              displayedProps.map((pName, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  <Building2 className="w-3 h-3" />
                  {pName}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-[10px]">All / Unassigned</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-3 h-3" />
          {row.original.status || 'Active'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const u = row.original
        const isSa = u.userRoles?.some((ur) => ur.role?.code === 'SUPER_ADMIN')
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#005390] hover:bg-[#005390]/10 hover:text-[#005390] transition-colors cursor-pointer shadow-2xs"
                title="Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-2xl p-1.5 shadow-xl border border-gray-100 bg-white"
              >
                <DropdownMenuItem
                  onClick={() =>
                    navigate(isLocationScoped ? `/admin/employees/edit/${u.id}` : `/global-settings/edit-user/${u.id}`)
                  }
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#005390]/10 hover:text-[#005390] rounded-xl cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5 text-[#005390]" />
                  Edit Employee Details
                </DropdownMenuItem>
                {!isSa && (
                  <DropdownMenuItem
                    onClick={() => navigate(`/global-settings/permissions/${u.id}`)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#005390]/10 hover:text-[#005390] rounded-xl cursor-pointer"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-[#005390]" />
                    Manage Permissions
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const visibleColumns = isLocationScoped ? userColumns.filter((col) => col.id !== 'properties') : userColumns

  // Main User Management Directory View (Standard Data Table)
  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#005390]" />
            Employee Directory
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage employee profiles, assigned properties, and module access permissions.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            resetForm()
            navigate('/global-settings/create-user')
          }}
        >
          Create Employee
        </Button>
      </div>

      {/* Users Directory Table */}
      <DataTable
        columns={visibleColumns}
        data={displayUsers}
        isLoading={isLoadingUsers}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search employees by name, code, phone, or email..."
      />
    </div>
  )
}
