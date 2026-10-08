import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Home, MoreVertical, Search, Trash2, UserCheck, UserPlus } from 'lucide-react'
import type { Property, ResidentItem } from '@/lib/types'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import { residentService } from '@/lib/services/residentService'
import { useLocationContext } from '@/hooks/useLocation'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { notifyError, notifySuccess } from '@/utils/toast'
import { cn, getFileUrl } from '@/lib/utils'

interface FlatGroup {
  unitId: string
  unitNumber: string
  floorLabel: string
  propertyName: string
  residingTenant?: ResidentItem
  residingOwner?: ResidentItem
  offsiteOwner?: ResidentItem
  allOccupants: ResidentItem[]
}

const LIVING_BADGES = {
  here: { label: 'Residing', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  elsewhere: {
    label: 'Off-site Resident',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  not: { label: 'Off-site Resident', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
} as const

/** Whether a person actually lives in the flat. */
const LivingBadge = ({ status }: { status: keyof typeof LIVING_BADGES }) => {
  const badge = LIVING_BADGES[status]
  return (
    <span
      className={cn(
        'inline-flex w-32 items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        badge.className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', badge.dot)} />
      {badge.label}
    </span>
  )
}

export interface ResidentListScreenProps {
  isGlobalMode?: boolean
}

export const ResidentListScreen: React.FC<ResidentListScreenProps> = ({ isGlobalMode = false }) => {
  const navigate = useNavigate()
  const { selectedLocationId, hasResourcePermission } = useLocationContext()
  const canCreateResident = hasResourcePermission('RESIDENT', 'create')
  const canUpdateResident = hasResourcePermission('RESIDENT', 'update')
  const canDeleteResident = hasResourcePermission('RESIDENT', 'delete')
  const canViewResident = hasResourcePermission('RESIDENT', 'view')

  const [residents, setResidents] = useState<ResidentItem[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState<string>('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterResiding, setFilterResiding] = useState<string>('ALL')

  // Pagination State — one page holds whole flats
  const [currentPage, setCurrentPage] = useState<number>(0)
  const pageSize = 8

  // Load properties list if in Global Mode
  useEffect(() => {
    if (isGlobalMode) {
      void getPropertiesAPI()
        .then((props) => setProperties(props))
        .catch(() => {})
    }
  }, [isGlobalMode])

  // Debounce search input by 300ms before querying Backend & reset pagination
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchInput)
      setCurrentPage(0)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch residents from Backend API with location, BE search, and type filters
  const loadPropertyData = useCallback(async (locId?: string, search?: string, type?: string, residing?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const resList = await residentService.getResidents({
        locId: locId && locId !== 'ALL' ? locId : undefined,
        search: search && search.trim() ? search.trim() : undefined,
        residentType: type !== 'ALL' ? type : undefined,
        isResiding: residing !== 'ALL' ? residing : undefined,
      })
      setResidents(resList)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load resident records'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Trigger BE load on location, debounced search, or filter changes
  useEffect(() => {
    let isCancelled = false

    const fetchData = async () => {
      const targetLoc = isGlobalMode ? selectedPropertyId : selectedLocationId
      if (!isGlobalMode && !targetLoc) {
        setIsLoading(false)
        return
      }

      try {
        const resList = await residentService.getResidents({
          locId: targetLoc && targetLoc !== 'ALL' ? targetLoc : undefined,
          search: debouncedSearchTerm && debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
          residentType: filterType !== 'ALL' ? filterType : undefined,
          isResiding: filterResiding !== 'ALL' ? filterResiding : undefined,
        })
        if (!isCancelled) {
          setResidents(resList)
          setError(null)
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load resident records'
          setError(msg)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      isCancelled = true
    }
  }, [isGlobalMode, selectedPropertyId, selectedLocationId, debouncedSearchTerm, filterType, filterResiding])

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove resident "${name}"?`)) return

    try {
      await residentService.deleteResident(id)
      notifySuccess('Resident Removed', `Resident "${name}" removed successfully.`)
      const targetLoc = isGlobalMode ? selectedPropertyId : selectedLocationId
      void loadPropertyData(targetLoc || undefined, debouncedSearchTerm, filterType, filterResiding)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete resident'
      notifyError('Delete Failed', msg)
    }
  }

  // Group residents by Flat / Unit
  const groupedFlats = useMemo(() => {
    const map = new Map<string, ResidentItem[]>()
    residents.forEach((r) => {
      const key = r.unitId || r.unit?.id || 'UNASSIGNED'
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(r)
    })

    const groups: FlatGroup[] = []
    map.forEach((occupants, unitId) => {
      const firstOcc = occupants[0]
      const firstUnit = firstOcc?.unit
      const floorNum = firstUnit?.floor?.floor_number
      const floorLabel =
        firstUnit?.floor?.floor_name ||
        (floorNum ? (floorNum === 1 ? 'Ground Floor' : `Floor ${floorNum}`) : 'Main Level')
      const unitNumber = firstUnit?.unit_number ? `Unit ${firstUnit.unit_number}` : 'Unassigned Flat'
      const propertyName = firstOcc?.property?.property_name || firstOcc?.property?.name || 'Property'

      const residingTenant = occupants.find((r) => r.residentType === 'TENANT' && r.isResiding)
      const residingOwner = occupants.find((r) => r.residentType === 'OWNER' && r.isResiding)
      const offsiteOwner = occupants.find((r) => r.residentType === 'OWNER' && !r.isResiding)

      groups.push({
        unitId,
        unitNumber,
        floorLabel,
        propertyName,
        residingTenant,
        residingOwner,
        offsiteOwner,
        allOccupants: occupants,
      })
    })

    return groups
  }, [residents])

  /**
   * Flats in reading order (property -> floor -> unit) with their occupants
   * sorted so the OWNER of the flat is always the first line and the other
   * members follow underneath.
   */
  const orderedFlats = useMemo(() => {
    const sortedFlats = [...groupedFlats].sort((a, b) =>
      `${a.propertyName}|${a.floorLabel}|${a.unitNumber}`.localeCompare(
        `${b.propertyName}|${b.floorLabel}|${b.unitNumber}`,
        undefined,
        { numeric: true },
      ),
    )

    return sortedFlats.map((flat) => ({
      ...flat,
      allOccupants: [...flat.allOccupants].sort((a, b) => {
        if (a.residentType !== b.residentType) return a.residentType === 'OWNER' ? -1 : 1
        if (a.isResiding !== b.isResiding) return a.isResiding ? -1 : 1
        return `${a.firstName} ${a.lastName || ''}`.localeCompare(`${b.firstName} ${b.lastName || ''}`)
      }),
    }))
  }, [groupedFlats])

  // Pagination Calculations — a page holds whole flats so a unit never splits
  const totalGroups = orderedFlats.length
  const totalRows = residents.length
  const pageCount = Math.ceil(totalGroups / pageSize) || 1
  /** Deleting or filtering can shrink the list past the current page. */
  const activePage = Math.min(currentPage, pageCount - 1)
  const paginatedFlats = useMemo(() => {
    const start = activePage * pageSize
    return orderedFlats.slice(start, start + pageSize)
  }, [orderedFlats, activePage, pageSize])

  const goToResident = (residentId: string) =>
    navigate(
      isGlobalMode ? `/global-settings/residents/details/${residentId}` : `/admin/residents/details/${residentId}`,
    )

  // Filter Controls Bar
  const filterControls = (
    <div className="flex flex-wrap items-center gap-3">
      {/* Property Location Filter (Only in Global Mode) */}
      {isGlobalMode && (
        <select
          id="filter-property-select"
          value={selectedPropertyId}
          onChange={(e) => {
            setSelectedPropertyId(e.target.value)
            setCurrentPage(0)
          }}
          aria-label="Property Location"
          className="h-9 px-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] shadow-2xs cursor-pointer"
        >
          <option value="ALL">All properties ({properties.length})</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.property_name || (p as { name?: string }).name || 'Property'}
            </option>
          ))}
        </select>
      )}

      {/* Resident Type Filter */}
      <select
        id="filter-type-select"
        value={filterType}
        onChange={(e) => {
          setFilterType(e.target.value)
          setCurrentPage(0)
        }}
        aria-label="Resident Type"
        className="h-9 px-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] shadow-2xs cursor-pointer"
      >
        <option value="ALL">Owners & tenants</option>
        <option value="OWNER">Owners only</option>
        <option value="TENANT">Tenants only</option>
      </select>

      {/* Residing Status Filter */}
      <select
        id="filter-residing-select"
        value={filterResiding}
        onChange={(e) => {
          setFilterResiding(e.target.value)
          setCurrentPage(0)
        }}
        aria-label="Residing Status"
        className="h-9 px-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] shadow-2xs cursor-pointer"
      >
        <option value="ALL">Everyone</option>
        <option value="RESIDING">Residing</option>
        <option value="OFFSITE">Off-site Resident</option>
      </select>
    </div>
  )

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Card ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 dark:text-white">
            <UserCheck className="w-5 h-5 text-[#005390]" />
            {isGlobalMode ? 'Global Resident Directory' : 'Resident Directory & Onboarding'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isGlobalMode
              ? 'View and manage resident profiles, flat occupancy, and credentials across all properties.'
              : 'Onboard Owners and Tenants, track flat occupancy status, and manage mobile app credentials.'}
          </p>
        </div>

        {!isGlobalMode && canCreateResident && (
          <Button
            variant="primary"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => navigate('/admin/residents/create')}
          >
            Onboard Resident / Tenant
          </Button>
        )}
      </div>

      {/* ── Filter Bar & BE Search ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xs">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="pl-9 pr-4 py-2 w-full rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-2xs focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] focus:outline-none"
            placeholder="Search by name, username or flat…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        {filterControls}
      </div>

      {/* ── Table with In-Row Accordion Rows ─────────────────────────────────── */}
      {isLoading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 p-12 text-center text-sm text-gray-400">
          Loading resident records...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center text-xs text-rose-700 font-bold">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedFlats.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-slate-900">
              No residents found.
            </div>
          ) : (
            paginatedFlats.map((flat) => {
              const livingCount = flat.allOccupants.reduce(
                (n, occ) =>
                  n +
                  (occ.isResiding ? 1 : 0) +
                  (occ.familyMembers || []).filter((fm) => fm.isResiding !== false).length,
                0,
              )
              return (
                <div
                  key={flat.unitId}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xs dark:border-gray-800 dark:bg-slate-900"
                >
                  {/* Flat header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-3 dark:border-gray-800 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
                        <Home className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{flat.unitNumber}</h3>
                        <p className="text-[11px] text-gray-500">
                          {flat.floorLabel}
                          {isGlobalMode && ` · ${flat.propertyName}`}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                      {livingCount} residing
                    </span>
                  </div>

                  {/* People: each resident, with their family indented underneath */}
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {flat.allOccupants.map((occ) => {
                      const fullName = `${occ.firstName} ${occ.lastName || ''}`.trim()
                      const family = occ.familyMembers || []
                      const isTenant = occ.residentType === 'TENANT'
                      return (
                        <li key={occ.id}>
                          <div className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[#005390]/[0.03] md:flex-row md:items-center">
                            <button
                              type="button"
                              onClick={() => goToResident(occ.id)}
                              className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                              title="View profile"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#005390]/10 text-xs font-bold text-[#005390]">
                                {occ.photoUrl ? (
                                  <img
                                    src={getFileUrl(occ.photoUrl)}
                                    alt={fullName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  occ.firstName[0]?.toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-900 group-hover:text-[#005390] dark:text-white">
                                  {fullName}
                                  <span
                                    className={cn(
                                      'rounded-full border px-2 py-px text-[10px] font-semibold',
                                      isTenant
                                        ? 'border-purple-200 bg-purple-50 text-purple-700'
                                        : 'border-blue-200 bg-blue-50 text-blue-700',
                                    )}
                                  >
                                    {isTenant ? 'Tenant' : 'Owner'}
                                  </span>
                                </p>
                                {occ.email && <p className="truncate text-xs text-gray-500">{occ.email}</p>}
                              </div>
                            </button>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-12 text-xs md:pl-0">
                              <LivingBadge status={occ.isResiding ? 'here' : 'elsewhere'} />
                              <span className="w-28 text-gray-700 dark:text-gray-300">{occ.phone || '—'}</span>
                              <span className="w-36">
                                {isTenant ? (
                                  <>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {occ.rentAmount != null
                                        ? `₹${Number(occ.rentAmount).toLocaleString('en-IN')}/mo`
                                        : 'Rent not set'}
                                    </span>
                                    <span className="block text-[10px] text-gray-500">
                                      {occ.payRentToCompany ? 'Paid via company' : 'Paid to owner'}
                                    </span>
                                  </>
                                ) : null}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#005390] dark:hover:bg-gray-800"
                                  title="Actions"
                                  aria-label={`Actions for ${fullName}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 rounded-xl p-1 shadow-xl">
                                  {canViewResident && (
                                    <DropdownMenuItem
                                      onClick={() => goToResident(occ.id)}
                                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                                    >
                                      <UserCheck className="h-3.5 w-3.5 text-[#005390]" />
                                      View Profile
                                    </DropdownMenuItem>
                                  )}
                                  {canUpdateResident && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navigate(
                                          isGlobalMode
                                            ? `/global-settings/residents/edit/${occ.id}`
                                            : `/admin/residents/edit/${occ.id}`,
                                        )
                                      }
                                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                                    >
                                      <Edit className="h-3.5 w-3.5 text-[#005390]" />
                                      Edit Profile
                                    </DropdownMenuItem>
                                  )}
                                  {canDeleteResident && (
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(occ.id, fullName)}
                                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Remove
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {family.length > 0 && (
                            <ul className="border-t border-dashed border-gray-100 bg-slate-50/50 dark:border-gray-800 dark:bg-slate-800/20">
                              {family.map((fm, fmIndex) => {
                                const fmName = `${fm.firstName} ${fm.lastName || ''}`.trim()
                                return (
                                  <li
                                    key={fm.id || `${occ.id}-${fmIndex}`}
                                    className="flex flex-col gap-1.5 py-2 pl-10 pr-4 md:flex-row md:items-center"
                                  >
                                    <div className="flex min-w-0 flex-1 items-center gap-3 border-l-2 border-gray-200 pl-3 dark:border-gray-700">
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                                        {fm.photoUrl ? (
                                          <img
                                            src={getFileUrl(fm.photoUrl)}
                                            alt={fmName}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          fm.firstName[0]?.toUpperCase()
                                        )}
                                      </div>
                                      <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100">
                                        {fmName}
                                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-px text-[10px] font-semibold capitalize text-violet-700">
                                          {fm.relation || 'Family'}
                                        </span>
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-10 text-xs md:pl-0">
                                      <LivingBadge status={fm.isResiding === false ? 'not' : 'here'} />
                                      <span className="w-28 text-gray-600 dark:text-gray-300">{fm.phone || '—'}</span>
                                      <span className="w-36" />
                                      <span className="w-8" />
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })
          )}
          {/* Pagination Footer */}
          {totalGroups > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                <span>
                  Showing flats{' '}
                  <span className="font-bold text-gray-900 dark:text-white">
                    {activePage * pageSize + 1}–{Math.min((activePage + 1) * pageSize, totalGroups)}
                  </span>{' '}
                  of <span className="font-bold text-gray-900 dark:text-white">{totalGroups}</span> (
                  <span className="font-bold text-[#005390]">{totalRows}</span> residents)
                </span>
                <span>
                  • Page <span className="font-bold text-gray-900 dark:text-white">{activePage + 1}</span> of{' '}
                  <span className="font-bold text-gray-900 dark:text-white">{Math.max(1, pageCount)}</span>
                </span>
              </div>

              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (activePage > 0) setCurrentPage(activePage - 1)
                      }}
                      className={
                        activePage === 0
                          ? 'pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500'
                          : 'cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-200'
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: pageCount }).map((_, idx) => {
                    if (idx === 0 || idx === pageCount - 1 || (idx >= activePage - 1 && idx <= activePage + 1)) {
                      return (
                        <PaginationItem key={idx}>
                          <PaginationLink
                            href="#"
                            isActive={idx === activePage}
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(idx)
                            }}
                            className="cursor-pointer text-xs h-8 w-8 rounded-xl font-bold"
                          >
                            {idx + 1}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    } else if ((idx === 1 && activePage > 2) || (idx === pageCount - 2 && activePage < pageCount - 3)) {
                      return (
                        <PaginationItem key={idx}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }
                    return null
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (activePage < pageCount - 1) setCurrentPage(activePage + 1)
                      }}
                      className={
                        activePage >= pageCount - 1
                          ? 'pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500'
                          : 'cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-200'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ResidentListScreen
