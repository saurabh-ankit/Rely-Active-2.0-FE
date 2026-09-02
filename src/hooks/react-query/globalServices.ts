import { useQuery } from '@tanstack/react-query'
import { getLocationGlobalServicesAPI, type LocationGlobalService } from '@/lib/services/globalServiceService'
import { useLocationStore } from '@/lib/stores/locationStore'

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

export const useLocationGlobalServices = () => {
  const locationId = useLocationId()

  return useQuery({
    queryKey: ['location-global-services', locationId],
    queryFn: async () => {
      const res = await getLocationGlobalServicesAPI(locationId!)
      const data = res?.data
      const list = (Array.isArray(data) ? data : []) as LocationGlobalService[]
      return list.map((service) => ({
        ...service,
        locationQuantity: service.locationQuantity ?? 1,
        allocatedQuantity: service.allocatedQuantity ?? 0,
        availableQuantity:
          service.availableQuantity ?? Math.max(0, (service.locationQuantity ?? 1) - (service.allocatedQuantity ?? 0)),
      }))
    },
    enabled: !!locationId,
  })
}
