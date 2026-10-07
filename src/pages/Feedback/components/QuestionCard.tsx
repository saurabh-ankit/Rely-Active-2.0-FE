import { Controller, useFieldArray, useWatch, type Control, type UseFormRegister } from 'react-hook-form'
import { ArrowDown, ArrowUp, Copy, Plus, Star, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { FeedbackAnswerType } from '@/lib/types/feedback'
import { ANSWER_TYPE_OPTIONS, RATING_SCALES, isChoiceType } from './questionTypes'

export interface QuestionFormValue {
  questionText: string
  answerType: FeedbackAnswerType
  options: Array<{ value: string }>
  ratingScale: number
  isRequired: boolean
}

export interface FeedbackFormValues {
  title: string
  expiryDate?: Date
  questions: QuestionFormValue[]
}

type QuestionErrors = {
  questionText?: { message?: string }
  options?: { message?: string; root?: { message?: string } } & Array<{ value?: { message?: string } } | undefined>
}

interface QuestionCardProps {
  index: number
  total: number
  control: Control<FeedbackFormValues>
  register: UseFormRegister<FeedbackFormValues>
  errors?: QuestionErrors
  onDuplicate: () => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}

const QuestionCard = ({
  index,
  total,
  control,
  register,
  errors,
  onDuplicate,
  onRemove,
  onMove,
}: QuestionCardProps) => {
  const answerType = useWatch({ control, name: `questions.${index}.answerType` })
  const ratingScale = useWatch({ control, name: `questions.${index}.ratingScale` })
  const {
    fields: options,
    append,
    remove,
    replace,
  } = useFieldArray({
    control,
    name: `questions.${index}.options`,
  })

  const optionsError = errors?.options?.message ?? errors?.options?.root?.message

  return (
    <Card className="border-l-4 border-l-[#2a517c]">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-1">
            <Label htmlFor={`question-${index}`} className="text-xs text-gray-500">
              Question {index + 1}
            </Label>
            <Input
              id={`question-${index}`}
              placeholder="Type your question"
              {...register(`questions.${index}.questionText`)}
            />
            {errors?.questionText && <p className="text-xs text-red-500">{errors.questionText.message}</p>}
          </div>
          <div className="space-y-1 sm:w-52">
            <Label className="text-xs text-gray-500">Answer type</Label>
            <Controller
              control={control}
              name={`questions.${index}.answerType`}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    const next = value as FeedbackAnswerType
                    field.onChange(next)
                    // Choice questions start with two blank options; other types keep none.
                    if (isChoiceType(next) && options.length === 0) replace([{ value: '' }, { value: '' }])
                    if (!isChoiceType(next)) replace([])
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANSWER_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <SelectItem key={value} value={value} label={label}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-500" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {answerType === 'PARAGRAPH' && (
          <div className="rounded-lg border border-dashed bg-gray-50 px-3 py-4 text-sm text-gray-400">
            Respondents will type a long answer here
          </div>
        )}

        {isChoiceType(answerType) && (
          <div className="space-y-2">
            {options.map((option, optionIndex) => (
              <div key={option.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-4 w-4 shrink-0 border-2 border-gray-300 ${answerType === 'SINGLE_CHOICE' ? 'rounded-full' : 'rounded'}`}
                  />
                  <Input
                    placeholder={`Option ${optionIndex + 1}`}
                    {...register(`questions.${index}.options.${optionIndex}.value`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove option ${optionIndex + 1}`}
                    disabled={options.length <= 2}
                    onClick={() => remove(optionIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {errors?.options?.[optionIndex]?.value && (
                  <p className="pl-6 text-xs text-red-500">{errors.options[optionIndex]?.value?.message}</p>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[#2a517c]"
              onClick={() => append({ value: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add option
            </Button>
            {optionsError && <p className="text-xs text-red-500">{optionsError}</p>}
          </div>
        )}

        {answerType === 'RATING' && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: ratingScale }, (_, i) => (
                <Star key={i} className="h-5 w-5" />
              ))}
            </div>
            <Controller
              control={control}
              name={`questions.${index}.ratingScale`}
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_SCALES.map((scale) => (
                      <SelectItem key={scale} value={String(scale)} label={`1 to ${scale}`}>
                        1 to {scale}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name={`questions.${index}.isRequired`}
              render={({ field }) => (
                <Switch
                  id={`required-${index}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-checked:bg-green-600"
                />
              )}
            />
            <Label htmlFor={`required-${index}`} className="cursor-pointer text-sm font-normal text-gray-600">
              Required
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Move question up"
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Move question down"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" aria-label="Duplicate question" onClick={onDuplicate}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Delete question"
              className="text-red-600 hover:text-red-700"
              disabled={total <= 1}
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default QuestionCard
