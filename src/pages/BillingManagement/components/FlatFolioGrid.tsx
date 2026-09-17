import React, { useState } from 'react'
import { Home, User, CreditCard, Search, ArrowRight, Building2, CheckCircle2, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UnitBillingSummary } from '@/lib/types/billing'

interface FlatFolioGridProps {
  units: UnitBillingSummary[]
  isLoading: boolean
  onSelectUnit: (unitId: string) => void
}

export const FlatFolioGrid: React.FC<FlatFolioGridProps> = ({ units, isLoading, onSelectUnit }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'ALL' | 'OCCUPIED' | 'OUTSTANDING' | 'VACANT'>('ALL')

  const filteredUnits = units.filter((u) => {
    // Search match
    const q = searchTerm.toLowerCase()
    const matchNumber = u.unitNumber.toLowerCase().includes(q)
    const matchResident = u.primaryResident?.name.toLowerCase().includes(q)
    const matchPayer = u.primaryPayer?.name.toLowerCase().includes(q)
    const matchFolio = u.folio?.accountNumber.toLowerCase().includes(q)
    const matchesSearch = !q || matchNumber || matchResident || matchPayer || matchFolio

    if (!matchesSearch) return false

    // Filter match
    if (filterMode === 'OCCUPIED') return u.occupancyStatus !== 'VACANT' && !!u.primaryResident
    if (filterMode === 'OUTSTANDING') return u.financialMetrics.totalOutstanding > 0
    if (filterMode === 'VACANT') return u.occupancyStatus === 'VACANT' || !u.primaryResident

    return true
  })

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search flat (e.g. Villa-101), resident, folio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50 border-gray-200"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Flats', count: units.length },
            {
              id: 'OCCUPIED',
              label: 'Occupied',
              count: units.filter((u) => u.occupancyStatus !== 'VACANT' && !!u.primaryResident).length,
            },
            {
              id: 'OUTSTANDING',
              label: 'Overdue / Due',
              count: units.filter((u) => u.financialMetrics.totalOutstanding > 0).length,
            },
            {
              id: 'VACANT',
              label: 'Vacant',
              count: units.filter((u) => u.occupancyStatus === 'VACANT' || !u.primaryResident).length,
            },
          ].map((f) => {
            const isSelected = filterMode === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id as typeof filterMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected ? 'bg-[#005390] text-white shadow-sm' : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-gray-700'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid of Flat Cards */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400 text-xs">Loading flat directory & financial portfolios...</div>
      ) : filteredUnits.length === 0 ? (
        <div className="py-16 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200 p-8">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="font-semibold text-gray-700 text-sm">No Flats Found</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your search query or switching the filter tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUnits.map((unit) => {
            const isOccupied = unit.occupancyStatus !== 'VACANT' && !!unit.primaryResident
            const hasDue = unit.financialMetrics.totalOutstanding > 0
            const hasCredit = (unit.folio?.creditBalance ?? 0) > 0

            return (
              <div
                key={unit.unitId}
                role="button"
                tabIndex={0}
                onClick={() => onSelectUnit(unit.unitId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectUnit(unit.unitId)
                  }
                }}
                className="group bg-white rounded-2xl border border-gray-200/80 hover:border-[#005390]/40 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Unit Number & Badges */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-blue-50 text-[#005390] rounded-xl group-hover:bg-[#005390] group-hover:text-white transition-colors">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base text-gray-900 group-hover:text-[#005390] transition-colors">
                            {unit.unitNumber}
                          </h3>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {unit.unitType}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {unit.blockName || 'Main Block'} • Floor {unit.floorNumber ?? 1}
                        </div>
                      </div>
                    </div>

                    <Badge
                      className={
                        !isOccupied
                          ? 'bg-slate-100 text-slate-700 border-slate-200 text-[10px]'
                          : unit.occupancyStatus === 'OWNER_OCCUPIED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                      }
                    >
                      {unit.occupancyStatus}
                    </Badge>
                  </div>

                  {/* Body: Who lives here & Who pays */}
                  <div className="py-3.5 space-y-2.5 text-xs">
                    {/* Occupant */}
                    <div className="flex items-start gap-2 text-gray-700">
                      <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                          Occupant
                        </span>
                        {isOccupied ? (
                          <span className="font-semibold text-gray-900">
                            {unit.primaryResident?.name}
                            <span className="text-gray-400 font-normal ml-1">
                              ({unit.primaryResident?.relationship || 'Resident'})
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No resident residing</span>
                        )}
                      </div>
                    </div>

                    {/* Financial Sponsor / Folio */}
                    <div className="flex items-start gap-2 text-gray-700">
                      <CreditCard className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                          Financial Folio / Payer
                        </span>
                        {unit.folio ? (
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              {unit.primaryPayer ? unit.primaryPayer.name : 'Resident (Self-Pay)'}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 block">
                              {unit.folio.accountNumber} • {unit.folio.billingMode}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No folio created yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Ribbon: Balance & Action */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    {hasDue ? (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-red-500 block">Outstanding Due</span>
                        <span className="font-bold text-sm text-red-600 font-mono">
                          ₹
                          {Number(unit.financialMetrics.totalOutstanding).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ) : hasCredit ? (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-600 block">Credit Balance</span>
                        <span className="font-bold text-sm text-emerald-600 font-mono">
                          ₹{Number(unit.folio?.creditBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : isOccupied ? (
                      <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>All Bills Paid</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400">Vacant Flat</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {unit.financialMetrics.activeSubscriptionsCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded-md text-gray-600 font-medium">
                        <Package className="w-3 h-3 text-gray-400" />
                        {unit.financialMetrics.activeSubscriptionsCount} Sub
                        {unit.financialMetrics.activeSubscriptionsCount > 1 ? 's' : ''}
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-semibold text-[#005390] group-hover:translate-x-0.5 transition-transform"
                    >
                      360° Folio <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
