import { useEffect, useState } from 'react'
import { Building2, CalendarDays, Edit, Layers, MapPin, Maximize2, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Property } from '../types'
import { PROPERTY_TYPE_LABELS } from '../types'
import type { ResidentItem } from '@/lib/types'
import { residentService } from '@/lib/services/residentService'

interface PropertyDetailDrawerProps {
  property: Property | null
  onClose: () => void
  onEdit?: (property: Property) => void
}

export default function PropertyDetailDrawer({ property, onClose, onEdit }: PropertyDetailDrawerProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [residents, setResidents] = useState<ResidentItem[]>([])

  useEffect(() => {
    let isMounted = true
    if (property?.id) {
      residentService
        .getResidents({ locId: property.id })
        .then((resList) => {
          if (isMounted) setResidents(resList)
        })
        .catch((err: unknown) => {
          console.error('Failed to load residents for property detail drawer:', err)
        })
    }
    return () => {
      isMounted = false
    }
  }, [property?.id])

  if (!property) return null

  const selectedBlock = property.blocks?.find((b) => b.id === activeBlockId) || property.blocks?.[0]

  const totalUnits =
    property.blocks?.reduce((sum, b) => {
      const floors = b.total_floors ?? b.floors?.length ?? 0
      const unitsPerFloor = b.units_per_floor ?? b.floors?.[0]?.units?.length ?? 0
      const calc = floors * unitsPerFloor
      if (calc > 0) return sum + calc
      return sum + (b.floors?.reduce((fsum, f) => fsum + (f.units?.length ?? 0), 0) ?? 0)
    }, 0) ?? 0

  const availableUnits =
    property.blocks?.reduce(
      (sum, b) =>
        sum +
        (b.floors?.reduce((fsum, f) => fsum + (f.units?.filter((u) => u.status === 'available').length ?? 0), 0) ?? 0),
      0,
    ) ?? 0

  const soldUnits =
    property.blocks?.reduce(
      (sum, b) =>
        sum + (b.floors?.reduce((fsum, f) => fsum + (f.units?.filter((u) => u.status === 'sold').length ?? 0), 0) ?? 0),
      0,
    ) ?? 0

  // Helper to determine precise unit occupancy status (Owner / Tenant / Off-site / Available / Sold)
  const getUnitOccupancyInfo = (unitId: string, baseStatus: string) => {
    const activeResidents = residents.filter(
      (r) => r.unitId === unitId && r.status !== 'INACTIVE' && r.status !== 'MOVED_OUT',
    )

    const residingTenant = activeResidents.find((r) => r.residentType === 'TENANT' && r.isResiding)
    if (residingTenant) {
      return {
        label: 'Occupied (Tenant)',
        badgeText: 'Tenant',
        residentName: `${residingTenant.firstName} ${residingTenant.lastName || ''}`.trim(),
        cardClass:
          'bg-purple-50 border-purple-300 text-purple-950 shadow-2xs hover:border-purple-400 dark:bg-purple-950/60 dark:border-purple-800 dark:text-purple-200',
        badgeClass:
          'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700',
      }
    }

    const residingOwner = activeResidents.find((r) => r.residentType === 'OWNER' && r.isResiding)
    if (residingOwner) {
      return {
        label: 'Occupied (Owner)',
        badgeText: 'Owner',
        residentName: `${residingOwner.firstName} ${residingOwner.lastName || ''}`.trim(),
        cardClass:
          'bg-blue-50 border-blue-300 text-blue-950 shadow-2xs hover:border-blue-400 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-200',
        badgeClass:
          'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700',
      }
    }

    const offsiteOwner = activeResidents.find((r) => r.residentType === 'OWNER' && !r.isResiding)
    if (offsiteOwner) {
      return {
        label: 'Off-site Owner',
        badgeText: 'Off-site',
        residentName: `${offsiteOwner.firstName} ${offsiteOwner.lastName || ''}`.trim(),
        cardClass:
          'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs hover:border-amber-400 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200',
        badgeClass:
          'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700',
      }
    }

    if (baseStatus === 'sold') {
      return {
        label: 'Sold',
        badgeText: 'Sold',
        residentName: null,
        cardClass:
          'bg-rose-50/80 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200',
        badgeClass:
          'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900 dark:text-rose-300 dark:border-rose-700',
      }
    }

    if (baseStatus === 'booked') {
      return {
        label: 'Booked',
        badgeText: 'Booked',
        residentName: null,
        cardClass:
          'bg-amber-50/80 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200',
        badgeClass:
          'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700',
      }
    }

    return {
      label: 'Available',
      badgeText: 'Available',
      residentName: null,
      cardClass:
        'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:shadow-xs dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200',
      badgeClass:
        'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-700',
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />

      {/* Drawer Panel - Full View */}
      <div className="relative z-10 w-full max-w-6xl h-full bg-slate-50 shadow-2xl flex flex-col overflow-hidden border-l border-gray-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#005390] flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{property.property_name}</h2>
              </div>
              <p className="text-xs text-gray-500">
                {PROPERTY_TYPE_LABELS[property.property_type]} •{' '}
                {[property.city, property.state].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                type="button"
                onClick={() => {
                  onEdit(property)
                  onClose()
                }}
                className="flex items-center gap-1.5 rounded-xl bg-[#005390] hover:bg-[#004274] text-white font-bold text-xs px-3.5 py-2 shadow-xs"
              >
                <Edit className="h-3.5 w-3.5" /> Edit Property
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                icon: Layers,
                label: 'Blocks',
                value: property.blocks?.length ?? 0,
                color: 'text-blue-600 bg-blue-50',
              },
              {
                icon: Building2,
                label: 'Total Units',
                value: totalUnits,
                color: 'text-indigo-600 bg-indigo-50',
              },
              {
                icon: CalendarDays,
                label: 'Available',
                value: availableUnits,
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                icon: Maximize2,
                label: 'Sold',
                value: soldUnits,
                color: 'text-rose-600 bg-rose-50',
              },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <h4 className="text-lg font-bold text-gray-900">{value}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Towers Breakdown */}
          {property.blocks && property.blocks.length > 0 && (
            <div className="space-y-4">
              {/* Block Tabs */}
              {property.blocks.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {property.blocks.map((b) => {
                    const isSelected = b.id === (selectedBlock?.id || property.blocks?.[0]?.id)
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setActiveBlockId(b.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#005390] border-[#005390] text-white shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {b.block_name}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Tower Header Info Container */}
              {selectedBlock && (
                <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                  {/* Tower Header */}
                  <div className="flex items-center justify-between px-6 py-4 bg-[#005390]/5 border-b border-[#005390]/10">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[#005390]" />
                      <h3 className="text-base font-bold text-gray-900">{selectedBlock.block_name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#005390]/10 border border-[#005390]/20 px-3 py-1 text-xs font-bold text-[#005390]">
                        {selectedBlock.floors?.length || 0} floors
                      </span>
                      <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                        {selectedBlock.floors?.reduce(
                          (s, f) => s + (f.units?.filter((u) => u.status === 'available').length ?? 0),
                          0,
                        ) || 0}{' '}
                        available
                      </span>
                      <span className="rounded-full bg-rose-100 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-800">
                        {selectedBlock.floors?.reduce(
                          (s, f) => s + (f.units?.filter((u) => u.status === 'sold').length ?? 0),
                          0,
                        ) || 0}{' '}
                        sold
                      </span>
                    </div>
                  </div>

                  {/* Visual Floor Grid */}
                  <div className="p-6 space-y-4 bg-slate-50/50">
                    {/* Visual Color Legend Bar */}
                    <div className="flex flex-wrap items-center gap-3 px-1 py-1.5 text-xs font-semibold text-gray-600 border-b border-gray-200/60 pb-3">
                      <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                        Unit Status Legend:
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Available
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        Occupied (Owner)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                        Occupied (Tenant)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        Off-site Owner
                      </span>
                    </div>

                    {selectedBlock.floors && selectedBlock.floors.length > 0 ? (
                      [...selectedBlock.floors]
                        .sort((a, b) => b.floor_number - a.floor_number)
                        .map((floor) => {
                          const isSellableFloor = floor.is_sellable !== false && floor.units && floor.units.length > 0

                          return (
                            <div
                              key={floor.id}
                              className={`rounded-2xl border p-4 shadow-xs transition-all ${
                                isSellableFloor
                                  ? 'border-gray-200 bg-white'
                                  : 'border-gray-200/80 bg-gray-100/70 opacity-75'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                {/* Left Floor Label */}
                                <div className="w-24 shrink-0 pt-1">
                                  <h4 className="text-xs font-bold text-gray-800">Floor {floor.floor_number}</h4>
                                  {floor.floor_name && (
                                    <p className="text-[10px] text-gray-400 font-medium">{floor.floor_name}</p>
                                  )}
                                </div>

                                {/* Right Unit Matrix */}
                                <div className="flex-1">
                                  {floor.units && floor.units.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                                      {floor.units.map((unit) => {
                                        const occInfo = getUnitOccupancyInfo(unit.id, unit.status)

                                        return (
                                          <div
                                            key={unit.id}
                                            className={`rounded-xl border p-2.5 space-y-1 transition-all ${occInfo.cardClass}`}
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="text-xs font-extrabold tracking-tight truncate">
                                                {unit.unit_number}
                                              </span>
                                              <span
                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${occInfo.badgeClass}`}
                                              >
                                                {occInfo.badgeText}
                                              </span>
                                            </div>
                                            <p className="text-[10px] font-medium opacity-90 truncate">
                                              {unit.unit_type} • {occInfo.label}
                                            </p>
                                            {occInfo.residentName && (
                                              <p className="text-[9px] font-bold text-gray-700 dark:text-gray-300 truncate mt-0.5 flex items-center gap-1">
                                                <User className="w-2.5 h-2.5 shrink-0" />
                                                <span className="truncate">{occInfo.residentName}</span>
                                              </p>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <div className="w-full rounded-xl border border-gray-200 bg-gray-100/70 text-gray-500 font-semibold py-3 px-4 text-center text-xs tracking-wider uppercase opacity-75">
                                      Non-Sellable Floor ({floor.floor_name || `Floor ${floor.floor_number}`})
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-6">No floors available for this tower.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Address Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              <MapPin className="h-4 w-4 text-[#005390]" /> Address Details
            </h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              {[property.street, property.city, property.state, property.pincode, property.country]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>

          {/* Amenities Card */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-[#005390]/10 border border-[#005390]/20 text-[#005390] text-xs font-semibold px-3 py-1"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {property.description && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">Description</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{property.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
