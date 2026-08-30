import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, Edit, Eye, Layers, MapPin, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Property } from './types'
import { PROPERTY_TYPE_LABELS } from './types'
import { deletePropertyAPI, getPropertiesAPI } from '@/lib/services/propertyService'
import PropertyDetailDrawer from './components/PropertyDetailDrawer'

export default function PropertyPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  // ── Fetch properties ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    getPropertiesAPI()
      .then((data) => {
        if (!mounted) return
        setProperties(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (mounted) setProperties([])
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [reloadToken])

  // ── Delete property ────────────────────────────────────────────────────────
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this property?')) return
    try {
      await deletePropertyAPI(id)
      setReloadToken((t) => t + 1)
      if (selectedProperty?.id === id) setSelectedProperty(null)
    } catch {
      alert('Failed to delete property')
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = properties.filter((p) => {
    return (
      !search ||
      p.property_name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
    )
  })

  const totalUnits = (p: Property) =>
    p.blocks?.reduce((s, b) => {
      const floors = b.total_floors ?? b.floors?.length ?? 0
      const unitsPerFloor = b.units_per_floor ?? b.floors?.[0]?.units?.length ?? 0
      const calc = floors * unitsPerFloor
      if (calc > 0) return s + calc
      return s + (b.floors?.reduce((fs, f) => fs + (f.units?.length ?? 0), 0) ?? 0)
    }, 0) ?? 0

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-[#005390]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#005390] border-t-transparent" />
          <span className="text-sm font-medium">Loading properties...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Properties</h1>
          <p className="text-sm text-gray-500">Manage your residential property portfolio &amp; structure</p>
        </div>
        <Button
          id="add-property-btn"
          onClick={() => navigate('/property/create')}
          className="flex items-center gap-2 bg-[#005390] hover:bg-[#004274] text-white rounded-xl shadow-xs px-4 py-2 font-bold"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        {(
          [
            {
              label: 'Total Properties',
              value: properties.length,
              color: 'text-[#005390] bg-[#005390]/10',
              icon: Building2,
            },
            {
              label: 'Total Units',
              value: properties.reduce((s, p) => s + totalUnits(p), 0),
              color: 'text-[#002C7D] bg-[#002C7D]/10',
              icon: Layers,
            },
          ] as const
        ).map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] transition"
        />
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/50 p-16 text-center">
          <Building2 className="mx-auto h-14 w-14 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            {properties.length === 0 ? 'No Properties Yet' : 'No Results Found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {properties.length === 0
              ? 'Click "Add Property" to create your first property.'
              : 'Try adjusting your search query.'}
          </p>
          {properties.length === 0 && (
            <Button
              onClick={() => navigate('/property/create')}
              className="mt-6 rounded-xl bg-[#005390] hover:bg-[#004274] text-white font-bold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Property
            </Button>
          )}
        </div>
      )}

      {/* ── Property cards ──────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((property) => (
            <div
              key={property.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedProperty(property)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedProperty(property)}
              className="group relative rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl hover:shadow-lg hover:border-[#005390]/30 transition-all duration-200 cursor-pointer"
            >
              {/* Type badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#005390] flex items-center justify-center shadow-md">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{PROPERTY_TYPE_LABELS[property.property_type]}</p>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{property.property_name}</h3>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#005390]" />
                <span className="truncate">
                  {[property.city, property.state, property.pincode].filter(Boolean).join(', ')}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: 'Blocks', value: property.blocks?.length ?? 0 },
                  {
                    label: 'Floors',
                    value: property.blocks?.reduce((s, b) => s + (b.total_floors ?? b.floors?.length ?? 0), 0) ?? 0,
                  },
                  { label: 'Units', value: totalUnits(property) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-2 text-center">
                    <p className="text-base font-bold text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Area + launch */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                {property.total_area ? (
                  <span className="text-xs text-gray-500">
                    {property.total_area} {property.area_unit ?? 'sqft'}
                  </span>
                ) : (
                  <span />
                )}
                {property.launch_date && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(property.launch_date).getFullYear()}
                  </span>
                )}
              </div>

              {/* Hover actions */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/property/edit/${property.id}`)
                  }}
                  className="p-1.5 rounded-lg bg-[#005390]/10 text-[#005390] hover:bg-[#005390]/20 transition-colors"
                  title="Edit property"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedProperty(property)
                  }}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  title="View details"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(property.id, e)}
                  className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                  title="Delete property"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail drawer ────────────────────────────────────────────────────── */}
      <PropertyDetailDrawer
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onEdit={(p) => navigate(`/property/edit/${p.id}`)}
      />
    </div>
  )
}
