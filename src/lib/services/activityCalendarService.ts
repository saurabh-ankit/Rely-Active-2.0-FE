import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

/** Mirrors Rely-Active-2.0-BE/src/services/activityCalendar.service.ts */
export type CalendarCategory =
  | 'events'
  | 'appointments'
  | 'careTasks'
  | 'shifts'
  | 'amenities'
  | 'tickets'
  | 'assets'
  | 'visitors'
  | 'food'
  | 'feedback'

export interface CalendarItem {
  id: string
  category: CalendarCategory
  kind: string
  title: string
  subtitle: string | null
  /** YYYY-MM-DD, inclusive */
  startDate: string
  endDate: string
  /** HH:mm (24h); null = all day */
  startTime: string | null
  endTime: string | null
  status: string | null
  details: Array<{ label: string; value: string }>
  link: string | null
}

export interface CalendarDaySummary {
  category: CalendarCategory
  label: string
  date: string
  total: number
  breakdown: Record<string, number>
  link: string | null
}

export interface ActivityCalendarData {
  from: string
  to: string
  today: string
  fullDetail: boolean
  categories: Array<{ key: CalendarCategory; label: string }>
  items: CalendarItem[]
  summaries: CalendarDaySummary[]
}

export interface ActivityCalendarParams {
  from: string
  to: string
}

export const getActivityCalendarAPI = async (
  locationId: string,
  params: ActivityCalendarParams,
): Promise<ActivityCalendarData> => {
  const url = API_ENDPOINTS.activityCalendar.get.replace(':locationId', locationId)
  const response = await api.get(url, { params })
  return response.data?.data as ActivityCalendarData
}
