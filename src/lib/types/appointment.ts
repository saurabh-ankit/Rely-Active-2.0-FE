export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW'

export interface AppointmentPatient {
  id: string
  firstName: string
  lastName: string
  fullName: string
  username?: string
  contact_email?: string
  contact_phone?: string
  profilePhoto?: string
  dob?: string
  gender?: string
  relation?: string
  isFamilyMember?: boolean
  displayLabel?: string
}

export interface AppointmentFamilyMember {
  id: string
  firstName: string
  lastName?: string | null
  fullName: string
  relation?: string
  profilePhoto?: string
  contact_email?: string
  contact_phone?: string
}

export interface AppointmentDoctor {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email?: string
  username?: string
}

export interface DoctorAppointment {
  id: string
  shiftEmployeeDateId: string
  residentId: string
  familyMemberId?: string | null
  doctorId: string
  appointmentDate: string
  slotTimeRange: string
  status: AppointmentStatus
  bookedAt: string
  cancelledAt?: string | null
  cancellationReason?: string | null
  attendedAt?: string | null
  notes?: string | null
  resident?: AppointmentPatient | null
  familyMember?: AppointmentFamilyMember | null
  patient?: AppointmentPatient | null
  doctor?: AppointmentDoctor | null
  shiftName?: string
}

export interface AppointmentBookingsQueryParams {
  page?: number
  limit?: number
  status?: AppointmentStatus
  search?: string
}

export interface AppointmentSlotDetail {
  slotTimeRange: string
  isBooked: boolean
  isPast?: boolean
  isAvailable?: boolean
}

export interface AppointmentCapacityResponse {
  shiftEmployeeDateId: string
  date: string
  doctorName?: string
  shiftName?: string
  totalSlots: number
  availableSlots: number
  bookedSlots: number
  activeBookings: number
  utilizationPercentage: number
  isFullyBooked: boolean
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  cancelledBookings: number
  attendedBookings: number
  noShowBookings: number
  totalCapacity: number
  availableSpots: number
  activeSeats: number
  confirmedRegistrations: number
  pendingRegistrations: number
  cancelledRegistrations: number
  attendedRegistrations: number
  noShowRegistrations: number
  slots: AppointmentSlotDetail[]
}

export interface AppointmentShiftDateContext {
  shiftEmployeeDateId: string
  date: string
  status: string
  doctor: AppointmentDoctor | null
  doctorId?: string
  shift: {
    id: string
    name: string
    startTime: string
    endTime: string
    numberOfSlots?: number | null
    slotDuration?: number | null
  } | null
  assignmentId?: string
  slotTimeRange?: string | null
  effectiveTime?: string | null
  totalSlots: number
  slots: string[]
}

export interface BookAppointmentRequest {
  residentId: string
  familyMemberId?: string | null
  slotTimeRange: string
  notes?: string
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus
  notes?: string
}

export interface EnsureShiftDateRequest {
  assignmentId: string
  date: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
}
