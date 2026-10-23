import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, Clock3, Search, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useLocationContext } from '@/hooks/useLocation'
import { getAmenitySlotConfigAPI, type AmenitySlotConfigResponse } from '@/lib/services/amenitySlotService'
import { getPropertyByIdAPI } from '@/lib/services/propertyService'
import SlotManagerDrawer from '@/pages/Amenities/components/SlotManagerDrawer'
import { Input } from '@/components/ui/input'

interface AmenityItem {
  id: string
  name: string
  slotBookable: boolean
  description?: string | null
  availableFrom?: string | null
  availableTo?: string | null
}

const TIME_24_HOUR_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const toDayPeriodLabel = (time24: string): string | null => {
  if (!TIME_24_HOUR_REGEX.test(time24)) return null
  const [rawHour] = time24.split(':').map((part) => Number(part))
  const hour = Number.isFinite(rawHour) ? rawHour : 0

  if (hour >= 5 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 17) return 'Afternoon'
  if (hour >= 17 && hour < 21) return 'Evening'
  return 'Night'
}

const to12HourLabel = (time24: string): string | null => {
  if (!TIME_24_HOUR_REGEX.test(time24)) return null
  const [rawHour, rawMinute] = time24.split(':').map((part) => Number(part))
  const hour = Number.isFinite(rawHour) ? rawHour : 0
  const minute = Number.isFinite(rawMinute) ? rawMinute : 0
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

const readTimeWindow = (item: AmenityItem): string | null => {
  const from = item.availableFrom?.trim() || ''
  const to = item.availableTo?.trim() || ''
  const fromPeriod = toDayPeriodLabel(from)
  const toPeriod = toDayPeriodLabel(to)
  const fromLabel = to12HourLabel(from)
  const toLabel = to12HourLabel(to)
  if (!fromLabel || !toLabel || !fromPeriod || !toPeriod) return null
  return `${fromPeriod} (${fromLabel}) to ${toPeriod} (${toLabel})`
}

export default function AmenitiesPage() {
  const { selectedLocationId, selectedLocationName } = useLocationContext()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [propertyName, setPropertyName] = useState<string | null>(null)
  const [amenities, setAmenities] = useState<AmenityItem[]>([])
  const [slotConfigByAmenity, setSlotConfigByAmenity] = useState<Record<string, AmenitySlotConfigResponse>>({})
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityItem | null>(null)
  const [slotDrawerOpen, setSlotDrawerOpen] = useState(false)
  const displayPropertyName = selectedLocationId
    ? propertyName || selectedLocationName || null
    : selectedLocationName || null

  const readAmenities = (property: {
    amenities?: string[] | null
    propertyAmenities?: Array<{
      amenityId: string
      name: string
      slotBookable: boolean
      description?: string | null
      settings?: unknown
    }> | null
  }): AmenityItem[] => {
    if (property.propertyAmenities?.length) {
      return property.propertyAmenities.map((item) => ({
        id: item.amenityId,
        name: item.name,
        slotBookable: item.slotBookable,
        description: item.description,
        availableFrom:
          item.settings && typeof item.settings === 'object' && !Array.isArray(item.settings)
            ? ((item.settings as Record<string, unknown>).availableFrom as string | undefined) || null
            : null,
        availableTo:
          item.settings && typeof item.settings === 'object' && !Array.isArray(item.settings)
            ? ((item.settings as Record<string, unknown>).availableTo as string | undefined) || null
            : null,
      }))
    }

    return (property.amenities || []).map((name) => ({
      id: name.trim().toLowerCase(),
      name,
      slotBookable: false,
      description: null,
      availableFrom: null,
      availableTo: null,
    }))
  }

  useEffect(() => {
    if (!selectedLocationId) return

    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const property = await getPropertyByIdAPI(selectedLocationId)
        if (!mounted) return

        setPropertyName(property.property_name || selectedLocationName || null)

        const nextAmenities = readAmenities(property)
        setAmenities(nextAmenities)

        const slotAmenities = nextAmenities.filter((item) => item.slotBookable)
        if (slotAmenities.length > 0) {
          const slotConfigs = await Promise.all(
            slotAmenities.map(async (item) => {
              try {
                const config = await getAmenitySlotConfigAPI(selectedLocationId, item.id)
                return [item.id, config] as const
              } catch {
                return [item.id, { hasSetup: false, config: null }] as const
              }
            }),
          )
          if (!mounted) return
          setSlotConfigByAmenity(Object.fromEntries(slotConfigs))
        } else {
          setSlotConfigByAmenity({})
        }
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to load amenities')
        setAmenities([])
        setSlotConfigByAmenity({})
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [selectedLocationId, selectedLocationName])

  const filteredAmenities = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return amenities
    return amenities.filter(
      (item) => item.name.toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term),
    )
  }, [amenities, search])

  const slotCount = amenities.filter((item) => item.slotBookable).length

  const slotSummaryText = (item: AmenityItem): string => {
    const slotConfig = slotConfigByAmenity[item.id]
    if (slotConfig?.hasSetup && slotConfig.summary) {
      return `Open ${slotConfig.summary.openLabel} to ${slotConfig.summary.closeLabel} · ${slotConfig.summary.durationLabel} slots`
    }
    const fallbackWindow = readTimeWindow(item)
    return fallbackWindow ? `Open ${fallbackWindow}` : 'No slots set up yet. Open manager to add hours.'
  }

  const openSlotManager = (item: AmenityItem) => {
    if (!item.slotBookable || !selectedLocationId) return
    setSelectedAmenity(item)
    setSlotDrawerOpen(true)
  }

  const handleSlotConfigUpdated = useCallback((amenityId: string, config: AmenitySlotConfigResponse) => {
    setSlotConfigByAmenity((prev) => ({ ...prev, [amenityId]: config }))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        title="Amenities"
        description={`Amenities for ${displayPropertyName || 'selected property'}`}
      />

      {!selectedLocationId ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          Select a property to view amenities.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="gap-0 rounded-2xl border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total amenities</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{amenities.length}</p>
            </Card>
            <Card className="gap-0 rounded-2xl border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Slot-bookable</p>
              <p className="mt-1 text-2xl font-bold text-[#005390]">{slotCount}</p>
            </Card>
            <Card className="gap-0 rounded-2xl border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Property</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-800">{displayPropertyName || '—'}</p>
            </Card>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search amenities"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
            />
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Loading amenities...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : filteredAmenities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              {amenities.length === 0 ? 'No amenities added for this property yet.' : 'No amenities match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredAmenities.map((item) => {
                const timeWindow = readTimeWindow(item)
                return (
                  <Button
                    variant="ghost"
                    type="button"
                    key={item.id}
                    onClick={() => openSlotManager(item)}
                    className={`rounded-2xl border border-gray-200 bg-white p-4 h-auto text-left shadow-xs flex-col items-stretch justify-start whitespace-normal font-normal hover:bg-white ${
                      item.slotBookable
                        ? 'cursor-pointer transition hover:border-[#005390]/40 hover:shadow-sm'
                        : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.slotBookable ? 'bg-[#005390]/10 text-[#005390]' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.slotBookable ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        {item.slotBookable ? 'Slot' : 'Standard'}
                      </span>
                    </div>
                    {item.description ? <p className="mt-2 text-xs text-gray-500 w-full">{item.description}</p> : null}
                    {item.slotBookable ? (
                      <p className="mt-2 text-[11px] font-semibold text-[#005390] w-full">{slotSummaryText(item)}</p>
                    ) : timeWindow ? (
                      <p className="mt-2 text-[11px] font-semibold text-[#005390] w-full">Available: {timeWindow}</p>
                    ) : null}
                    {item.slotBookable ? (
                      <p className="mt-2 text-[11px] font-semibold text-[#005390] w-full">
                        Manage slots &amp; bookings
                      </p>
                    ) : null}
                    <p className="mt-3 flex items-center gap-1 text-[11px] text-gray-400 w-full">
                      <Building2 className="h-3.5 w-3.5" /> {displayPropertyName || 'Property'}
                    </p>
                  </Button>
                )
              })}
            </div>
          )}

          {selectedLocationId && selectedAmenity?.slotBookable ? (
            <SlotManagerDrawer
              open={slotDrawerOpen}
              onOpenChange={(isOpen) => {
                setSlotDrawerOpen(isOpen)
                if (!isOpen) setSelectedAmenity(null)
              }}
              amenity={selectedAmenity}
              locationId={selectedLocationId}
              onConfigUpdated={handleSlotConfigUpdated}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
