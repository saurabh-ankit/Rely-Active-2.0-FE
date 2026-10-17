import { describe, expect, it } from 'vitest'
import type { AmenitySlotItem } from '@/lib/services/amenitySlotService'
import {
  computeSlotMetrics,
  formatMinutesAmPm,
  getAmenityOpenState,
  getZonedDateParts,
  isCurrentSlot,
} from './amenityTimeline'

const makeSlot = (overrides: Partial<AmenitySlotItem>): AmenitySlotItem => ({
  startMinutes: 8 * 60,
  startLabel: '8:00 AM',
  endMinutes: 9 * 60,
  endLabel: '9:00 AM',
  period: 'MORNING',
  status: 'AVAILABLE',
  capacity: 1,
  bookedCount: 0,
  remainingCount: 1,
  isPast: false,
  isBlocked: false,
  blockId: null,
  bookings: [],
  ...overrides,
})

describe('amenityTimeline utils', () => {
  it('formats minutes to 12-hour clock labels', () => {
    expect(formatMinutesAmPm(0)).toBe('12:00 AM')
    expect(formatMinutesAmPm(13 * 60 + 5)).toBe('1:05 PM')
  })

  it('computes open state with close/open labels', () => {
    const openState = getAmenityOpenState(
      {
        openMinutes: 7 * 60,
        closeMinutes: 22 * 60,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      },
      0,
      12 * 60,
    )
    expect(openState).toEqual({ isOpen: true, message: 'Open now - closes 10:00 PM' })
  })

  it('computes slot totals and next free start', () => {
    const metrics = computeSlotMetrics(
      [
        makeSlot({ startMinutes: 9 * 60, bookedCount: 1, capacity: 1, remainingCount: 0, status: 'BOOKED' }),
        makeSlot({ startMinutes: 10 * 60, bookedCount: 1, capacity: 2, remainingCount: 1, status: 'PARTIALLY_BOOKED' }),
        makeSlot({ startMinutes: 11 * 60, bookedCount: 0, capacity: 2, remainingCount: 2, status: 'AVAILABLE' }),
      ],
      9 * 60,
    )

    expect(metrics.totalBooked).toBe(2)
    expect(metrics.totalCapacity).toBe(5)
    expect(metrics.nextFreeStartMinutes).toBe(10 * 60)
  })

  it('marks current slot only while in range and not in past', () => {
    expect(isCurrentSlot(makeSlot({ startMinutes: 9 * 60, endMinutes: 10 * 60, isPast: false }), 9 * 60 + 15)).toBe(
      true,
    )
    expect(isCurrentSlot(makeSlot({ startMinutes: 9 * 60, endMinutes: 10 * 60, isPast: true }), 9 * 60 + 15)).toBe(
      false,
    )
  })

  it('reads date parts in provided timezone', () => {
    const parts = getZonedDateParts(new Date('2026-10-19T18:30:00Z'), 'Asia/Kolkata')
    expect(parts.ymd).toBe('2026-10-20')
    expect(parts.dayMon0).toBe(1)
  })
})
