import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createAdvertisementAPI,
  createFeedbackFormAPI,
  deleteAdvertisementAPI,
  deleteFeedbackFormAPI,
  getFeedbackFormAPI,
  getFeedbackFormResponsesAPI,
  getFeedbackRecipientCountAPI,
  listAdvertisementsAPI,
  listFeedbackFormsAPI,
  sendFeedbackFormAPI,
  updateAdvertisementAPI,
  updateAdvertisementStatusAPI,
  updateFeedbackFormAPI,
} from '@/lib/services/feedbackService'
import { useLocationStore } from '@/lib/stores/locationStore'
import type {
  AdvertisementQueryParams,
  FeedbackAudience,
  FeedbackFormQueryParams,
  SaveFeedbackFormRequest,
} from '@/lib/types/feedback'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

const errorMessage = (error: ApiError, fallback: string) => error?.response?.data?.message || error.message || fallback

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

// ── Advertisements ───────────────────────────────────────────────────────────

export const useAdvertisements = (params?: AdvertisementQueryParams) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['advertisements', locationId, params],
    queryFn: () => listAdvertisementsAPI(locationId!, params),
    enabled: !!locationId,
    placeholderData: keepPreviousData,
  })
}

export const useCreateAdvertisement = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: FormData) => createAdvertisementAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      toast.success(data.message || 'Advertisement created successfully')
    },
    onError: (error: ApiError) => toast.error(errorMessage(error, 'Failed to create advertisement')),
  })
}

export const useUpdateAdvertisement = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => updateAdvertisementAPI(locationId!, id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      toast.success(data.message || 'Advertisement updated successfully')
    },
    onError: (error: ApiError) => toast.error(errorMessage(error, 'Failed to update advertisement')),
  })
}

export const useUpdateAdvertisementStatus = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdvertisementStatusAPI(locationId!, id, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      toast.success(data.message || 'Advertisement updated')
    },
    onError: (error: ApiError) => toast.error(errorMessage(error, 'Failed to update advertisement')),
  })
}

export const useDeleteAdvertisement = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (id: string) => deleteAdvertisementAPI(locationId!, id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      toast.success(data.message || 'Advertisement deleted successfully')
    },
    onError: (error: ApiError) => toast.error(errorMessage(error, 'Failed to delete advertisement')),
  })
}

// ── Feedback forms ───────────────────────────────────────────────────────────

const invalidateForms = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['feedback-forms'] })
  queryClient.invalidateQueries({ queryKey: ['feedback-form'] })
}

export const useFeedbackForms = (params?: FeedbackFormQueryParams) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['feedback-forms', locationId, params],
    queryFn: () => listFeedbackFormsAPI(locationId!, params),
    enabled: !!locationId,
    placeholderData: keepPreviousData,
  })
}

export const useFeedbackForm = (id: string | undefined) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['feedback-form', locationId, id],
    queryFn: () => getFeedbackFormAPI(locationId!, id!),
    enabled: !!locationId && !!id,
  })
}

export const useFeedbackRecipientCount = (enabled: boolean) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['feedback-recipient-count', locationId],
    queryFn: () => getFeedbackRecipientCountAPI(locationId!),
    enabled: enabled && !!locationId,
  })
}

export const useFeedbackFormResponses = (id: string | undefined) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['feedback-form-responses', locationId, id],
    queryFn: () => getFeedbackFormResponsesAPI(locationId!, id!),
    enabled: !!locationId && !!id,
  })
}

export const useCreateFeedbackForm = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: SaveFeedbackFormRequest) => createFeedbackFormAPI(locationId!, data),
    onSuccess: () => invalidateForms(queryClient),
    onError: (error: ApiError) => toast.error(errorMessage(error, 'Failed to create feedback form')),
  })
}

export const useUpdateFeedbackForm = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveFeedbackFormRequest }) =>
      updateFeedbackFormAPI(locationId!, id, data),
    onSuccess: () => invalidateForms(queryClient),
    onError: (error: ApiError) => toast.error(errorMessage(error, 'Failed to update feedback form')),
  })
}

export const useDeleteFeedbackForm = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (id: string) => deleteFeedbackFormAPI(locationId!, id),
    onSuccess: (data) => {
      invalidateForms(queryClient)
      toast.success(data.message || 'Feedback form deleted successfully')
    },
    onError: (error: ApiError) => toast.error(errorMessage(error, 'Failed to delete feedback form')),
  })
}

export const useSendFeedbackForm = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ id, audience }: { id: string; audience: FeedbackAudience }) =>
      sendFeedbackFormAPI(locationId!, id, audience),
    onSuccess: (data) => {
      invalidateForms(queryClient)
      toast.success(data.message || 'Feedback form sent')
    },
    onError: (error: ApiError) => toast.error(errorMessage(error, 'Failed to send feedback form')),
  })
}
