export type FeedbackAnswerType = 'PARAGRAPH' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'RATING'
export type FeedbackAudience = 'RESIDENTS' | 'EMPLOYEES' | 'BOTH'
export type FeedbackFormStatus = 'DRAFT' | 'SENT'
export type FeedbackFormStatusFilter = FeedbackFormStatus | 'EXPIRED'

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── Advertisements ───────────────────────────────────────────────────────────

export interface Advertisement {
  id: string
  locationId: string
  title: string
  description: string | null
  imageUrl: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AdvertisementQueryParams {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

// ── Feedback forms ───────────────────────────────────────────────────────────

export interface FeedbackQuestion {
  id?: string
  questionText: string
  answerType: FeedbackAnswerType
  options: string[] | null
  ratingScale: number | null
  isRequired: boolean
  sortOrder?: number
}

export interface FeedbackForm {
  id: string
  locationId: string
  title: string
  expiryDate: string
  status: FeedbackFormStatus
  audience: FeedbackAudience | null
  sentAt: string | null
  isExpired: boolean
  /** False once the form has been sent; sent forms are read-only. */
  isEditable: boolean
  createdAt: string
  updatedAt: string
  questions?: FeedbackQuestion[]
  recipientCount?: number
  responseCount?: number
}

export interface FeedbackFormQueryParams {
  search?: string
  status?: FeedbackFormStatusFilter
  page?: number
  limit?: number
}

export interface SaveFeedbackFormRequest {
  title: string
  expiryDate: string
  questions: Array<{
    questionText: string
    answerType: FeedbackAnswerType
    options?: string[] | null
    ratingScale?: number | null
    isRequired: boolean
  }>
}

export interface FeedbackRecipientCount {
  residents: number
  employees: number
}

export interface FeedbackQuestionSummary {
  questionId: string
  questionText: string
  answerType: FeedbackAnswerType
  answeredCount: number
  textAnswers?: Array<{ respondentName: string; answerText: string | null }>
  optionCounts?: Array<{ option: string; count: number }>
  ratingScale?: number
  averageRating?: number | null
  distribution?: Array<{ value: number; count: number }>
}

export interface FeedbackResponseAnswer {
  questionId: string
  answerText: string | null
  selectedOptions: string[] | null
  ratingValue: number | null
}

export interface FeedbackIndividualResponse {
  recipientId: string
  recipientType: 'RESIDENT' | 'EMPLOYEE'
  respondentName: string
  submittedAt: string
  answers: FeedbackResponseAnswer[]
}

export interface FeedbackFormResponses {
  form: FeedbackForm
  summary: FeedbackQuestionSummary[]
  responses: FeedbackIndividualResponse[]
}
