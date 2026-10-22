import { AlignLeft, CircleDot, ListChecks, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FeedbackAnswerType } from '@/lib/types/feedback'

export const ANSWER_TYPE_OPTIONS: Array<{ value: FeedbackAnswerType; label: string; icon: LucideIcon }> = [
  { value: 'PARAGRAPH', label: 'Paragraph', icon: AlignLeft },
  { value: 'SINGLE_CHOICE', label: 'Single Choice', icon: CircleDot },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: ListChecks },
  { value: 'RATING', label: 'Rating', icon: Star },
]

export const RATING_SCALES = [3, 5, 10]
export const DEFAULT_RATING_SCALE = 5

export const isChoiceType = (type: FeedbackAnswerType) => type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE'

export const answerTypeMeta = (type: FeedbackAnswerType) =>
  ANSWER_TYPE_OPTIONS.find((o) => o.value === type) ?? ANSWER_TYPE_OPTIONS[0]!
