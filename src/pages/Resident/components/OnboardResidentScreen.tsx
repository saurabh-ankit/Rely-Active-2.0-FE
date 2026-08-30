import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  KeyRound,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import type { CreateResidentPayload, ResidentFamilyMember, ResidentItem, ResidentType } from '@/lib/types'
import { residentService } from '@/lib/services/residentService'
import { getPropertyByIdAPI } from '@/lib/services/propertyService'
import type { PropertyUnit } from '@/pages/Property/types'
import { useLocationContext } from '@/hooks/useLocation'
import { residentFormSchema, type ResidentFormValues } from '@/validations/residentValidation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface UnitWithOccupancy extends PropertyUnit {
  occupancyStatus?: string
}

interface OnboardResidentScreenProps {
  isEditMode?: boolean
}

export const OnboardResidentScreen: React.FC<OnboardResidentScreenProps> = ({ isEditMode = false }) => {
  const navigate = useNavigate()
  const { id: editResidentId } = useParams<{ id: string }>()
  const { selectedLocationId } = useLocationContext()

  const [units, setUnits] = useState<UnitWithOccupancy[]>([])
  const [existingResidents, setExistingResidents] = useState<ResidentItem[]>([])
  const [familyMembers, setFamilyMembers] = useState<ResidentFamilyMember[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // React Hook Form + Zod validation matching Employee screen standard
  const {
    register,
    handleSubmit: handleHookSubmit,
    setValue,
    control,
    reset: resetForm,
    formState: { errors },
  } = useForm<ResidentFormValues>({
    resolver: zodResolver(residentFormSchema),
    defaultValues: {
      unitId: '',
      locId: '',
      residentType: 'OWNER',
      ownershipType: 'PRIMARY',
      isResiding: true,
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      email: '',
      phone: '',
      emergencyContact: '',
      bloodGroup: '',
      moveInDate: new Date().toISOString().split('T')[0],
    },
  })

  const watchedResidentType = useWatch({ control, name: 'residentType' })
  const watchedIsResiding = useWatch({ control, name: 'isResiding' })

  // Load properties and initial data
  useEffect(() => {
    let isMounted = true

    const init = async () => {
      setIsLoading(true)
      try {
        if (!selectedLocationId) {
          setIsLoading(false)
          return
        }

        setValue('locId', selectedLocationId)

        const [resList, propDetails] = await Promise.all([
          residentService.getResidents({ locId: selectedLocationId }),
          getPropertyByIdAPI(selectedLocationId),
        ])

        if (!isMounted) return
        setExistingResidents(resList)

        const allUnits: UnitWithOccupancy[] = []
        propDetails.blocks?.forEach((b) => {
          b.floors?.forEach((f) => {
            f.units?.forEach((u) => {
              allUnits.push(u as UnitWithOccupancy)
            })
          })
        })
        setUnits(allUnits)

        if (allUnits.length > 0 && !isEditMode) {
          setValue('unitId', allUnits[0].id)
        }

        // If Edit Mode, load resident details
        if (isEditMode && editResidentId) {
          const targetRes = resList.find((r) => r.id === editResidentId)
          if (targetRes) {
            resetForm({
              unitId: targetRes.unitId,
              locId: targetRes.locId,
              residentType: targetRes.residentType,
              ownershipType: targetRes.ownershipType || 'PRIMARY',
              isResiding: targetRes.isResiding,
              firstName: targetRes.firstName,
              lastName: targetRes.lastName || '',
              username: targetRes.username || '',
              password: '',
              email: targetRes.email || '',
              phone: targetRes.phone || '',
              emergencyContact: targetRes.emergencyContact || '',
              bloodGroup: targetRes.bloodGroup || '',
              moveInDate: targetRes.moveInDate || new Date().toISOString().split('T')[0],
            })
            setFamilyMembers(targetRes.familyMembers || [])
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return
        setFormError(err instanceof Error ? err.message : 'Failed to load property units')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void init()
    return () => {
      isMounted = false
    }
  }, [selectedLocationId, isEditMode, editResidentId, setValue, resetForm])

  // Family Members helpers
  const handleAddFamilyMember = () => {
    setFamilyMembers((prev) => [
      ...prev,
      {
        firstName: '',
        lastName: '',
        relation: 'Spouse',
        isResiding: watchedIsResiding,
        gender: 'MALE',
        dob: '',
        phone: '',
        email: '',
        username: '',
        password: '',
      },
    ])
  }

  const handleRemoveFamilyMember = (index: number) => {
    setFamilyMembers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFamilyMemberChange = (index: number, field: keyof ResidentFamilyMember, value: unknown) => {
    setFamilyMembers((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const onSubmit = async (values: ResidentFormValues) => {
    setFormError(null)
    setFormSuccess(null)

    setIsSubmitting(true)

    const payload: CreateResidentPayload = {
      ...values,
      isResiding: values.residentType === 'TENANT' ? true : values.isResiding,
      familyMembers,
    }

    try {
      if (isEditMode && editResidentId) {
        await residentService.updateResident(editResidentId, payload)
        setFormSuccess('Resident details updated successfully!')
      } else {
        await residentService.createResident(payload)
        setFormSuccess('Resident onboarded successfully!')
      }

      setTimeout(() => {
        navigate('/admin/residents')
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save resident record'
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter available units based on Resident Type
  // For Tenants: Only show units that have an already registered Off-site Owner (isResiding === false)
  const availableUnits = units.filter((u) => {
    if (watchedResidentType === 'TENANT') {
      const hasOffsiteOwner = existingResidents.some(
        (r) => r.unitId === u.id && r.residentType === 'OWNER' && !r.isResiding,
      )
      return hasOffsiteOwner
    }
    return true
  })

  const isOwnerMissingForTenant = watchedResidentType === 'TENANT' && availableUnits.length === 0

  return (
    <div className="w-full space-y-6">
      {/* Top Back Navigation Link */}
      <button
        type="button"
        onClick={() => navigate('/admin/residents')}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Resident Directory
      </button>

      {/* Page Header Card */}
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#005390]/10 text-[#005390] shadow-xs">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {isEditMode ? 'Edit Resident Profile' : 'Onboard Resident / Tenant'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Register flat owner or tenant, set physically residing status, add family members, and configure mobile
              credentials.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/admin/residents')}
          className="rounded-xl border-gray-200 shrink-0"
        >
          Cancel & Back
        </Button>
      </div>

      {formError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 font-bold flex items-center gap-2 shadow-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-700 font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-12 text-center text-sm text-gray-400 shadow-xl backdrop-blur-xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#005390]" />
          Loading property units...
        </div>
      ) : (
        <form onSubmit={handleHookSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Resident Type & Residing Status Card (PLACED ON TOP) */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 pb-3">
              <UserCheck className="w-5 h-5 text-[#005390]" />
              Resident Type & Residing Status
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label htmlFor="select-resident-type" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Resident Role Type
                </label>
                <select
                  id="select-resident-type"
                  {...register('residentType', {
                    onChange: (e) => {
                      const selectedType = e.target.value as ResidentType
                      if (selectedType === 'TENANT') {
                        setValue('isResiding', true)
                      }
                    },
                  })}
                  className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 shadow-2xs"
                >
                  <option value="OWNER">Owner (Property Owner)</option>
                  <option value="TENANT">Tenant (Renter)</option>
                </select>
                {errors.residentType && (
                  <p className="mt-1 text-xs font-semibold text-red-500">{errors.residentType.message}</p>
                )}
              </div>

              {watchedResidentType !== 'TENANT' && (
                <div>
                  <label htmlFor="select-residing-key" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Residing Status
                  </label>
                  <select
                    id="select-residing-key"
                    value={watchedIsResiding ? 'true' : 'false'}
                    onChange={(e) => setValue('isResiding', e.target.value === 'true')}
                    className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 shadow-2xs"
                  >
                    <option value="true">Physically Residing (Living in Flat)</option>
                    <option value="false">Off-site Landlord (Non-residing)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Mandatory Off-site Owner Hint Banner for Tenants */}
            {watchedResidentType === 'TENANT' && availableUnits.length === 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl flex items-start gap-2.5 shadow-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>No Eligible Units for Tenant Onboarding:</strong> Tenants can only be onboarded to flats that
                  already have a registered <strong>Off-site Owner (Landlord)</strong>. Please onboard an Off-site Owner
                  first.
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Property & Unit Selection Card */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 pb-3">
              <Building2 className="w-5 h-5 text-[#005390]" />
              Property & Flat Unit Mapping
            </h2>

            <div className="text-xs">
              <label htmlFor="select-unit" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Property Flat / Unit <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                id="select-unit"
                {...register('unitId')}
                className={`h-9 w-full rounded-xl border bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 shadow-2xs ${
                  errors.unitId ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200'
                }`}
              >
                <option value="">Select Flat...</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.unit_number} ({u.unit_type}) — Occupancy: {u.occupancyStatus || 'VACANT'}
                  </option>
                ))}
              </select>
              {errors.unitId && <p className="mt-1 text-xs font-semibold text-red-500">{errors.unitId.message}</p>}
            </div>
          </div>

          {/* Section 3: Personal & Family Information Card */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 pb-3">
              <UserPlus className="w-5 h-5 text-[#005390]" />
              Personal & Family Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="First Name"
                required
                {...register('firstName')}
                error={errors.firstName?.message}
                placeholder="e.g. Rahul"
              />
              <Input
                label="Last Name"
                {...register('lastName')}
                error={errors.lastName?.message}
                placeholder="e.g. Sharma"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Mobile Phone"
                {...register('phone')}
                error={errors.phone?.message}
                placeholder="e.g. 98765 43210"
                icon={<Phone className="h-4 w-4 text-gray-400" />}
              />
              <Input
                label="Email Address"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="e.g. rahul@example.com"
                icon={<Mail className="h-4 w-4 text-gray-400" />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Emergency Contact Phone"
                {...register('emergencyContact')}
                error={errors.emergencyContact?.message}
                placeholder="e.g. 99887 76655"
                icon={<Phone className="h-4 w-4 text-gray-400" />}
              />
              <Input
                label="Move-In Date"
                required
                type="date"
                {...register('moveInDate')}
                error={errors.moveInDate?.message}
              />
            </div>

            {/* Dynamic Family Members Section */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-gray-800 text-xs">
                  <Users className="w-4 h-4 text-[#005390]" />
                  Family Members (Living in this Flat)
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFamilyMember}
                  className="rounded-xl border-[#005390]/20 text-[#005390] hover:bg-[#005390]/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Family Member
                </Button>
              </div>

              {familyMembers.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No family members added yet.</p>
              ) : (
                <div className="space-y-3">
                  {familyMembers.map((fm, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl grid grid-cols-1 sm:grid-cols-6 gap-3 items-center text-xs shadow-2xs"
                    >
                      <div>
                        <label
                          htmlFor={`fm-first-name-${idx}`}
                          className="block text-[10px] font-semibold text-gray-500 mb-1"
                        >
                          First Name
                        </label>
                        <input
                          id={`fm-first-name-${idx}`}
                          type="text"
                          placeholder="Member Name"
                          value={fm.firstName}
                          onChange={(e) => handleFamilyMemberChange(idx, 'firstName', e.target.value)}
                          className="h-8 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`fm-relation-select-${idx}`}
                          className="block text-[10px] font-semibold text-gray-500 mb-1"
                        >
                          Relation
                        </label>
                        <select
                          id={`fm-relation-select-${idx}`}
                          value={fm.relation}
                          onChange={(e) => handleFamilyMemberChange(idx, 'relation', e.target.value)}
                          className="h-8 w-full rounded-xl border border-gray-200 bg-white px-2.5 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none"
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Brother">Brother</option>
                          <option value="Sister">Sister</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`fm-gender-select-${idx}`}
                          className="block text-[10px] font-semibold text-gray-500 mb-1"
                        >
                          Gender
                        </label>
                        <select
                          id={`fm-gender-select-${idx}`}
                          value={fm.gender || 'MALE'}
                          onChange={(e) => handleFamilyMemberChange(idx, 'gender', e.target.value)}
                          className="h-8 w-full rounded-xl border border-gray-200 bg-white px-2.5 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`fm-dob-input-${idx}`}
                          className="block text-[10px] font-semibold text-gray-500 mb-1"
                        >
                          Date of Birth
                        </label>
                        <input
                          id={`fm-dob-input-${idx}`}
                          type="date"
                          value={fm.dob || ''}
                          onChange={(e) => handleFamilyMemberChange(idx, 'dob', e.target.value)}
                          className="h-8 w-full rounded-xl border border-gray-200 bg-white px-2 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`fm-phone-input-${idx}`}
                          className="block text-[10px] font-semibold text-gray-500 mb-1"
                        >
                          Phone
                        </label>
                        <input
                          id={`fm-phone-input-${idx}`}
                          type="text"
                          placeholder="Phone Number"
                          value={fm.phone || ''}
                          onChange={(e) => handleFamilyMemberChange(idx, 'phone', e.target.value)}
                          className="h-8 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <label
                            htmlFor={`fm-email-input-${idx}`}
                            className="block text-[10px] font-semibold text-gray-500 mb-1"
                          >
                            Email Address
                          </label>
                          <input
                            id={`fm-email-input-${idx}`}
                            type="email"
                            placeholder="Email Address"
                            value={fm.email || ''}
                            onChange={(e) => handleFamilyMemberChange(idx, 'email', e.target.value)}
                            className="h-8 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFamilyMember(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl mt-4 transition shrink-0"
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Mobile App Login Credentials for Family Member */}
                      <div className="sm:col-span-6 pt-2.5 border-t border-gray-200/60 mt-1">
                        <label
                          htmlFor={`fm-[#005390]-login-access-${idx}`}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-[#005390] cursor-pointer"
                        >
                          <input
                            id={`fm-[#005390]-login-access-${idx}`}
                            type="checkbox"
                            checked={Boolean(fm.username)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleFamilyMemberChange(
                                  idx,
                                  'username',
                                  `${fm.firstName.toLowerCase()}_${Date.now().toString().slice(-4)}`,
                                )
                              } else {
                                handleFamilyMemberChange(idx, 'username', '')
                                handleFamilyMemberChange(idx, 'password', '')
                              }
                            }}
                            className="rounded border-gray-300 text-[#005390] focus:ring-[#005390]"
                          />
                          <KeyRound className="w-3.5 h-3.5" />
                          Enable Individual Mobile App Login Credentials
                        </label>

                        {Boolean(fm.username) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                            <div>
                              <label
                                htmlFor={`fm-username-input-${idx}`}
                                className="block text-[10px] font-semibold text-gray-600 mb-1"
                              >
                                Username Handle
                              </label>
                              <input
                                id={`fm-username-input-${idx}`}
                                type="text"
                                placeholder="e.g. priya_101"
                                value={fm.username || ''}
                                onChange={(e) => handleFamilyMemberChange(idx, 'username', e.target.value)}
                                className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-900 font-mono"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`fm-password-input-${idx}`}
                                className="block text-[10px] font-semibold text-gray-600 mb-1"
                              >
                                Initial Password
                              </label>
                              <input
                                id={`fm-password-input-${idx}`}
                                type="password"
                                placeholder="Default: Resident@123"
                                value={fm.password || ''}
                                onChange={(e) => handleFamilyMemberChange(idx, 'password', e.target.value)}
                                className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-900"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Mobile App Credentials Card */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 pb-3">
              <KeyRound className="w-5 h-5 text-[#005390]" />
              Mobile App Login Account
            </h2>

            <div className="p-5 bg-blue-50/50 border border-blue-100/80 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <Input
                label="Mobile Username Handle"
                {...register('username')}
                error={errors.username?.message}
                placeholder="e.g. rahul_101"
              />
              <Input
                label="Initial Password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
                placeholder="Default: Resident@123"
              />
            </div>
          </div>

          {/* Action Footer Card (Matching Employee Screen Footer) */}
          <div className="flex items-center justify-end gap-3 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/residents')}
              className="rounded-xl border-gray-200"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || isOwnerMissingForTenant}
              title={isOwnerMissingForTenant ? 'Owner must be onboarded first before onboarding a tenant' : ''}
              className="bg-[#005390] hover:bg-[#003d6b] text-white rounded-xl shadow-md shadow-[#005390]/20"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {isEditMode ? 'Update Resident' : 'Save & Onboard Resident'}
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default OnboardResidentScreen
