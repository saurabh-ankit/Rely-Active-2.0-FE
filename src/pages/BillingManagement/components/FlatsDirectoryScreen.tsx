import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  ReceiptIndianRupee,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocationContext } from '@/hooks/useLocation'
import { useGetInvoices, useGetUnitsBillingSummary } from '@/hooks/react-query/billing'

const formatMoveInDate = (dateStr?: string | Date | null) => {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return null
  }
}

const getInvoiceTotal = (inv: Record<string, unknown>): number => {
  const val = Number(inv?.grandTotal ?? inv?.total ?? 0)
  return isNaN(val) ? 0 : val
}

const getInvoicePaid = (inv: Record<string, unknown>): number => {
  const val = Number(inv?.amountPaid ?? inv?.paidAmount ?? 0)
  return isNaN(val) ? 0 : val
}

const getInvoiceDue = (inv: Record<string, unknown>): number => {
  if (inv?.amountDue !== undefined && inv?.amountDue !== null && !isNaN(Number(inv.amountDue))) {
    return Number(inv.amountDue)
  }
  return Math.max(0, getInvoiceTotal(inv) - getInvoicePaid(inv))
}

export const FlatsDirectoryScreen: React.FC = () => {
  const navigate = useNavigate()
  const { selectedLocationId } = useLocationContext()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Queries
  const { data: unitsSummaryData, isLoading: unitsLoading } = useGetUnitsBillingSummary(selectedLocationId || undefined)

  const { data: invoicesData, isLoading: invoicesLoading } = useGetInvoices({
    locationId: selectedLocationId || undefined,
  })

  const units = useMemo(() => (Array.isArray(unitsSummaryData?.data) ? unitsSummaryData.data : []), [unitsSummaryData])
  const invoices = useMemo(() => (Array.isArray(invoicesData?.data) ? invoicesData.data : []), [invoicesData])

  // Aggregate metrics
  const totalInvoiced = useMemo(() => invoices.reduce((acc, inv) => acc + getInvoiceTotal(inv), 0), [invoices])
  const totalPaid = useMemo(() => invoices.reduce((acc, inv) => acc + getInvoicePaid(inv), 0), [invoices])
  const totalDue = useMemo(() => invoices.reduce((acc, inv) => acc + getInvoiceDue(inv), 0), [invoices])

  const occupiedFlatsCount = useMemo(
    () => units.filter((u) => (u.occupancyStatus && u.occupancyStatus !== 'VACANT') || !!u.primaryResident).length,
    [units],
  )

  // Filtered units (strictly occupied flats only)
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const isOccupied = (u.occupancyStatus && u.occupancyStatus !== 'VACANT') || !!u.primaryResident
      if (!isOccupied) return false

      const q = searchTerm.toLowerCase().trim()
      if (!q) return true

      const unitNumStr = String(u.unitNumber || '')
      const matchNumber = unitNumStr.toLowerCase().includes(q)
      const matchResident = u.primaryResident?.name?.toLowerCase().includes(q) ?? false
      const matchPayer = u.primaryPayer?.name?.toLowerCase().includes(q) ?? false
      const matchFolio = u.folio?.accountNumber?.toLowerCase().includes(q) ?? false
      const matchFamily = u.residents?.some((r) => r.name?.toLowerCase().includes(q)) ?? false
      return matchNumber || matchResident || matchPayer || matchFolio || matchFamily
    })
  }, [units, searchTerm])

  // Reset page on location change
  const [prevLocationId, setPrevLocationId] = useState(selectedLocationId)
  if (selectedLocationId !== prevLocationId) {
    setPrevLocationId(selectedLocationId)
    setCurrentPage(1)
  }

  // Pagination calculation with automatic boundary guard
  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / pageSize))
  if (currentPage > totalPages) {
    setCurrentPage(1)
  }

  const safePage = Math.min(currentPage, totalPages)
  const paginatedUnits = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredUnits.slice(start, start + pageSize)
  }, [filteredUnits, safePage, pageSize])

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#005390]">
              <ReceiptIndianRupee className="w-6 h-6" />
            </div>
            Billing & Revenue Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Select any occupied flat to view its dedicated billing dashboard, monthly invoices, subscriptions, and
            ledger
          </p>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Occupied Flats
            </CardTitle>
            <Home className="w-4 h-4 text-[#005390]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{unitsLoading ? '...' : occupiedFlatsCount}</div>
            <p className="text-xs text-gray-500 mt-1">Occupied flats across property</p>
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

      {/* Directory Search & Table */}
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
            No occupied flats matched your search criteria.
          </div>
        ) : (
          /* ── TABLE VIEW WITH PAGINATION ─────────────────────────────────── */
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-gray-200">
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5 pl-4">
                    Flat / Unit
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5">
                    Residents & Family Members
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5">
                    Bill-To Payer
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider py-3.5">
                    Balance / Due
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUnits.map((unit, idx) => {
                  const isOccupied =
                    (unit.occupancyStatus && unit.occupancyStatus !== 'VACANT') || !!unit.primaryResident
                  const dueVal = Number(unit.financialMetrics?.totalOutstanding || 0)
                  const creditVal = Number(unit.folio?.creditBalance || 0)
                  const hasDue = dueVal > 0
                  const hasCredit = creditVal > 0
                  const targetId = unit.unitId || unit.id || ''

                  return (
                    <TableRow
                      key={targetId || `unit-${unit.unitNumber || idx}`}
                      onClick={() => {
                        if (targetId) navigate(`unit/${targetId}`)
                      }}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group border-b border-gray-100"
                    >
                      {/* Flat Unit Info */}
                      <TableCell className="py-3.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-sm text-[#005390] group-hover:underline">
                            Flat {unit.unitNumber || targetId || 'N/A'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {unit.floorNumber !== undefined && unit.floorNumber !== null
                            ? `Floor ${unit.floorNumber}`
                            : ''}
                          {unit.blockName ? ` • Tower ${unit.blockName}` : ''}
                          {unit.unitType ? ` • ${unit.unitType}` : ''}
                        </div>
                        {formatMoveInDate(unit.moveInDate || unit.primaryResident?.moveInDate) && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md mt-1.5 font-medium">
                            <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>
                              Moved In: {formatMoveInDate(unit.moveInDate || unit.primaryResident?.moveInDate)}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Residents & Family Members */}
                      <TableCell className="py-3.5">
                        {unit.residents && unit.residents.length > 0 ? (
                          <div className="space-y-1.5">
                            {unit.residents.map((r, rIdx) => (
                              <div key={r.id || `res-${rIdx}`} className="flex items-center gap-2">
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${
                                    r.isPrimary || (!r.isFamilyMember && rIdx === 0)
                                      ? 'bg-blue-100 text-[#005390]'
                                      : r.isFamilyMember
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-slate-100 text-gray-600'
                                  }`}
                                >
                                  {r.name ? r.name.charAt(0).toUpperCase() : 'R'}
                                </div>
                                <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-semibold text-gray-800">{r.name}</span>
                                  {r.relationship && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                        r.isFamilyMember
                                          ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                                          : 'bg-slate-100 text-gray-600'
                                      }`}
                                    >
                                      {r.relationship}
                                    </span>
                                  )}
                                  {r.phone && <span className="text-[10px] text-gray-400 font-mono">{r.phone}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : unit.primaryResident?.name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-[#005390] flex items-center justify-center font-bold text-[9px] shrink-0">
                              {unit.primaryResident.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-gray-800">{unit.primaryResident.name}</span>
                              {unit.primaryResident.relationship && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-gray-600 font-medium">
                                  {unit.primaryResident.relationship}
                                </span>
                              )}
                              {unit.primaryResident.phone && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {unit.primaryResident.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No Residents Assigned</span>
                        )}
                      </TableCell>

                      {/* Bill-To Payer Account */}
                      <TableCell className="py-3.5">
                        {isOccupied ? (
                          <div className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                            {unit.primaryPayer?.name || unit.primaryResident?.name || 'Self-Payer'}
                            {unit.primaryPayer?.role && (
                              <span className="text-[10px] text-gray-400 font-normal">({unit.primaryPayer.role})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </TableCell>

                      {/* Balance / Financial Status */}
                      <TableCell className="py-3.5">
                        {hasDue ? (
                          <div className="font-mono font-bold text-xs text-rose-600">
                            ₹
                            {dueVal.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        ) : hasCredit ? (
                          <div className="font-mono font-bold text-xs text-emerald-600">
                            +₹
                            {creditVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        ) : isOccupied ? (
                          Number(unit.financialMetrics?.invoicesCount || 0) > 0 ? (
                            <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Paid</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No Invoices</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── PAGINATION CONTROLS ────────────────────────────────────────── */}
        {!unitsLoading && filteredUnits.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Showing <span className="font-semibold text-gray-900">{(safePage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-gray-900">
                  {Math.min(safePage * pageSize, filteredUnits.length)}
                </span>{' '}
                of <span className="font-semibold text-gray-900">{filteredUnits.length}</span> flats
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="bg-slate-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-700 outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="h-8 px-2.5 text-xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>

              <div className="text-xs text-gray-600 px-2 font-medium">
                Page <span className="font-bold text-gray-900">{safePage}</span> of{' '}
                <span className="font-bold text-gray-900">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
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
