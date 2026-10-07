import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { FeedbackQuestion } from '@/lib/types/feedback'
import { DEFAULT_RATING_SCALE, answerTypeMeta } from './questionTypes'

/** Read-only rendering of a form's questions, used for sent (locked) forms. */
const FormPreview = ({ questions }: { questions: FeedbackQuestion[] }) => (
  <div className="space-y-3">
    {questions.map((q, index) => {
      const { label, icon: Icon } = answerTypeMeta(q.answerType)
      return (
        <Card key={q.id ?? index}>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="font-medium text-gray-900">
                {index + 1}. {q.questionText}
                {q.isRequired && <span className="ml-1 text-red-500">*</span>}
              </p>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            </div>
            {q.answerType === 'PARAGRAPH' && (
              <div className="rounded-lg border border-dashed bg-gray-50 px-3 py-3 text-sm text-gray-400">
                Long answer text
              </div>
            )}
            {(q.answerType === 'SINGLE_CHOICE' || q.answerType === 'MULTIPLE_CHOICE') && (
              <ul className="space-y-1.5">
                {(q.options ?? []).map((option) => (
                  <li key={option} className="flex items-center gap-2 text-sm text-gray-700">
                    <span
                      className={`h-4 w-4 shrink-0 border-2 border-gray-300 ${q.answerType === 'SINGLE_CHOICE' ? 'rounded-full' : 'rounded'}`}
                    />
                    {option}
                  </li>
                ))}
              </ul>
            )}
            {q.answerType === 'RATING' && (
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: q.ratingScale ?? DEFAULT_RATING_SCALE }, (_, i) => (
                  <Star key={i} className="h-5 w-5" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )
    })}
  </div>
)

export default FormPreview
