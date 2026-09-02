import { useMemo, useState } from 'react'
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
import {
  getServiceTotalPrice,
  type LocationGlobalService,
  type SelectedVenueService,
} from '@/lib/services/globalServiceService'

interface VenueAddOnServicesSelectProps {
  services: LocationGlobalService[]
  isLoading?: boolean
  selectedItems: SelectedVenueService[]
  onChange: (items: SelectedVenueService[]) => void
  /** When editing, add back the current venue's allocation to available stock */
  editingAllocations?: Record<string, number>
}

export function VenueAddOnServicesSelect({
  services,
  isLoading = false,
  selectedItems,
  onChange,
  editingAllocations = {},
}: VenueAddOnServicesSelectProps) {
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({})

  const selectedServices = useMemo(
    () =>
      selectedItems
        .map((item) => {
          const service = services.find((s) => s.id === item.id)
          return service ? { service, quantity: item.quantity } : null
        })
        .filter((entry): entry is { service: LocationGlobalService; quantity: number } => !!entry),
    [selectedItems, services],
  )

  const getMaxQuantity = (service: LocationGlobalService): number => {
    const editingBonus = editingAllocations[service.id] ?? 0
    return (service.availableQuantity ?? service.locationQuantity ?? 1) + editingBonus
  }

  const handleSelectionChange = (vals: LocationGlobalService[]) => {
    const nextIds = vals.map((v) => v.id)
    const newlyAdded = nextIds.filter((id) => !selectedItems.some((item) => item.id === id))
    const kept = selectedItems.filter((item) => nextIds.includes(item.id))
    const added = newlyAdded.map((id) => ({ id, quantity: 1 }))
    onChange([...added, ...kept])
  }

  const removeService = (serviceId: string) => {
    setQuantityErrors((prev) => {
      if (!prev[serviceId]) return prev
      const next = { ...prev }
      delete next[serviceId]
      return next
    })
    onChange(selectedItems.filter((item) => item.id !== serviceId))
  }

  const updateQuantity = (serviceId: string, rawValue: string, maxQty: number) => {
    const parsed = parseInt(rawValue, 10)
    const nextQty = Number.isNaN(parsed) || rawValue.trim() === '' ? 1 : parsed

    if (nextQty > maxQty) {
      setQuantityErrors((prev) => ({
        ...prev,
        [serviceId]: `Maximum available is ${maxQty}`,
      }))
      onChange(selectedItems.map((item) => (item.id === serviceId ? { ...item, quantity: maxQty } : item)))
      return
    }

    setQuantityErrors((prev) => {
      if (!prev[serviceId]) return prev
      const next = { ...prev }
      delete next[serviceId]
      return next
    })

    onChange(selectedItems.map((item) => (item.id === serviceId ? { ...item, quantity: Math.max(1, nextQty) } : item)))
  }

  const formatPrice = (price: number) => `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="mb-1.5">Add-On Services</Label>
        <div className="h-9 rounded-xl border border-gray-200 bg-gray-50 px-3.5 flex items-center text-xs text-gray-400">
          Loading services...
        </div>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="mb-1.5">Add-On Services</Label>
        <p className="text-xs text-gray-500 leading-relaxed rounded-xl border border-gray-200 bg-gray-50 p-3">
          No services available for this location. Assign services in Global Settings → Global Services.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Label className="mb-1.5">Add-On Services</Label>

      <Combobox
        multiple
        items={services}
        value={selectedServices.map((entry) => entry.service)}
        onValueChange={handleSelectionChange}
        itemToStringLabel={(item) => item.name}
        isItemEqualToValue={(a, b) => a.id === b.id}
      >
        <ComboboxInput placeholder="Search services..." className="w-full rounded-xl" showTrigger />
        <ComboboxContent side="bottom" align="start" className="w-[var(--anchor-width)]">
          <ComboboxList className="max-h-60">
            {(service: LocationGlobalService) => (
              <ComboboxItem key={service.id} value={service} className="text-xs py-2">
                <div className="flex flex-1 items-center justify-between gap-3 min-w-0 pr-6">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-gray-900">{service.name}</span>
                    {service.description && (
                      <span className="text-[11px] text-gray-400 line-clamp-1">{service.description}</span>
                    )}
                    <span className="text-[10px] text-gray-500">Available: {getMaxQuantity(service)}</span>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-[#005390]">
                    {formatPrice(service.locationPrice)}
                  </span>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty className="text-xs text-gray-500 py-2">No services found</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>

      {selectedServices.length > 0 && (
        <div className="space-y-2">
          {selectedServices.map(({ service, quantity }) => {
            const maxQty = getMaxQuantity(service)
            const total = getServiceTotalPrice(service.locationPrice, quantity)
            const qtyError = quantityErrors[service.id]
            return (
              <div
                key={service.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{service.name}</div>
                  {service.description && (
                    <div className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{service.description}</div>
                  )}
                  <div className="text-[10px] text-gray-500 mt-0.5">Available: {maxQty}</div>
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
                        onChange={(e) => updateQuantity(service.id, e.target.value, maxQty)}
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
                  <div className="text-right min-w-[90px]">
                    <div className="text-[10px] text-gray-400">
                      {formatPrice(service.locationPrice)} × {quantity}
                    </div>
                    <div className="text-sm font-bold text-[#005390]">{formatPrice(total)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeService(service.id)}
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

export default VenueAddOnServicesSelect
