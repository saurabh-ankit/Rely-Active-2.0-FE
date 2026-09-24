import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  Eye,
  FileCheck,
  FileText,
  Home,
  Layers,
  Mail,
  Package,
  Phone,
  Plus,
  ReceiptIndianRupee,
  RefreshCw,
  Sparkles,
  Tag,
  User,
  Wrench,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import {
  useGetUnitBilling360,
  useGetUnitServices,
  useGenerateInvoice,
  useGetTaxSettings,
} from '@/hooks/react-query/billing'
import { useLocationContext } from '@/hooks/useLocation'
import { formatDateDDMMYYYY } from '@/lib/utils/dateFormat'
import { InvoiceDetailDialog } from './InvoiceDetailDialog'
import { AddMiscellaneousChargeModal } from './AddMiscellaneousChargeModal'
import { ReceivePaymentModal } from './ReceivePaymentModal'
import type { Invoice, BillingEvent } from '@/lib/types/billing'

export const FlatBillingDashboard: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { selectedLocationId } = useLocationContext()

  // Redirect if invalid or undefined unitId
  useEffect(() => {
    if (!unitId || unitId === 'undefined') {
      navigate('/admin/billing-management', { replace: true })
    }
  }, [unitId, navigate])

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'generate' | 'invoices' | 'unbilled' | 'subscriptions' | 'receipts' | 'profile'
  >('generate')

  // Invoice Detail Dialog
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false)
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false)
  const [editingBillingEvent, setEditingBillingEvent] = useState<BillingEvent | null>(null)

  // Receive Payment Modal
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false)
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState<Invoice | null>(null)

  // Success Dialog after generating invoice
  const [generatedInvoiceInfo, setGeneratedInvoiceInfo] = useState<{
    invoiceId: string
    invoiceNumber: string
    grandTotal: number
  } | null>(null)

  // Date setup defaults: current month
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0')
  const defaultPeriodStart = `${currentYear}-${currentMonth}-01`
  const lastDayOfMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate()
  const defaultPeriodEnd = `${currentYear}-${currentMonth}-${String(lastDayOfMonth).padStart(2, '0')}`
  const defaultMonthStr = `${currentYear}-${currentMonth}`

  const dueTarget = new Date()
  dueTarget.setDate(dueTarget.getDate() + 10)
  const defaultDueDate = dueTarget.toISOString().split('T')[0]

  const [billingMonth, setBillingMonth] = useState(defaultMonthStr)
  const [startDate, setStartDate] = useState(defaultPeriodStart)
  const [endDate, setEndDate] = useState(defaultPeriodEnd)
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [deselectedEventIds, setDeselectedEventIds] = useState<Set<string>>(new Set())

  // Discount configuration
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [discountNote, setDiscountNote] = useState<string>('')

  // Fetch unit 360 data
  const isValidUnitId = Boolean(unitId && unitId !== 'undefined')
  const {
    data: unit360Data,
    isLoading: unitLoading,
    refetch: refetchUnit,
  } = useGetUnitBilling360(isValidUnitId ? unitId! : null)

  // Fetch unit services (subscriptions + pending consumption charges)
  const { data: unitServicesData } = useGetUnitServices(isValidUnitId ? unitId! : null, startDate, endDate)
  const { data: taxSettingsData } = useGetTaxSettings()
  const taxSettings = taxSettingsData?.data

  const generateInvoiceMutation = useGenerateInvoice()

  const unit = unit360Data?.data?.unit
  const occupants = unit360Data?.data?.occupants || []
  const primaryResident = occupants.find((r) => r.isPrimary) || occupants[0]
  const invoices = useMemo(() => unit360Data?.data?.invoices || [], [unit360Data])
  const receipts = useMemo(() => unit360Data?.data?.receipts || [], [unit360Data])
  const miscItems = useMemo(() => unit360Data?.data?.miscellaneousItems || [], [unit360Data])

  const recurringSubscriptions = useMemo(() => unitServicesData?.data?.recurringSubscriptions || [], [unitServicesData])
  const pendingConsumptionCharges = useMemo(
    () => unitServicesData?.data?.pendingConsumptionCharges || [],
    [unitServicesData],
  )

  // Pending events combined from unit services and 360 miscellaneous items
  const pendingEvents = useMemo(() => {
    if (pendingConsumptionCharges.length > 0) {
      return pendingConsumptionCharges
    }
    return miscItems.map((item) => ({
      id: item.id,
      sourceModule: 'MANUAL',
      serviceType: 'miscellaneous',
      itemName: item.itemName,
      description: item.itemName + (item.notes ? ` - ${item.notes}` : ''),
      quantity: item.quantityTaken || item.totalQuantity || 1,
      unitPrice: item.unitPrice || 0,
      amount: item.price || item.unitPrice * (item.quantityTaken || 1),
      date: item.date || item.createdAt?.split('T')[0] || startDate,
      status: 'PENDING',
    }))
  }, [pendingConsumptionCharges, miscItems, startDate])

  const selectedEvents = useMemo(
    () => pendingEvents.filter((ev) => !deselectedEventIds.has(ev.id)),
    [pendingEvents, deselectedEventIds],
  )
  const selectedEventIds = useMemo(() => new Set(selectedEvents.map((ev) => ev.id)), [selectedEvents])
  const isAllEventsSelected = pendingEvents.length > 0 && selectedEvents.length === pendingEvents.length
  const isSomeEventsSelected = selectedEvents.length > 0 && selectedEvents.length < pendingEvents.length

  const handleToggleAllEvents = (checked: boolean) => {
    if (checked) {
      setDeselectedEventIds(new Set())
    } else {
      setDeselectedEventIds(new Set(pendingEvents.map((ev) => ev.id)))
    }
  }

  const handleToggleEvent = (eventId: string) => {
    setDeselectedEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  const moveInDateStr = primaryResident?.moveInDate || null

  const minBillingMonth = useMemo(() => {
    if (moveInDateStr) {
      return moveInDateStr.slice(0, 7)
    }
    return undefined
  }, [moveInDateStr])

  const getPriorMonth = (monthVal: string): string => {
    if (!monthVal) return ''
    const parts = monthVal.split('-')
    if (parts.length !== 2) return ''
    let y = parseInt(parts[0], 10)
    let m = parseInt(parts[1], 10)
    if (isNaN(y) || isNaN(m)) return ''
    m -= 1
    if (m < 1) {
      m = 12
      y -= 1
    }
    return `${y}-${String(m).padStart(2, '0')}`
  }

  const calculateSubProratedPrice = (sub: Record<string, unknown>, pStart: string, pEnd: string) => {
    if (sub.amount !== undefined && sub.amount !== null && !isNaN(Number(sub.amount))) {
      return Number(sub.amount)
    }
    const fullPrice = Number(sub.monthlyRate || sub.unitPrice || 0)
    if (!pStart || !pEnd) return fullPrice
    const subStartDate = sub.startDate as string | undefined
    const start = new Date(subStartDate && subStartDate > pStart ? subStartDate : pStart)
    const end = new Date(pEnd)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return fullPrice

    const totalDaysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    const startDay = start.getDate()
    const activeDays = Math.max(1, Math.min(totalDaysInMonth, end.getDate() - startDay + 1))

    if (activeDays < totalDaysInMonth) {
      return Math.round((fullPrice / totalDaysInMonth) * activeDays * 100) / 100
    }
    return fullPrice
  }

  const handleMonthChange = (monthVal: string) => {
    if (minBillingMonth && monthVal < minBillingMonth) {
      monthVal = minBillingMonth
    }
    setBillingMonth(monthVal)
    if (!monthVal) return
    const parts = monthVal.split('-')
    if (parts.length !== 2) return
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    if (isNaN(y) || isNaN(m)) return
    const lastDay = new Date(y, m, 0).getDate()
    const firstDayStr = `${monthVal}-01`
    const lastDayStr = `${monthVal}-${String(lastDay).padStart(2, '0')}`

    if (moveInDateStr && moveInDateStr.startsWith(monthVal)) {
      setStartDate(moveInDateStr)
    } else {
      setStartDate(firstDayStr)
    }
    setEndDate(lastDayStr)
  }

  const [prevMinBillingMonth, setPrevMinBillingMonth] = useState(minBillingMonth)
  if (minBillingMonth && minBillingMonth !== prevMinBillingMonth) {
    setPrevMinBillingMonth(minBillingMonth)
    if (!billingMonth || billingMonth < minBillingMonth) {
      handleMonthChange(minBillingMonth)
    } else if (moveInDateStr && moveInDateStr.startsWith(billingMonth)) {
      setStartDate(moveInDateStr)
    }
  }

  const formatMonthDisplay = (monthVal: string) => {
    if (!monthVal) return ''
    const parts = monthVal.split('-')
    if (parts.length !== 2) return monthVal
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    if (isNaN(y) || isNaN(m)) return monthVal
    const dateObj = new Date(y, m - 1, 1)
    return dateObj.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  }

  // Active subscriptions sum calculation
  const activeSubsSum = useMemo(
    () =>
      recurringSubscriptions.reduce((acc, sub: Record<string, unknown>) => {
        return acc + calculateSubProratedPrice(sub, startDate, endDate)
      }, 0),
    [recurringSubscriptions, startDate, endDate],
  )

  const allPendingEventsSum = useMemo(() => {
    return pendingEvents.reduce((acc, ev) => acc + Number(ev.amount || ev.unitPrice || 0), 0)
  }, [pendingEvents])

  const pendingEventsSum = useMemo(() => {
    return pendingEvents
      .filter((ev) => selectedEventIds.has(ev.id))
      .reduce((acc, ev) => acc + Number(ev.amount || ev.unitPrice || 0), 0)
  }, [pendingEvents, selectedEventIds])

  const subtotalEstimate = activeSubsSum + pendingEventsSum

  const discountEstimate = useMemo(() => {
    if (!discountValue || discountValue <= 0) return 0
    if (discountType === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, discountValue))
      return Number(((subtotalEstimate * pct) / 100).toFixed(2))
    }
    return Math.min(subtotalEstimate, Math.max(0, discountValue))
  }, [subtotalEstimate, discountType, discountValue])

  const taxableSubtotal = Math.max(0, subtotalEstimate - discountEstimate)

  const gstEnabled = Boolean(taxSettings?.gstEnabled)
  const defaultGstRate = Number(taxSettings?.defaultGstRate ?? 18)
  const cgstRate = Number(taxSettings?.cgstRate ?? defaultGstRate / 2)
  const sgstRate = Number(taxSettings?.sgstRate ?? defaultGstRate / 2)

  const cgstEstimate = useMemo(
    () => (gstEnabled ? Number(((taxableSubtotal * cgstRate) / 100).toFixed(2)) : 0),
    [gstEnabled, taxableSubtotal, cgstRate],
  )

  const sgstEstimate = useMemo(
    () => (gstEnabled ? Number(((taxableSubtotal * sgstRate) / 100).toFixed(2)) : 0),
    [gstEnabled, taxableSubtotal, sgstRate],
  )

  const totalTaxEstimate = cgstEstimate + sgstEstimate

  const grandTotalEstimate = Math.max(0, taxableSubtotal + totalTaxEstimate)

  // Overall Financial KPIs
  const summaryKPIs = unit360Data?.data?.summary
  const totalOutstanding =
    summaryKPIs?.totalOutstanding ?? invoices.reduce((acc, inv) => acc + Math.max(0, inv.total - inv.paidAmount), 0)
  const totalInvoiced = summaryKPIs?.totalInvoiced ?? invoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0)
  const totalPaid = summaryKPIs?.totalCollected ?? invoices.reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0)

  const handleGenerateInvoice = async () => {
    if (!unit?.id) return
    try {
      const servicesPayload = recurringSubscriptions.map((sub: Record<string, unknown>) => {
        const proratedPrice = calculateSubProratedPrice(sub, startDate, endDate)
        return {
          serviceType: (sub.serviceType as string) || 'monthly_rents',
          amount: proratedPrice,
          notes: (sub.packageName as string) || (sub.description as string) || 'Monthly Service Subscription',
        }
      })

      const miscPayload = selectedEvents.map((chg: Record<string, unknown>) => ({
        description: (chg.itemName as string) || (chg.description as string) || 'Consumption Charge',
        amount: Number(chg.amount || chg.unitPrice || 0),
        notes: (chg.sourceModule as string) || undefined,
      }))

      const res = await generateInvoiceMutation.mutateAsync({
        unitId: unit.id,
        residentId: primaryResident?.id,
        loc_id: selectedLocationId || '00000000-0000-0000-0000-000000000000',
        startDate,
        endDate,
        dueDate,
        billingMode: 'MONTHLY',
        services: servicesPayload,
        miscellaneousItems: miscPayload,
        notes:
          discountEstimate > 0
            ? `Discount applied: ₹${discountEstimate}${discountNote ? ` (${discountNote})` : ''}`
            : undefined,
      })

      const invoiceData = res?.data
      if (invoiceData?.id) {
        setGeneratedInvoiceInfo({
          invoiceId: invoiceData.id,
          invoiceNumber: invoiceData.invoiceNumber,
          grandTotal: Number(invoiceData.total || 0),
        })
      }
      refetchUnit()
    } catch {
      // Error handling managed in mutation toast
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">PAID</Badge>
      case 'PARTIALLY_PAID':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">PARTIALLY PAID</Badge>
      case 'OVERDUE':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">OVERDUE</Badge>
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">DRAFT</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (unitLoading) {
    return (
      <div className="py-24 text-center text-gray-500 text-sm space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005390]" />
        <p>Loading dedicated billing dashboard for flat...</p>
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="py-24 text-center text-gray-500 text-sm space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <p>Flat / Unit not found.</p>
        <Button onClick={() => navigate('/admin/billing-management')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Flats Directory
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP NAVIGATION */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/billing-management')}
          className="text-xs h-9 cursor-pointer bg-white hover:bg-slate-50 border-gray-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Flats Directory
        </Button>
      </div>

      {/* 2. DEDICATED FLAT & RESIDENT INFORMATION BANNER */}
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Flat Identity */}
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-[#005390] text-white shadow-md shadow-[#005390]/20 flex items-center justify-center shrink-0">
                <Home className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black text-gray-900 font-mono tracking-tight">{unit.unitNumber}</h1>
                  {unit.unitType && (
                    <Badge variant="outline" className="text-xs bg-white text-gray-700 border-gray-300">
                      {unit.unitType}
                    </Badge>
                  )}
                  <Badge
                    className={`text-xs font-bold ${
                      occupants.length > 0
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {occupants.length > 0 ? 'OCCUPIED' : 'VACANT'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {unit.floorNumber !== undefined ? `Floor ${unit.floorNumber}` : ''}
                  {unit.blockName ? ` • Tower ${unit.blockName}` : ''}
                </p>
              </div>
            </div>

            {/* Resident & Payer Profiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8 border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-8">
              {/* Resident & Residing Family */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Residing Occupants ({occupants.length})
                </span>
                {occupants && occupants.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {occupants.map((occ, idx) => (
                      <div
                        key={occ.id || idx}
                        className="space-y-0.5 border-b border-gray-100 last:border-0 pb-1.5 last:pb-0"
                      >
                        <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5 flex-wrap">
                          <User className="w-3.5 h-3.5 shrink-0 text-[#005390]" />
                          <span>{occ.name}</span>
                          {occ.isPrimary && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-blue-50 text-[#005390] border border-blue-200/60">
                              Primary Resident
                            </span>
                          )}
                        </div>
                        {occ.phone && (
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 pl-5 font-mono">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            {occ.phone}
                          </div>
                        )}
                        {occ.email && (
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 pl-5">
                            <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                            {occ.email}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">No resident currently assigned</span>
                )}
              </div>

              {/* Primary Payer */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Primary Bill-To Resident
                </span>
                {primaryResident ? (
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      {primaryResident.name}
                    </div>
                    {primaryResident.phone && (
                      <div className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {primaryResident.phone}
                      </div>
                    )}
                    {primaryResident.email && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {primaryResident.email}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">No primary resident assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`border shadow-sm ${totalOutstanding > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-gray-100'}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Outstanding Balance
            </CardTitle>
            <AlertCircle className={`w-4 h-4 ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
            >
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalOutstanding > 0 ? 'Pending invoice payments' : 'All invoices settled'}
            </p>
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
            <div className="text-2xl font-bold font-mono text-gray-900">
              ₹{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">{invoices.length} total bills issued</p>
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
            <div className="text-2xl font-bold font-mono text-emerald-600">
              ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">{receipts.length} payment receipts</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pending Consumption
            </CardTitle>
            <Zap className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600">{pendingEvents.length} Items</div>
            <p className="text-xs text-gray-500 mt-1">
              ₹{allPendingEventsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })} unbilled usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. NAVIGATION TABS */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-semibold text-gray-500 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('generate')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'generate' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" /> Generate Invoice
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'invoices' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Invoices History ({invoices.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unbilled')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'unbilled' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" /> Unbilled Services ({pendingEvents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'subscriptions' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Subscriptions & Packages ({recurringSubscriptions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'receipts' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <ReceiptIndianRupee className="w-4 h-4 text-emerald-600" /> Payment Receipts ({receipts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'profile' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <User className="w-4 h-4" /> Occupants ({occupants.length})
        </button>
      </div>

      {/* TAB 1: GENERATE INVOICE */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Configuration & Items Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Period Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#005390]" />
                  1. Billing Period
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {primaryResident?.moveInDate && (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl flex items-center justify-between text-xs text-[#005390]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CalendarCheck className="w-4 h-4 text-[#005390]" />
                      Moved In: {formatDateDDMMYYYY(primaryResident.moveInDate)}
                    </span>
                    {startDate === primaryResident.moveInDate && (
                      <Badge className="bg-[#005390] text-white text-[10px] hover:bg-[#004477]">
                        Prorated Start Date Applied
                      </Badge>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#005390]" />
                      Billing Month
                    </Label>
                    <Input
                      type="month"
                      min={minBillingMonth}
                      value={billingMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="text-xs mt-1 h-9 font-medium"
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500">
                      <span>
                        Cycle: <strong className="text-gray-800">{formatMonthDisplay(billingMonth)}</strong>
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-blue-50/50 text-[#005390] border-blue-200"
                      >
                        {formatDateDDMMYYYY(startDate)} → {formatDateDDMMYYYY(endDate)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Payment Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="text-xs mt-1 h-9"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Payment deadline for this monthly invoice
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscriptions Included Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  2. Recurring Subscriptions Included ({recurringSubscriptions.length})
                </CardTitle>
                <span className="text-xs font-mono font-bold text-purple-700">
                  ₹{activeSubsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </CardHeader>
              <CardContent className="pt-4">
                {recurringSubscriptions.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No active recurring packages linked to this flat.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recurringSubscriptions.map((sub: Record<string, unknown>) => {
                      const fullPrice = Number(sub.monthlyRate || sub.unitPrice || sub.amount || 0)
                      const proratedPrice = calculateSubProratedPrice(sub, startDate, endDate)
                      const isProrated = (sub.isProrated as boolean) || (proratedPrice !== fullPrice && fullPrice > 0)
                      const daysInMonth =
                        (sub.daysInMonth as number) ||
                        new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).getDate()
                      const subStartDate = sub.startDate as string | undefined
                      const activeDays =
                        (sub.activeDays as number) ||
                        Math.max(1, daysInMonth - (subStartDate ? new Date(subStartDate).getDate() : 1) + 1)
                      const prodObj = sub.product as Record<string, unknown> | undefined
                      return (
                        <div
                          key={(sub.id as string) || (sub.serviceType as string)}
                          className="py-2.5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              {(sub.packageName as string) ||
                                (sub.description as string) ||
                                (prodObj?.productName as string) ||
                                (sub.serviceType as string) ||
                                'Recurring Service'}
                              {isProrated && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 bg-blue-50 text-[#005390] border-blue-200 font-medium"
                                >
                                  Prorated ({activeDays} days)
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              Monthly Subscription Package {subStartDate ? `• Started ${subStartDate}` : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-gray-900">
                              ₹{proratedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-gray-400 block">
                              {isProrated ? `(Full: ₹${fullPrice.toLocaleString('en-IN')}/mo)` : '/ month'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unbilled Usage Events Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>3. Pending Consumption Charges ({pendingEvents.length})</span>
                  {billingMonth && (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                      {formatMonthDisplay(getPriorMonth(billingMonth))} Arrears
                    </span>
                  )}
                  {pendingEvents.length > 0 && (
                    <span className="text-[11px] font-normal text-gray-500 ml-1">
                      ({selectedEventIds.size} of {pendingEvents.length} selected)
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsAddChargeOpen(true)}
                    className="h-8 bg-[#005390] px-2.5 text-xs hover:bg-[#004477]"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Charge
                  </Button>
                  {pendingEvents.length > 0 && (
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md transition-colors">
                      <input
                        type="checkbox"
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = isSomeEventsSelected
                          }
                        }}
                        checked={isAllEventsSelected}
                        onChange={(e) => handleToggleAllEvents(e.target.checked)}
                        className="rounded border-gray-300 text-[#005390] focus:ring-[#005390] w-4 h-4 cursor-pointer"
                      />
                      <span>Select All</span>
                    </label>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {pendingEvents.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No unbilled usage events recorded for this flat.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pendingEvents.map((ev: Record<string, unknown>) => {
                      const evId = ev.id as string
                      const isSelected = selectedEventIds.has(evId)
                      return (
                        <div
                          key={ev.id}
                          className={`py-2.5 flex items-center justify-between text-xs px-2 -mx-2 rounded-md transition-colors ${
                            isSelected ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/40 opacity-60 hover:opacity-80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleEvent(ev.id)}
                              className="rounded border-gray-300 text-[#005390] focus:ring-[#005390] w-4 h-4 cursor-pointer shrink-0"
                            />
                            <div className="p-1.5 rounded-lg shrink-0 bg-blue-50 text-[#005390]">
                              {ev.description?.toLowerCase().includes('maintenance') ||
                              ev.description?.toLowerCase().includes('repair') ? (
                                <Wrench className="w-3.5 h-3.5" />
                              ) : (
                                <Zap className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{ev.itemName || ev.description}</div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                <span>{formatDateDDMMYYYY(ev.date || ev.serviceDate || startDate)}</span>
                                {ev.sourceModule && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold uppercase text-gray-500">{ev.sourceModule}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-gray-900">
                              ₹
                              {Number(ev.amount || ev.unitPrice || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            <span className="text-[10px] text-gray-400 block">
                              Qty: {ev.quantity || 1} × ₹
                              {Number(ev.unitPrice || ev.amount || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Discount & Concessions Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  4. Invoice Discount & Concessions
                </CardTitle>
                {discountEstimate > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold">
                    -₹{discountEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Discount Type</Label>
                    <div className="flex rounded-lg border border-gray-200 p-0.5 mt-1 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setDiscountType('FIXED')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                          discountType === 'FIXED'
                            ? 'bg-white text-[#005390] shadow-xs'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        Fixed Amount (₹)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('PERCENTAGE')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                          discountType === 'PERCENTAGE'
                            ? 'bg-white text-[#005390] shadow-xs'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        Percentage (%)
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700">
                      {discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        min="0"
                        max={discountType === 'PERCENTAGE' ? 100 : subtotalEstimate}
                        step={discountType === 'PERCENTAGE' ? '0.5' : '1'}
                        value={discountValue || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value))
                          setDiscountValue(val)
                        }}
                        className="text-xs h-9 pr-8 font-medium"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">
                        {discountType === 'PERCENTAGE' ? '%' : '₹'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-gray-700">Discount Note / Reason</Label>
                    <span className="text-[11px] text-gray-400">Optional justification for invoice</span>
                  </div>
                  <Input
                    type="text"
                    value={discountNote}
                    onChange={(e) => setDiscountNote(e.target.value)}
                    placeholder="e.g. Management approved concession, Festive discount"
                    className="text-xs h-9 font-medium"
                    maxLength={250}
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-gray-400">Quick reasons:</span>
                    {['Management Approval', 'Festive Offer', 'Early Settlement', 'Goodwill Waiver'].map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setDiscountNote(tag)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          discountNote === tag
                            ? 'bg-blue-100 text-[#005390] border-blue-300 font-bold'
                            : 'bg-gray-100/80 text-gray-600 border-gray-200 hover:bg-gray-200/70'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {discountEstimate > 0 && (
                  <p className="text-xs text-emerald-600 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between">
                    <span>Discount applied:</span>
                    <strong className="font-mono font-bold">
                      -₹{discountEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Calculation Summary & Action */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-b from-white to-slate-50 border-gray-200 shadow-md sticky top-6">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ReceiptIndianRupee className="w-4 h-4 text-[#005390]" />
                  Invoice Preview & Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="bg-slate-100/70 p-3 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Flat / Unit:</span>
                    <span className="font-bold text-gray-900">{unit.unitNumber}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Bill-To:</span>
                    <span className="font-semibold text-gray-900">{primaryResident?.name || 'Self'}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Period:</span>
                    <span className="font-medium text-gray-800">
                      {formatDateDDMMYYYY(startDate)} → {formatDateDDMMYYYY(endDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Due Date:</span>
                    <span className="font-medium text-gray-800">{formatDateDDMMYYYY(dueDate)}</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs pt-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subscriptions Subtotal:</span>
                    <span className="font-mono font-medium text-gray-900">
                      ₹{activeSubsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Usage Events Subtotal:</span>
                    <span className="font-mono font-medium text-gray-900">
                      ₹{pendingEventsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-gray-700 font-semibold pt-2 border-t border-gray-200">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono">
                      ₹{subtotalEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {discountEstimate > 0 && (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Discount ({discountType === 'PERCENTAGE' ? `${discountValue}%` : 'Flat ₹'}):</span>
                        <span className="font-mono">
                          -₹{discountEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {discountNote.trim() && (
                        <div
                          className="text-[10px] text-emerald-700 font-medium italic pl-1 truncate"
                          title={discountNote}
                        >
                          Reason: {discountNote.trim()}
                        </div>
                      )}
                    </div>
                  )}

                  {gstEnabled && (
                    <div className="space-y-1 pt-1 border-t border-dashed border-gray-200">
                      <div className="flex justify-between text-blue-700 text-xs font-medium">
                        <span>CGST ({cgstRate}%):</span>
                        <span className="font-mono font-semibold">
                          +₹
                          {cgstEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-blue-700 text-xs font-medium">
                        <span>SGST ({sgstRate}%):</span>
                        <span className="font-mono font-semibold">
                          +₹
                          {sgstEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-bold text-gray-900 pt-3 border-t-2 border-gray-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[#005390]">
                      ₹{grandTotalEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={generateInvoiceMutation.isPending || !unit?.id}
                  className="w-full h-11 text-sm font-bold bg-[#005390] hover:bg-[#004273] text-white shadow-md cursor-pointer mt-2"
                >
                  {generateInvoiceMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating & Finalizing Bill...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4 mr-2" />
                      Confirm & Generate Invoice
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  Generates sequential bill with itemized services and consumption charges.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES HISTORY */}
      {activeTab === 'invoices' && (
        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Flat {unit.unitNumber} Invoice History ({invoices.length} Bills)
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSelectedPaymentInvoice(null)
                  setIsReceivePaymentOpen(true)
                }}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <ReceiptIndianRupee className="w-3.5 h-3.5 mr-1" /> Receive Payment
              </Button>
              <Button
                size="sm"
                onClick={() => setActiveTab('generate')}
                className="text-xs h-8 bg-[#005390] hover:bg-[#004273] text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> New Bill
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Invoice No</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-3 py-3 text-left">Issue / Due Date</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-right">Amount Paid</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      No invoices issued yet for this flat. Switch to "Generate Invoice" tab to create the first bill.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const dueAmount = Math.max(0, Number(inv.total || 0) - Number(inv.paidAmount || 0))
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#005390] whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatDateDDMMYYYY(inv.startDate)} → {formatDateDDMMYYYY(inv.endDate)}
                        </td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                          <div>Issue: {formatDateDDMMYYYY(inv.createdAt || inv.startDate)}</div>
                          <div className="text-[10px]">Due: {formatDateDDMMYYYY(inv.dueDate || inv.endDate)}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                          ₹{Number(inv.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 whitespace-nowrap">
                          ₹{Number(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                          <span className={dueAmount > 0 ? 'text-rose-600' : 'text-gray-500'}>
                            ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">{getStatusBadge(inv.status)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {dueAmount > 0 ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedPaymentInvoice(inv)
                                  setIsReceivePaymentOpen(true)
                                }}
                                className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-medium"
                              >
                                <ReceiptIndianRupee className="w-3.5 h-3.5 mr-1" /> Receive Payment
                              </Button>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Settled
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoiceId(inv.id)
                                setIsInvoiceDetailOpen(true)
                              }}
                              className="text-[#005390] hover:bg-[#005390]/10 text-xs h-7 px-2"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View Bill
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: UNBILLED CONSUMPTION */}
      {activeTab === 'unbilled' && (
        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Pending Chargeable Usage for Flat {unit.unitNumber} ({pendingEvents.length} Events)
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddChargeOpen(true)}
              className="h-8 bg-[#005390] px-2.5 text-xs hover:bg-[#004477]"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Miscellaneous Charge
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-3 py-3 text-left">Source Module</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-3 py-3 text-right">Quantity</th>
                  <th className="px-3 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-3 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {pendingEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      No unbilled consumption events pending. All usage is currently invoiced.
                    </td>
                  </tr>
                ) : (
                  pendingEvents.map((ev: Record<string, unknown>) => (
                    <tr key={ev.id as string} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                        {formatDateDDMMYYYY((ev.date as string) || (ev.serviceDate as string) || startDate)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-slate-50 text-slate-700 border-slate-200"
                        >
                          {(ev.sourceModule as string) || 'CONSUMPTION'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {(ev.itemName as string) || (ev.description as string)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{(ev.quantity as number) || 1}</td>
                      <td className="px-3 py-3 text-right font-mono">
                        ₹{Number(ev.unitPrice || ev.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                        ₹{Number(ev.amount || ev.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                          {(ev.status as string) || 'PENDING'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: SUBSCRIPTIONS & PACKAGES */}
      {activeTab === 'subscriptions' && (
        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Recurring Monthly Packages for Flat {unit.unitNumber} ({recurringSubscriptions.length} Plans)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Package / Plan</th>
                  <th className="px-3 py-3 text-left">Subscriber</th>
                  <th className="px-3 py-3 text-left">Frequency</th>
                  <th className="px-3 py-3 text-left">Start Date</th>
                  <th className="px-4 py-3 text-right">Monthly Fee</th>
                  <th className="px-3 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recurringSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      No active recurring packages linked to this flat.
                    </td>
                  </tr>
                ) : (
                  recurringSubscriptions.map((sub: Record<string, unknown>) => {
                    const prodObj = sub.product as Record<string, unknown> | undefined
                    return (
                      <tr key={(sub.id as string) || (sub.serviceType as string)} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">
                            {(sub.packageName as string) ||
                              (sub.description as string) ||
                              (prodObj?.productName as string) ||
                              (sub.serviceType as string) ||
                              'Recurring Service'}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {(prodObj?.productType as string) || (sub.serviceType as string)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {(sub.subscriberName as string) || primaryResident?.name || 'Flat Occupant'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px]">
                            MONTHLY
                          </Badge>
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-600 whitespace-nowrap">
                          {formatDateDDMMYYYY(sub.startDate as string)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                          ₹
                          {Number(sub.monthlyRate || sub.unitPrice || sub.amount || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">ACTIVE</Badge>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: PAYMENT RECEIPTS */}
      {activeTab === 'receipts' && (
        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Payment Receipts Log for Flat {unit.unitNumber} ({receipts.length} Receipts)
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSelectedPaymentInvoice(null)
                setIsReceivePaymentOpen(true)
              }}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <ReceiptIndianRupee className="w-3.5 h-3.5 mr-1" /> Receive Payment
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Receipt No</th>
                  <th className="px-3 py-3 text-left">Payment Date</th>
                  <th className="px-3 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Reference No</th>
                  <th className="px-4 py-3 text-right">Amount Received</th>
                  <th className="px-3 py-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      No payment receipts recorded yet for this flat.
                    </td>
                  </tr>
                ) : (
                  receipts.map((rcpt) => (
                    <tr key={rcpt.id} className="hover:bg-slate-50 font-mono">
                      <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap">{rcpt.receiptNumber}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                        {formatDateDDMMYYYY(rcpt.paymentDate)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-sans">
                          {rcpt.paymentMethod}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-sans">{rcpt.paymentReference || 'N/A'}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                        ₹{Number(rcpt.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 font-sans text-gray-500">{rcpt.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 6: OCCUPANTS PROFILE */}
      {activeTab === 'profile' && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-[#005390]" />
              Flat Occupants ({occupants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 divide-y divide-gray-100">
            {occupants.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No residents assigned to this flat.</p>
            ) : (
              occupants.map((res) => (
                <div key={res.id} className="py-3 flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      {res.name}
                      {res.isPrimary && (
                        <Badge className="bg-blue-100 text-[#005390] text-[9px]">Primary Resident</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Relationship: {res.relationship || 'Resident'}</div>
                    {res.phone && <div className="text-xs text-gray-500 font-mono">Phone: {res.phone}</div>}
                    {res.email && <div className="text-xs text-gray-500">Email: {res.email}</div>}
                    {res.moveInDate && (
                      <div className="text-xs text-gray-500">Moved In: {formatDateDDMMYYYY(res.moveInDate)}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* SUCCESS MODAL ON INVOICE CREATION */}
      {generatedInvoiceInfo && (
        <Dialog open={Boolean(generatedInvoiceInfo)} onOpenChange={() => setGeneratedInvoiceInfo(null)}>
          <DialogContent className="sm:max-w-[450px] p-6 text-center">
            <div className="mx-auto p-3 bg-emerald-100 text-emerald-700 rounded-full w-14 h-14 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">Invoice Generated Successfully!</DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Bill has been finalized for Flat {unit.unitNumber}.
            </DialogDescription>

            <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 my-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Number:</span>
                <span className="font-mono font-bold text-[#005390]">{generatedInvoiceInfo.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Grand Total:</span>
                <span className="font-mono font-bold text-gray-900">
                  ₹{generatedInvoiceInfo.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-center">
              <Button variant="outline" size="sm" onClick={() => setGeneratedInvoiceInfo(null)} className="text-xs">
                Done
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const invId = generatedInvoiceInfo.invoiceId
                  setGeneratedInvoiceInfo(null)
                  setSelectedInvoiceId(invId)
                  setIsInvoiceDetailOpen(true)
                }}
                className="text-xs bg-[#005390] hover:bg-[#004273] text-white"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                View Itemized Bill
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* INVOICE DETAIL DRAWER/DIALOG */}
      {isInvoiceDetailOpen && (
        <InvoiceDetailDialog
          invoiceId={selectedInvoiceId}
          isOpen={isInvoiceDetailOpen}
          onClose={() => {
            setIsInvoiceDetailOpen(false)
            setSelectedInvoiceId(null)
          }}
        />
      )}
      <AddMiscellaneousChargeModal
        open={isAddChargeOpen}
        onOpenChange={(open) => {
          setIsAddChargeOpen(open)
          if (!open) setEditingBillingEvent(null)
        }}
        unit={unit}
        folio={null}
        occupants={occupants}
        billingEvent={editingBillingEvent}
        onSuccess={() => refetchUnit()}
      />
      <ReceivePaymentModal
        open={isReceivePaymentOpen}
        onOpenChange={(open) => {
          setIsReceivePaymentOpen(open)
          if (!open) setSelectedPaymentInvoice(null)
        }}
        unit={unit}
        folio={null}
        primaryPayer={primaryResident ? { partyName: primaryResident.name, role: 'PRIMARY_PAYER' } : null}
        primaryResident={primaryResident}
        invoice={selectedPaymentInvoice}
        invoices={invoices}
        onSuccess={() => refetchUnit()}
      />
    </div>
  )
}
