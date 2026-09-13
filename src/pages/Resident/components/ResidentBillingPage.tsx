import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar, CheckCircle2, Clock, Plus, Printer, Receipt, Sparkles, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { residentService, type ResidentBillingData } from '@/lib/services/residentService'
import type { ResidentItem } from '@/lib/types/resident'

interface MiscService {
  id: string
  name: string
  description: string
  quantity: number
  price: number
  total: number
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const ResidentBillingPage: React.FC = () => {
  const navigate = useNavigate()
  const { id: paramId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const residentId = paramId || searchParams.get('residentId') || ''

  // All residents for dropdown selector
  const [allResidents, setAllResidents] = useState<ResidentItem[]>([])
  const [isLoadingResidents, setIsLoadingResidents] = useState(false)

  // Billing date selection
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1) // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())

  // Billing API data
  const [billingData, setBillingData] = useState<ResidentBillingData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Interactive state
  const [miscServices, setMiscServices] = useState<MiscService[]>([])
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat')
  const [discountValue, setDiscountValue] = useState<number>(0)

  // Add misc item modal
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false)
  const [miscName, setMiscName] = useState('')
  const [miscDescription, setMiscDescription] = useState('')
  const [miscQuantity, setMiscQuantity] = useState<number>(1)
  const [miscPrice, setMiscPrice] = useState<number>(0)

  // Load resident list for selector
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setIsLoadingResidents(true)
      residentService
        .getResidents()
        .then((residents) => {
          if (active) {
            setAllResidents(residents)
            if (!residentId && residents.length > 0) {
              setSearchParams({ residentId: residents[0].id })
            }
          }
        })
        .catch((e) => console.error('Failed to load residents for billing:', e))
        .finally(() => {
          if (active) setIsLoadingResidents(false)
        })
    }, 0)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [residentId, setSearchParams])

  // Fetch billing data when residentId, selectedMonth, or selectedYear changes
  useEffect(() => {
    if (!residentId) return

    let active = true
    const timer = setTimeout(() => {
      setIsLoading(true)
      setError(null)

      residentService
        .getResidentBilling(residentId, { month: selectedMonth, year: selectedYear })
        .then((data) => {
          if (active) {
            setBillingData(data)
          }
        })
        .catch((err: unknown) => {
          if (active) {
            const msg = err instanceof Error ? err.message : 'Failed to load billing details'
            setError(msg)
            toast.error(msg)
          }
        })
        .finally(() => {
          if (active) setIsLoading(false)
        })
    }, 0)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [residentId, selectedMonth, selectedYear])

  // Calculate dynamic services and totals (Without Room Rent)
  const {
    currentMonthCharges,
    refundCharges,
    addonTasks,
    grossTotal,
    refundTotal,
    subtotal,
    discountAmount,
    grandTotal,
  } = useMemo(() => {
    if (!billingData) {
      return {
        currentMonthCharges: [],
        refundCharges: [],
        addonTasks: [],
        grossTotal: 0,
        refundTotal: 0,
        subtotal: 0,
        discountAmount: 0,
        grandTotal: 0,
      }
    }

    const inv = billingData.invoice

    // Advance / Current month charges (Care Package only - Room Rent is excluded)
    const currCharges = inv.services.filter(
      (s) => s.category === 'Advance' && s.type !== 'ROOM' && (Number(s.total) || 0) >= 0,
    )

    // Refunds / Adjustments (Credit - unused periods, package changes, stopped packages)
    const refCharges = inv.services.filter(
      (s) => s.category === 'Refund' || s.type === 'REFUND' || (Number(s.total) || 0) < 0,
    )

    // Additional Tasks Done (exclusive of subscribed package) / Add-ons
    const rawAddTasks = inv.services.filter(
      (s) =>
        (s.category === 'Add-on' || s.category === 'Arrears' || s.type === 'ADDITIONAL_TASK') &&
        (Number(s.total) || 0) >= 0,
    )

    // Group same tasks by name & unit price to ensure increased quantity
    const addTasksMap = new Map<string, (typeof rawAddTasks)[0]>()
    for (const task of rawAddTasks) {
      const key = `${(task.name || '').trim().toLowerCase()}_${task.price}`
      if (!addTasksMap.has(key)) {
        addTasksMap.set(key, { ...task })
      } else {
        const existing = addTasksMap.get(key)!
        const existingQty =
          typeof existing.quantity === 'number' ? existing.quantity : parseInt(String(existing.quantity), 10) || 1
        const addQty = typeof task.quantity === 'number' ? task.quantity : parseInt(String(task.quantity), 10) || 1
        existing.quantity = existingQty + addQty
        existing.total = (Number(existing.total) || 0) + (Number(task.total) || 0)
      }
    }
    const addTasks = Array.from(addTasksMap.values())

    // Sum everything
    const advanceSum = currCharges.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
    const addonSum = addTasks.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
    const miscSum = miscServices.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
    const refundSum = refCharges.reduce((sum, item) => sum + Math.abs(Number(item.total) || 0), 0)

    const grossChargesTotal = advanceSum + addonSum + miscSum
    const rawSubtotal = Math.max(0, grossChargesTotal - refundSum)

    let calculatedDiscount = 0
    if (discountType === 'percentage') {
      calculatedDiscount = (rawSubtotal * Math.min(100, Math.max(0, discountValue))) / 100
    } else {
      calculatedDiscount = Math.min(rawSubtotal, Math.max(0, discountValue))
    }

    const calculatedTotal = Math.max(0, rawSubtotal - calculatedDiscount)

    return {
      currentMonthCharges: currCharges,
      refundCharges: refCharges,
      addonTasks: addTasks,
      grossTotal: Math.round(grossChargesTotal * 100) / 100,
      refundTotal: Math.round(refundSum * 100) / 100,
      subtotal: Math.round(rawSubtotal * 100) / 100,
      discountAmount: Math.round(calculatedDiscount * 100) / 100,
      grandTotal: Math.round(calculatedTotal * 100) / 100,
    }
  }, [billingData, miscServices, discountType, discountValue])

  const handleAddMiscItem = () => {
    if (!miscName.trim()) {
      toast.error('Please enter a service name')
      return
    }
    const qty = miscQuantity > 0 ? miscQuantity : 1
    const unitP = miscPrice >= 0 ? miscPrice : 0
    const newItem: MiscService = {
      id: `misc-${Date.now()}`,
      name: miscName.trim(),
      description: miscDescription.trim() || 'Ad-hoc service charge',
      quantity: qty,
      price: unitP,
      total: qty * unitP,
    }
    setMiscServices((prev) => [...prev, newItem])
    setMiscName('')
    setMiscDescription('')
    setMiscQuantity(1)
    setMiscPrice(0)
    setIsMiscModalOpen(false)
    toast.success('Service charge added')
  }

  const handleRemoveMiscItem = (id: string) => {
    setMiscServices((prev) => prev.filter((item) => item.id !== id))
    toast.info('Item removed')
  }

  const handlePrint = () => {
    window.print()
  }

  const handleGenerateInvoice = () => {
    toast.success(`Invoice for ${billingData?.resident.fullName || 'resident'} prepared successfully!`, {
      description: `Amount: ₹${grandTotal.toLocaleString('en-IN')}`,
    })
  }

  const resident = billingData?.resident
  const invoice = billingData?.invoice

  return (
    <div className="w-full space-y-6 pb-20 print:p-0 print:m-0 print:space-y-4">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              residentId ? navigate(`/admin/residents/details/${residentId}`) : navigate('/admin/residents')
            }
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Resident Profile
          </button>
        </div>

        {/* Action Buttons: Print & Generate */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="secondary"
            icon={<Printer className="w-4 h-4 text-gray-600" />}
            onClick={handlePrint}
            className="rounded-xl font-semibold border-gray-200 bg-white hover:bg-gray-50 shadow-xs"
          >
            Print Invoice
          </Button>

          <Button
            variant="primary"
            icon={<Receipt className="w-4 h-4 text-white" />}
            onClick={handleGenerateInvoice}
            className="rounded-xl font-bold bg-[#005390] hover:bg-[#004170] shadow-sm"
          >
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* ── Resident Selection & Switcher Bar ──────────────────────────── */}
      <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-3 rounded-2xl bg-[#005390]/10 text-[#005390] shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <label
              htmlFor="billing-resident-select"
              className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1"
            >
              Select Resident for Billing
            </label>
            <select
              id="billing-resident-select"
              value={residentId}
              onChange={(e) => setSearchParams({ residentId: e.target.value })}
              className="w-full max-w-md px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#005390]"
              disabled={isLoadingResidents}
            >
              {allResidents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstName} {r.lastName || ''} ({r.unit?.unit_number ? `Unit ${r.unit.unit_number}` : 'No unit'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-3 shrink-0">
          <div>
            <label
              htmlFor="billing-month-select"
              className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1"
            >
              Billing Month
            </label>
            <select
              id="billing-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#005390]"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="billing-year-select"
              className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1"
            >
              Year
            </label>
            <select
              id="billing-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#005390]"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Resident Overview & Billing Context Card ──────────────────── */}
      {resident && (
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6 print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#005390] to-sky-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0 border-2 border-white">
              {resident.firstName?.[0]?.toUpperCase() || 'R'}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{resident.fullName}</h1>
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  Unit {resident.unitNumber}
                </span>
                {resident.propertyName && (
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                    {resident.propertyName}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-600">
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {resident.residentType === 'OWNER' ? 'Property Owner' : 'Tenant Occupant'}
                </span>
                {resident.moveInDate && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <Calendar className="w-3.5 h-3.5" /> Move-in:{' '}
                    {new Date(resident.moveInDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {resident.package && (
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5" /> {resident.package.name} (₹
                    {resident.package.price.toLocaleString('en-IN')}/mo)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Billing Mode Badge & Period */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black uppercase tracking-wider">Monthly Billing</span>
            </div>
            <p className="text-[11px] text-gray-500 max-w-xs text-left md:text-right">
              Advance for Care Package + Additional Tasks Done (exclusive of subscribed package)
            </p>
            {invoice && (
              <div className="text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                Billing Period: {invoice.startDate} to {invoice.endDate}
                {invoice.isProrated && (
                  <span className="ml-2 text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                    Prorated ({invoice.billableDays} / {invoice.daysInMonth} Days)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Loading & Error States ────────────────────────────────────── */}
      {isLoading && (
        <div className="rounded-3xl border border-gray-100 bg-white/80 p-12 text-center shadow-lg">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#005390]" />
          <p className="mt-3 text-sm font-semibold text-gray-600">
            Calculating resident charges & invoice breakdown...
          </p>
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-center text-rose-700 font-semibold shadow-sm">
          {error}
        </div>
      )}

      {/* ── Main Invoice Breakdown Table ──────────────────────────────── */}
      {!isLoading && !error && invoice && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/80 bg-white/90 shadow-xl backdrop-blur-xl overflow-hidden print:border print:shadow-none">
            <div className="p-5 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Services & Charges Breakdown</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Itemization of Care Package and Add-on Tasks for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </p>
              </div>

              <Button
                variant="secondary"
                icon={<Plus className="w-4 h-4 text-[#005390]" />}
                onClick={() => setIsMiscModalOpen(true)}
                className="rounded-xl font-bold border-[#005390]/30 text-[#005390] hover:bg-blue-50/50 shadow-xs print:hidden"
              >
                Add Miscellaneous Service
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Service</th>
                    <th className="py-3.5 px-6">Description</th>
                    <th className="py-3.5 px-6 text-right">Quantity</th>
                    <th className="py-3.5 px-6 text-right">Price</th>
                    <th className="py-3.5 px-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {/* ── Section 1: Current Month Charges (Advance) ── */}
                  {currentMonthCharges.length > 0 && (
                    <>
                      <tr className="bg-emerald-50/60">
                        <td
                          colSpan={5}
                          className="py-2.5 px-6 text-xs font-black text-emerald-700 uppercase tracking-wider"
                        >
                          Current Month Charges (Advance)
                        </td>
                      </tr>
                      {currentMonthCharges.map((svc) => (
                        <tr key={svc.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{svc.name}</span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                                Advance
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-gray-600 text-xs">{svc.description}</td>
                          <td className="py-3.5 px-6 text-right text-gray-900 font-semibold">{svc.quantity}</td>
                          <td className="py-3.5 px-6 text-right font-semibold text-gray-900">
                            ₹{Number(svc.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-6 text-right font-bold text-gray-900">
                            ₹{Number(svc.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* ── Section 2: Refunds & Adjustments (Credit) ── */}
                  {refundCharges.length > 0 && (
                    <>
                      <tr className="bg-teal-50/70">
                        <td
                          colSpan={5}
                          className="py-2.5 px-6 text-xs font-black text-teal-800 uppercase tracking-wider"
                        >
                          Refunds & Adjustments (Credit)
                        </td>
                      </tr>
                      {refundCharges.map((svc) => (
                        <tr key={svc.id} className="bg-teal-50/20 hover:bg-teal-50/50 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-gray-900">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span>{svc.name}</span>
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200">
                                  Refund
                                </span>
                              </div>
                              <span className="text-[11px] text-emerald-600 font-medium italic">
                                Credit — unused period refund
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-gray-600 text-xs italic">{svc.description}</td>
                          <td className="py-3.5 px-6 text-right text-gray-900 font-semibold">{svc.quantity}</td>
                          <td className="py-3.5 px-6 text-right font-semibold text-emerald-700">
                            ₹{Number(svc.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-6 text-right font-bold">
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                              - ₹{Math.abs(Number(svc.total)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* ── Section 3: Additional Tasks Done (exclusive of subscribed package) / Add-ons ── */}
                  <tr className="bg-orange-50/60">
                    <td colSpan={5} className="py-2.5 px-6 text-xs font-black text-orange-700 uppercase tracking-wider">
                      Additional Tasks Done (exclusive of subscribed package) — Add-ons
                    </td>
                  </tr>

                  {addonTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 px-6 text-xs text-gray-500 italic bg-gray-50/30">
                        No additional tasks (exclusive of package) recorded for this billing cycle.
                      </td>
                    </tr>
                  ) : (
                    addonTasks.map((svc) => (
                      <tr key={svc.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{svc.name}</span>
                            <span className="text-[10px] font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full uppercase">
                              Add-on
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-gray-600 text-xs">
                          <div className="font-medium text-gray-800">{svc.description}</div>
                          {(svc.formattedDate || svc.date) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                              <Clock className="w-3 h-3 shrink-0 text-gray-400" />
                              <span>{svc.formattedDate || svc.date}</span>
                              {svc.nurseName && <span className="ml-1">• By: {svc.nurseName}</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right text-gray-900 font-semibold">{svc.quantity}</td>
                        <td className="py-3.5 px-6 text-right font-semibold text-gray-900">
                          ₹{Number(svc.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-gray-900">
                          ₹{Number(svc.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* ── Section 3: Miscellaneous Services ── */}
                  {miscServices.length > 0 && (
                    <>
                      <tr className="bg-purple-50/60">
                        <td
                          colSpan={5}
                          className="py-2.5 px-6 text-xs font-black text-purple-700 uppercase tracking-wider"
                        >
                          Miscellaneous Services & Fees
                        </td>
                      </tr>
                      {miscServices.map((misc) => (
                        <tr key={misc.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{misc.name}</span>
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full uppercase">
                                Custom
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMiscItem(misc.id)}
                                className="text-gray-400 hover:text-rose-600 p-1 rounded-md cursor-pointer transition-colors print:hidden"
                                title="Delete service item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-gray-600 text-xs">{misc.description}</td>
                          <td className="py-3.5 px-6 text-right text-gray-900 font-semibold">{misc.quantity}</td>
                          <td className="py-3.5 px-6 text-right font-semibold text-gray-900">
                            ₹{Number(misc.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-6 text-right font-bold text-gray-900">
                            ₹{Number(misc.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Summary & Discounts Footer ── */}
            <div className="p-6 bg-gradient-to-br from-gray-50/70 to-white border-t border-gray-200 flex flex-col md:flex-row items-end justify-between gap-6">
              {/* Left Column: Discount / Adjustments Input Controls */}
              <div className="w-full md:w-80 space-y-3 print:hidden">
                <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Apply Discount</span>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setDiscountType('flat')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        discountType === 'flat'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Flat (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        discountType === 'percentage'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Percent (%)
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      step={discountType === 'percentage' ? '1' : '100'}
                      value={discountValue === 0 ? '' : discountValue}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        setDiscountValue(isNaN(val) ? 0 : val)
                      }}
                      placeholder="0"
                      className="text-right font-bold text-sm bg-white rounded-xl h-9"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">
                      {discountType === 'percentage' ? '%' : '₹'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Totals Computation Table */}
              <div className="w-full md:w-80 space-y-2.5">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span className="font-medium">Gross Charges</span>
                  <span className="font-bold text-gray-900">
                    ₹{grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {refundTotal > 0 && (
                  <div className="flex justify-between items-center text-sm text-emerald-700">
                    <span className="font-medium">Refund / Credit Deduction</span>
                    <span className="font-bold">
                      - ₹{refundTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-bold text-gray-900">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm text-emerald-700">
                    <span className="font-medium">
                      Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Flat'})
                    </span>
                    <span className="font-bold">
                      - ₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                  <span className="text-base font-black text-gray-900 uppercase tracking-tight">Total Payable</span>
                  <span className="text-2xl font-black text-[#005390]">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                    Currency: INR (₹)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Miscellaneous Item Modal ──────────────────────────────────── */}
      <Dialog open={isMiscModalOpen} onOpenChange={setIsMiscModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Add Miscellaneous Service</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Add custom ad-hoc services, equipment rentals, or special assistance to this invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs font-bold text-gray-700">Service Name *</Label>
              <Input
                placeholder="e.g. Wheelchair Rental, Special Assistance"
                value={miscName}
                onChange={(e) => setMiscName(e.target.value)}
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700">Description</Label>
              <Input
                placeholder="Optional notes or details"
                value={miscDescription}
                onChange={(e) => setMiscDescription(e.target.value)}
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-gray-700">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={miscQuantity}
                  onChange={(e) => setMiscQuantity(parseInt(e.target.value, 10) || 1)}
                  className="mt-1 rounded-xl text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700">Unit Price (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={miscPrice === 0 ? '' : miscPrice}
                  onChange={(e) => setMiscPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-1 rounded-xl text-sm font-semibold"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-800 flex justify-between items-center">
              <span>Item Total:</span>
              <span className="font-bold text-sm">
                ₹{((miscQuantity > 0 ? miscQuantity : 1) * (miscPrice >= 0 ? miscPrice : 0)).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setIsMiscModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddMiscItem}
              className="rounded-xl bg-[#005390] hover:bg-[#004170] text-white font-bold"
            >
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ResidentBillingPage
