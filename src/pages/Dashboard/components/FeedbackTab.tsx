import { ClipboardList, FileText, MessageSquareText, Percent, Send, Star, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DashboardFeedbackAnalytics } from '@/lib/types/dashboard'
import { SERIES, STATUS, formatNumber, monthLabel } from './chartUtils'
import { RankList, SeriesBars } from './analyticsShared'
import { EmptyChart, Meter, Panel, StatTile } from './shared'

const STAR_COLOR = [STATUS.critical, STATUS.serious, STATUS.warning, SERIES[2]!, STATUS.good]
const AUDIENCE_LABEL: Record<string, string> = { RESIDENT: 'Residents', EMPLOYEE: 'Employees' }

export function FeedbackTab({ data }: { data: DashboardFeedbackAnalytics }) {
  const navigate = useNavigate()
  const maxStars = Math.max(1, ...data.ratingDistribution.map((d) => d.count))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={Send}
          label="Forms sent"
          value={formatNumber(data.formsSent)}
          hint={`${data.activeForms} still open`}
          onClick={() => navigate('/admin/feedback-and-training')}
        />
        <StatTile
          icon={Users}
          tone="slate"
          label="Recipients"
          value={formatNumber(data.recipients)}
          hint="Across all forms"
        />
        <StatTile
          icon={MessageSquareText}
          tone="violet"
          label="Responses"
          value={formatNumber(data.responses)}
          hint="Forms submitted"
        />
        <StatTile
          icon={Percent}
          tone="green"
          label="Response rate"
          value={`${data.responseRate}%`}
          hint="Submitted of sent"
        />
        <StatTile
          icon={Star}
          tone="amber"
          label="Average rating"
          value={data.ratingsCount ? `${data.averageRating} / 5` : '-'}
          hint={`${formatNumber(data.ratingsCount)} rating answers`}
        />
        <StatTile
          icon={ClipboardList}
          tone="blue"
          label="Open forms"
          value={formatNumber(data.activeForms)}
          hint="Not yet expired"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel icon={MessageSquareText} title="Responses per month" subtitle="Last 6 months" className="xl:col-span-2">
          <SeriesBars
            data={data.monthly}
            xKey="month"
            xFormat={monthLabel}
            series={[{ key: 'responses', label: 'Responses', color: SERIES[0]! }]}
            empty="No responses in the last 6 months"
          />
        </Panel>
        <Panel icon={Star} title="Rating spread" subtitle="Rating questions, scaled to 5 stars">
          {data.ratingsCount ? (
            <div className="space-y-3">
              {data.ratingDistribution.map((d) => (
                <Meter
                  key={d.stars}
                  label={`${d.stars} star${d.stars > 1 ? 's' : ''}`}
                  value={d.count}
                  max={maxStars}
                  color={STAR_COLOR[d.stars - 1]}
                />
              ))}
            </div>
          ) : (
            <EmptyChart message="No ratings yet" />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={FileText}
          title="Recent forms"
          subtitle="Response rate and average rating"
          className="xl:col-span-2"
        >
          {data.forms.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-xs">
                <thead>
                  <tr className="text-left text-[11px] text-gray-500 uppercase">
                    <th className="pb-2 font-semibold">Form</th>
                    <th className="pb-2 text-right font-semibold">Sent</th>
                    <th className="pb-2 text-right font-semibold">Responses</th>
                    <th className="pb-2 text-right font-semibold">Rate</th>
                    <th className="pb-2 text-right font-semibold">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forms.map((f, i) => (
                    <tr key={`${f.title}-${i}`} className="border-t border-gray-100">
                      <td className="max-w-[220px] truncate py-2 font-semibold text-[#1f2937]">{f.title}</td>
                      <td className="py-2 text-right text-gray-500">
                        {f.sentAt
                          ? new Date(f.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                          : '-'}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {f.responses} / {f.recipients}
                      </td>
                      <td className="py-2 text-right font-bold tabular-nums">{f.responseRate}%</td>
                      <td className="py-2 text-right tabular-nums">
                        {f.averageRating != null ? `${f.averageRating} / 5` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyChart message="No feedback forms sent yet" />
          )}
        </Panel>
        <Panel icon={Users} title="By audience" subtitle="Response rate">
          <RankList
            color={SERIES[2]}
            rows={data.byAudience.map((a) => ({
              label: AUDIENCE_LABEL[a.key] ?? a.key,
              value: a.responseRate,
              display: `${a.responseRate}% · ${a.responses} / ${a.recipients}`,
            }))}
            empty="No forms sent yet"
          />
        </Panel>
      </div>
    </div>
  )
}
