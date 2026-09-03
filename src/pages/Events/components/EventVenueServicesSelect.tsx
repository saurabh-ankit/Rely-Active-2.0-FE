import { useState } from 'react'
import { X } from 'lucide-react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import type { AddOnService } from '@/lib/services/eventService'
import { getServiceTotalPrice } from '@/lib/services/eventService'
import { getAddOnServiceKey } from '@/utils/event.utils'

interface EventVenueServicesSelectProps {
  services: AddOnService[]
  selectedServices: AddOnService[]
  onChange: (services: AddOnService[]) => void
}

export function EventVenueServicesSelect({ services, selectedServices, onChange }: EventVenueServicesSelectProps) {
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({})

  const handleSelectionChange = (vals: AddOnService[]) => {
    const nextKeys = vals.map(getAddOnServiceKey)
    const existingMap = new Map(selectedServices.map((s) => [getAddOnServiceKey(s), s.quantity ?? 1]))
    const newlyAdded = nextKeys.filter((key) => !existingMap.has(key))
    const kept = selectedServices.filter((s) => nextKeys.includes(getAddOnServiceKey(s)))
    const added = newlyAdded
      .map((key) => services.find((s) => getAddOnServiceKey(s) === key))
      .filter((s): s is AddOnService => !!s)
      .map((service) => ({ ...service, quantity: 1 }))
    onChange([...added, ...kept])
  }

  const removeService = (serviceKey: string) => {
    setQuantityErrors((prev) => {
      if (!prev[serviceKey]) return prev
      const next = { ...prev }
      delete next[serviceKey]
      return next
    })
    onChange(selectedServices.filter((s) => getAddOnServiceKey(s) !== serviceKey))
  }

  const updateQuantity = (serviceKey: string, rawValue: string, maxQty: number) => {
    const parsed = parseInt(rawValue, 10)
    const nextQty = Number.isNaN(parsed) || rawValue.trim() === '' ? 1 : parsed

    if (nextQty > maxQty) {
      setQuantityErrors((prev) => ({
        ...prev,
        [serviceKey]: `Maximum allowed is ${maxQty}`,
      }))
      onChange(selectedServices.map((s) => (getAddOnServiceKey(s) === serviceKey ? { ...s, quantity: maxQty } : s)))
      return
    }

    setQuantityErrors((prev) => {
      if (!prev[serviceKey]) return prev
      const next = { ...prev }
      delete next[serviceKey]
      return next
    })

    onChange(
      selectedServices.map((s) =>
        getAddOnServiceKey(s) === serviceKey ? { ...s, quantity: Math.max(1, nextQty) } : s,
      ),
    )
  }

  const getMaxQuantity = (service: AddOnService): number => {
    const venueService = services.find((s) => getAddOnServiceKey(s) === getAddOnServiceKey(service))
    return venueService?.quantity ?? 1
  }

  const formatPrice = (price?: number) => {
    if (price == null) return null
    return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  if (services.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="mb-1.5">Services</Label>
        <p className="text-xs text-gray-500 leading-relaxed rounded-xl border border-gray-200 bg-gray-50 p-3">
          No services for this venue.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Label className="mb-1.5">Services</Label>

      <Combobox
        multiple
        items={services}
        value={selectedServices}
        onValueChange={handleSelectionChange}
        itemToStringLabel={(item) => item.name}
        isItemEqualToValue={(a, b) => getAddOnServiceKey(a) === getAddOnServiceKey(b)}
      >
        <ComboboxInput placeholder="Select services..." className="w-full rounded-xl" showTrigger />
        <ComboboxContent side="bottom" align="start" className="w-[var(--anchor-width)]">
          <ComboboxList className="max-h-60">
            {(service: AddOnService) => (
              <ComboboxItem key={getAddOnServiceKey(service)} value={service} className="text-xs py-2">
                <div className="flex flex-1 items-center justify-between gap-3 min-w-0 pr-6">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-gray-900">{service.name}</span>
                    {service.keyFeatures && (
                      <span className="text-[11px] text-gray-400 line-clamp-1">{service.keyFeatures}</span>
                    )}
                    <span className="text-[10px] text-gray-500">Max: {service.quantity ?? 1} for this venue</span>
                  </div>
                  {formatPrice(service.price) && (
                    <span className="shrink-0 text-[11px] font-bold text-[#005390]">{formatPrice(service.price)}</span>
                  )}
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty className="text-xs text-gray-500 py-2">No services found</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>

      {selectedServices.length > 0 && (
        <div className="space-y-2">
          {selectedServices.map((service) => {
            const key = getAddOnServiceKey(service)
            const quantity = service.quantity ?? 1
            const maxQty = getMaxQuantity(service)
            const total = getServiceTotalPrice(service.price, quantity)
            const qtyError = quantityErrors[key]
            return (
              <div
                key={key}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{service.name}</div>
                  {service.keyFeatures && (
                    <div className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{service.keyFeatures}</div>
                  )}
                  <div className="text-[10px] text-gray-500 mt-0.5">Max: {maxQty} for this venue</div>
                </div>
                <div className="flex items-start gap-2 shrink-0">
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-500 font-medium">Qty</span>
                      <input
                        type="number"
                        min={1}
                        max={maxQty}
                        step={1}
                        value={quantity}
                        onChange={(e) => updateQuantity(key, e.target.value, maxQty)}
                        className={`w-14 rounded-lg border px-2 py-1 text-xs font-bold text-center focus:outline-none focus:ring-1 ${
                          qtyError
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                            : 'border-gray-200 focus:border-[#005390] focus:ring-[#005390]/20'
                        }`}
                      />
                    </div>
                    {qtyError && (
                      <span className="text-[10px] text-rose-600 font-medium max-w-[120px] text-right leading-tight">
                        {qtyError}
                      </span>
                    )}
                  </div>
                  {formatPrice(service.price) && (
                    <div className="text-right min-w-[90px]">
                      <div className="text-[10px] text-gray-400">
                        {formatPrice(service.price)} × {quantity}
                      </div>
                      <div className="text-sm font-bold text-[#005390]">{formatPrice(total)}</div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeService(key)}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    aria-label={`Remove ${service.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default EventVenueServicesSelect
