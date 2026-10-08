import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Building2, CalendarDays, Edit, Home, Layers, MapPin, Phone, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { getPropertyByIdAPI } from '@/lib/services/propertyService'
import { cn, getFileUrl } from '@/lib/utils'
import { ENTITY_PRESETS, levelLabel } from './components/structure/entityPresets'
import { formatPropertyTypes, type EntityInput, type Property } from './types'

// ─── Unit status ──────────────────────────────────────────────────────────────

interface UnitResident {
  id?: string
  phone?: string | null
  photoUrl?: string | null
  moveInDate?: string | null
  firstName?: string
  lastName?: string | null
  residentType?: string
  isResiding?: boolean
  status?: string
  isDeleted?: boolean
}

/** A unit as the details API returns it: the editable fields plus id, status and residents. */
interface ViewUnit {
  id?: string
  unit_number: string
  unit_type?: string
  status?: string
  price?: number | string | null
  built_up_area?: number | string | null
  carpet_area?: number | string | null
  residents?: UnitResident[]
}

type UnitStatus = 'available' | 'owner' | 'tenant' | 'offsite' | 'sold'

const STATUS_STYLES: Record<UnitStatus, { label: string; cell: string; dot: string }> = {
  available: { label: 'Available', cell: 'border-emerald-300 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  owner: { label: 'Owner living', cell: 'border-blue-300 bg-blue-100 text-blue-900', dot: 'bg-blue-500' },
  tenant: { label: 'Tenant living', cell: 'border-purple-300 bg-purple-100 text-purple-900', dot: 'bg-purple-500' },
  offsite: { label: 'Owner off-site', cell: 'border-amber-300 bg-amber-50 text-amber-900', dot: 'bg-amber-500' },
  sold: { label: 'Sold / booked', cell: 'border-rose-300 bg-rose-50 text-rose-800', dot: 'bg-rose-500' },
}

const activeResidents = (unit: ViewUnit) =>
  (unit.residents ?? []).filter((r) => !r.isDeleted && r.status !== 'INACTIVE' && r.status !== 'MOVED_OUT')

function unitStatus(unit: ViewUnit): UnitStatus {
  const people = activeResidents(unit)
  if (people.some((r) => r.residentType === 'TENANT' && r.isResiding)) return 'tenant'
  if (people.some((r) => r.residentType === 'OWNER' && r.isResiding)) return 'owner'
  if (people.some((r) => r.residentType === 'OWNER' && !r.isResiding)) return 'offsite'
  if (unit.status === 'sold' || unit.status === 'booked') return 'sold'
  return 'available'
}

const formatPrice = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0)
  if (!amount) return null
  return amount >= 1e7 ? `₹${(amount / 1e7).toFixed(2)} Cr` : `₹${(amount / 1e5).toFixed(2)} L`
}

const fullName = (r: UnitResident) => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Resident'

const formatDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * A unit cell that shows a card on hover/focus: the unit's details and who lives there
 * (photo, role, residing or off-site, phone, move-in date, link to the profile).
 */
function UnitHover({ unit, className, children }: { unit: ViewUnit; className: string; children: React.ReactNode }) {
  const status = unitStatus(unit)
  const people = activeResidents(unit)
  const area = Number(unit.carpet_area ?? unit.built_up_area ?? 0)
  const price = formatPrice(unit.price)
  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            type="button"
            aria-label={`${unit.unit_number} details`}
            className={cn(className, 'cursor-pointer')}
          />
        }
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-72 p-0">
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-3.5 py-3">
          <div>
            <p className="text-sm font-bold text-gray-900">{unit.unit_number}</p>
            <p className="text-[11px] text-gray-500">
              {[unit.unit_type, area ? `${area.toLocaleString('en-IN')} sqft` : null, price]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              STATUS_STYLES[status].cell,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_STYLES[status].dot)} />
            {STATUS_STYLES[status].label}
          </span>
        </div>
        {people.length === 0 ? (
          <p className="px-3.5 py-3 text-xs text-gray-400">No one lives here yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {people.map((r, i) => {
              const name = fullName(r)
              const isTenant = r.residentType === 'TENANT'
              const movedIn = formatDate(r.moveInDate)
              return (
                <li key={r.id ?? i} className="flex gap-3 px-3.5 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#005390]/10 text-xs font-bold text-[#005390]">
                    {r.photoUrl ? (
                      <img src={getFileUrl(r.photoUrl)} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={cn(
                          'rounded-full border px-1.5 py-px text-[10px] font-semibold',
                          isTenant
                            ? 'border-purple-200 bg-purple-50 text-purple-700'
                            : 'border-blue-200 bg-blue-50 text-blue-700',
                        )}
                      >
                        {isTenant ? 'Tenant' : 'Owner'}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-1.5 py-px text-[10px] font-semibold',
                          r.isResiding
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700',
                        )}
                      >
                        {r.isResiding ? 'Residing' : 'Off-site Resident'}
                      </span>
                    </div>
                    {r.phone && (
                      <p className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <Phone className="h-3 w-3 text-gray-400" /> {r.phone}
                      </p>
                    )}
                    {movedIn && (
                      <p className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <CalendarDays className="h-3 w-3 text-gray-400" /> Moved in {movedIn}
                      </p>
                    )}
                    {r.id && (
                      <Link
                        to={`/admin/residents/details/${r.id}`}
                        className="inline-block text-[11px] font-semibold text-[#005390] hover:underline"
                      >
                        View profile →
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

const entityUnits = (entity: EntityInput): ViewUnit[] =>
  [
    ...(entity.units ?? []),
    ...(entity.floors ?? []).flatMap((f) => f.units ?? []),
    ...(entity.blocks ?? []).flatMap((b) => [...(b.units ?? []), ...(b.floors ?? []).flatMap((f) => f.units ?? [])]),
  ] as ViewUnit[]

// ─── Drawings ─────────────────────────────────────────────────────────────────

interface FloorView {
  id?: string
  floor_number: number
  floor_name?: string | null
  is_sellable?: boolean
  units?: ViewUnit[]
}

/** One building, drawn as an elevation: roof, floors stacked top-down with a window per unit, ground. */
function Building({ name, floors }: { name: string; floors: FloorView[] }) {
  const sorted = [...floors].sort((a, b) => b.floor_number - a.floor_number)
  const units = floors.flatMap((f) => f.units ?? [])
  const occupied = units.filter((u) => ['owner', 'tenant'].includes(unitStatus(u))).length
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="w-full rounded-t-xl bg-slate-700 px-3 py-1.5 text-center text-xs font-bold tracking-wide text-white">
        {name}
      </div>
      <div className="w-full space-y-1 border-x-4 border-slate-300 bg-slate-100 p-2">
        {sorted.map((floor) => {
          const floorUnits = [...(floor.units ?? [])].sort((a, b) =>
            a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }),
          )
          return (
            <div key={floor.id ?? floor.floor_number} className="flex items-center gap-1.5">
              <span
                className="w-7 shrink-0 text-right text-[10px] font-semibold text-slate-500"
                title={floor.floor_name ?? undefined}
              >
                {floor.floor_number === 1 && floor.floor_name?.toLowerCase().includes('ground')
                  ? 'G'
                  : floor.floor_number}
              </span>
              {floorUnits.length === 0 || floor.is_sellable === false ? (
                <div className="h-7 flex-1 rounded bg-[repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0_4px,#f1f5f9_4px,#f1f5f9_8px)] px-2 text-[10px] leading-7 text-slate-400">
                  {floor.floor_name || 'Common floor'}
                </div>
              ) : (
                <div className="flex gap-1">
                  {floorUnits.map((unit) => (
                    <UnitHover
                      key={unit.id ?? unit.unit_number}
                      unit={unit}
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded border text-[10px] font-semibold transition hover:ring-2 hover:ring-[#005390]/30',
                        STATUS_STYLES[unitStatus(unit)].cell,
                      )}
                    >
                      {unit.unit_number}
                    </UnitHover>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="h-2 w-[110%] rounded-b bg-slate-400" />
      <p className="mt-2 text-[11px] text-gray-500">
        {floors.length} floors · {units.length} units · {occupied} occupied
      </p>
    </div>
  )
}

/** Homes drawn as a site plan: one plot per villa/duplex/triplex. */
function SitePlan({ units, isVilla }: { units: ViewUnit[]; isVilla: boolean }) {
  const sorted = [...units].sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {sorted.map((unit) => {
        const area = Number((isVilla ? unit.built_up_area : unit.carpet_area) ?? 0)
        const resident = activeResidents(unit)[0]
        return (
          <UnitHover
            key={unit.id ?? unit.unit_number}
            unit={unit}
            className={cn(
              'block rounded-xl border-2 border-dashed p-3 text-left transition hover:ring-2 hover:ring-[#005390]/30',
              STATUS_STYLES[unitStatus(unit)].cell,
            )}
          >
            <div className="flex items-center justify-between">
              <Home className="h-4 w-4 opacity-70" />
              <span className="text-[10px] font-semibold opacity-70">{unit.unit_type}</span>
            </div>
            <p className="mt-2 text-sm font-bold">{unit.unit_number}</p>
            <p className="text-[10px] opacity-70">{area ? `${area.toLocaleString('en-IN')} sqft` : '—'}</p>
            {resident && <p className="mt-1 truncate text-[10px] font-semibold">{fullName(resident)}</p>}
          </UnitHover>
        )
      })}
    </div>
  )
}

/** Draws one entity in the way that fits its levels. */
function EntityDrawing({ entity }: { entity: EntityInput }) {
  const levels = entity.levels.join('>')
  if (levels === 'block>floor>unit') {
    return (
      <div className="flex items-end gap-8 overflow-x-auto pb-2">
        {(entity.blocks ?? []).map((block) => (
          <Building
            key={block.id ?? block.block_name}
            name={block.block_name}
            floors={(block.floors ?? []) as FloorView[]}
          />
        ))}
      </div>
    )
  }
  if (levels === 'floor>unit') {
    return <Building name={entity.name} floors={(entity.floors ?? []) as FloorView[]} />
  }
  if (levels === 'block>unit') {
    return (
      <div className="space-y-4">
        {(entity.blocks ?? []).map((block) => (
          <div key={block.id ?? block.block_name}>
            <p className="mb-2 text-xs font-semibold text-gray-600">{block.block_name}</p>
            <SitePlan units={(block.units ?? []) as ViewUnit[]} isVilla={entity.entity_type === 'villa'} />
          </div>
        ))}
      </div>
    )
  }
  return <SitePlan units={(entity.units ?? []) as ViewUnit[]} isVilla={entity.entity_type === 'villa'} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [property, setProperty] = useState<Property | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    getPropertyByIdAPI(id)
      .then((p) => active && setProperty(p))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : 'Could not load this property'))
    return () => {
      active = false
    }
  }, [id])

  const entities = useMemo(() => property?.entities ?? [], [property])
  const stats = useMemo(() => {
    const units = entities.flatMap(entityUnits)
    const count = (s: UnitStatus[]) => units.filter((u) => s.includes(unitStatus(u))).length
    return {
      units: units.length,
      occupied: count(['owner', 'tenant']),
      available: count(['available']),
      offsite: count(['offsite']),
      sold: count(['sold']),
    }
  }, [entities])

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">{error}</div>
    )
  }
  if (!property) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-gray-400">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading property…
      </div>
    )
  }

  const address = [property.street, property.city, property.state, property.pincode, property.country]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={Building2}
        title={property.property_name}
        description={`${formatPropertyTypes(property)} · ${[property.city, property.state].filter(Boolean).join(', ')}`}
        onBack={() => navigate('/property')}
        actions={
          <Button
            type="button"
            onClick={() => navigate(`/property/edit/${property.id}`)}
            className="rounded-xl bg-[#005390] text-xs font-bold text-white hover:bg-[#004274]"
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Property
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Entities', value: entities.length, tone: 'text-slate-900' },
          { label: 'Units', value: stats.units, tone: 'text-slate-900' },
          { label: 'Occupied', value: stats.occupied, tone: 'text-blue-700' },
          { label: 'Available', value: stats.available, tone: 'text-emerald-700' },
          { label: 'Sold / off-site', value: stats.sold + stats.offsite, tone: 'text-amber-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-xs text-gray-600 shadow-2xs">
        {(Object.keys(STATUS_STYLES) as UnitStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_STYLES[s].dot)} />
            {STATUS_STYLES[s].label}
          </span>
        ))}
        <span className="text-gray-400">· Hover a unit to see who lives there</span>
      </div>

      {/* One section per entity */}
      {entities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
          No structure added yet.
        </div>
      ) : (
        entities.map((entity) => {
          const preset = ENTITY_PRESETS[entity.entity_type] ?? ENTITY_PRESETS.apartment
          const Icon = preset.icon
          const units = entityUnits(entity)
          const unitWord = levelLabel(entity, 'unit').toLowerCase()
          return (
            <section
              key={entity.id ?? entity.name}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs md:p-6"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <Icon className="h-5 w-5 text-[#005390]" />
                  {entity.name}
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                    {preset.label}
                  </span>
                </h2>
                <p className="text-xs text-gray-500">
                  {entity.levels.length > 1 && `${entity.levels.map((l) => levelLabel(entity, l)).join(' → ')} · `}
                  {units.length} {unitWord}
                  {units.length === 1 ? '' : 's'}
                </p>
              </div>
              <EntityDrawing entity={entity} />
            </section>
          )
        })
      )}

      {/* Address, amenities, description */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
            <MapPin className="h-4 w-4 text-[#005390]" /> Address
          </h3>
          <p className="text-sm text-gray-700">{address || '—'}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
            <Layers className="h-4 w-4 text-[#005390]" /> Amenities
          </h3>
          {property.amenities?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {property.amenities.map((a) => (
                <span key={a} className="rounded-full bg-[#005390]/10 px-2.5 py-0.5 text-xs font-medium text-[#005390]">
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">None added</p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-700">About</h3>
          <p className="text-sm text-gray-600">{property.description || 'No description.'}</p>
        </div>
      </div>
    </div>
  )
}
