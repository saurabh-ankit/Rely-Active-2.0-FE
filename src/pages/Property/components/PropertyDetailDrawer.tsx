import { useState } from 'react'
import {
  Building2,
  CalendarDays,
  Edit,
  HelpCircle,
  Layers,
  MapPin,
  Maximize2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Property } from '../types'
import { PROPERTY_TYPE_LABELS } from '../types'

interface PropertyDetailDrawerProps {
  property: Property | null
  onClose: () => void
  onEdit?: (property: Property) => void
}

export default function PropertyDetailDrawer({
  property,
  onClose,
  onEdit,
}: PropertyDetailDrawerProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)

  if (!property) return null

  const selectedBlock =
    property.blocks?.find((b) => b.id === activeBlockId) || property.blocks?.[0]

  const totalUnits =
    property.blocks?.reduce(
      (sum, b) =>
        sum + (b.floors?.reduce((fsum, f) => fsum + (f.units?.length ?? 0), 0) ?? 0),
      0,
    ) ?? 0

  const availableUnits =
    property.blocks?.reduce(
      (sum, b) =>
        sum +
        (b.floors?.reduce(
          (fsum, f) =>
            fsum +
            (f.units?.filter((u) => u.status === 'available').length ?? 0),
          0,
        ) ?? 0),
      0,
    ) ?? 0

  const soldUnits =
    property.blocks?.reduce(
      (sum, b) =>
        sum +
        (b.floors?.reduce(
          (fsum, f) =>
            fsum + (f.units?.filter((u) => u.status === 'sold').length ?? 0),
          0,
        ) ?? 0),
      0,
    ) ?? 0

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

      {/* Drawer Panel */}
      <div className="relative z-10 w-full max-w-3xl h-full bg-slate-50 shadow-2xl flex flex-col overflow-hidden border-l border-gray-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{property.property_name}</h2>
              </div>
              <p className="text-xs text-gray-500">
                {PROPERTY_TYPE_LABELS[property.property_type]} • {[property.city, property.state].filter(Boolean).join(', ')}
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
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 shadow-xs"
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
              <div key={label} className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-xs">
                <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center mx-auto mb-1`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Tower Selector & Visual Matrix Grid (Matching Screenshot) */}
          {property.blocks && property.blocks.length > 0 && (
            <div className="space-y-4">
              {/* Block Selector Tabs */}
              {property.blocks.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {property.blocks.map((b) => {
                    const isSelected = selectedBlock?.id === b.id
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => setActiveBlockId(b.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {b.block_name}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Tower Header Info Container (Matching Screenshot) */}
              {selectedBlock && (
                <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                  {/* Tower Header */}
                  <div className="flex items-center justify-between px-6 py-4 bg-sky-50/60 border-b border-sky-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-bold text-gray-900">{selectedBlock.block_name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-100 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-800">
                        {selectedBlock.floors?.length || 0} floors
                      </span>
                      <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                        {selectedBlock.floors?.reduce(
                          (s, f) =>
                            s + (f.units?.filter((u) => u.status === 'available').length ?? 0),
                          0,
                        ) || 0}{' '}
                        available
                      </span>
                      <span className="rounded-full bg-rose-100 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-800">
                        {selectedBlock.floors?.reduce(
                          (s, f) =>
                            s + (f.units?.filter((u) => u.status === 'sold').length ?? 0),
                          0,
                        ) || 0}{' '}
                        sold
                      </span>
                    </div>
                  </div>

                  {/* Visual Floor Grid (Ordered top floor to ground floor) */}
                  <div className="p-6 space-y-4 bg-slate-50/50">
                    {selectedBlock.floors && selectedBlock.floors.length > 0 ? (
                      [...selectedBlock.floors]
                        .sort((a, b) => b.floor_number - a.floor_number)
                        .map((floor) => {
                          const isGround =
                            floor.floor_number === 1 || floor.floor_type === 'GROUND_FLOOR'

                          return (
                            <div
                              key={floor.id}
                              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                {/* Left Floor Label */}
                                <div className="w-24 shrink-0 pt-1">
                                  <h4 className="text-xs font-bold text-gray-800">
                                    Floor {floor.floor_number}
                                  </h4>
                                  {floor.floor_name && (
                                    <p className="text-[10px] text-gray-400 font-medium">
                                      {floor.floor_name}
                                    </p>
                                  )}
                                </div>

                                {/* Right Unit Matrix */}
                                <div className="flex-1">
                                  {isGround ? (
                                    <div className="w-full rounded-xl border border-blue-200 bg-blue-50/60 text-blue-700 font-bold py-4 text-center text-xs tracking-wider uppercase shadow-2xs">
                                      GROUND FLOOR
                                    </div>
                                  ) : floor.units && floor.units.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                      {floor.units.map((unit) => {
                                        const isSold = unit.status === 'sold'
                                        const isBooked = unit.status === 'booked'

                                        return (
                                          <div
                                            key={unit.id}
                                            className={`rounded-xl border p-2.5 space-y-1 transition-all ${
                                              isSold
                                                ? 'bg-rose-50/80 border-rose-300 text-rose-900'
                                                : isBooked
                                                  ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                                                  : 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:shadow-xs'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-extrabold tracking-tight">
                                                {unit.unit_number}
                                              </span>
                                              <HelpCircle className="h-3.5 w-3.5 opacity-60" />
                                            </div>
                                            <p className="text-[10px] font-medium opacity-90 truncate">
                                              {unit.unit_type} •{' '}
                                              {unit.status.charAt(0).toUpperCase() +
                                                unit.status.slice(1)}
                                            </p>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic py-2">
                                      No units configured for this floor
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-6">
                        No floors available for this tower.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Address Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              <MapPin className="h-4 w-4 text-blue-600" /> Address Details
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
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Amenities
              </h3>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1"
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
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                Description
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">{property.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
