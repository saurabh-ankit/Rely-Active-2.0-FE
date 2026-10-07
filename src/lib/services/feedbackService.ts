import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  Advertisement,
  AdvertisementQueryParams,
  FeedbackAudience,
  FeedbackForm,
  FeedbackFormQueryParams,
  FeedbackFormResponses,
  FeedbackRecipientCount,
  Pagination,
  SaveFeedbackFormRequest,
} from '@/lib/types/feedback'

type ApiResponse<T> = { success: boolean; message?: string; data: T }

const formatUrl = (template: string, locationId: string, id?: string) => {
  const url = template.replace(':locationId', locationId)
  return id ? url.replace(':id', id) : url
}

const multipartConfig = { timeout: 60_000 }

// ── Advertisements ───────────────────────────────────────────────────────────

export const listAdvertisementsAPI = async (locationId: string, params?: AdvertisementQueryParams) => {
  const response = await api.get<ApiResponse<{ advertisements: Advertisement[]; pagination: Pagination }>>(
    formatUrl(API_ENDPOINTS.advertisements.list, locationId),
    { params },
  )
  return response.data
}

export const createAdvertisementAPI = async (locationId: string, data: FormData) => {
  const response = await api.post<ApiResponse<Advertisement>>(
    formatUrl(API_ENDPOINTS.advertisements.create, locationId),
    data,
    multipartConfig,
  )
  return response.data
}

export const updateAdvertisementAPI = async (locationId: string, id: string, data: FormData) => {
  const response = await api.put<ApiResponse<Advertisement>>(
    formatUrl(API_ENDPOINTS.advertisements.detail, locationId, id),
    data,
    multipartConfig,
  )
  return response.data
}

export const updateAdvertisementStatusAPI = async (locationId: string, id: string, isActive: boolean) => {
  const response = await api.patch<ApiResponse<Advertisement>>(
    formatUrl(API_ENDPOINTS.advertisements.status, locationId, id),
    { isActive },
  )
  return response.data
}

export const deleteAdvertisementAPI = async (locationId: string, id: string) => {
  const response = await api.delete<ApiResponse<null>>(formatUrl(API_ENDPOINTS.advertisements.detail, locationId, id))
  return response.data
}

// ── Feedback forms ───────────────────────────────────────────────────────────

export const listFeedbackFormsAPI = async (locationId: string, params?: FeedbackFormQueryParams) => {
  const response = await api.get<ApiResponse<{ forms: FeedbackForm[]; pagination: Pagination }>>(
    formatUrl(API_ENDPOINTS.feedbackForms.list, locationId),
    { params },
  )
  return response.data
}

export const getFeedbackFormAPI = async (locationId: string, id: string) => {
  const response = await api.get<ApiResponse<FeedbackForm>>(
    formatUrl(API_ENDPOINTS.feedbackForms.detail, locationId, id),
  )
  return response.data
}

export const createFeedbackFormAPI = async (locationId: string, data: SaveFeedbackFormRequest) => {
  const response = await api.post<ApiResponse<FeedbackForm>>(
    formatUrl(API_ENDPOINTS.feedbackForms.create, locationId),
    data,
  )
  return response.data
}

export const updateFeedbackFormAPI = async (locationId: string, id: string, data: SaveFeedbackFormRequest) => {
  const response = await api.put<ApiResponse<FeedbackForm>>(
    formatUrl(API_ENDPOINTS.feedbackForms.detail, locationId, id),
    data,
  )
  return response.data
}

export const deleteFeedbackFormAPI = async (locationId: string, id: string) => {
  const response = await api.delete<ApiResponse<null>>(formatUrl(API_ENDPOINTS.feedbackForms.detail, locationId, id))
  return response.data
}

export const sendFeedbackFormAPI = async (locationId: string, id: string, audience: FeedbackAudience) => {
  const response = await api.post<ApiResponse<{ recipientCount: number }>>(
    formatUrl(API_ENDPOINTS.feedbackForms.send, locationId, id),
    { audience },
  )
  return response.data
}

export const getFeedbackRecipientCountAPI = async (locationId: string) => {
  const response = await api.get<ApiResponse<FeedbackRecipientCount>>(
    formatUrl(API_ENDPOINTS.feedbackForms.recipientCount, locationId),
  )
  return response.data
}

export const getFeedbackFormResponsesAPI = async (locationId: string, id: string) => {
  const response = await api.get<ApiResponse<FeedbackFormResponses>>(
    formatUrl(API_ENDPOINTS.feedbackForms.responses, locationId, id),
  )
  return response.data
}
