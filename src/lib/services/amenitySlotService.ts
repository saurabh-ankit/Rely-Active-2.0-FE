import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const formatUrl = (
  template: string,
  locationId: string,
  amenityId: string,
  replacements?: Record<string, string>,
): string => {
  let url = template.replace(':locationId', locationId).replace(':amenityId', amenityId)
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value)
    })
  }
  return url
}

export interface AmenitySlotSetup {
  id: string
  propertyAmenityId: string
  openMinutes: number
  closeMinutes: number
  durationMin: number
  capacity: number
  daysOfWeek: number[]
  /** Timed slots, whole days, or overnight stays (check-in at openMinutes, check-out next day). */
  bookingUnit?: 'SLOT' | 'FULL_DAY' | 'NIGHT'
  checkOutMinutes?: number | null
}

export interface AmenitySlotBookingItem {
  id: string
  date: string
  startMinutes: number
  residentId: string
  residentName: string
  floorNumber: number | null
  unitNumber: string | null
  status: 'BOOKED' | 'CANCELLED'
  /** Total captured when booked (unitPrice × unitCount); billed on the resident's flat invoice. Null when free. */
  chargeAmount?: number | null
  unitPrice?: number | null
  /** Slots, days or nights booked. */
  unitCount?: number
  /** Last date occupied, for a multi-day or overnight booking. */
  endDate?: string | null
  /** Overnight stays: the morning the guest leaves. */
  checkOutDate?: string | null
}

export type AmenitySlotStatus = 'AVAILABLE' | 'PARTIALLY_BOOKED' | 'BOOKED' | 'BLOCKED' | 'PAST' | 'LEGACY_BOOKED'

export interface AmenitySlotItem {
  startMinutes: number
  startLabel: string
  endMinutes: number
  endLabel: string
  period: 'MORNING' | 'AFTERNOON' | 'EVENING'
  status: AmenitySlotStatus
  capacity: number
  bookedCount: number
  remainingCount: number
  isPast: boolean
  isBlocked: boolean
  blockId: string | null
  bookings: AmenitySlotBookingItem[]
  isLegacy?: boolean
}

export interface AmenitySlotConfigResponse {
  hasSetup: boolean
  config: AmenitySlotSetup | null
  summary?: {
    slotsPerDay: number
    openLabel: string
    closeLabel: string
    durationLabel: string
    capacityLabel: string
  }
  suggestedWindow?: { openMinutes: number; closeMinutes: number } | null
}

export interface AmenitySlotsForDateResponse {
  date: string
  hasSetup: boolean
  dayClosed: boolean
  config?: Omit<AmenitySlotSetup, 'propertyAmenityId'>
  slots: AmenitySlotItem[]
}

export interface UpdateAmenitySlotConfigPayload {
  openMinutes: number
  closeMinutes: number
  durationMin: number
  capacity: number
  daysOfWeek: number[]
  force?: boolean
}

export interface ImpactedBooking {
  id: string
  date: string
  startMinutes: number
  startLabel: string
  residentId: string
  residentName: string
  floorNumber: number | null
  unitNumber: string | null
}

export const getAmenitySlotConfigAPI = async (
  locationId: string,
  amenityId: string,
): Promise<AmenitySlotConfigResponse> => {
  const url = formatUrl(API_ENDPOINTS.amenitySlots.slotConfig, locationId, amenityId)
  const response = await api.get(url)
  return response.data?.data || response.data
}

export const updateAmenitySlotConfigAPI = async (
  locationId: string,
  amenityId: string,
  payload: UpdateAmenitySlotConfigPayload,
): Promise<AmenitySlotConfigResponse & { impactedBookingsCount?: number }> => {
  const url = formatUrl(API_ENDPOINTS.amenitySlots.slotConfig, locationId, amenityId)
  const response = await api.put(url, payload)
  return response.data?.data || response.data
}

export const getAmenitySlotsForDateAPI = async (
  locationId: string,
  amenityId: string,
  date: string,
): Promise<AmenitySlotsForDateResponse> => {
  const url = formatUrl(API_ENDPOINTS.amenitySlots.slots, locationId, amenityId)
  const response = await api.get(url, { params: { date } })
  return response.data?.data || response.data
}

export const createAmenitySlotBookingAPI = async (
  locationId: string,
  amenityId: string,
  payload: {
    date: string
    /** Timed slots only. */
    startMinutes?: number
    /** Full day: last day booked (inclusive). */
    endDate?: string
    /** Overnight stay: the check-out date. */
    checkOutDate?: string
    residentId: string
    notes?: string
  },
) => {
  const url = formatUrl(API_ENDPOINTS.amenitySlots.bookings, locationId, amenityId)
  const response = await api.post(url, payload)
  return response.data
}

export const cancelAmenitySlotBookingAPI = async (locationId: string, amenityId: string, bookingId: string) => {
  const url = formatUrl(API_ENDPOINTS.amenitySlots.booking, locationId, amenityId, { bookingId })
  const response = await api.delete(url)
  return response.data
}

export const blockAmenitySlotAPI = async (
  locationId: string,
  amenityId: string,
  payload: { date: string; startMinutes: number; reason?: string },
) => {
  const url = formatUrl(API_ENDPOINTS.amenitySlots.blocks, locationId, amenityId)
  const response = await api.post(url, payload)
  return response.data
}

export const unblockAmenitySlotAPI = async (locationId: string, amenityId: string, blockId: string) => {
  const url = formatUrl(API_ENDPOINTS.amenitySlots.block, locationId, amenityId, { blockId })
  const response = await api.delete(url)
  return response.data
}
