import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, Edit, Home, MoreVertical, Trash2, UserCheck, UserPlus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ResidentItem } from '@/lib/types'
import { residentService } from '@/lib/services/residentService'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import type { Property } from '@/pages/Property/types'
import { useLocationContext } from '@/hooks/useLocation'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export const ResidentListScreen: React.FC = () => {
  const navigate = useNavigate()
  const { selectedLocationId } = useLocationContext()

  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [residents, setResidents] = useState<ResidentItem[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterResiding, setFilterResiding] = useState<string>('ALL')

  const loadPropertyData = useCallback(async (locId: string) => {
    setIsLoading(true)
    try {
      const resList = await residentService.getResidents({ locId })
      setResidents(resList)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load resident records'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const propList = await getPropertiesAPI()
      setProperties(propList)

      const activeLoc = selectedLocationId || (propList.length > 0 ? propList[0].id : '')
      setSelectedPropertyId(activeLoc)

      if (activeLoc) {
        await loadPropertyData(activeLoc)
      } else {
        setIsLoading(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load property data'
      setError(msg)
      setIsLoading(false)
    }
  }, [selectedLocationId, loadPropertyData])

  // Sync with top header location selector
  useEffect(() => {
    let isMounted = true
    const syncLocation = async () => {
      if (!isMounted) return
      if (selectedLocationId) {
        setSelectedPropertyId(selectedLocationId)
        await loadPropertyData(selectedLocationId)
      } else {
        await fetchInitialData()
      }
    }
    void syncLocation()
    return () => {
      isMounted = false
    }
  }, [selectedLocationId, fetchInitialData, loadPropertyData])

  const handlePropertyChange = (locId: string) => {
    setSelectedPropertyId(locId)
    loadPropertyData(locId)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove resident "${name}"?`)) return

    try {
      await residentService.deleteResident(id)
      if (selectedPropertyId) loadPropertyData(selectedPropertyId)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete resident')
    }
  }

  // Filter residents based on search & filter dropdowns
  const filteredResidents = residents.filter((r) => {
    const matchesSearch =
      `${r.firstName} ${r.lastName || ''} ${r.username || ''} ${r.phone || ''} ${r.unit?.unit_number || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'ALL' || r.residentType === filterType

    const matchesResiding =
      filterResiding === 'ALL' ||
      (filterResiding === 'RESIDING' && r.isResiding) ||
      (filterResiding === 'OFFSITE' && !r.isResiding)

    return matchesSearch && matchesType && matchesResiding
  })

  // Table Columns matching Employee Screen Column Defs
  const columns: ColumnDef<ResidentItem>[] = [
    {
      accessorKey: 'firstName',
      header: 'Resident',
      cell: ({ row }) => {
        const r = row.original
        const fullName = `${r.firstName} ${r.lastName || ''}`.trim()
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#005390]/10 text-[#005390] flex items-center justify-center font-bold text-xs shrink-0">
              {r.firstName[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white text-sm">{fullName}</div>
              {r.email && <div className="text-[10px] text-gray-400">{r.email}</div>}
              {r.familyMembers && r.familyMembers.length > 0 && (
                <div className="text-[10px] text-[#005390] font-semibold mt-0.5">
                  + {r.familyMembers.length} Family Member(s)
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: 'unit',
      header: 'Flat / Unit',
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold">
            <Home className="w-3.5 h-3.5 text-gray-400" />
            Unit {r.unit?.unit_number || 'N/A'}
          </div>
        )
      },
    },
    {
      accessorKey: 'residentType',
      header: 'Type',
      cell: ({ row }) => {
        const r = row.original
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              r.residentType === 'OWNER'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400'
                : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-400'
            }`}
          >
            {r.residentType}
          </span>
        )
      },
    },
    {
      id: 'residingStatus',
      header: 'Residing Status',
      cell: ({ row }) => {
        const r = row.original
        return r.isResiding ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400">
            <Check className="w-3 h-3" />
            Physically Residing
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400">
            Off-site Landlord
          </span>
        )
      },
    },
    {
      accessorKey: 'username',
      header: 'Mobile Handle',
      cell: ({ row }) => {
        const r = row.original
        return r.username ? (
          <span className="text-[#005390] font-semibold text-xs font-mono">@{r.username}</span>
        ) : (
          <span className="text-gray-400 text-xs">No Handle</span>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: 'Contact',
      cell: ({ row }) => {
        const r = row.original
        return <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">{r.phone || 'N/A'}</span>
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#005390] hover:bg-[#005390]/10 hover:text-[#005390] transition-colors cursor-pointer shadow-2xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                title="Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-2xl p-1.5 shadow-xl border border-gray-100 bg-white dark:bg-slate-900 dark:border-gray-800"
              >
                <DropdownMenuItem
                  onClick={() => navigate(`/admin/residents/edit/${r.id}`)}
                  className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Edit className="h-3.5 w-3.5 text-[#005390]" />
                  Edit Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleDelete(r.id, `${r.firstName} ${r.lastName || ''}`)}
                  className="flex items-center gap-2 text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  Remove Resident
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  // Filter Bar controls passed into DataTable
  const filterControls = (
    <div className="flex flex-wrap items-center gap-3 w-full">
      {/* Property Selector */}
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="active-property-select" className="block text-xs font-semibold text-gray-500 mb-1">
          Active Property
        </label>
        <div className="relative">
          <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <select
            id="active-property-select"
            value={selectedPropertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="h-9 w-full pl-9 pr-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390] shadow-2xs"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.property_name} ({p.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resident Type Filter */}
      <div className="min-w-[160px]">
        <label htmlFor="filter-type-select" className="block text-xs font-semibold text-gray-500 mb-1">
          Resident Type
        </label>
        <select
          id="filter-type-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 w-full px-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390] shadow-2xs"
        >
          <option value="ALL">All Types (Owner, Tenant)</option>
          <option value="OWNER">Owner Only</option>
          <option value="TENANT">Tenant Only</option>
        </select>
      </div>

      {/* Residing Status Filter */}
      <div className="min-w-[180px]">
        <label htmlFor="filter-residing-select" className="block text-xs font-semibold text-gray-500 mb-1">
          Residing Status
        </label>
        <select
          id="filter-residing-select"
          value={filterResiding}
          onChange={(e) => setFilterResiding(e.target.value)}
          className="h-9 w-full px-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390] shadow-2xs"
        >
          <option value="ALL">All Occupants</option>
          <option value="RESIDING">Physically Residing</option>
          <option value="OFFSITE">Off-site Landlord</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Card (Same as Employee Screen Header) ────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 dark:text-white">
            <UserCheck className="w-5 h-5 text-[#005390]" />
            Resident Directory & Onboarding
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Onboard Owners and Tenants, track flat occupancy status, and manage mobile app credentials.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => navigate('/admin/residents/create')}
        >
          Onboard Resident / Tenant
        </Button>
      </div>

      {/* ── Main Data Table (Same as Employee Screen DataTable) ─────────────── */}
      <DataTable
        columns={columns}
        data={filteredResidents}
        isLoading={isLoading}
        error={error || undefined}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search Name, @username, Unit #..."
        filterActions={filterControls}
      />
    </div>
  )
}

export default ResidentListScreen
