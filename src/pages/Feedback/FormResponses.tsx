import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { BarChart3, Eye, MessageSquareText, Star, Users } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import PageLoader from '@/components/shared/PageLoader'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useFeedbackFormResponses } from '@/hooks/react-query/feedback'
import type { FeedbackIndividualResponse, FeedbackQuestionSummary, FeedbackResponseAnswer } from '@/lib/types/feedback'
import FormStatusBadge from './components/FormStatusBadge'
import { answerTypeMeta } from './components/questionTypes'

const BarRow = ({ label, count, total }: { label: string; count: number; total: number }) => {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-4 text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="shrink-0 text-gray-500">
          {count} ({percent}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-[#2a517c]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

const QuestionSummaryCard = ({ summary, index }: { summary: FeedbackQuestionSummary; index: number }) => {
  const { label, icon: Icon } = answerTypeMeta(summary.answerType)
  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <p className="font-medium text-gray-900">
            {index + 1}. {summary.questionText}
          </p>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
            <Icon className="h-3.5 w-3.5" />
            {label} · {summary.answeredCount} {summary.answeredCount === 1 ? 'answer' : 'answers'}
          </span>
        </div>

        {summary.optionCounts && (
          <div className="space-y-3">
            {summary.optionCounts.map((o) => (
              <BarRow key={o.option} label={o.option} count={o.count} total={summary.answeredCount} />
            ))}
          </div>
        )}

        {summary.distribution && (
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="text-center sm:pr-6 sm:border-r">
              <p className="text-3xl font-bold text-gray-900">{summary.averageRating ?? '—'}</p>
              <p className="flex items-center justify-center gap-1 text-xs text-gray-500">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                out of {summary.ratingScale}
              </p>
            </div>
            <div className="space-y-2">
              {[...summary.distribution].reverse().map((d) => (
                <BarRow key={d.value} label={`${d.value} ★`} count={d.count} total={summary.answeredCount} />
              ))}
            </div>
          </div>
        )}

        {summary.textAnswers &&
          (summary.textAnswers.length === 0 ? (
            <p className="text-sm italic text-gray-400">No answers yet</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {summary.textAnswers.map((a, i) => (
                <li key={i} className="rounded-lg bg-gray-50 p-3 text-sm">
                  <p className="text-gray-800 whitespace-pre-wrap">{a.answerText}</p>
                  <p className="mt-1 text-xs text-gray-500">— {a.respondentName}</p>
                </li>
              ))}
            </ul>
          ))}
      </CardContent>
    </Card>
  )
}

const formatAnswer = (answer: FeedbackResponseAnswer | undefined): string => {
  if (!answer) return '—'
  if (answer.answerText) return answer.answerText
  if (answer.selectedOptions?.length) return answer.selectedOptions.join(', ')
  if (answer.ratingValue != null) return `${answer.ratingValue} ★`
  return '—'
}

const FormResponses = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useFeedbackFormResponses(id)
  const [tab, setTab] = useState('summary')
  const [viewing, setViewing] = useState<FeedbackIndividualResponse | null>(null)

  const result = data?.data
  const questionsById = useMemo(
    () => new Map((result?.summary ?? []).map((q) => [q.questionId, q.questionText])),
    [result?.summary],
  )

  if (isLoading) return <PageLoader />
  if (!result) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-gray-600">This feedback form could not be found.</p>
        <Button variant="outline" onClick={() => navigate('/admin/settings/feedback')}>
          Back to Feedback Forms
        </Button>
      </div>
    )
  }

  const { form, summary, responses } = result
  const recipientCount = form.recipientCount ?? 0
  const responseCount = form.responseCount ?? 0
  const responseRate = recipientCount > 0 ? Math.round((responseCount / recipientCount) * 100) : 0

  const noResponses = (
    <Empty className="border border-dashed rounded-xl py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageSquareText />
        </EmptyMedia>
        <EmptyTitle>No responses yet</EmptyTitle>
        <EmptyDescription>Responses will appear here as people submit the form.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title={form.title}
        description={`Responses · Expires ${format(new Date(form.expiryDate), 'dd MMM yyyy')}`}
        onBack={() => navigate('/admin/settings/feedback')}
        actions={
          <>
            <FormStatusBadge form={form} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/settings/feedback/forms/edit/${form.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Form
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Sent to</p>
            <p className="text-2xl font-bold text-gray-900">{recipientCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Responses</p>
            <p className="text-2xl font-bold text-gray-900">{responseCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Response rate</p>
            <p className="text-2xl font-bold text-gray-900">{responseRate}%</p>
          </CardContent>
        </Card>
      </div>

      <ResponsiveTabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          {
            value: 'summary',
            label: 'Summary',
            shortLabel: 'Summary',
            icon: MessageSquareText,
            content:
              responseCount === 0 ? (
                noResponses
              ) : (
                <div className="space-y-4">
                  {summary.map((s, i) => (
                    <QuestionSummaryCard key={s.questionId} summary={s} index={i} />
                  ))}
                </div>
              ),
          },
          {
            value: 'individual',
            label: `Individual (${responseCount})`,
            shortLabel: 'Individual',
            icon: Users,
            content:
              responses.length === 0 ? (
                noResponses
              ) : (
                <Card>
                  <CardContent className="divide-y p-0">
                    {responses.map((r) => (
                      <button
                        key={r.recipientId}
                        type="button"
                        onClick={() => setViewing(r)}
                        className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{r.respondentName}</p>
                          <p className="text-xs text-gray-500">
                            Submitted {format(new Date(r.submittedAt), 'dd MMM yyyy, h:mm a')}
                          </p>
                        </div>
                        <Badge variant="outline">{r.recipientType === 'RESIDENT' ? 'Resident' : 'Employee'}</Badge>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ),
          },
        ]}
      />

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.respondentName}</DialogTitle>
            <DialogDescription>
              {viewing && `Submitted ${format(new Date(viewing.submittedAt), 'dd MMM yyyy, h:mm a')}`}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-4">
            {summary.map((q, i) => (
              <li key={q.questionId} className="space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  {i + 1}. {questionsById.get(q.questionId)}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {formatAnswer(viewing?.answers.find((a) => a.questionId === q.questionId))}
                </p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FormResponses
