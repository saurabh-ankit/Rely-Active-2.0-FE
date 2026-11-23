import { Activity, AlertTriangle, CalendarCheck, ClipboardCheck, HeartPulse, Pill, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DashboardMedicalAnalytics } from '@/lib/types/dashboard'
import { SERIES, STATUS, dayLabel, formatNumber, monthLabel, humanize } from './chartUtils'
import { RankList, SeriesBars } from './analyticsShared'
import { Donut, Panel, StatTile } from './shared'

const INCIDENT_LABEL: Record<string, string> = {
  fall_injury: 'Fall / injury',
  skin_wound: 'Skin / wound',
  behavior: 'Behaviour',
  env_temp: 'Environment / temperature',
  bathroom: 'Bathroom',
  refusal: 'Refusal of care',
  other: 'Other',
}
const SEVERITY_COLOR: Record<string, string> = {
  critical: STATUS.critical,
  high: STATUS.serious,
  moderate: STATUS.warning,
  low: STATUS.good,
}

export function MedicalTab({ data }: { data: DashboardMedicalAnalytics }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={Stethoscope}
          label="Appointments"
          value={formatNumber(data.appointmentsThisMonth)}
          hint={`This month · ${data.appointmentsUpcoming} upcoming`}
          onClick={() => navigate('/admin/medical')}
        />
        <StatTile
          icon={CalendarCheck}
          tone="green"
          label="Attended"
          value={`${data.attendanceRate}%`}
          hint="Of appointments due, 30 days"
        />
        <StatTile
          icon={Pill}
          tone="violet"
          label="Medication given"
          value={`${data.medication.adherence}%`}
          hint={`${data.medication.given} given · ${data.medication.missed} missed, 14 days`}
        />
        <StatTile
          icon={ClipboardCheck}
          tone="amber"
          label="Care tasks done"
          value={formatNumber(data.careTasksCompletedThisMonth)}
          hint={`This month · ${data.careTasksActive} active tasks`}
        />
        <StatTile
          icon={HeartPulse}
          tone="slate"
          label="Vitals recorded"
          value={formatNumber(data.vitalsLast30Days)}
          hint="Last 30 days"
        />
        <StatTile
          icon={AlertTriangle}
          tone="red"
          label="Incidents"
          value={formatNumber(data.incidentsLast90Days)}
          hint="Last 90 days"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={CalendarCheck}
          title="Doctor appointments"
          subtitle="Last 6 months, by outcome"
          className="xl:col-span-2"
        >
          <SeriesBars
            data={data.appointmentsMonthly}
            xKey="month"
            xFormat={monthLabel}
            stacked
            series={[
              { key: 'attended', label: 'Attended', color: STATUS.good },
              { key: 'scheduled', label: 'Scheduled', color: SERIES[0]! },
              { key: 'missed', label: 'Cancelled / no-show', color: STATUS.critical },
            ]}
            empty="No appointments in the last 6 months"
          />
        </Panel>
        <Panel icon={Stethoscope} title="By doctor" subtitle="Appointments, last 6 months">
          <RankList
            color={SERIES[6]}
            rows={data.byDoctor.map((d) => ({
              label: d.name,
              value: d.total,
              display: `${d.total} · ${d.attended} attended`,
            }))}
            empty="No appointments yet"
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={Activity}
          title="Daily care"
          subtitle="Medication doses and care tasks, last 14 days"
          className="xl:col-span-2"
        >
          <SeriesBars
            data={data.daily}
            xKey="day"
            xFormat={dayLabel}
            series={[
              { key: 'medsGiven', label: 'Doses given', color: SERIES[0]! },
              { key: 'medsMissed', label: 'Doses missed', color: SERIES[7]! },
              { key: 'careTasks', label: 'Care tasks done', color: SERIES[2]! },
            ]}
            empty="No medication or care tasks recorded in the last 14 days"
          />
        </Panel>
        <Panel icon={AlertTriangle} title="Incidents" subtitle="Last 90 days">
          <Donut
            centerLabel="incidents"
            data={data.incidentSeverity.map((s) => ({
              key: s.key,
              label: humanize(s.key),
              value: s.count,
              color: SEVERITY_COLOR[s.key] ?? SERIES[0]!,
            }))}
          />
          {data.incidentTypes.length > 0 && (
            <div className="mt-4">
              <RankList
                color={SERIES[1]}
                rows={data.incidentTypes.map((t) => ({
                  label: INCIDENT_LABEL[t.key] ?? humanize(t.key),
                  value: t.count,
                }))}
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
