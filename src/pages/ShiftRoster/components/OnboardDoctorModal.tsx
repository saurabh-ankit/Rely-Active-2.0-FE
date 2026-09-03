import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOnboardDoctor } from '@/hooks/react-query/rosterManagement'
import { useUsersQuery } from '@/hooks/react-query/user'
import type { OnboardDoctorPayload } from '@/lib/services/rosterService'

interface OnboardDoctorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  specializations: Array<{ name: string; id?: string }>
  targetLocations: Array<{ id: string; name: string; type: string }>
}

const EMPTY_ONBOARD_DEFAULTS: OnboardDoctorPayload & { userId: string } = {
  userId: '',
  doctorType: 'VISITING',
  specialization: '',
  medicalLicenseNumber: '',
  maxPatientsPerSlot: 1,
  defaultSlotDurationMinutes: 30,
  engagement: {
    validFrom: '',
    validUntil: '',
    serviceCategory: '',
    defaultSlotCapacity: 1,
  },
}

function getOnboardDoctorDefaults(): OnboardDoctorPayload & { userId: string } {
  const today = new Date()
  const until = new Date(today)
  until.setFullYear(until.getFullYear() + 1)
  return {
    ...EMPTY_ONBOARD_DEFAULTS,
    engagement: {
      ...EMPTY_ONBOARD_DEFAULTS.engagement!,
      validFrom: today.toISOString().split('T')[0],
      validUntil: until.toISOString().split('T')[0],
    },
  }
}

export function OnboardDoctorModal({ open, onOpenChange, specializations, targetLocations }: OnboardDoctorModalProps) {
  const onboardMutation = useOnboardDoctor()
  const { data: users = [] } = useUsersQuery()

  const doctorUsers = users.filter((u) => {
    const uAny = u as { roleCode?: string; roles?: string[] }
    return uAny.roleCode?.toUpperCase() === 'DOCTOR' || uAny.roles?.includes('DOCTOR')
  })

  const { register, handleSubmit, reset, setValue, control } = useForm<OnboardDoctorPayload & { userId: string }>({
    defaultValues: EMPTY_ONBOARD_DEFAULTS,
  })

  const userId = useWatch({ control, name: 'userId' })
  const specialization = useWatch({ control, name: 'specialization' })
  const clinicRoomId = useWatch({ control, name: 'engagement.clinicRoomId' })

  useEffect(() => {
    if (open) reset(getOnboardDoctorDefaults())
  }, [open, reset])

  const clinicRooms = targetLocations.filter((t) => t.type === 'CLINIC_VENUE' || t.type === 'ROOM_UNIT')

  const onSubmit = handleSubmit(async (values) => {
    const payload: OnboardDoctorPayload = {
      userId: values.userId || undefined,
      doctorType: 'VISITING',
      specialization: values.specialization,
      medicalLicenseNumber: values.medicalLicenseNumber,
      consultationFee: values.consultationFee,
      maxPatientsPerSlot: values.maxPatientsPerSlot,
      defaultSlotDurationMinutes: values.defaultSlotDurationMinutes,
      engagement: {
        validFrom: values.engagement!.validFrom,
        validUntil: values.engagement!.validUntil,
        serviceCategory: values.engagement!.serviceCategory,
        clinicRoomId: values.engagement!.clinicRoomId,
        defaultSlotCapacity: values.engagement!.defaultSlotCapacity,
      },
    }
    await onboardMutation.mutateAsync(payload)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onboard Visiting Doctor</DialogTitle>
          <DialogDescription>Create doctor profile and engagement contract in one step.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Doctor User</Label>
            <Select value={String(userId || '')} onValueChange={(v: string) => setValue('userId', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select existing user (optional)" />
              </SelectTrigger>
              <SelectContent>
                {doctorUsers.map((u) => {
                  const profile = (u.profile || {}) as { firstName?: string; lastName?: string }
                  const name = profile.firstName
                    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
                    : u.username || u.email
                  return (
                    <SelectItem key={u.id} value={u.id}>
                      {name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Specialization *</Label>
            <Select value={String(specialization || '')} onValueChange={(v: string) => setValue('specialization', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select specialization" />
              </SelectTrigger>
              <SelectContent>
                {specializations.map((s) => (
                  <SelectItem key={s.id || s.name} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Medical License Number *</Label>
            <Input className="mt-1" {...register('medicalLicenseNumber', { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Default Slot Duration (min)</Label>
              <Input
                type="number"
                className="mt-1"
                {...register('defaultSlotDurationMinutes', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label>Max Patients / Slot</Label>
              <Input type="number" className="mt-1" {...register('maxPatientsPerSlot', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <p className="text-sm font-semibold">Engagement Contract</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valid From *</Label>
                <Input type="date" className="mt-1" {...register('engagement.validFrom', { required: true })} />
              </div>
              <div>
                <Label>Valid Until *</Label>
                <Input type="date" className="mt-1" {...register('engagement.validUntil', { required: true })} />
              </div>
            </div>
            <div>
              <Label>Service Category *</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Cardiology OPD"
                {...register('engagement.serviceCategory', { required: true })}
              />
            </div>
            <div>
              <Label>Clinic Room</Label>
              <Select
                value={String(clinicRoomId || '')}
                onValueChange={(v: string) => setValue('engagement.clinicRoomId', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select clinic room (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {clinicRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id.replace(/^(prop|block|floor|unit|clinic|dept)-/, '')}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Slot Capacity</Label>
              <Input
                type="number"
                className="mt-1"
                {...register('engagement.defaultSlotCapacity', { valueAsNumber: true })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={onboardMutation.isPending}>
              {onboardMutation.isPending ? 'Onboarding...' : 'Onboard Doctor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
