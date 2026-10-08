import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Edit, Eye, Layers, MapPin, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PROPERTY_TYPE_LABELS, type EntityInput, type Property } from './types'
import { ENTITY_PRESETS, levelLabel } from './components/structure/entityPresets'
import { deletePropertyAPI, getPropertiesAPI } from '@/lib/services/propertyService'
import { PageHeader } from '@/components/common/PageHeader'

/** "tower" → "towers", "duplex" → "duplexes". */
const plural = (word: string, n: number) =>
  n === 1 ? word.toLowerCase() : `${word.toLowerCase()}${/(x|s|ch|sh)$/i.test(word) ? 'es' : 's'}`

/** Counts that are actually visible for an entity (hidden blocks/floors are skipped). */
function entityCounts(entity: EntityInput) {
  const levels = entity.levels.join('>')
  const blocks = entity.blocks ?? []
  const floors = entity.floors ?? []
  const units =
    (entity.units?.length ?? 0) +
    floors.reduce((s, f) => s + (f.units?.length ?? 0), 0) +
    blocks.reduce(
      (s, b) => s + (b.units?.length ?? 0) + (b.floors ?? []).reduce((fs, f) => fs + (f.units?.length ?? 0), 0),
      0,
    )
  return {
    blocks: levels.startsWith('block') ? blocks.length : 0,
    floors:
      levels === 'block>floor>unit'
        ? blocks.reduce((s, b) => s + (b.floors?.length ?? 0), 0)
        : levels === 'floor>unit'
          ? floors.length
          : 0,
    units,
  }
}

/** "4 towers · 20 floors · 100 flats" */
function entityLine(entity: EntityInput) {
  const c = entityCounts(entity)
  return [
    c.blocks ? `${c.blocks} ${plural(levelLabel(entity, 'block'), c.blocks)}` : null,
    c.floors ? `${c.floors} ${plural(levelLabel(entity, 'floor'), c.floors)}` : null,
    `${c.units} ${plural(levelLabel(entity, 'unit'), c.units)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

const propertyUnits = (p: Property) => (p.entities ?? []).reduce((s, e) => s + entityCounts(e).units, 0)

/** "80,000 sqft", "60 acres" */
const formatArea = (p: Property) =>
  p.total_area
    ? `${Number(p.total_area).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${p.area_unit ?? 'sqft'}`
    : null

export default function PropertyPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const [search, setSearch] = useState('')

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
      <PageHeader
        icon={Building2}
        title="Properties"
        description="Manage your residential property portfolio & structure."
        actions={
          <>
            <Button
              id="add-property-btn"
              onClick={() => navigate('/property/create')}
              className="flex items-center gap-2 bg-[#005390] hover:bg-[#004274] text-white rounded-xl shadow-xs px-4 py-2 font-bold"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          </>
        }
      />

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
              value: properties.reduce((s, p) => s + propertyUnits(p), 0),
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
              onClick={() => navigate(`/property/${property.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/property/${property.id}`)}
              className="group relative rounded-3xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl hover:shadow-lg hover:border-[#005390]/30 transition-all duration-200 cursor-pointer"
            >
              {/* Header: name, kinds, location, actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#005390] shadow-md">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold leading-tight text-gray-900">{property.property_name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                      <MapPin className="h-3 w-3 shrink-0 text-[#005390]" />
                      {[property.city, property.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/property/${property.id}`)
                    }}
                    className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
                    title="View details"
                    aria-label={`View ${property.property_name}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/property/edit/${property.id}`)
                    }}
                    className="rounded-lg p-1.5 text-[#005390] transition-colors hover:bg-[#005390]/10"
                    title="Edit property"
                    aria-label={`Edit ${property.property_name}`}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(property.id, e)}
                    className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                    title="Delete property"
                    aria-label={`Delete ${property.property_name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(property.property_types ?? []).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-[#005390]/15 bg-[#005390]/5 px-2.5 py-0.5 text-[11px] font-semibold text-[#005390]"
                  >
                    {PROPERTY_TYPE_LABELS[t] ?? t}
                  </span>
                ))}
              </div>

              {/* Structure: one line per entity */}
              <div className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50/60">
                {(property.entities ?? []).length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-gray-400">No structure added yet</p>
                ) : (
                  (property.entities ?? []).map((entity) => {
                    const Icon = (ENTITY_PRESETS[entity.entity_type] ?? ENTITY_PRESETS.apartment).icon
                    return (
                      <div
                        key={entity.id ?? entity.name}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-gray-800">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-[#005390]" />
                          <span className="truncate">{entity.name}</span>
                        </span>
                        <span className="shrink-0 text-right text-[11px] text-gray-600">{entityLine(entity)}</span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Totals */}
              <div className="mt-4 flex items-end justify-between">
                <p className="text-xs text-gray-500">
                  <span className="text-xl font-bold text-gray-900">{propertyUnits(property)}</span> units in total
                </p>
                {formatArea(property) && <span className="text-xs text-gray-500">{formatArea(property)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
