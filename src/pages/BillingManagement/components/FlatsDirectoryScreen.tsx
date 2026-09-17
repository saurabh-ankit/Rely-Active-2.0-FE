import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LayoutGrid,
  List,
  Package,
  ReceiptIndianRupee,
  RefreshCw,
  Search,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocationContext } from '@/hooks/useLocation'
import { useGetInvoices, useGetUnitsBillingSummary } from '@/hooks/react-query/billing'

export const FlatsDirectoryScreen: React.FC = () => {
  const navigate = useNavigate()
  const { selectedLocationId, selectedLocationName } = useLocationContext()
  const [searchTerm, setSearchTerm] = useState('')
  // Default to OCCUPIED as requested for immediate resident visibility
  const [filterMode, setFilterMode] = useState<'OCCUPIED' | 'ALL' | 'OUTSTANDING' | 'VACANT'>('OCCUPIED')
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Queries
  const {
    data: unitsSummaryData,
    isLoading: unitsLoading,
    refetch: refetchUnits,
  } = useGetUnitsBillingSummary(selectedLocationId || undefined)

  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
  } = useGetInvoices({
    propertyId: selectedLocationId || undefined,
  })

  const units = useMemo(() => (Array.isArray(unitsSummaryData?.data) ? unitsSummaryData.data : []), [unitsSummaryData])
  const invoices = useMemo(() => (Array.isArray(invoicesData?.data) ? invoicesData.data : []), [invoicesData])

  // Aggregate metrics
  const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.grandTotal || 0), 0)
  const totalPaid = invoices.reduce((acc, inv) => acc + Number(inv.amountPaid || 0), 0)
  const totalDue = invoices.reduce((acc, inv) => acc + Number(inv.amountDue || 0), 0)

  const occupiedFlatsCount = units.filter(
    (u) => (u.occupancyStatus && u.occupancyStatus !== 'VACANT') || !!u.primaryResident,
  ).length

  const outstandingFlatsCount = units.filter((u) => Number(u.financialMetrics?.totalOutstanding || 0) > 0).length

  // Filtered units
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const q = searchTerm.toLowerCase().trim()
      const matchNumber = u.unitNumber.toLowerCase().includes(q)
      const matchResident = u.primaryResident?.name?.toLowerCase().includes(q)
      const matchPayer = u.primaryPayer?.name?.toLowerCase().includes(q)
      const matchFolio = u.folio?.accountNumber?.toLowerCase().includes(q)
      const matchesSearch = !q || matchNumber || matchResident || matchPayer || matchFolio

      if (!matchesSearch) return false

      const isOccupied = (u.occupancyStatus && u.occupancyStatus !== 'VACANT') || !!u.primaryResident
      const hasDue = Number(u.financialMetrics?.totalOutstanding || 0) > 0

      if (filterMode === 'OCCUPIED') return isOccupied
      if (filterMode === 'OUTSTANDING') return hasDue
      if (filterMode === 'VACANT') return !isOccupied

      return true
    })
  }, [units, searchTerm, filterMode])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / pageSize))
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUnits.slice(start, start + pageSize)
  }, [filteredUnits, currentPage, pageSize])

  const handleFilterChange = (mode: 'OCCUPIED' | 'ALL' | 'OUTSTANDING' | 'VACANT') => {
    setFilterMode(mode)
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    refetchUnits()
    refetchInvoices()
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#005390]">
              <ReceiptIndianRupee className="w-6 h-6" />
            </div>
            Billing & Revenue Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Select any flat to view its dedicated billing dashboard, monthly invoices, subscriptions, and sacred ledger
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs px-3 py-1 font-medium bg-slate-50 border-gray-200">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            {selectedLocationName || 'All Properties'}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={unitsLoading || invoicesLoading}
            className="text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${unitsLoading || invoicesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Flats & Occupancy
            </CardTitle>
            <Home className="w-4 h-4 text-[#005390]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {unitsLoading ? '...' : `${occupiedFlatsCount} / ${units.length}`}
            </div>
            <p className="text-xs text-gray-500 mt-1">{units.length - occupiedFlatsCount} vacant flats available</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Invoiced
            </CardTitle>
            <FileText className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {invoicesLoading
                ? '...'
                : `₹${totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            </div>
            <p className="text-xs text-gray-500 mt-1">{invoices.length} invoices generated across property</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Collected
            </CardTitle>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {invoicesLoading
                ? '...'
                : `₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            </div>
            <p className="text-xs text-gray-500 mt-1">Settled payments received</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Outstanding
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {invoicesLoading
                ? '...'
                : `₹${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            </div>
            <p className="text-xs text-gray-500 mt-1">Receivables pending settlement</p>
          </CardContent>
        </Card>
      </div>

      {/* Directory Controls & Search */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by flat, resident, payer, folio..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 text-xs bg-slate-50 border-gray-200 h-9"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
            {/* Filter Pills with OCCUPIED First */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <Button
                variant={filterMode === 'OCCUPIED' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterChange('OCCUPIED')}
                className={`text-xs h-7.5 px-3 rounded-lg cursor-pointer transition-all ${
                  filterMode === 'OCCUPIED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Occupied ({occupiedFlatsCount})
              </Button>

              <Button
                variant={filterMode === 'ALL' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterChange('ALL')}
                className={`text-xs h-7.5 px-3 rounded-lg cursor-pointer transition-all ${
                  filterMode === 'ALL'
                    ? 'bg-[#005390] hover:bg-[#004273] text-white font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Flats ({units.length})
              </Button>

              <Button
                variant={filterMode === 'OUTSTANDING' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterChange('OUTSTANDING')}
                className={`text-xs h-7.5 px-3 rounded-lg cursor-pointer transition-all ${
                  filterMode === 'OUTSTANDING'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Outstanding Due {outstandingFlatsCount > 0 ? `(${outstandingFlatsCount})` : ''}
              </Button>

              <Button
                variant={filterMode === 'VACANT' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterChange('VACANT')}
                className={`text-xs h-7.5 px-3 rounded-lg cursor-pointer transition-all ${
                  filterMode === 'VACANT'
                    ? 'bg-slate-700 hover:bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Vacant ({units.length - occupiedFlatsCount})
              </Button>
            </div>

            {/* View Mode Toggle: Table vs Cards */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-gray-200">
              <Button
                variant={viewMode === 'TABLE' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('TABLE')}
                className={`h-7.5 px-2.5 rounded-lg cursor-pointer ${
                  viewMode === 'TABLE' ? 'bg-white text-[#005390] shadow-xs' : 'text-gray-500'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs font-medium">Table</span>
              </Button>

              <Button
                variant={viewMode === 'GRID' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('GRID')}
                className={`h-7.5 px-2.5 rounded-lg cursor-pointer ${
                  viewMode === 'GRID' ? 'bg-white text-[#005390] shadow-xs' : 'text-gray-500'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs font-medium">Cards</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {unitsLoading ? (
          <div className="py-20 text-center text-gray-400 text-xs">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-[#005390]" />
            Loading property flats and financial accounts...
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-xs">
            <Home className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            No flats matched the current filter or search criteria.
          </div>
        ) : viewMode === 'TABLE' ? (
          /* ── TABLE VIEW WITH PAGINATION ─────────────────────────────────── */
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-gray-200">
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5 pl-4">
                    Flat / Unit
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5">
                    Occupancy
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5">
                    Senior Resident
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5">
                    Bill-To Payer & Folio
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5 text-center">
                    Packages
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5 text-right">
                    Balance / Due
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5 text-right pr-4">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUnits.map((unit) => {
                  const isOccupied =
                    (unit.occupancyStatus && unit.occupancyStatus !== 'VACANT') || !!unit.primaryResident
                  const hasDue = Number(unit.financialMetrics?.totalOutstanding || 0) > 0
                  const hasCredit = Number(unit.folio?.creditBalance || 0) > 0
                  const targetId = unit.unitId || unit.id || ''

                  return (
                    <TableRow
                      key={targetId}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (targetId) navigate(`unit/${targetId}`)
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && targetId) {
                          e.preventDefault()
                          navigate(`unit/${targetId}`)
                        }
                      }}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer border-b border-gray-100 group"
                    >
                      {/* Flat Number & Type */}
                      <TableCell className="py-3.5 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#005390] group-hover:bg-[#005390] group-hover:text-white transition-colors flex items-center justify-center font-bold text-xs font-mono">
                            {unit.unitNumber}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-gray-900 group-hover:text-[#005390] transition-colors">
                              Flat {unit.unitNumber}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {unit.floorNumber !== undefined ? `Floor ${unit.floorNumber}` : ''}
                              {unit.blockName ? ` • ${unit.blockName}` : ''}
                              {unit.unitType ? ` • ${unit.unitType}` : ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Occupancy Status Badge */}
                      <TableCell className="py-3.5">
                        <Badge
                          className={`text-[10px] font-bold ${
                            isOccupied
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {isOccupied ? 'OCCUPIED' : 'VACANT'}
                        </Badge>
                      </TableCell>

                      {/* Senior Resident Details */}
                      <TableCell className="py-3.5">
                        {unit.primaryResident ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-[#005390] flex items-center justify-center font-bold text-xs shrink-0">
                              {unit.primaryResident.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-gray-900 truncate">
                                {unit.primaryResident.name}
                              </div>
                              {unit.primaryResident.phone && (
                                <div className="text-[10px] text-gray-400 truncate">{unit.primaryResident.phone}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No resident assigned</span>
                        )}
                      </TableCell>

                      {/* Bill-To Payer & Folio */}
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-medium text-xs text-gray-800 truncate">
                            {unit.primaryPayer?.name || unit.primaryResident?.name || (isOccupied ? 'Self-Payer' : '—')}
                            {unit.primaryPayer?.role && (
                              <span className="text-[10px] text-gray-400 ml-1">({unit.primaryPayer.role})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {unit.folio?.accountNumber ? `Folio: ${unit.folio.accountNumber}` : 'Pending Account'}
                          </div>
                        </div>
                      </TableCell>

                      {/* Packages / Subscriptions */}
                      <TableCell className="py-3.5 text-center">
                        {Number(unit.financialMetrics?.activeSubscriptionsCount || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                            <Package className="w-3 h-3 text-gray-500" />
                            {unit.financialMetrics.activeSubscriptionsCount} Sub
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </TableCell>

                      {/* Balance / Due */}
                      <TableCell className="py-3.5 text-right font-mono">
                        {hasDue ? (
                          <div>
                            <span className="font-bold text-xs text-rose-600">
                              ₹
                              {Number(unit.financialMetrics?.totalOutstanding).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            <span className="block text-[9px] uppercase tracking-wider text-rose-500 font-sans font-bold">
                              Due
                            </span>
                          </div>
                        ) : hasCredit ? (
                          <div>
                            <span className="font-bold text-xs text-emerald-600">
                              ₹{Number(unit.folio?.creditBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="block text-[9px] uppercase tracking-wider text-emerald-500 font-sans font-bold">
                              Advance Credit
                            </span>
                          </div>
                        ) : isOccupied ? (
                          Number(unit.financialMetrics?.invoicesCount || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> All Paid
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">No Invoices</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </TableCell>

                      {/* Action Button */}
                      <TableCell className="py-3.5 text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (targetId) navigate(`unit/${targetId}`)
                          }}
                          className="h-8 text-xs font-semibold text-[#005390] group-hover:bg-[#005390] group-hover:text-white transition-all cursor-pointer"
                        >
                          Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* ── CARDS GRID VIEW (WITH PAGINATION) ──────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
            {paginatedUnits.map((unit) => {
              const isOccupied = (unit.occupancyStatus && unit.occupancyStatus !== 'VACANT') || !!unit.primaryResident
              const hasDue = Number(unit.financialMetrics?.totalOutstanding || 0) > 0
              const hasCredit = Number(unit.folio?.creditBalance || 0) > 0
              const targetId = unit.unitId || unit.id || ''

              return (
                <div
                  key={targetId}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (targetId) navigate(`unit/${targetId}`)
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && targetId) {
                      e.preventDefault()
                      navigate(`unit/${targetId}`)
                    }
                  }}
                  className="bg-white border border-gray-200 hover:border-[#005390] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Header: Flat Number & Occupancy Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg text-gray-900 group-hover:text-[#005390] transition-colors">
                            {unit.unitNumber}
                          </span>
                          {unit.unitType && (
                            <Badge variant="outline" className="text-[10px] text-gray-600 bg-slate-50">
                              {unit.unitType}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {unit.floorNumber !== undefined ? `Floor ${unit.floorNumber}` : ''}
                          {unit.blockName ? ` • Block ${unit.blockName}` : ''}
                        </div>
                      </div>

                      <Badge
                        className={`text-[10px] font-bold ${
                          isOccupied
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {isOccupied ? 'OCCUPIED' : 'VACANT'}
                      </Badge>
                    </div>

                    {/* Occupant & Payer Information */}
                    <div className="py-3.5 space-y-3">
                      {isOccupied ? (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#005390] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {unit.primaryResident?.name ? unit.primaryResident.name.charAt(0).toUpperCase() : 'R'}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-gray-900 truncate">
                                {unit.primaryResident?.name}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                Resident {unit.primaryResident?.phone ? `• ${unit.primaryResident.phone}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-gray-100 text-[11px] space-y-1">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                              Bill-To Payer (Who Pays)
                            </div>
                            <div className="font-medium text-gray-800 flex items-center gap-1.5 truncate">
                              <User className="w-3 h-3 text-[#005390]" />
                              {unit.primaryPayer?.name || unit.primaryResident?.name || 'Self-Payer'}
                              {unit.primaryPayer?.role && (
                                <span className="text-[10px] text-gray-400 font-normal">
                                  ({unit.primaryPayer.role})
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              Folio: {unit.folio?.accountNumber || 'Pending Account'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="py-4 text-center text-gray-400 text-xs">
                          <Home className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                          Vacant Unit — Ready for Resident Onboarding
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Financial Balance & CTA */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div>
                      {hasDue ? (
                        <div>
                          <span className="text-[9px] uppercase font-bold text-rose-500 block tracking-wider">
                            Outstanding Due
                          </span>
                          <span className="font-bold text-sm text-rose-600 font-mono">
                            ₹
                            {Number(unit.financialMetrics?.totalOutstanding).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ) : hasCredit ? (
                        <div>
                          <span className="text-[9px] uppercase font-bold text-emerald-600 block tracking-wider">
                            Credit Balance
                          </span>
                          <span className="font-bold text-sm text-emerald-600 font-mono">
                            ₹{Number(unit.folio?.creditBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : isOccupied ? (
                        Number(unit.financialMetrics?.invoicesCount || 0) > 0 ? (
                          <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>All Bills Paid</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">No Invoices</span>
                        )
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">No Balance</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {Number(unit.financialMetrics?.activeSubscriptionsCount || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                          <Package className="w-3 h-3 text-gray-400" />
                          {unit.financialMetrics.activeSubscriptionsCount} Sub
                        </span>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-semibold text-[#005390] group-hover:translate-x-0.5 transition-transform cursor-pointer"
                      >
                        Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── PAGINATION CONTROLS ────────────────────────────────────────── */}
        {!unitsLoading && filteredUnits.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Showing <strong className="text-gray-900">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-gray-900">{Math.min(currentPage * pageSize, filteredUnits.length)}</strong> of{' '}
                <strong className="text-gray-900">{filteredUnits.length}</strong> flats
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-gray-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="bg-slate-50 border border-gray-200 text-xs rounded-md px-2 py-1 text-gray-700 cursor-pointer focus:outline-none focus:border-[#005390]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>

              <div className="text-xs text-gray-600 px-2 font-medium">
                Page <span className="font-bold text-gray-900">{currentPage}</span> of{' '}
                <span className="font-bold text-gray-900">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 text-xs cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
