import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { residentService } from '@/lib/services/residentService'
import { getCareTeamAPI, assignCareTeamMemberAPI, removeCareTeamMemberAPI } from '@/lib/services/residentService'
import type {
  GetResidentsParams,
  LocationMedicineOption,
  MedicationAdministrationItem,
  MedicationAdministrationsParams,
  ResidentAllergyPayload,
  ResidentClinicalData,
  ResidentClinicalMutationResponse,
  ResidentDocumentItem,
  ResidentItem,
  ResidentLabReportItem,
  ResidentMedicationPayload,
  ResidentMedicinesParams,
  ResidentGuardiansData,
  ResidentTimelineParams,
  ResidentTimelineResponse,
  ResidentVitalPayload,
  UpdateResidentConditionPayload,
} from '@/lib/types'
import type { AssignCareTeamPayload } from '@/lib/services/residentService'
import { getVitalSettingsAPI, type VitalSetting } from '@/lib/services/vitalSettingService'
import { getLabTestSettingsAPI, type LabTestSetting } from '@/lib/services/labTestSettingService'

export const RESIDENT_KEYS = {
  all: ['residents'] as const,
  list: (params?: GetResidentsParams) => ['residents', 'list', params] as const,
  byId: (id?: string) => ['residents', 'detail', id] as const,
  careTeam: (residentId?: string) => ['residents', 'care-team', residentId] as const,
  clinical: (residentId?: string) => ['residents', 'clinical', residentId] as const,
  labReports: (residentId?: string) => ['residents', 'lab-reports', residentId] as const,
  documents: (residentId?: string) => ['residents', 'documents', residentId] as const,
  guardians: (residentId?: string) => ['residents', 'guardians', residentId] as const,
  medicines: (residentId?: string, params?: ResidentMedicinesParams) =>
    ['residents', 'medicines', residentId, params] as const,
  timeline: (residentId?: string, params?: ResidentTimelineParams) =>
    ['residents', 'timeline', residentId, params] as const,
  medicationAdministrations: (residentId?: string, params?: MedicationAdministrationsParams) =>
    ['residents', 'medication-administrations', residentId, params] as const,
}

export const useResidentMedicationAdministrationsQuery = (
  residentId?: string,
  params: MedicationAdministrationsParams = {},
  enabled = true,
) => {
  return useQuery<MedicationAdministrationItem[]>({
    queryKey: RESIDENT_KEYS.medicationAdministrations(residentId, params),
    queryFn: () => residentService.getResidentMedicationAdministrations(residentId!, params),
    enabled: enabled && !!residentId,
  })
}

export const useResidentClinicalQuery = (residentId?: string, enabled = true) => {
  return useQuery<ResidentClinicalData>({
    queryKey: RESIDENT_KEYS.clinical(residentId),
    queryFn: () => residentService.getResidentClinical(residentId!),
    enabled: enabled && !!residentId,
  })
}

export const useResidentLabReportsQuery = (residentId?: string, enabled = true) => {
  return useQuery<ResidentLabReportItem[]>({
    queryKey: RESIDENT_KEYS.labReports(residentId),
    queryFn: () => residentService.getResidentLabReports(residentId!),
    enabled: enabled && !!residentId,
  })
}

type ApiError = { response?: { data?: { message?: string } }; message?: string }

export const useResidentDocumentsQuery = (residentId?: string, enabled = true) => {
  return useQuery<ResidentDocumentItem[]>({
    queryKey: RESIDENT_KEYS.documents(residentId),
    queryFn: () => residentService.getResidentDocuments(residentId!),
    enabled: enabled && !!residentId,
  })
}

export const useCreateResidentDocumentMutation = (residentId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: FormData) => residentService.createResidentDocument(residentId, data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: RESIDENT_KEYS.documents(residentId) })
      toast.success(data?.message || 'Document uploaded successfully')
    },
    onError: (error: ApiError) =>
      toast.error(error?.response?.data?.message || error?.message || 'Failed to upload document'),
  })
}

export const useResidentGuardiansQuery = (residentId?: string, enabled = true) => {
  return useQuery<ResidentGuardiansData>({
    queryKey: RESIDENT_KEYS.guardians(residentId),
    queryFn: () => residentService.getResidentGuardians(residentId!),
    enabled: enabled && !!residentId,
  })
}

const useResidentGuardianMutation = <TVariables>(
  residentId: string,
  mutationFn: (variables: TVariables) => Promise<{ message?: string }>,
  messages: { success: string; error: string },
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: RESIDENT_KEYS.guardians(residentId) })
      toast.success(data?.message || messages.success)
    },
    onError: (error: ApiError) => toast.error(error?.response?.data?.message || error?.message || messages.error),
  })
}

export const useCreateResidentGuardianMutation = (residentId: string) =>
  useResidentGuardianMutation(
    residentId,
    (data: FormData) => residentService.createResidentGuardian(residentId, data),
    { success: 'Guardian added successfully', error: 'Failed to add guardian' },
  )

export const useUpdateResidentGuardianMutation = (residentId: string) =>
  useResidentGuardianMutation(
    residentId,
    ({ id, payload }: { id: string; payload: FormData }) =>
      residentService.updateResidentGuardian(residentId, id, payload),
    { success: 'Guardian updated successfully', error: 'Failed to update guardian' },
  )

export const useDeleteResidentGuardianMutation = (residentId: string) =>
  useResidentGuardianMutation(residentId, (id: string) => residentService.deleteResidentGuardian(residentId, id), {
    success: 'Guardian removed successfully',
    error: 'Failed to remove guardian',
  })

export const useUpdateResidentConditionMutation = (residentId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateResidentConditionPayload) =>
      residentService.updateResidentCondition(residentId, payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: RESIDENT_KEYS.clinical(residentId) })
      void queryClient.invalidateQueries({ queryKey: ['residents', 'timeline', residentId] })
      toast.success(data?.message || 'Resident condition updated successfully')
    },
    onError: (error: ApiError) =>
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update resident condition'),
  })
}

export const useResidentMedicinesQuery = (
  residentId?: string,
  params: ResidentMedicinesParams = {},
  enabled = true,
) => {
  return useQuery<LocationMedicineOption[]>({
    queryKey: RESIDENT_KEYS.medicines(residentId, params),
    queryFn: () => residentService.getResidentMedicines(residentId!, params),
    enabled: enabled && !!residentId,
    placeholderData: keepPreviousData,
  })
}

export const useActiveVitalSettingsQuery = (enabled = true) => {
  return useQuery<VitalSetting[]>({
    queryKey: ['vital-settings', 'active'],
    queryFn: async () => (await getVitalSettingsAPI({ isActive: true, limit: 100 })).data,
    enabled,
  })
}

export const useActiveLabTestSettingsQuery = (enabled = true) => {
  return useQuery<LabTestSetting[]>({
    queryKey: ['lab-test-settings', 'active'],
    queryFn: async () => (await getLabTestSettingsAPI({ isActive: true, limit: 100 })).data,
    enabled,
  })
}

/** Clinical writes refresh the module list and the timeline, which is derived from the same rows. */
const useResidentClinicalMutation = <TVariables>(
  residentId: string,
  listKey: readonly unknown[],
  mutationFn: (variables: TVariables) => Promise<ResidentClinicalMutationResponse>,
  messages: { success: string; error: string },
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: listKey })
      void queryClient.invalidateQueries({ queryKey: ['residents', 'timeline', residentId] })
      toast.success(data?.message || messages.success)
    },
    onError: (error: ApiError) => toast.error(error?.response?.data?.message || error?.message || messages.error),
  })
}

type UpdateVariables<T> = { id: string; payload: T }

export const useCreateResidentMedicationMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    (payload: ResidentMedicationPayload) => residentService.createResidentMedication(residentId, payload),
    { success: 'Medication added successfully', error: 'Failed to add medication' },
  )

export const useUpdateResidentMedicationMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    ({ id, payload }: UpdateVariables<Partial<ResidentMedicationPayload>>) =>
      residentService.updateResidentMedication(residentId, id, payload),
    { success: 'Medication updated successfully', error: 'Failed to update medication' },
  )

export const useDeleteResidentMedicationMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    (id: string) => residentService.deleteResidentMedication(residentId, id),
    { success: 'Medication deleted successfully', error: 'Failed to delete medication' },
  )

export const useCreateResidentInsulinMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    (payload: ResidentMedicationPayload) => residentService.createResidentInsulin(residentId, payload),
    { success: 'Insulin added successfully', error: 'Failed to add insulin' },
  )

export const useUpdateResidentInsulinMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    ({ id, payload }: UpdateVariables<Partial<ResidentMedicationPayload>>) =>
      residentService.updateResidentInsulin(residentId, id, payload),
    { success: 'Insulin updated successfully', error: 'Failed to update insulin' },
  )

export const useDeleteResidentInsulinMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    (id: string) => residentService.deleteResidentInsulin(residentId, id),
    { success: 'Insulin deleted successfully', error: 'Failed to delete insulin' },
  )

export const useCreateResidentVitalMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    (payload: ResidentVitalPayload) => residentService.createResidentVital(residentId, payload),
    { success: 'Vital added successfully', error: 'Failed to add vital' },
  )

export const useUpdateResidentVitalMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    ({ id, payload }: UpdateVariables<Partial<ResidentVitalPayload>>) =>
      residentService.updateResidentVital(residentId, id, payload),
    { success: 'Vital updated successfully', error: 'Failed to update vital' },
  )

export const useDeleteResidentVitalMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    (id: string) => residentService.deleteResidentVital(residentId, id),
    { success: 'Vital deleted successfully', error: 'Failed to delete vital' },
  )

export const useCreateResidentAllergyMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    (payload: ResidentAllergyPayload) => residentService.createResidentAllergy(residentId, payload),
    { success: 'Allergy added successfully', error: 'Failed to add allergy' },
  )

export const useUpdateResidentAllergyMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    ({ id, payload }: UpdateVariables<Partial<ResidentAllergyPayload>>) =>
      residentService.updateResidentAllergy(residentId, id, payload),
    { success: 'Allergy updated successfully', error: 'Failed to update allergy' },
  )

export const useDeleteResidentAllergyMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.clinical(residentId),
    (id: string) => residentService.deleteResidentAllergy(residentId, id),
    { success: 'Allergy deleted successfully', error: 'Failed to delete allergy' },
  )

export const useCreateResidentLabReportMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.labReports(residentId),
    (data: FormData) => residentService.createResidentLabReport(residentId, data),
    { success: 'Lab report uploaded successfully', error: 'Failed to upload lab report' },
  )

export const useUpdateResidentLabReportMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.labReports(residentId),
    ({ id, payload }: UpdateVariables<FormData>) => residentService.updateResidentLabReport(residentId, id, payload),
    { success: 'Lab report updated successfully', error: 'Failed to update lab report' },
  )

export const useDeleteResidentLabReportMutation = (residentId: string) =>
  useResidentClinicalMutation(
    residentId,
    RESIDENT_KEYS.labReports(residentId),
    (id: string) => residentService.deleteResidentLabReport(residentId, id),
    { success: 'Lab report deleted successfully', error: 'Failed to delete lab report' },
  )

export const useResidentTimelineQuery = (residentId?: string, params: ResidentTimelineParams = {}, enabled = true) => {
  return useQuery<ResidentTimelineResponse>({
    queryKey: RESIDENT_KEYS.timeline(residentId, params),
    queryFn: () => residentService.getResidentTimeline(residentId!, params),
    enabled: enabled && !!residentId,
    placeholderData: keepPreviousData,
  })
}

export const useResidentsQuery = (params?: GetResidentsParams, enabled = true) => {
  return useQuery<ResidentItem[]>({
    queryKey: RESIDENT_KEYS.list(params),
    queryFn: () => residentService.getResidents(params),
    enabled,
  })
}

export const useResidentByIdQuery = (id?: string, enabled = true) => {
  return useQuery<ResidentItem>({
    queryKey: RESIDENT_KEYS.byId(id),
    queryFn: () => residentService.getResidentById(id!),
    enabled: enabled && !!id,
  })
}

export const useCareTeamQuery = (residentId?: string, enabled = true) => {
  return useQuery({
    queryKey: RESIDENT_KEYS.careTeam(residentId),
    queryFn: () => getCareTeamAPI(residentId!),
    enabled: enabled && !!residentId,
  })
}

export const useAssignCareTeamMutation = (residentId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AssignCareTeamPayload) => assignCareTeamMemberAPI(residentId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RESIDENT_KEYS.careTeam(residentId) })
    },
  })
}

export const useRemoveCareTeamMemberMutation = (residentId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeCareTeamMemberAPI(residentId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RESIDENT_KEYS.careTeam(residentId) })
    },
  })
}
