import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  FileCheck,
  FileText,
  HeartPulse,
  Home,
  Layers,
  Mail,
  Package,
  Phone,
  Pencil,
  Plus,
  ReceiptIndianRupee,
  RefreshCw,
  Sparkles,
  Tag,
  User,
  Utensils,
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
  useGetUnitsBillingSummary,
  useGenerateInvoice,
  useGetTaxSettings,
} from '@/hooks/react-query/billing'
import { useLocationContext } from '@/hooks/useLocation'
import { formatDateDDMMYYYY } from '@/lib/utils/dateFormat'
import { InvoiceDetailDialog } from './InvoiceDetailDialog'
import { AddMiscellaneousChargeModal } from './AddMiscellaneousChargeModal'
import type { BillingEvent } from '@/lib/types/billing'

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

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<
    'generate' | 'invoices' | 'unbilled' | 'subscriptions' | 'ledger' | 'profile'
  >('generate')

  // Invoice Detail Dialog
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false)
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false)
  const [editingBillingEvent, setEditingBillingEvent] = useState<BillingEvent | null>(null)

  // Success Dialog after generating invoice
  const [generatedInvoiceInfo, setGeneratedInvoiceInfo] = useState<{
    invoiceId: string
    invoiceNumber: string
    grandTotal: number
  } | null>(null)

  // Fetch unit 360 data
  const isValidUnitId = Boolean(unitId && unitId !== 'undefined')
  const {
    data: unit360Data,
    isLoading: unitLoading,
    refetch: refetchUnit,
  } = useGetUnitBilling360(isValidUnitId ? unitId! : null)

  // Fetch all units for the quick switcher dropdown
  const { data: unitsSummaryData } = useGetUnitsBillingSummary(selectedLocationId || undefined)
  const allUnits = Array.isArray(unitsSummaryData?.data) ? unitsSummaryData.data : []

  const generateInvoiceMutation = useGenerateInvoice()

  const unit = unit360Data?.data?.unit
  const occupants = unit360Data?.data?.occupants || []
  const primaryResident = occupants.find((r) => r.isPrimary) || occupants[0]
  const folio = unit360Data?.data?.folio
  const primaryPayer = folio?.parties?.find((p) => p.role === 'PRIMARY_PAYER' && p.isActive)
  const subscriptions = unit360Data?.data?.subscriptions || []
  const pendingEvents = unit360Data?.data?.pendingEvents || []
  const invoices = unit360Data?.data?.invoices || []
  const ledgerEntries = unit360Data?.data?.ledger?.entries || []

  // Generate Invoice Form States
  const [billingMode, setBillingMode] = useState<'MONTHLY' | 'SUPPLEMENTARY' | 'FINAL_DISCHARGE'>('MONTHLY')

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
  const [includePendingEvents, setIncludePendingEvents] = useState(true)

  // Discount configuration
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [discountNote, setDiscountNote] = useState<string>('')

  // Global Tax & GST configuration
  const { data: taxSettingsData } = useGetTaxSettings()
  const taxSettings = taxSettingsData?.data
  const gstEnabled = taxSettings?.gstEnabled ?? true
  const cgstRate = gstEnabled ? Number(taxSettings?.cgstRate ?? 9) : 0
  const sgstRate = gstEnabled ? Number(taxSettings?.sgstRate ?? 9) : 0

  // Track the latest periodEnd that has already been invoiced for this flat
  const lastInvoicedPeriodEnd = useMemo(() => {
    const validInvoices = invoices.filter((inv) => inv.status !== 'CANCELLED' && inv.periodEnd)
    if (validInvoices.length === 0) return null
    return validInvoices.reduce(
      (latest, inv) => (inv.periodEnd > latest ? inv.periodEnd : latest),
      validInvoices[0].periodEnd,
    )
  }, [invoices])

  const nextUnbilledStartDate = useMemo(() => {
    if (!lastInvoicedPeriodEnd) return defaultPeriodStart
    const d = new Date(lastInvoicedPeriodEnd)
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }, [lastInvoicedPeriodEnd, defaultPeriodStart])

  const handleMonthChange = (monthVal: string) => {
    setBillingMonth(monthVal)
    if (!monthVal) return
    const parts = monthVal.split('-')
    if (parts.length !== 2) return
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    if (isNaN(y) || isNaN(m)) return
    const lastDay = new Date(y, m, 0).getDate()
    setStartDate(`${monthVal}-01`)
    setEndDate(`${monthVal}-${String(lastDay).padStart(2, '0')}`)
  }

  const handleModeChange = (mode: 'MONTHLY' | 'SUPPLEMENTARY' | 'FINAL_DISCHARGE') => {
    setBillingMode(mode)
    if (mode === 'MONTHLY') {
      handleMonthChange(billingMonth)
    } else if (mode === 'FINAL_DISCHARGE') {
      if (nextUnbilledStartDate) {
        setStartDate(nextUnbilledStartDate)
      }
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

  // Live calculation for the Generate tab (subscriptions excluded in SUPPLEMENTARY mode)
  const billableSubscriptions = useMemo(() => {
    if (billingMode === 'SUPPLEMENTARY') return []
    const alreadyBilled = new Set(
      invoices
        .filter(
          (invoice) =>
            invoice.status !== 'CANCELLED' && invoice.periodStart <= endDate && invoice.periodEnd >= startDate,
        )
        .flatMap((invoice) => invoice.lines || [])
        .map((line) => line.subscriptionId)
        .filter((subscriptionId): subscriptionId is string => Boolean(subscriptionId)),
    )
    return subscriptions.filter((subscription) => subscription.isActive && !alreadyBilled.has(subscription.id))
  }, [subscriptions, invoices, startDate, endDate, billingMode])

  const billedInvoicesBySubscription = useMemo(() => {
    const billed = new Map<string, (typeof invoices)[number]>()
    invoices
      .filter(
        (invoice) =>
          invoice.status !== 'CANCELLED' && invoice.periodStart <= endDate && invoice.periodEnd >= startDate,
      )
      .forEach((invoice) => {
        invoice.lines?.forEach((line) => {
          if (line.subscriptionId) billed.set(line.subscriptionId, invoice)
        })
      })
    return billed
  }, [invoices, startDate, endDate])

  const activeSubsSum = useMemo(
    () => billableSubscriptions.reduce((acc, subscription) => acc + Number(subscription.unitPrice || 0), 0),
    [billableSubscriptions],
  )

  const pendingEventsSum = useMemo(() => {
    if (!includePendingEvents) return 0
    return pendingEvents.reduce((acc, ev) => acc + Number(ev.amount || ev.unitPrice || 0), 0)
  }, [pendingEvents, includePendingEvents])

  const subtotalEstimate = activeSubsSum + pendingEventsSum

  const discountEstimate = useMemo(() => {
    if (!discountValue || discountValue <= 0) return 0
    if (discountType === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, discountValue))
      return Number(((subtotalEstimate * pct) / 100).toFixed(2))
    }
    return Math.min(subtotalEstimate, Math.max(0, discountValue))
  }, [subtotalEstimate, discountType, discountValue])

  const taxableSubtotalEstimate = Math.max(0, subtotalEstimate - discountEstimate)
  const cgstEstimate = Number(((taxableSubtotalEstimate * cgstRate) / 100).toFixed(2))
  const sgstEstimate = Number(((taxableSubtotalEstimate * sgstRate) / 100).toFixed(2))
  const grandTotalEstimate = taxableSubtotalEstimate + cgstEstimate + sgstEstimate

  // Total Outstanding on this flat
  const totalOutstanding = invoices.reduce((acc, inv) => acc + Number(inv.amountDue || 0), 0)
  const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.grandTotal || 0), 0)
  const totalPaid = invoices.reduce((acc, inv) => acc + Number(inv.amountPaid || 0), 0)
  const creditBalance = Number(folio?.creditBalance || unit360Data?.data?.ledger?.creditBalance || 0)

  const handleGenerateInvoice = async () => {
    if (!folio?.id) return
    try {
      const res = await generateInvoiceMutation.mutateAsync({
        billingAccountId: folio.id,
        periodStart: startDate,
        periodEnd: endDate,
        dueDate,
        includePendingEvents,
        billingMode,
        includeSubscriptions: billingMode !== 'SUPPLEMENTARY',
        discountType: discountValue > 0 ? discountType : undefined,
        discountValue: discountValue > 0 ? discountValue : undefined,
        discountNote: discountValue > 0 && discountNote ? discountNote.trim() : undefined,
      })

      const invoiceData = res?.data
      if (invoiceData?.id) {
        setGeneratedInvoiceInfo({
          invoiceId: invoiceData.id,
          invoiceNumber: invoiceData.invoiceNumber,
          grandTotal: Number(invoiceData.grandTotal || 0),
        })
      }
      refetchUnit()
    } catch {
      // toast is handled in mutation
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">PAID</Badge>
      case 'PARTIALLY_PAID':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">PARTIALLY PAID</Badge>
      case 'FINALIZED':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">FINALIZED</Badge>
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
      {/* 1. TOP NAVIGATION & FLAT SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/billing-management')}
            className="text-xs h-9 cursor-pointer bg-white hover:bg-slate-50 border-gray-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Flats Directory
          </Button>

          {/* Quick Flat Switcher Selector */}
          <div className="relative">
            <select
              value={unit.id}
              onChange={(e) => navigate(`/admin/billing-management/unit/${e.target.value}`)}
              className="appearance-none bg-blue-50/70 border border-blue-200 text-[#005390] text-xs font-bold rounded-lg pl-3 pr-8 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-[#005390]/20"
            >
              {allUnits.map((u) => {
                const uId = u.unitId || u.id || ''
                return (
                  <option key={uId} value={uId}>
                    Flat {u.unitNumber} {u.primaryResident?.name ? `(${u.primaryResident.name})` : '(Vacant)'}
                  </option>
                )
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#005390] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchUnit()} className="text-xs h-9 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* 2. DEDICATED FLAT & RESIDENT INFORMATION BANNER (Rely-Assist style) */}
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
                  {unit.blockName ? ` • Block ${unit.blockName}` : ''}
                  {folio ? ` • Folio: ${folio.accountNumber}` : ''}
                </p>
              </div>
            </div>

            {/* Resident & Payer Profiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8 border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-8">
              {/* Senior Resident */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Resident (Who Lives Here)
                </span>
                {primaryResident ? (
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#005390]" />
                      {primaryResident.name}
                    </div>
                    {primaryResident.phone && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
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
                  <span className="text-xs text-gray-400 italic">No resident currently assigned</span>
                )}
              </div>

              {/* Bill-To Payer */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Primary Bill-To Payer (Who Pays)
                </span>
                {primaryPayer ? (
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      {primaryPayer.partyName}
                      {primaryPayer.role && (
                        <span className="text-[10px] font-normal text-gray-500">({primaryPayer.role})</span>
                      )}
                    </div>
                    {primaryPayer.partyPhone && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {primaryPayer.partyPhone}
                      </div>
                    )}
                    {primaryPayer.partyEmail && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {primaryPayer.partyEmail}
                      </div>
                    )}
                  </div>
                ) : primaryResident ? (
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm text-gray-800">Self-Payer ({primaryResident.name})</div>
                    <div className="text-xs text-gray-400">Direct Resident Folio</div>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">No payer registered</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. FLAT FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`border shadow-sm ${totalOutstanding > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-gray-100'}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Outstanding Due
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
              Credit / Advance
            </CardTitle>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              ₹{creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Available advance balance</p>
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
            <p className="text-xs text-gray-500 mt-1">
              {invoices.length} total bills (₹{totalPaid.toLocaleString('en-IN')} paid)
            </p>
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
              ₹{pendingEventsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })} unbilled usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. DEDICATED FLAT TABS (Rely-Assist layout) */}
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
          <Layers className="w-4 h-4" /> Subscriptions & Packages ({subscriptions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'ledger' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Sacred Ledger ({ledgerEntries.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'profile' ? 'border-[#005390] text-[#005390]' : 'border-transparent hover:text-gray-800'
          }`}
        >
          <User className="w-4 h-4" /> Occupants & Payers ({occupants.length + (folio?.parties?.length || 0)})
        </button>
      </div>

      {/* TAB 1: GENERATE INVOICE (Interactive Billing Studio) */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Configuration & Items Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Mode & Period Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#005390]" />
                  1. Billing Period & Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-gray-600 mb-2 block">Select Billing Mode</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={billingMode === 'MONTHLY' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleModeChange('MONTHLY')}
                      className={`text-xs h-9 ${billingMode === 'MONTHLY' ? 'bg-[#005390] text-white' : ''}`}
                    >
                      Monthly Cycle
                    </Button>
                    <Button
                      type="button"
                      variant={billingMode === 'SUPPLEMENTARY' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleModeChange('SUPPLEMENTARY')}
                      className={`text-xs h-9 ${billingMode === 'SUPPLEMENTARY' ? 'bg-[#005390] text-white' : ''}`}
                    >
                      Supplementary
                    </Button>
                    <Button
                      type="button"
                      variant={billingMode === 'FINAL_DISCHARGE' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleModeChange('FINAL_DISCHARGE')}
                      className={`text-xs h-9 ${billingMode === 'FINAL_DISCHARGE' ? 'bg-rose-700 text-white' : ''}`}
                    >
                      Final Move-out
                    </Button>
                  </div>
                </div>

                {billingMode === 'SUPPLEMENTARY' && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Supplementary Invoice Mode Active</span>
                      <p className="text-amber-800 text-[11px] mt-0.5">
                        Invoices on-demand consumption and unbilled service charges only. Recurring monthly packages are
                        automatically excluded to prevent duplicate charges.
                      </p>
                    </div>
                  </div>
                )}

                {billingMode === 'FINAL_DISCHARGE' && (
                  <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl text-xs text-rose-900 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Final Move-Out / Settlement Mode</span>
                        <p className="text-rose-800 text-[11px] mt-0.5">
                          Generates final pro-rata settlement invoice up to the move-out departure date, including all
                          unbilled consumption charges.
                        </p>
                      </div>
                    </div>

                    {lastInvoicedPeriodEnd ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-950 bg-white/80 px-2.5 py-1.5 rounded-lg border border-rose-200/70">
                        <CalendarCheck className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                        <span>
                          Previously invoiced up to: <strong>{formatDateDDMMYYYY(lastInvoicedPeriodEnd)}</strong>.
                          Unbilled departure stay begins on{' '}
                          <strong>{formatDateDDMMYYYY(nextUnbilledStartDate)}</strong>.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-800 bg-white/80 px-2.5 py-1.5 rounded-lg border border-rose-200/70">
                        <CalendarCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>No previous invoices issued for this flat yet. Billing from start of tenancy.</span>
                      </div>
                    )}
                  </div>
                )}

                {billingMode === 'MONTHLY' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#005390]" />
                        Billing Month
                      </Label>
                      <Input
                        type="month"
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
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">
                        {billingMode === 'FINAL_DISCHARGE' ? 'Billing From (Start Date)' : 'Period Start Date'}
                      </Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-xs mt-1 h-9"
                      />
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        {billingMode === 'FINAL_DISCHARGE'
                          ? 'Start of unbilled final stay'
                          : 'Billing cycle start date'}
                      </span>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">
                        {billingMode === 'FINAL_DISCHARGE' ? 'Move-Out Date (Departure)' : 'Period End Date'}
                      </Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-xs mt-1 h-9"
                      />
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        {billingMode === 'FINAL_DISCHARGE'
                          ? 'Prorated rent & plans up to this day'
                          : 'Billing cycle end date'}
                      </span>
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
                        {billingMode === 'FINAL_DISCHARGE'
                          ? 'Settlement payment deadline'
                          : 'Payment deadline for invoice'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscriptions Included Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  2. Recurring Subscriptions Included (
                  {billableSubscriptions.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  {billingMode === 'SUPPLEMENTARY' ? (
                    <>
                      <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-800 border-amber-200">
                        Excluded in Supplementary
                      </Badge>
                      <span className="text-xs font-mono font-bold text-emerald-600">₹0.00</span>
                    </>
                  ) : billedInvoicesBySubscription.size > 0 && billableSubscriptions.length === 0 ? (
                    <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200">
                      {formatMonthDisplay(billingMonth)} already invoiced
                    </Badge>
                  ) : (
                    <span className="text-xs font-mono font-bold text-purple-700">
                      ₹{activeSubsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {billingMode === 'SUPPLEMENTARY' ? (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      Recurring packages excluded in Supplementary mode
                    </div>
                    <p className="text-[11px] text-amber-700 pl-5.5">
                      This invoice only charges pending consumption and on-demand events (Care tasks,
                      Medication/Inventory, etc.) without re-charging the monthly{' '}
                      {subscriptions
                        .filter((s) => s.isActive)
                        .map((s) => s.description || s.product?.productName)
                        .join(', ') || 'package'}
                      .
                    </p>
                  </div>
                ) : subscriptions.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No active recurring packages linked to this flat's folio.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {billedInvoicesBySubscription.size > 0 && (
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        <span className="font-semibold">{formatMonthDisplay(billingMonth)} subscription invoice generated.</span>{' '}
                        It is excluded from this new invoice preview.
                      </div>
                    )}
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {sub.description || sub.product?.productName || 'Recurring Service'}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {sub.billingFrequency} • Proration: {sub.prorationPolicy || 'DAILY'}
                          </div>
                          {billedInvoicesBySubscription.get(sub.id) && (
                            <div className="mt-1 text-[10px] font-semibold text-emerald-700">
                              Already invoiced: {billedInvoicesBySubscription.get(sub.id)?.invoiceNumber}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-gray-900">
                            ₹{Number(sub.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            {billedInvoicesBySubscription.has(sub.id) ? 'already billed for this period' : '/ month'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unbilled Usage Events Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  3. Pending Consumption Charges ({pendingEvents.length})
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsAddChargeOpen(true)}
                    className="h-8 bg-[#005390] px-2.5 text-xs hover:bg-[#004477]"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Miscellaneous Charge
                  </Button>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePendingEvents}
                      onChange={(e) => setIncludePendingEvents(e.target.checked)}
                      className="rounded border-gray-300 text-[#005390]"
                    />
                    <span>Include in Invoice</span>
                  </label>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {pendingEvents.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No unbilled usage events recorded for this flat.
                  </p>
                ) : (
                  <div
                    className={`divide-y divide-gray-100 ${!includePendingEvents ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    {pendingEvents.map((ev) => (
                      <div key={ev.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-1.5 rounded-lg ${
                              ev.sourceModule === 'INVENTORY'
                                ? 'bg-indigo-50 text-indigo-600'
                                : ev.sourceModule === 'CARE'
                                  ? 'bg-rose-50 text-rose-600'
                                  : ev.sourceModule === 'FNB'
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-blue-50 text-blue-600'
                            }`}
                          >
                            {ev.sourceModule === 'INVENTORY' ? (
                              <Package className="w-3.5 h-3.5" />
                            ) : ev.sourceModule === 'CARE' ? (
                              <HeartPulse className="w-3.5 h-3.5" />
                            ) : ev.sourceModule === 'FNB' ? (
                              <Utensils className="w-3.5 h-3.5" />
                            ) : (
                              <Zap className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{ev.description}</div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                              <span>{formatDateDDMMYYYY(ev.serviceDate)}</span>
                              <span>•</span>
                              <span
                                className={`font-semibold uppercase ${
                                  ev.sourceModule === 'INVENTORY'
                                    ? 'text-indigo-600'
                                    : ev.sourceModule === 'CARE'
                                      ? 'text-rose-600'
                                      : ev.sourceModule === 'FNB'
                                        ? 'text-amber-600'
                                        : 'text-gray-500'
                                }`}
                              >
                                {ev.sourceModule}
                              </span>
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
                            Qty: {ev.quantity} × ₹
                            {Number(ev.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          {ev.sourceModule === 'MANUAL' && ev.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1 h-6 px-1.5 text-[10px] text-[#005390]"
                              onClick={() => {
                                setEditingBillingEvent(ev)
                                setIsAddChargeOpen(true)
                              }}
                            >
                              <Pencil className="mr-1 h-3 w-3" /> Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. Invoice Discount & Concessions */}
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

                {/* Discount Note / Reason */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-gray-700">Discount Note / Reason</Label>
                    <span className="text-[11px] text-gray-400">Optional justification for ledger & invoice</span>
                  </div>
                  <Input
                    type="text"
                    value={discountNote}
                    onChange={(e) => setDiscountNote(e.target.value)}
                    placeholder="e.g. Management approved concession, Festive discount, Special waiver"
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
                    <span>Discount applied before taxes:</span>
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
                    <span className="font-semibold text-gray-900">
                      {primaryPayer?.partyName || primaryResident?.name || 'Self'}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Billing Mode:</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        billingMode === 'SUPPLEMENTARY'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : billingMode === 'FINAL_DISCHARGE'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-blue-50 text-[#005390] border-blue-200'
                      }`}
                    >
                      {billingMode === 'SUPPLEMENTARY'
                        ? 'Supplementary'
                        : billingMode === 'FINAL_DISCHARGE'
                          ? 'Final Move-out'
                          : 'Monthly Cycle'}
                    </Badge>
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
                    <span>
                      Subscriptions Subtotal:
                      {billingMode === 'SUPPLEMENTARY' && (
                        <span className="text-[10px] text-amber-600 font-semibold ml-1.5">(Excluded)</span>
                      )}
                    </span>
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

                  <div className="flex justify-between text-gray-700 font-semibold pt-1 border-t border-dashed border-gray-200">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono">
                      ₹{taxableSubtotalEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {gstEnabled ? (
                    <>
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>CGST ({cgstRate}%):</span>
                        <span className="font-mono">
                          ₹{cgstEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>SGST ({sgstRate}%):</span>
                        <span className="font-mono">
                          ₹{sgstEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-gray-400 text-[11px]">
                      <span>GST (Disabled globally):</span>
                      <span className="font-mono">Exempt (0%)</span>
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
                  disabled={generateInvoiceMutation.isPending || !folio?.id}
                  className="w-full h-11 text-sm font-bold bg-[#005390] hover:bg-[#004273] text-white shadow-md cursor-pointer mt-2"
                >
                  {generateInvoiceMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating & Posting to Ledger...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4 mr-2" />
                      Confirm & Generate Invoice
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  Generates sequential bill, creates itemized invoice lines, and commits to the append-only ledger.
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
              Flat {unit.unitNumber} Invoice Statement ({invoices.length} Bills)
            </div>
            <Button
              size="sm"
              onClick={() => setActiveTab('generate')}
              className="text-xs h-8 bg-[#005390] hover:bg-[#004273] text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Bill
            </Button>
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
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#005390] whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDateDDMMYYYY(inv.periodStart)} → {formatDateDDMMYYYY(inv.periodEnd)}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        <div>Issue: {formatDateDDMMYYYY(inv.issueDate)}</div>
                        <div className="text-[10px]">Due: {formatDateDDMMYYYY(inv.dueDate)}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        ₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 whitespace-nowrap">
                        ₹{Number(inv.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                        <span className={Number(inv.amountDue) > 0 ? 'text-rose-600' : 'text-gray-500'}>
                          ₹{Number(inv.amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">{getStatusBadge(inv.status)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
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
                      </td>
                    </tr>
                  ))
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
                  <th className="px-4 py-3 text-left">Service Date</th>
                  <th className="px-3 py-3 text-left">Module</th>
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
                  pendingEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                        {formatDateDDMMYYYY(ev.serviceDate)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            ev.sourceModule === 'INVENTORY'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : ev.sourceModule === 'CARE'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : ev.sourceModule === 'FNB'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {ev.sourceModule}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{ev.description}</td>
                      <td className="px-3 py-3 text-right font-mono">{ev.quantity}</td>
                      <td className="px-3 py-3 text-right font-mono">
                        ₹{Number(ev.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                        ₹{Number(ev.amount || ev.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">{ev.status}</Badge>
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
              Recurring Monthly Contracts for Flat {unit.unitNumber} ({subscriptions.length} Plans)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Package / Plan</th>
                  <th className="px-3 py-3 text-left">Frequency</th>
                  <th className="px-3 py-3 text-left">Proration Policy</th>
                  <th className="px-3 py-3 text-left">Start Date</th>
                  <th className="px-4 py-3 text-right">Monthly Fee</th>
                  <th className="px-3 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      No subscriptions configured for this flat.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {sub.description || sub.product?.productName || 'Recurring Service'}
                        </div>
                        <div className="text-[11px] text-gray-400">{sub.product?.category || ''}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">
                          {sub.billingFrequency}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-600">{sub.prorationPolicy || 'DAILY'}</td>
                      <td className="px-3 py-3 font-mono text-gray-600 whitespace-nowrap">
                        {formatDateDDMMYYYY(sub.startDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        ₹{Number(sub.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <Badge
                          className={
                            sub.isActive
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }
                        >
                          {sub.isActive ? 'ACTIVE' : 'PAUSED'}
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

      {/* TAB 5: SACRED LEDGER STATEMENT */}
      {activeTab === 'ledger' && (
        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Chronological Sacred Ledger Statement
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Append-only financial audit trail for Folio {folio?.accountNumber || unit.unitNumber}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Current Balance</span>
              <span className="font-mono font-bold text-sm text-[#005390]">
                ₹{Number(folio?.creditBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Post Date</th>
                  <th className="px-3 py-3 text-left">Entry Type</th>
                  <th className="px-3 py-3 text-left">Reference No</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-3 py-3 text-right">Debit (Charges)</th>
                  <th className="px-3 py-3 text-right">Credit (Payments)</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      No ledger transactions posted yet.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 font-mono">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDateDDMMYYYY(entry.entryDate || entry.createdAt)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-sans">
                          {entry.entryType}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-[#005390] font-semibold whitespace-nowrap">
                        {entry.referenceId || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-sans text-gray-800">{entry.description}</td>
                      <td className="px-3 py-3 text-right text-rose-600 whitespace-nowrap">
                        {Number(entry.debitAmount || 0) > 0
                          ? `₹${Number(entry.debitAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-600 whitespace-nowrap">
                        {Number(entry.creditAmount || 0) > 0
                          ? `₹${Number(entry.creditAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        ₹{Number(entry.runningBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 6: OCCUPANTS & PAYERS PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Occupants Card */}
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
                        {res.isPrimary && <Badge className="bg-blue-100 text-[#005390] text-[9px]">Primary</Badge>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Relationship: {res.relationship || 'Resident'}</div>
                      {res.phone && <div className="text-xs text-gray-500">Phone: {res.phone}</div>}
                      {res.email && <div className="text-xs text-gray-500">Email: {res.email}</div>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Payers Card */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Financial Billing Parties ({folio?.parties?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 divide-y divide-gray-100">
              {!folio?.parties || folio.parties.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">
                  No separate payer parties registered. Primary resident is default self-payer.
                </p>
              ) : (
                folio.parties.map((party) => (
                  <div key={party.id} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        {party.partyName}
                        {party.role === 'PRIMARY_PAYER' && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[9px]">Primary Payer</Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Role: {party.role || 'Payer'}</div>
                      {party.partyPhone && <div className="text-xs text-gray-500">Phone: {party.partyPhone}</div>}
                      {party.partyEmail && <div className="text-xs text-gray-500">Email: {party.partyEmail}</div>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
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
              Bill has been finalized for Flat {unit.unitNumber} and posted to the ledger.
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
        folio={folio}
        occupants={occupants}
        billingEvent={editingBillingEvent}
      />
    </div>
  )
}
