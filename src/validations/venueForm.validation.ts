import { z } from 'zod'
import type { LocationGlobalService } from '@/lib/services/globalServiceService'
import type { SelectedVenueService } from '@/lib/services/globalServiceService'

export const selectedVenueServiceSchema = z.object({
  id: z.string(),
  quantity: z.number().int(),
})

export const venueImageSchema = z.object({
  url: z.string().optional(),
  caption: z.string().optional(),
})

export const venueFormBaseSchema = z.object({
  name: z.string().trim().min(1, 'Venue name is required'),
  occupancy: z.number({ error: 'Occupancy must be a number' }).int().positive('Occupancy must be greater than 0'),
  price: z.number().min(0),
  keyFeatures: z.string().trim().min(1, 'Key features are required'),
  otherServices: z.string().optional(),
  images: z.array(venueImageSchema),
  selectedServices: z.array(selectedVenueServiceSchema),
})

export type VenueFormValues = z.infer<typeof venueFormBaseSchema>

export interface VenueServiceValidationContext {
  locationServices: LocationGlobalService[]
  editingAllocations?: Record<string, number>
}

export function validateVenueSelectedServices(
  selectedServices: SelectedVenueService[],
  ctx: VenueServiceValidationContext,
): string | null {
  for (const item of selectedServices) {
    const service = ctx.locationServices.find((s) => s.id === item.id)
    if (!service) continue
    if (!item.quantity || item.quantity < 1) {
      return `Quantity must be at least 1 for service "${service.name}"`
    }
    const editingBonus = ctx.editingAllocations?.[item.id] ?? 0
    const maxQty = (service.availableQuantity ?? service.locationQuantity ?? 1) + editingBonus
    if (item.quantity > maxQty) {
      return `Quantity for "${service.name}" exceeds available stock (${maxQty} remaining)`
    }
  }
  return null
}

export function createVenueFormSchema(ctx: VenueServiceValidationContext) {
  return venueFormBaseSchema.superRefine((data, refineCtx) => {
    const serviceError = validateVenueSelectedServices(data.selectedServices || [], ctx)
    if (serviceError) {
      refineCtx.addIssue({
        code: 'custom',
        message: serviceError,
        path: ['selectedServices'],
      })
    }
  })
}

export const venueFormDefaultValues: VenueFormValues = {
  name: '',
  occupancy: 0,
  price: 0,
  keyFeatures: '',
  otherServices: '',
  images: [],
  selectedServices: [],
}
