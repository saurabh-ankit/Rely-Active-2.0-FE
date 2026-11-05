import { useDashboardAnalyticsQuery } from '@/hooks/react-query/dashboard'
import type { AnalyticsTabKey, DashboardAnalyticsMap } from '@/lib/types/dashboard'
import { AnalyticsError, AnalyticsLoading } from './analyticsShared'
import { AssetsTab } from './AssetsTab'
import { DiningTab } from './DiningTab'
import { EventsTab } from './EventsTab'
import { FeedbackTab } from './FeedbackTab'
import { MedicalTab } from './MedicalTab'
import { StaffTab } from './StaffTab'
import { TicketsTab } from './TicketsTab'
import { VisitorsTab } from './VisitorsTab'

const VIEWS: { [K in AnalyticsTabKey]: (props: { data: DashboardAnalyticsMap[K] }) => React.ReactNode } = {
  tickets: TicketsTab,
  visitors: VisitorsTab,
  dining: DiningTab,
  events: EventsTab,
  medical: MedicalTab,
  staff: StaffTab,
  assets: AssetsTab,
  feedback: FeedbackTab,
}

/** Loads one analytics tab (only while it is open) and renders it. */
export function AnalyticsTabView<T extends AnalyticsTabKey>({
  tab,
  label,
  locationId,
}: {
  tab: T
  label: string
  locationId?: string | null
}) {
  const { data, isLoading, isError, refetch } = useDashboardAnalyticsQuery(tab, locationId)
  if (isError && !data) return <AnalyticsError label={label} onRetry={() => refetch()} />
  if (isLoading || !data) return <AnalyticsLoading />
  const View = VIEWS[tab] as (props: { data: DashboardAnalyticsMap[T] }) => React.ReactNode
  return <View data={data} />
}
