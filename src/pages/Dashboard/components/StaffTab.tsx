import { BadgeCheck, Briefcase, CalendarOff, CalendarX, Clock, Repeat, UserCheck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DashboardStaffAnalytics } from '@/lib/types/dashboard'
import { SERIES, STATUS, dayLabel, formatNumber, humanize } from './chartUtils'
import { RankList, SeriesBars } from './analyticsShared'
import { Donut, Panel, StatTile } from './shared'

export function StaffTab({ data }: { data: DashboardStaffAnalytics }) {
  const navigate = useNavigate()
  const t = data.today

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={Users}
          label="Staff"
          value={formatNumber(data.headcount)}
          hint={`${data.shifts} shifts set up`}
          onClick={() => navigate('/admin/employees')}
        />
        <StatTile
          icon={Clock}
          tone="violet"
          label="Rostered today"
          value={formatNumber(t.scheduled)}
          hint={`${t.upcoming} yet to start`}
          onClick={() => navigate('/admin/shift-roster-management')}
        />
        <StatTile
          icon={UserCheck}
          tone="green"
          label="On duty"
          value={formatNumber(t.present)}
          hint={t.scheduled ? `${Math.round((t.present / t.scheduled) * 100)}% of rostered` : 'Today'}
        />
        <StatTile icon={CalendarX} tone="red" label="Absent" value={formatNumber(t.absent)} hint="Today" />
        <StatTile
          icon={Repeat}
          tone="amber"
          label="Covered"
          value={formatNumber(t.covered)}
          hint="Shifts covered by others"
        />
        <StatTile icon={CalendarOff} tone="slate" label="Day off" value={formatNumber(t.dayOff)} hint="Today" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel icon={UserCheck} title="Shift attendance" subtitle="Last 14 days" className="xl:col-span-2">
          <SeriesBars
            data={data.daily}
            xKey="day"
            xFormat={dayLabel}
            stacked
            series={[
              { key: 'present', label: 'On duty', color: STATUS.good },
              { key: 'covered', label: 'Covered', color: STATUS.warning },
              { key: 'absent', label: 'Absent', color: STATUS.critical },
            ]}
            empty="No shifts rostered in the last 14 days"
          />
        </Panel>
        <Panel icon={Clock} title="Today by shift" subtitle="On duty of rostered">
          <RankList
            color={SERIES[2]}
            rows={data.byShiftToday.map((s) => ({
              label: s.name,
              value: s.onDuty,
              display: `${s.onDuty} / ${s.scheduled}${s.absent ? ` · ${s.absent} absent` : ''}`,
            }))}
            empty="No shifts rostered today"
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <Panel icon={Briefcase} title="By department">
          <RankList rows={data.byDepartment.map((d) => ({ label: d.key, value: d.count }))} empty="No staff yet" />
        </Panel>
        <Panel icon={BadgeCheck} title="By role">
          <Donut
            centerLabel="staff"
            data={data.byRole.map((r, i) => ({
              key: r.key,
              label: r.key,
              value: r.count,
              color: SERIES[i % SERIES.length]!,
            }))}
          />
        </Panel>
        <Panel icon={CalendarX} title="Absence reasons" subtitle="Last 30 days">
          <RankList
            color={SERIES[1]}
            rows={data.leaveTypes.map((l) => ({ label: humanize(l.key), value: l.count }))}
            empty="No absences in the last 30 days"
          />
        </Panel>
        <Panel icon={CalendarOff} title="Most absences" subtitle="Last 30 days">
          <RankList
            color={SERIES[7]}
            rows={data.topAbsentees.map((a) => ({ label: a.name, value: a.count }))}
            empty="No absences in the last 30 days"
          />
        </Panel>
      </div>
    </div>
  )
}
