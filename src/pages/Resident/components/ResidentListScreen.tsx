import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Edit,
  Home,
  MoreVertical,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react'
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

export interface ResidentListScreenProps {
  isGlobalMode?: boolean
}

export const ResidentListScreen: React.FC<ResidentListScreenProps> = ({ isGlobalMode = false }) => {
  const navigate = useNavigate()
  const { selectedLocationId } = useLocationContext()

  const [residents, setResidents] = useState<ResidentItem[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState<string>('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterResiding, setFilterResiding] = useState<string>('ALL')
  const [expandedUnitIds, setExpandedUnitIds] = useState<Set<string>>(new Set())

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(0)
  const pageSize = 10

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

      // Expand all flat groups by default
      const allUnitIds = new Set<string>()
      resList.forEach((r) => {
        if (r.unitId) allUnitIds.add(r.unitId)
      })
      setExpandedUnitIds(allUnitIds)
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
          const allUnitIds = new Set<string>()
          resList.forEach((r) => {
            if (r.unitId) allUnitIds.add(r.unitId)
          })
          setExpandedUnitIds(allUnitIds)
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

  const toggleAccordion = (unitId: string) => {
    setExpandedUnitIds((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) {
        next.delete(unitId)
      } else {
        next.add(unitId)
      }
      return next
    })
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

  // Pagination Calculations
  const totalGroups = groupedFlats.length
  const pageCount = Math.ceil(totalGroups / pageSize) || 1
  const paginatedGroups = useMemo(() => {
    const start = currentPage * pageSize
    return groupedFlats.slice(start, start + pageSize)
  }, [groupedFlats, currentPage, pageSize])

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

        {!isGlobalMode && (
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
                <TableHeader className="bg-gray-50/90 text-gray-700 font-semibold border-b border-gray-200 dark:bg-gray-800/80 dark:border-gray-800 dark:text-gray-200 uppercase text-[10px] tracking-wider">
                  <TableRow>
                    <TableHead className="w-10 pl-4"></TableHead>
                    <TableHead
                      colSpan={7}
                      className="py-3 text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider"
                    >
                      {isGlobalMode ? 'PROPERTY & FLAT / UNIT' : 'FLAT / UNIT'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="p-12 text-center text-sm text-gray-400">
                        No resident records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedGroups.map((group) => {
                      const isExpanded = expandedUnitIds.has(group.unitId)

                      return (
                        <React.Fragment key={group.unitId}>
                          {/* Main Flat Summary Row */}
                          <TableRow className="bg-gray-50/70 hover:bg-gray-100/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors border-b border-gray-200 dark:border-gray-800">
                            {/* Expander Chevron Column */}
                            <TableCell className="w-10 py-3.5 pl-4">
                              <button
                                type="button"
                                onClick={() => toggleAccordion(group.unitId)}
                                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 transition cursor-pointer"
                                title={isExpanded ? 'Collapse flat details' : 'Expand flat details'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-[#005390]" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </TableCell>

                            {/* Property & Flat / Unit Column */}
                            <TableCell className="py-3.5">
                              <div
                                role="button"
                                tabIndex={0}
                                className="flex flex-wrap items-center gap-2 cursor-pointer outline-none"
                                onClick={() => toggleAccordion(group.unitId)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    toggleAccordion(group.unitId)
                                  }
                                }}
                              >
                                {isGlobalMode && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#005390]/10 text-[#005390] border border-[#005390]/20">
                                    <Building2 className="w-3.5 h-3.5" />
                                    {group.propertyName}
                                  </span>
                                )}
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-xs font-bold shadow-2xs">
                                  <Home className="w-3.5 h-3.5 text-[#005390]" />
                                  {group.floorLabel} — {group.unitNumber}
                                </div>
                              </div>
                            </TableCell>

                            {/* Resident Column (Tenant Name & Owner Name) */}
                            <TableCell className="py-3.5">
                              <div
                                role="button"
                                tabIndex={0}
                                className="space-y-1 cursor-pointer outline-none"
                                onClick={() => toggleAccordion(group.unitId)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    toggleAccordion(group.unitId)
                                  }
                                }}
                              >
                                {group.residingTenant && (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                                    <span className="text-purple-700 dark:text-purple-400 font-semibold text-[10px] bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                      Tenant:
                                    </span>
                                    {group.residingTenant.firstName} {group.residingTenant.lastName || ''}
                                  </div>
                                )}
                                {group.offsiteOwner && (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                                    <span className="text-amber-700 dark:text-amber-400 font-semibold text-[10px] bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                      Owner:
                                    </span>
                                    {group.offsiteOwner.firstName} {group.offsiteOwner.lastName || ''}
                                  </div>
                                )}
                                {group.residingOwner && !group.residingTenant && (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                                    <span className="text-blue-700 dark:text-blue-400 font-semibold text-[10px] bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                      Owner:
                                    </span>
                                    {group.residingOwner.firstName} {group.residingOwner.lastName || ''}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Clean empty space on main flat header row */}
                            <TableCell
                              colSpan={5}
                              role="button"
                              tabIndex={0}
                              className="py-3.5 cursor-pointer outline-none"
                              onClick={() => toggleAccordion(group.unitId)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  toggleAccordion(group.unitId)
                                }
                              }}
                            ></TableCell>
                          </TableRow>

                          {/* Accordion Sub-row Directly Inside Table */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-gray-200/80">
                              <TableCell colSpan={8} className="p-0">
                                <div className="bg-slate-50/90 dark:bg-slate-800/60 px-4 py-3 border-y border-gray-200/80 dark:border-gray-700">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200/60 dark:border-gray-700/60 pb-1">
                                        <th className="py-2 pl-4 font-bold">Occupant Name</th>
                                        <th className="py-2 font-bold">Type</th>
                                        <th className="py-2 font-bold">Residing Status</th>
                                        <th className="py-2 font-bold">Mobile Handle</th>
                                        <th className="py-2 font-bold">Contact</th>
                                        <th className="py-2 font-bold text-right pr-4">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                                      {group.allOccupants.map((occ) => {
                                        const fullName = `${occ.firstName} ${occ.lastName || ''}`.trim()
                                        return (
                                          <tr
                                            key={occ.id}
                                            className="hover:bg-white/60 dark:hover:bg-slate-900/60 transition-colors"
                                          >
                                            {/* Occupant Name & Family Members */}
                                            <td className="py-2.5 pl-4">
                                              <div
                                                role="button"
                                                tabIndex={0}
                                                className="flex items-center gap-2.5 cursor-pointer group/occ outline-none"
                                                onClick={() =>
                                                  navigate(
                                                    isGlobalMode
                                                      ? `/global-settings/residents/details/${occ.id}`
                                                      : `/admin/residents/details/${occ.id}`,
                                                  )
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    navigate(
                                                      isGlobalMode
                                                        ? `/global-settings/residents/details/${occ.id}`
                                                        : `/admin/residents/details/${occ.id}`,
                                                    )
                                                  }
                                                }}
                                                title="Click to view resident profile details"
                                              >
                                                <div className="w-7 h-7 rounded-full bg-[#005390]/10 text-[#005390] group-hover/occ:bg-[#005390] group-hover/occ:text-white transition-colors flex items-center justify-center font-bold text-xs shrink-0">
                                                  {occ.firstName[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                  <div className="font-bold text-gray-900 dark:text-white text-xs group-hover/occ:text-[#005390] transition-colors">
                                                    {fullName}
                                                  </div>
                                                  {occ.email && (
                                                    <div className="text-[10px] text-gray-400">{occ.email}</div>
                                                  )}
                                                  {occ.familyMembers && occ.familyMembers.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                      {occ.familyMembers.map((fm) => (
                                                        <span
                                                          key={fm.id || fm.firstName}
                                                          className="text-[9px] font-medium bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                        >
                                                          {fm.firstName} {fm.lastName || ''} (
                                                          {fm.relation || 'Relative'})
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </td>

                                            {/* Type Badge */}
                                            <td className="py-2.5">
                                              <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                  occ.residentType === 'OWNER'
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                                    : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                                                }`}
                                              >
                                                {occ.residentType}
                                              </span>
                                            </td>

                                            {/* Residing Status */}
                                            <td className="py-2.5">
                                              {occ.isResiding ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                                  <Check className="w-3 h-3" /> Physically Residing
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                                                  Off-site Landlord
                                                </span>
                                              )}
                                            </td>

                                            {/* Mobile Handle */}
                                            <td className="py-2.5">
                                              {occ.username ? (
                                                <span className="text-[#005390] font-semibold text-xs font-mono">
                                                  ({occ.username})
                                                </span>
                                              ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                              )}
                                            </td>

                                            {/* Contact Phone */}
                                            <td className="py-2.5">
                                              <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">
                                                {occ.phone || 'N/A'}
                                              </span>
                                            </td>

                                            {/* Actions Dropdown / Menu */}
                                            <td className="py-2.5 text-right pr-4">
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
                                                  <DropdownMenuItem
                                                    onClick={() =>
                                                      navigate(
                                                        isGlobalMode
                                                          ? `/global-settings/residents/details/${occ.id}`
                                                          : `/admin/residents/details/${occ.id}`,
                                                      )
                                                    }
                                                    className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                                                  >
                                                    <UserCheck className="h-3.5 w-3.5 text-[#005390]" />
                                                    View Profile
                                                  </DropdownMenuItem>

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

                                                  <DropdownMenuItem
                                                    onClick={() => handleDelete(occ.id, fullName)}
                                                    className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-lg px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                                    Remove Resident
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
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
                  Total <span className="font-bold text-gray-900 dark:text-white">{totalGroups}</span> flat(s) (
                  <span className="font-bold text-[#005390]">{residents.length}</span> total resident records)
                </span>
                <span>
                  • Page <span className="font-bold text-gray-900 dark:text-white">{currentPage + 1}</span> of{' '}
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
                        if (currentPage > 0) setCurrentPage((prev) => prev - 1)
                      }}
                      className={
                        currentPage === 0
                          ? 'pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500'
                          : 'cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-200'
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: pageCount }).map((_, idx) => {
                    if (idx === 0 || idx === pageCount - 1 || (idx >= currentPage - 1 && idx <= currentPage + 1)) {
                      return (
                        <PaginationItem key={idx}>
                          <PaginationLink
                            href="#"
                            isActive={idx === currentPage}
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
                    } else if (
                      (idx === 1 && currentPage > 2) ||
                      (idx === pageCount - 2 && currentPage < pageCount - 3)
                    ) {
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
                        if (currentPage < pageCount - 1) setCurrentPage((prev) => prev + 1)
                      }}
                      className={
                        currentPage >= pageCount - 1
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
