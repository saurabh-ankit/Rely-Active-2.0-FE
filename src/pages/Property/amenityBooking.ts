// Booking units for slot-bookable amenities, shared by the property form and the Amenities page.

/** How a slot-bookable amenity is booked: timed slots, whole days, or overnight stays. */
export type AmenityBookingUnit = 'SLOT' | 'FULL_DAY' | 'NIGHT'

export interface SelectedAmenity {
  amenityId: string | null
  name: string
  slotBookable: boolean
  /** Each slot, day or night booked is billed at `price` to the resident's flat. */
  isPayable: boolean
  price: string
  bookingUnit: AmenityBookingUnit
  /** Timed slots only. */
  slotDurationMinutes: number
  /** Opening hours (timed slots, full day) or the optional availability of a non-slot amenity. */
  availableFrom?: string
  availableTo?: string
  /** Overnight stays: check-in on the day booked, check-out the next day. */
  checkInTime: string
  checkOutTime: string
}

export const SLOT_LENGTHS = [30, 45, 60, 90, 120, 180, 240]

export const slotLengthLabel = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes === 60 ? '' : 's'}`

/** "1 hr slot" / "day" / "night": what one price covers. */
export const priceUnitLabel = (amenity: Pick<SelectedAmenity, 'bookingUnit' | 'slotDurationMinutes'>) =>
  amenity.bookingUnit === 'NIGHT'
    ? 'night'
    : amenity.bookingUnit === 'FULL_DAY'
      ? 'day'
      : `${slotLengthLabel(amenity.slotDurationMinutes)} slot`
