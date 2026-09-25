import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, Edit, Home, MoreVertical, Search, Trash2, UserCheck, UserPlus, Users } from 'lucide-react'
import type { Property, ResidentItem } from '@/lib/types'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import { residentService } from '@/lib/services/residentService'
import { useLocationContext } from '@/hooks/useLocation'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { getFileUrl } from '@/lib/utils'

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

/** "1998-01-12" -> "12 Jan 1998 · 27 yrs" */
const formatDob = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const hasHadBirthday =
    now.getMonth() > date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate())
  if (!hasHadBirthday) age -= 1

  return age >= 0 && age < 130 ? `${label} · ${age} yrs` : label
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

  /** Flat, Resident, Type, Status, Handle, Contact, Rent, Actions */
  const columnCount = 8

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
          <option value="ALL">Property: All Properties ({properties.length})</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              Property: {p.property_name || (p as { name?: string }).name || 'Property'}
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
        <option value="ALL">Resident Type: All Types (Owner, Tenant)</option>
        <option value="OWNER">Resident Type: Owner Only</option>
        <option value="TENANT">Resident Type: Tenant Only</option>
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
        <option value="ALL">Residing Status: All Occupants</option>
        <option value="RESIDING">Residing Status: Physically Residing</option>
        <option value="OFFSITE">Residing Status: Off-site Landlord</option>
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
            placeholder="Search Name, username, Unit #..."
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
          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xs dark:border-gray-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/90 border-b border-gray-200 dark:bg-gray-800/80 dark:border-gray-800">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-3 pl-4 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Flat / Unit
                    </TableHead>
                    <TableHead className="py-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Resident
                    </TableHead>
                    <TableHead className="py-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Type
                    </TableHead>
                    <TableHead className="py-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Residing Status
                    </TableHead>
                    <TableHead className="py-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Mobile Handle
                    </TableHead>
                    <TableHead className="py-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Contact
                    </TableHead>
                    <TableHead className="py-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Rent &amp; Billing
                    </TableHead>
                    <TableHead className="py-3 pr-4 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFlats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columnCount} className="p-12 text-center text-sm text-gray-400">
                        No resident records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedFlats.map((flat) => {
                      const flatOwner = flat.residingOwner || flat.offsiteOwner
                      // Each occupant occupies one row plus one per family member.
                      const flatRowCount = flat.allOccupants.reduce(
                        (count, occ) => count + 1 + (occ.familyMembers?.length || 0),
                        0,
                      )

                      return (
                        <React.Fragment key={flat.unitId}>
                          {/* ── The people in that flat: owner first, members below ── */}
                          {flat.allOccupants.map((occ, occIndex) => {
                            const fullName = `${occ.firstName} ${occ.lastName || ''}`.trim()
                            const family = occ.familyMembers || []
                            const isLastOccupant = occIndex === flat.allOccupants.length - 1

                            return (
                              <React.Fragment key={occ.id}>
                                <TableRow
                                  className={`hover:bg-[#005390]/5 transition-colors ${
                                    isLastOccupant && family.length === 0
                                      ? 'border-b-2 border-b-gray-200 dark:border-b-gray-700'
                                      : 'border-b border-gray-100 dark:border-gray-800'
                                  }`}
                                >
                                  {/* Flat details — merged down the flat's rows, so the unit is read first */}
                                  {occIndex === 0 && (
                                    <TableCell
                                      rowSpan={flatRowCount}
                                      className="py-3 pl-4 pr-3 align-top whitespace-normal w-56 bg-[#005390]/[0.05] border-r border-gray-200 dark:bg-slate-800/60 dark:border-gray-700"
                                    >
                                      <div className="space-y-1.5">
                                        {isGlobalMode && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#005390]/10 text-[#005390] border border-[#005390]/20">
                                            <Building2 className="w-3 h-3" />
                                            {flat.propertyName}
                                          </span>
                                        )}

                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-xs font-bold shadow-2xs">
                                          <Home className="w-3.5 h-3.5 text-[#005390]" />
                                          {flat.floorLabel} — {flat.unitNumber}
                                        </div>

                                        <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                          {flat.allOccupants.length} occupant{flat.allOccupants.length === 1 ? '' : 's'}
                                        </div>

                                        {flatOwner && (
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-800 dark:text-gray-100">
                                            <span className="text-blue-700 dark:text-blue-300 text-[9px] font-semibold bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                              Owner
                                            </span>
                                            {flatOwner.firstName} {flatOwner.lastName || ''}
                                          </div>
                                        )}

                                        {flat.residingTenant && (
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-800 dark:text-gray-100">
                                            <span className="text-purple-700 dark:text-purple-300 text-[9px] font-semibold bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                              Tenant
                                            </span>
                                            {flat.residingTenant.firstName} {flat.residingTenant.lastName || ''}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  )}

                                  {/* Resident: photo, name, email, family members */}
                                  <TableCell className="py-3 whitespace-normal">
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      className="flex items-start gap-2.5 cursor-pointer group/occ outline-none"
                                      onClick={() => goToResident(occ.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault()
                                          goToResident(occ.id)
                                        }
                                      }}
                                      title="Click to view resident profile details"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-[#005390]/10 text-[#005390] group-hover/occ:border-[#005390] overflow-hidden border border-gray-200/80 transition-colors flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                        {occ.photoUrl ? (
                                          <img
                                            src={getFileUrl(occ.photoUrl)}
                                            alt={fullName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span>{occ.firstName[0]?.toUpperCase()}</span>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-bold text-gray-900 dark:text-white text-xs group-hover/occ:text-[#005390] transition-colors">
                                          {fullName}
                                        </div>
                                        {occ.email && <div className="text-[10px] text-gray-400">{occ.email}</div>}
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                          {occ.gender && <span>{occ.gender}</span>}
                                          {formatDob(occ.dob) && <span>{formatDob(occ.dob)}</span>}
                                          {occ.bloodGroup && (
                                            <span className="text-rose-600 dark:text-rose-400">{occ.bloodGroup}</span>
                                          )}
                                        </div>
                                        {family.length > 0 && (
                                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#005390]">
                                            <Users className="w-3 h-3" />
                                            {family.length} family member{family.length === 1 ? '' : 's'} listed below
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>

                                  {/* Owner / Tenant */}
                                  <TableCell className="py-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        occ.residentType === 'OWNER'
                                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                          : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                                      }`}
                                    >
                                      {occ.residentType}
                                    </span>
                                  </TableCell>

                                  {/* Residing Status */}
                                  <TableCell className="py-3">
                                    {occ.isResiding ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                        <Check className="w-3 h-3" /> Physically Residing
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                                        Off-site Landlord
                                      </span>
                                    )}
                                  </TableCell>

                                  {/* Mobile Handle */}
                                  <TableCell className="py-3">
                                    {occ.username ? (
                                      <span className="text-[#005390] font-semibold text-xs font-mono">
                                        ({occ.username})
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </TableCell>

                                  {/* Contact Phone */}
                                  <TableCell className="py-3">
                                    <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">
                                      {occ.phone || 'N/A'}
                                    </span>
                                  </TableCell>

                                  {/* Rent & Billing */}
                                  <TableCell className="py-3">
                                    {occ.residentType === 'TENANT' ? (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                                          {occ.rentAmount !== undefined && occ.rentAmount !== null
                                            ? `₹${Number(occ.rentAmount).toLocaleString('en-IN')}`
                                            : 'Rent Not Set'}
                                        </span>
                                        {occ.payRentToCompany ? (
                                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md dark:bg-blue-950 dark:text-blue-300 w-max">
                                            Company Billing
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md dark:bg-amber-950 dark:text-amber-300 w-max">
                                            Direct to Owner
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </TableCell>

                                  {/* Actions Dropdown / Menu */}
                                  <TableCell className="py-3 text-right pr-4">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-[#005390] hover:bg-[#005390]/10 hover:text-[#005390] transition-colors cursor-pointer shadow-2xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                                        title="Actions"
                                      >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="w-48 rounded-xl p-1 shadow-xl border border-gray-100 bg-white dark:bg-slate-900 dark:border-gray-800"
                                      >
                                        {canViewResident && (
                                          <DropdownMenuItem
                                            onClick={() => goToResident(occ.id)}
                                            className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
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
                                            className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                                          >
                                            <Edit className="h-3.5 w-3.5 text-[#005390]" />
                                            Edit Profile
                                          </DropdownMenuItem>
                                        )}

                                        {canDeleteResident && (
                                          <DropdownMenuItem
                                            onClick={() => handleDelete(occ.id, fullName)}
                                            className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-lg px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                          >
                                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                            Remove Resident
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>

                                {/* ── Family members of this resident ── */}
                                {family.map((fm, fmIndex) => {
                                  const fmName = `${fm.firstName} ${fm.lastName || ''}`.trim()
                                  const isLastFamilyRow = isLastOccupant && fmIndex === family.length - 1

                                  return (
                                    <TableRow
                                      key={fm.id || `${occ.id}-${fm.firstName}-${fmIndex}`}
                                      className={`bg-gray-50/60 dark:bg-slate-800/30 hover:bg-[#005390]/5 transition-colors ${
                                        isLastFamilyRow
                                          ? 'border-b-2 border-b-gray-200 dark:border-b-gray-700'
                                          : 'border-b border-gray-100 dark:border-gray-800'
                                      }`}
                                    >
                                      {/* Name, photo and personal details, indented under the resident */}
                                      <TableCell className="py-2.5 pl-8 whitespace-normal">
                                        <div className="flex items-start gap-2.5">
                                          <span className="text-gray-300 dark:text-gray-600 text-xs leading-6 select-none">
                                            &#8627;
                                          </span>
                                          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 overflow-hidden border border-gray-200/80 flex items-center justify-center font-bold text-[10px] shrink-0 dark:bg-slate-800 dark:border-gray-700">
                                            {fm.photoUrl ? (
                                              <img
                                                src={getFileUrl(fm.photoUrl)}
                                                alt={fmName}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <span>{fm.firstName[0]?.toUpperCase()}</span>
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-bold text-gray-800 dark:text-gray-100 text-xs">
                                              {fmName}
                                            </div>
                                            {fm.email && <div className="text-[10px] text-gray-400">{fm.email}</div>}
                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                              {fm.gender && <span>{fm.gender}</span>}
                                              {formatDob(fm.dob) && <span>{formatDob(fm.dob)}</span>}
                                              {fm.bloodGroup && (
                                                <span className="text-rose-600 dark:text-rose-400">
                                                  {fm.bloodGroup}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>

                                      {/* Type: family, with the relation */}
                                      <TableCell className="py-2.5">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                          <Users className="w-3 h-3" />
                                          {fm.relation || 'Family'}
                                        </span>
                                      </TableCell>

                                      {/* Residing status */}
                                      <TableCell className="py-2.5">
                                        {fm.isResiding === false ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-gray-700">
                                            Not Residing
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                            <Check className="w-3 h-3" /> Physically Residing
                                          </span>
                                        )}
                                      </TableCell>

                                      {/* Mobile handle */}
                                      <TableCell className="py-2.5">
                                        {fm.username ? (
                                          <span className="text-[#005390] font-semibold text-xs font-mono">
                                            ({fm.username})
                                          </span>
                                        ) : (
                                          <span className="text-gray-400 text-xs">-</span>
                                        )}
                                      </TableCell>

                                      {/* Contact */}
                                      <TableCell className="py-2.5">
                                        <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
                                          {fm.phone || 'N/A'}
                                        </span>
                                      </TableCell>

                                      {/* Rent & billing never applies to a family member */}
                                      <TableCell className="py-2.5">
                                        <span className="text-gray-400 text-xs">-</span>
                                      </TableCell>

                                      {/* Family members are managed from the resident's profile */}
                                      <TableCell className="py-2.5 pr-4 text-right">
                                        <span className="text-[10px] font-semibold text-gray-400">
                                          via {occ.firstName}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </React.Fragment>
                            )
                          })}
                        </React.Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
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
                  <span className="font-bold text-[#005390]">{totalRows}</span> resident records)
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
