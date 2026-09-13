import React, { useState } from 'react'
import {
  Home,
  User,
  CreditCard,
  FileText,
  Repeat,
  Zap,
  BookOpen,
  PlusCircle,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGetUnitBilling360 } from '@/hooks/react-query/billing'
import { formatDateDDMMYYYY } from '@/lib/utils/dateFormat'

interface UnitFolio360DialogProps {
  unitId: string | null
  isOpen: boolean
  onClose: () => void
  onOpenInvoiceDetail: (invoiceId: string) => void
  onOpenGenerateInvoice?: (accountId: string) => void
}

export const UnitFolio360Dialog: React.FC<UnitFolio360DialogProps> = ({
  unitId,
  isOpen,
  onClose,
  onOpenInvoiceDetail,
  onOpenGenerateInvoice,
}) => {
  if (!isOpen || !unitId) return null

  const [activeTab, setActiveTab] = useState<'invoices' | 'subscriptions' | 'usage' | 'ledger' | 'parties'>('invoices')
  const { data, isLoading } = useGetUnitBilling360(unitId, isOpen)

  const unitData = data?.data
  const unit = unitData?.unit
  const folio = unitData?.folio
  const occupants = unitData?.occupants || []
  const primaryPayer = folio?.parties?.find((p) => p.role === 'PRIMARY_PAYER' && p.isActive) || folio?.parties?.[0]
  const subscriptions = unitData?.subscriptions || []
  const invoices = unitData?.invoices || []
  const pendingEvents = unitData?.pendingEvents || []
  const ledgerEntries = unitData?.ledger?.entries || []
  const creditBalance = unitData?.ledger?.creditBalance ?? 0

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0)
  const totalOutstanding = invoices
    .filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT' && inv.status !== 'PREVIEW')
    .reduce((sum, inv) => sum + Number(inv.amountDue || 0), 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">PAID</Badge>
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-800 border-red-200">OVERDUE</Badge>
      case 'PARTIALLY_PAID':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">PARTIAL</Badge>
      case 'FINALIZED':
      case 'SENT':
      case 'ISSUED':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">ISSUED</Badge>
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">DRAFT</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-[#003865] to-[#005390] text-white p-6 rounded-t-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Home className="w-6 h-6 text-white" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight">{unit?.unitNumber || 'Unit Folio'}</h2>
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                      {unit?.unitType || 'Unit'}
                    </Badge>
                    <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/30 text-xs">
                      {unit?.occupancyStatus || 'OCCUPIED'}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">
                    {unit?.blockName || 'Main Block'} • Floor {unit?.floorNumber ?? 1}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {folio && onOpenGenerateInvoice && (
                <Button
                  size="sm"
                  onClick={() => onOpenGenerateInvoice(folio.id)}
                  className="bg-white text-[#005390] hover:bg-slate-100 font-semibold shadow-sm text-xs"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Generate Invoice
                </Button>
              )}
            </div>
          </div>

          {/* Resident & Payer Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2.5 bg-white/5 p-2.5 rounded-lg border border-white/10">
              <User className="w-4 h-4 text-emerald-300 shrink-0" />
              <div>
                <span className="text-white/60 block text-[10px] uppercase font-bold tracking-wider">Occupant (Who Lives Here)</span>
                <span className="font-semibold text-white">
                  {occupants.length > 0 ? occupants.map((o) => `${o.name} (${o.relationship})`).join(', ') : 'No registered residents'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-white/5 p-2.5 rounded-lg border border-white/10">
              <CreditCard className="w-4 h-4 text-cyan-300 shrink-0" />
              <div>
                <span className="text-white/60 block text-[10px] uppercase font-bold tracking-wider">Financial Sponsor (Who Pays)</span>
                <span className="font-semibold text-white">
                  {primaryPayer ? `${primaryPayer.partyName} • ${primaryPayer.partyEmail || primaryPayer.partyPhone || primaryPayer.role}` : 'Self-Pay / Folio Payer'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial KPI Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-gray-200">
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Invoiced</div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              ₹{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">{invoices.length} historical invoices</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Outstanding Due</div>
            <div className={`text-lg font-bold mt-1 ${totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {totalOutstanding > 0 ? 'Payment required' : 'Fully settled'}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Active Packages</div>
            <div className="text-lg font-bold text-[#005390] mt-1">
              {subscriptions.filter((s) => s.status === 'ACTIVE').length} Active
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Recurring monthly services</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Unapplied Credit</div>
            <div className="text-lg font-bold text-emerald-600 mt-1">
              ₹{creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Advance deposit balance</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-gray-200">
          <nav className="flex space-x-6">
            {[
              { id: 'invoices', label: 'Invoices & Bills', count: invoices.length, icon: FileText },
              { id: 'subscriptions', label: 'Recurring Services', count: subscriptions.length, icon: Repeat },
              { id: 'usage', label: 'Pending Usage', count: pendingEvents.length, icon: Zap },
              { id: 'ledger', label: 'Sacred Ledger', count: ledgerEntries.length, icon: BookOpen },
              { id: 'parties', label: 'Folio & Payers', count: folio?.parties?.length || 0, icon: User },
            ].map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-1 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isSelected
                      ? 'border-[#005390] text-[#005390]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-blue-100 text-[#005390]' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400 text-xs">Loading 360° Folio data...</div>
          ) : !folio ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-gray-700">No Financial Folio Assigned to This Unit Yet</p>
              <p className="text-gray-400 text-[11px] mt-1">
                You can create a billing account to begin subscriptions, logging consumption, and issuing bills.
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: INVOICES */}
              {activeTab === 'invoices' && (
                <div>
                  {invoices.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-xs">
                      No invoices generated yet for this unit.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left">Invoice Number</th>
                            <th className="px-3 py-3 text-left">Period</th>
                            <th className="px-3 py-3 text-left">Issued / Due</th>
                            <th className="px-3 py-3 text-right">Grand Total</th>
                            <th className="px-3 py-3 text-right">Amount Due</th>
                            <th className="px-3 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-[#005390]">
                                {inv.invoiceNumber}
                              </td>
                              <td className="px-3 py-3 text-gray-600">
                                {formatDateDDMMYYYY(inv.periodStart)} to {formatDateDDMMYYYY(inv.periodEnd)}
                              </td>
                              <td className="px-3 py-3 text-gray-600">
                                <div>Issued: {formatDateDDMMYYYY(inv.issueDate)}</div>
                                <div className="text-[10px] text-gray-400">Due: {formatDateDDMMYYYY(inv.dueDate)}</div>
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-gray-900">
                                ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className={`px-3 py-3 text-right font-bold ${Number(inv.amountDue) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                ₹{Number(inv.amountDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {getStatusBadge(inv.status)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onOpenInvoiceDetail(inv.id)}
                                  className="text-[#005390] hover:text-[#003865] text-xs h-7"
                                >
                                  View Details →
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SUBSCRIPTIONS */}
              {activeTab === 'subscriptions' && (
                <div>
                  {subscriptions.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-xs">
                      No active recurring services assigned to this unit.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left">Service / Package</th>
                            <th className="px-3 py-3 text-left">Category</th>
                            <th className="px-3 py-3 text-left">Billing Frequency</th>
                            <th className="px-3 py-3 text-right">Qty</th>
                            <th className="px-3 py-3 text-right">Price / Month</th>
                            <th className="px-3 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {subscriptions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                <div>{sub.product?.productName || sub.description}</div>
                                {sub.description && (
                                  <div className="text-[10px] text-gray-400">{sub.description}</div>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <Badge variant="outline" className="text-[10px]">
                                  {sub.product?.category || 'SERVICE'}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 text-gray-600 font-mono text-[11px]">
                                {sub.billingFrequency}
                              </td>
                              <td className="px-3 py-3 text-right font-medium text-gray-900">
                                {sub.quantity}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-gray-900">
                                ₹{Number(sub.unitPrice * sub.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Badge
                                  className={
                                    sub.status === 'ACTIVE'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                      : 'bg-amber-100 text-amber-800 border-amber-200'
                                  }
                                >
                                  {sub.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PENDING USAGE */}
              {activeTab === 'usage' && (
                <div>
                  {pendingEvents.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-xs">
                      No pending unbilled usage events recorded for this unit.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left">Service Date</th>
                            <th className="px-3 py-3 text-left">Source Module</th>
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-3 py-3 text-left">Consumer</th>
                            <th className="px-3 py-3 text-right">Amount</th>
                            <th className="px-3 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {pendingEvents.map((evt) => (
                            <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-gray-600 font-mono">
                                {formatDateDDMMYYYY(evt.serviceDate)}
                              </td>
                              <td className="px-3 py-3">
                                <Badge variant="outline" className="text-[10px]">
                                  {evt.sourceModule}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-900 font-medium">
                                <div>{evt.description}</div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  {evt.chargeType} • Qty: {evt.quantity}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-gray-600">
                                {evt.resident ? `${evt.resident.firstName} ${evt.resident.lastName || ''}` : 'Resident'}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-gray-900">
                                ₹{Number(evt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                  PENDING
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SACRED LEDGER */}
              {activeTab === 'ledger' && (
                <div>
                  {ledgerEntries.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-xs">
                      No ledger transactions posted yet.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-3 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-3 py-3 text-right">Debit (₹)</th>
                            <th className="px-3 py-3 text-right">Credit (₹)</th>
                            <th className="px-4 py-3 text-right">Running Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {ledgerEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-mono text-gray-600">
                                {formatDateDDMMYYYY(entry.entryDate)}
                              </td>
                              <td className="px-3 py-3 font-semibold text-gray-800">
                                {entry.entryType}
                              </td>
                              <td className="px-4 py-3 text-gray-900">
                                <div>{entry.description}</div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  Ref: {entry.referenceType} ({entry.referenceId.slice(0, 8)}...)
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-semibold text-red-600">
                                {Number(entry.debitAmount) > 0
                                  ? `₹${Number(entry.debitAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                  : '—'}
                              </td>
                              <td className="px-3 py-3 text-right font-semibold text-emerald-600">
                                {Number(entry.creditAmount) > 0
                                  ? `₹${Number(entry.creditAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold font-mono text-gray-900">
                                ₹{Number(entry.runningBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: FOLIO & PAYERS */}
              {activeTab === 'parties' && (
                <div className="space-y-6">
                  {/* Folio Metadata */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 uppercase font-semibold text-[10px] block">Folio Number</span>
                      <span className="font-mono font-bold text-gray-900">{folio.accountNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase font-semibold text-[10px] block">Billing Mode</span>
                      <span className="font-semibold text-gray-900">{folio.billingMode}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase font-semibold text-[10px] block">Cycle</span>
                      <span className="font-semibold text-gray-900">{folio.billingCycle} (Day {folio.billingDay})</span>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase font-semibold text-[10px] block">Currency</span>
                      <span className="font-semibold text-gray-900">{folio.currency}</span>
                    </div>
                  </div>

                  {/* Registered Parties Table */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#005390]" />
                      Responsible Payers & Financial Sponsors
                    </h3>
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left">Payer Name</th>
                            <th className="px-3 py-3 text-left">Role</th>
                            <th className="px-4 py-3 text-left">Contact Info</th>
                            <th className="px-4 py-3 text-left">Billing Address</th>
                            <th className="px-3 py-3 text-left">GSTIN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {(folio.parties || []).map((party) => (
                            <tr key={party.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-semibold text-gray-900">
                                {party.partyName}
                                {party.isDefault && (
                                  <Badge className="ml-2 bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                    Default
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <Badge variant="outline" className="text-[10px]">
                                  {party.role}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                <div>{party.partyEmail || '—'}</div>
                                <div className="text-[10px] text-gray-400">{party.partyPhone || '—'}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                {party.partyAddress || '—'}
                              </td>
                              <td className="px-3 py-3 font-mono text-gray-600">
                                {party.partyGstin || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

