import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const formatUrl = (template: string, locationId: string, replacements?: Record<string, string>) => {
  let url = template.replace(':locationId', locationId || 'all')
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value)
    })
  }
  return url
}

export interface VenueImage {
  url: string
  caption?: string
}

export interface AddOnService {
  globalServiceId?: string
  name: string
  imageUrl?: string
  keyFeatures?: string
  price?: number
  quantity?: number
}

export interface CreateVenueRequest {
  name: string
  occupancy: number
  price?: number
  keyFeatures?: string
  otherServices?: string
  coverPhoto?: string
  images?: VenueImage[]
  addOnServices?: AddOnService[]
}

export interface UpdateVenueRequest extends Partial<CreateVenueRequest> {
  id: string
}

export interface Venue {
  id: string
  name: string
  occupancy: number
  price?: number
  keyFeatures?: string
  otherServices?: string
  coverPhoto?: string
  images?: VenueImage[]
  addOnServices?: AddOnService[]
  createdAt: string
  updatedAt: string
}

export type EventType = 'regular' | 'special'

export type FrequencyType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface EventOccurrence {
  startDate: string
  endDate: string
}

export interface CreateEventRequest {
  eventType: EventType
  title: string
  description?: string
  startDate: string
  endDate: string
  venueId: string
  allowReservation?: boolean
  frequencyType?: FrequencyType
  maxCapacity?: number
  reservationPerFlat?: number
  recurrenceDayOfWeek?: number
  recurrenceDaysOfWeek?: number[]
  recurrenceDayOfMonth?: number
  recurrenceMonth?: number
  sameScheduleForAllDates?: boolean
  poster?: string
  eventOccurrences?: EventOccurrence[]
  entryFee?: number
  selectedServices?: AddOnService[]
}

export type UpdateEventRequest = Partial<CreateEventRequest>

export interface Event {
  id: string
  eventType: EventType
  title: string
  description?: string
  startDate: string
  endDate: string
  venueId: string
  venue?: Venue
  allowReservation: boolean
  frequencyType: FrequencyType
  maxCapacity?: number | null
  reservationPerFlat?: number | null
  recurrenceDayOfWeek?: number | null
  recurrenceDaysOfWeek?: number[] | null
  recurrenceDayOfMonth?: number | null
  recurrenceMonth?: number | null
  poster?: string
  entryFee?: number
  selectedServices?: AddOnService[]
  createdAt: string
  updatedAt: string
}

export interface EventQueryParams {
  page?: number
  limit?: number | 'all'
  search?: string
  eventType?: EventType
  venueId?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface VenueQueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarQueryParams {
  view?: CalendarView
  year?: number
  month?: number
  weekStart?: string
  date?: string
}

export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW'

export interface Patient {
  id: string
  firstName: string
  middleName?: string | null
  lastName: string
  fullName: string
  username?: string
  contact_email?: string
  contact_phone?: string
  profilePhoto?: string
  dob?: string
  gender?: string
}

export interface EventRegistration {
  id: string
  eventId: string
  patientId: string
  status: RegistrationStatus
  registeredAt: string
  registrationDate?: string
  attendingOn?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
  attendedAt?: string | null
  notes?: string | null
  patient: Patient
  event?: {
    id: string
    title: string
    eventType: EventType
    startDate: string
    endDate: string
  }
}

export interface EventRegistrationsQueryParams {
  page?: number
  limit?: number
  status?: RegistrationStatus
  search?: string
}

export interface EventCapacityResponse {
  eventId: string
  eventTitle: string
  venueId: string
  venueName: string
  venueCapacity: number
  maxCapacity?: number | null
  reservationPerFlat?: number | null
  totalCapacity: number
  totalRegistrations: number
  confirmedRegistrations: number
  pendingRegistrations: number
  cancelledRegistrations: number
  attendedRegistrations: number
  noShowRegistrations: number
  activeRegistrations: number
  availableSpots: number | null
  utilizationPercentage: number
  isFullyBooked: boolean
}

export interface UpdateRegistrationStatusRequest {
  status: RegistrationStatus
  notes?: string
}

// ── Global Service Interfaces & API Helpers ────────────────────────────────────
export interface LocationGlobalService {
  id: string
  name: string
  description?: string | null
  basePrice: number
  imageUrl?: string | null
  isActive: boolean
  locationPrice: number
  locationAssignmentId: string | null
  locationQuantity: number
  allocatedQuantity: number
  availableQuantity: number
}

export interface SelectedVenueService {
  id: string
  quantity: number
}

export const getLocationGlobalServicesAPI = async (locationId: string) => {
  const url = formatUrl(API_ENDPOINTS.globalServices.listByLocation, locationId)
  const response = await api.get(url)
  return response.data
}

export function getServiceTotalPrice(price?: number, quantity?: number): number {
  return (price ?? 0) * (quantity ?? 1)
}

export function mapSelectedServicesToAddOns(
  services: LocationGlobalService[],
  selectedItems: SelectedVenueService[],
): AddOnService[] {
  const result: AddOnService[] = []
  for (const { id, quantity } of selectedItems) {
    const service = services.find((s) => s.id === id)
    if (!service) continue
    result.push({
      globalServiceId: service.id,
      name: service.name,
      imageUrl: service.imageUrl || undefined,
      keyFeatures: service.description || undefined,
      price: service.locationPrice,
      quantity: quantity || 1,
    })
  }
  return result
}

export function resolveSelectedVenueServices(
  addOnServices: AddOnService[],
  catalog: LocationGlobalService[],
): SelectedVenueService[] {
  const items: SelectedVenueService[] = []
  for (const addon of addOnServices) {
    if (addon.globalServiceId && catalog.some((s) => s.id === addon.globalServiceId)) {
      items.push({ id: addon.globalServiceId, quantity: addon.quantity ?? 1 })
      continue
    }
    const match = catalog.find((s) => s.name === addon.name)
    if (match) {
      items.push({ id: match.id, quantity: addon.quantity ?? 1 })
    }
  }
  return items
}

/** @deprecated Use resolveSelectedVenueServices instead */
export function resolveSelectedServiceIds(addOnServices: AddOnService[], catalog: LocationGlobalService[]): string[] {
  return resolveSelectedVenueServices(addOnServices, catalog).map((item) => item.id)
}

// ── Venue & Event API Calls ───────────────────────────────────────────────────
export const createVenueAPI = async (locationId: string, data: CreateVenueRequest | FormData) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.createVenue, locationId)
  const response = await api.post(url, data)
  return response.data
}

export const listVenuesAPI = async (locationId: string, params?: VenueQueryParams) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.listVenues, locationId)
  const response = await api.get(url, { params })
  return response.data
}

export const getVenueByIdAPI = async (locationId: string, venueId: string) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.getVenueById, locationId, { venueId })
  const response = await api.get(url)
  return response.data
}

export const updateVenueAPI = async (locationId: string, venueId: string, data: UpdateVenueRequest | FormData) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.updateVenue, locationId, { venueId })
  const response = await api.put(url, data)
  return response.data
}

export const deleteVenueAPI = async (locationId: string, venueId: string) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.deleteVenue, locationId, { venueId })
  const response = await api.delete(url)
  return response.data
}

export const createEventAPI = async (locationId: string, data: CreateEventRequest | FormData) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.createEvent, locationId)
  const response = await api.post(url, data)
  return response.data
}

export const listEventsAPI = async (locationId: string, params?: EventQueryParams) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.listEvents, locationId)
  const response = await api.get(url, { params })
  return response.data
}

export const getEventByIdAPI = async (locationId: string, eventId: string) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.getEventById, locationId, { eventId })
  const response = await api.get(url)
  return response.data
}

export const updateEventAPI = async (locationId: string, eventId: string, data: UpdateEventRequest | FormData) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.updateEvent, locationId, { eventId })
  const response = await api.put(url, data)
  return response.data
}

export const deleteEventAPI = async (locationId: string, eventId: string) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.deleteEvent, locationId, { eventId })
  const response = await api.delete(url)
  return response.data
}

export const bulkDeleteEventsAPI = async (locationId: string, eventIds: string[]) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.bulkDeleteEvents, locationId)
  const response = await api.delete(url, { data: { ids: eventIds } })
  return response.data
}

export const getEventsCalendarAPI = async (locationId: string, params: CalendarQueryParams) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.getEventsCalendar, locationId)
  const response = await api.get(url, { params })
  return response.data
}

export const getEventRegistrationsAPI = async (
  locationId: string,
  eventId: string,
  params?: EventRegistrationsQueryParams,
) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.getEventRegistrations, locationId, { eventId })
  const response = await api.get(url, { params })
  return response.data
}

export const getEventCapacityAPI = async (locationId: string, eventId: string) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.getEventCapacity, locationId, { eventId })
  const response = await api.get(url)
  return response.data
}

export const updateRegistrationStatusAPI = async (
  locationId: string,
  eventId: string,
  registrationId: string,
  data: UpdateRegistrationStatusRequest,
) => {
  const url = formatUrl(API_ENDPOINTS.eventManagement.updateRegistrationStatus, locationId, {
    eventId,
    registrationId,
  })
  const response = await api.put(url, data)
  return response.data
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3002'

export const resolveMediaUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`
  return url
}
