import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { AddOnService } from '@/lib/services/eventService'

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

const formatUrl = (template: string, locationId: string) => template.replace(':locationId', locationId)

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
