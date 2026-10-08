import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, startOfDay } from 'date-fns'
import { BarChart3, CalendarIcon, ClipboardList, Info, Lock, Plus, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import PageLoader from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCreateFeedbackForm, useFeedbackForm, useUpdateFeedbackForm } from '@/hooks/react-query/feedback'
import type { FeedbackForm, SaveFeedbackFormRequest } from '@/lib/types/feedback'
import FormPreview from './components/FormPreview'
import FormStatusBadge from './components/FormStatusBadge'
import QuestionCard, { type FeedbackFormValues, type QuestionFormValue } from './components/QuestionCard'
import SendFormDialog from './components/SendFormDialog'
import { DEFAULT_RATING_SCALE, isChoiceType } from './components/questionTypes'

const questionSchema = z
  .object({
    questionText: z.string().trim().min(1, 'Question is required'),
    answerType: z.enum(['PARAGRAPH', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'RATING']),
    options: z.array(z.object({ value: z.string() })),
    ratingScale: z.number(),
    isRequired: z.boolean(),
  })
  .superRefine((q, ctx) => {
    if (!isChoiceType(q.answerType)) return
    q.options.forEach((option, i) => {
      if (!option.value.trim()) {
        ctx.addIssue({ code: 'custom', path: ['options', i, 'value'], message: 'Option cannot be empty' })
      }
    })
    const values = q.options.map((o) => o.value.trim().toLowerCase()).filter(Boolean)
    if (q.options.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Add at least 2 options' })
    } else if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Options must be unique' })
    }
  })

const formSchema = z.object({
  title: z.string().trim().min(1, 'Form title is required').max(255, 'Form title must be 255 characters or fewer'),
  expiryDate: z
    .date({ message: 'Expiry date is required' })
    .optional()
    .refine((d) => !!d, 'Expiry date is required')
    .refine((d) => !d || d.getTime() > Date.now(), 'Expiry date must be in the future'),
  questions: z.array(questionSchema).min(1, 'Add at least one question'),
})

const emptyQuestion = (): QuestionFormValue => ({
  questionText: '',
  answerType: 'PARAGRAPH',
  options: [],
  ratingScale: DEFAULT_RATING_SCALE,
  isRequired: true,
})

const toFormValues = (form: FeedbackForm): FeedbackFormValues => ({
  title: form.title,
  expiryDate: new Date(form.expiryDate),
  questions: (form.questions ?? []).map((q) => ({
    questionText: q.questionText,
    answerType: q.answerType,
    options: (q.options ?? []).map((value) => ({ value })),
    ratingScale: q.ratingScale ?? DEFAULT_RATING_SCALE,
    isRequired: q.isRequired,
  })),
})

const toRequest = (values: FeedbackFormValues): SaveFeedbackFormRequest => ({
  title: values.title.trim(),
  // Forms stay open until the end of the chosen day.
  expiryDate: new Date(new Date(values.expiryDate!).setHours(23, 59, 59, 999)).toISOString(),
  questions: values.questions.map((q) => ({
    questionText: q.questionText.trim(),
    answerType: q.answerType,
    options: isChoiceType(q.answerType) ? q.options.map((o) => o.value.trim()) : null,
    ratingScale: q.answerType === 'RATING' ? q.ratingScale : null,
    isRequired: q.isRequired,
  })),
})

const BACK_TO_LIST = '/admin/settings/feedback'

const FormBuilder = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data, isLoading, refetch } = useFeedbackForm(id)
  const existing = data?.data
  const createMutation = useCreateFeedbackForm()
  const updateMutation = useUpdateFeedbackForm()
  const isSaving = createMutation.isPending || updateMutation.isPending

  const [sendTarget, setSendTarget] = useState<{ id: string; title: string } | null>(null)
  // Set once a new form is first saved, so later saves update that draft instead of creating another.
  const [createdId, setCreatedId] = useState<string | null>(null)
  const draftId = id ?? createdId
  // A sent form with no responses yet can still be edited, but it is not sent again.
  const isSent = existing?.status === 'SENT'

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', questions: [emptyQuestion()] },
  })
  const { fields, append, insert, remove, move } = useFieldArray({ control, name: 'questions' })

  useEffect(() => {
    if (existing?.isEditable) reset(toFormValues(existing))
  }, [existing, reset])

  /** Saves the form and resolves with its id; when the server reports it is locked, reloads the page state. */
  const save = async (values: FeedbackFormValues): Promise<string | null> => {
    const payload = toRequest(values)
    try {
      const result = draftId
        ? await updateMutation.mutateAsync({ id: draftId, data: payload })
        : await createMutation.mutateAsync(payload)
      if (!draftId) setCreatedId(result.data.id)
      reset(values)
      return result.data.id
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status === 409) await refetch()
      return null
    }
  }

  const onSaveDraft = handleSubmit(async (values) => {
    const savedId = await save(values)
    if (!savedId) return
    toast.success(isSent ? 'Form updated' : 'Form saved as draft')
    navigate(BACK_TO_LIST)
  })

  const onSaveAndSend = handleSubmit(async (values) => {
    // Skip the save round-trip when an existing draft has no unsaved changes.
    const savedId = draftId && !isDirty ? draftId : await save(values)
    if (!savedId) return
    setSendTarget({ id: savedId, title: values.title })
  })

  const duplicateQuestion = (index: number) => {
    const source = getValues(`questions.${index}`)
    insert(index + 1, { ...source, options: source.options.map((o) => ({ ...o })) })
  }

  if (isEdit && isLoading) return <PageLoader />

  if (isEdit && !existing) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-gray-600">This feedback form could not be found.</p>
        <Button variant="outline" onClick={() => navigate(BACK_TO_LIST)}>
          Back to Feedback Forms
        </Button>
      </div>
    )
  }

  // ── Sent forms are locked: show a read-only view instead of the builder ──
  if (existing && !existing.isEditable) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={ClipboardList}
          title={existing.title}
          description={`Expires ${format(new Date(existing.expiryDate), 'dd MMM yyyy')}${
            existing.sentAt ? ` · Sent ${format(new Date(existing.sentAt), 'dd MMM yyyy, h:mm a')}` : ''
          }`}
          onBack={() => navigate(BACK_TO_LIST)}
          actions={<FormStatusBadge form={existing} />}
        />

        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <Lock className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-amber-800">
            This form already has responses and can no longer be edited, so every response answers the same questions.
          </p>
          <Button
            size="sm"
            className="shrink-0 bg-[#2a517c] hover:bg-[#476587] text-white"
            onClick={() => navigate(`/admin/settings/feedback/forms/${existing.id}/responses`)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Responses
          </Button>
        </div>

        <FormPreview questions={existing.questions ?? []} />
      </div>
    )
  }

  const questionErrors = errors.questions as unknown as Array<Record<string, never>> | undefined

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(BACK_TO_LIST)} disabled={isSaving}>
        Cancel
      </Button>
      {isSent ? (
        <Button
          size="sm"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="bg-[#2a517c] hover:bg-[#476587] text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      ) : (
        <>
          <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            size="sm"
            onClick={onSaveAndSend}
            disabled={isSaving}
            className="bg-[#2a517c] hover:bg-[#476587] text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            Save &amp; Send
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title={isEdit ? 'Edit Feedback Form' : 'Create Feedback Form'}
        description="Add questions, then send the form to residents, employees or both."
        onBack={() => navigate(BACK_TO_LIST)}
        actions={actionButtons}
      />

      {isSent && existing && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <p className="text-sm text-blue-800">
            This form has been sent to {existing.recipientCount ?? 0}{' '}
            {existing.recipientCount === 1 ? 'person' : 'people'} and no one has responded yet, so you can still edit
            it. Once the first response comes in, it will be locked.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        <Card className="lg:sticky lg:top-4">
          <CardContent className="space-y-5 p-5">
            <h2 className="text-base font-semibold text-gray-900">Form details</h2>
            <div className="space-y-1.5">
              <Label htmlFor="form-title">
                Form title <span className="text-red-500">*</span>
              </Label>
              <Input id="form-title" placeholder="e.g. Monthly Dining Feedback" {...register('title')} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>
                Expiry date <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="expiryDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger render={<Button variant="outline" className="w-full justify-start font-normal" />}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {field.value ? format(field.value, 'dd MMM yyyy') : 'Pick a date'}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={{ before: startOfDay(new Date()) }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.expiryDate ? (
                <p className="text-xs text-red-500">{errors.expiryDate.message}</p>
              ) : (
                <p className="text-xs text-gray-500">The form stays open until the end of this day.</p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
              <span className="text-gray-600">Questions</span>
              <span className="font-semibold text-gray-900">{fields.length}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <QuestionCard
              key={field.id}
              index={index}
              total={fields.length}
              control={control}
              register={register}
              errors={questionErrors?.[index]}
              onDuplicate={() => duplicateQuestion(index)}
              onRemove={() => remove(index)}
              onMove={(direction) => move(index, index + direction)}
            />
          ))}
          {errors.questions?.message && <p className="text-xs text-red-500">{errors.questions.message}</p>}

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-dashed"
            onClick={() => append(emptyQuestion())}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add question
          </Button>

          {fields.length > 2 && <div className="flex justify-end pt-2">{actionButtons}</div>}
        </div>
      </div>

      <SendFormDialog
        open={!!sendTarget}
        onOpenChange={(open) => !open && setSendTarget(null)}
        form={sendTarget}
        onSent={() => navigate(BACK_TO_LIST)}
      />
    </div>
  )
}

export default FormBuilder
