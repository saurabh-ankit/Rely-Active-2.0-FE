import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  IndianRupee,
  Percent,
  Sparkles,
  Ticket,
  Trophy,
  Waves,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DashboardEventsAnalytics } from '@/lib/types/dashboard'
import { SERIES, formatINR, formatINRCompact, formatNumber, monthLabel, humanize } from './chartUtils'
import { RankList, SeriesBars } from './analyticsShared'
import { Donut, Panel, StatTile } from './shared'

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

export function EventsTab({ data }: { data: DashboardEventsAnalytics }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={CalendarDays}
          label="Upcoming events"
          value={formatNumber(data.upcoming)}
          hint={`${data.thisMonth} this month`}
          onClick={() => navigate('/admin/events')}
        />
        <StatTile
          icon={Ticket}
          tone="violet"
          label="Seats booked"
          value={formatNumber(data.seatsBookedThisMonth)}
          hint="This month"
        />
        <StatTile
          icon={Percent}
          tone="green"
          label="Attendance rate"
          value={`${data.attendanceRate}%`}
          hint="Of seats booked for past events"
        />
        <StatTile
          icon={ClipboardList}
          tone="amber"
          label="Open requests"
          value={formatNumber(data.openRequests)}
          hint="Event requests from residents"
        />
        <StatTile
          icon={Waves}
          tone="slate"
          label="Amenity bookings"
          value={formatNumber(data.amenityBookingsThisMonth)}
          hint="This month"
          onClick={() => navigate('/admin/amenities')}
        />
        <StatTile
          icon={IndianRupee}
          tone="red"
          label="Amenity charges"
          value={formatINRCompact(data.amenityRevenueThisMonth)}
          hint="This month"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={CalendarCheck}
          title="Events, bookings and attendance"
          subtitle="Last 6 months"
          className="xl:col-span-2"
        >
          <SeriesBars
            data={data.monthly}
            xKey="month"
            xFormat={monthLabel}
            series={[
              { key: 'events', label: 'Events held', color: SERIES[6]! },
              { key: 'booked', label: 'Seats booked', color: SERIES[0]! },
              { key: 'attended', label: 'Attended', color: SERIES[2]! },
            ]}
            empty="No events in the last 6 months"
          />
        </Panel>
        <Panel icon={Trophy} title="Most popular events" subtitle="Seats booked, last 6 months">
          <RankList
            color={SERIES[1]}
            rows={data.topEvents.map((e) => ({
              label: `${e.title} · ${shortDate(e.startDate)}`,
              value: e.seats,
              display: e.capacity ? `${e.seats} / ${e.capacity}` : formatNumber(e.seats),
            }))}
            empty="No bookings yet"
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel icon={Waves} title="Amenity usage" subtitle="Bookings, last 30 days">
          <RankList
            color={SERIES[0]}
            rows={data.amenities.map((a) => ({
              label: a.name,
              value: a.bookings,
              display: a.revenue ? `${a.bookings} · ${formatINR(a.revenue)}` : formatNumber(a.bookings),
            }))}
            empty="No amenity bookings in the last 30 days"
          />
        </Panel>
        <Panel icon={Ticket} title="Registrations" subtitle="By status, last 6 months">
          <Donut
            centerLabel="registrations"
            data={data.registrationStatus.map((s, i) => ({
              key: s.key,
              label: humanize(s.key),
              value: s.count,
              color: SERIES[i % SERIES.length]!,
            }))}
          />
        </Panel>
        <Panel icon={Sparkles} title="Event mix and requests" subtitle="All events and resident requests">
          <Donut
            centerLabel="events"
            data={[
              { key: 'regular', label: 'Regular', value: data.byType.regular, color: SERIES[0]! },
              { key: 'special', label: 'Special', value: data.byType.special, color: SERIES[4]! },
            ]}
          />
          {data.requestStatus.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.requestStatus.map((r) => (
                <span
                  key={r.key}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600"
                >
                  {humanize(r.key)} <b className="text-[#1f2937]">{r.count}</b>
                </span>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
