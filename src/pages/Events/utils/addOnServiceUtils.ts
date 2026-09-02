import type { AddOnService } from '@/lib/services/eventService'

export const getAddOnServiceKey = (service: AddOnService): string => service.globalServiceId || service.name
