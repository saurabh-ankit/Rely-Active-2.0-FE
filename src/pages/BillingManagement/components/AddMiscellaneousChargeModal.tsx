import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, DollarSign, Loader2, PlusCircle, Sparkles, Tag, User, Wrench } from 'lucide-react'
import { formatDateDDMMYYYY } from '@/lib/utils/dateFormat'
import { useCreateBillingEvent } from '@/hooks/react-query/billing'
import type { BillingEvent, BillingEventSourceModule } from '@/lib/types/billing'

interface Occupant {
  id: string
  name: string
  isPrimary?: boolean
  relationship?: string
}

interface AddMiscellaneousChargeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: {
    id: string
    unitNumber: string
  } | null
  folio?: {
    id?: string
    propertyId?: string
    primaryResidentId?: string | null
  } | null
  occupants?: Occupant[]
  billingEvent?: BillingEvent | null
  onSuccess?: () => void
}

const PRESET_CHARGES = [
  {
    label: '🔧 Plumbing Repair',
    desc: 'Plumbing Repair & Fixture Replacement',
    cat: 'MANUAL' as BillingEventSourceModule,
    defaultPrice: 350,
  },
  {
    label: '⚡ Electrical Work',
    desc: 'Electrical Maintenance & Fitting',
    cat: 'MANUAL' as BillingEventSourceModule,
    defaultPrice: 400,
  },
  {
    label: '🧹 Deep Cleaning',
    desc: 'Apartment Deep Cleaning Service',
    cat: 'HOUSEKEEPING' as BillingEventSourceModule,
    defaultPrice: 750,
  },
  {
    label: '🍽️ Guest Meal',
    desc: 'Guest Dining & Additional Meals',
    cat: 'FNB' as BillingEventSourceModule,
    defaultPrice: 250,
  },
  {
    label: '🚗 Transport / Cab',
    desc: 'Transport & Escorted Cab Facility',
    cat: 'TRANSPORT' as BillingEventSourceModule,
    defaultPrice: 500,
  },
  {
    label: '🧺 Laundry Service',
    desc: 'Special Fabric Laundry & Ironing',
    cat: 'HOUSEKEEPING' as BillingEventSourceModule,
    defaultPrice: 200,
  },
  {
    label: '📦 Misc Ad-hoc',
    desc: 'Miscellaneous Assistance / Consumables',
    cat: 'MANUAL' as BillingEventSourceModule,
    defaultPrice: 150,
  },
]

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function getInitialFormState(
  billingEvent: BillingEvent | null | undefined,
  occupants: Occupant[],
  folio?: AddMiscellaneousChargeModalProps['folio'],
) {
  const todayStr = getTodayStr()
  if (billingEvent) {
    return {
      description: billingEvent.description || '',
      sourceModule: (billingEvent.sourceModule as BillingEventSourceModule) || ('MANUAL' as BillingEventSourceModule),
      selectedResidentId: billingEvent.residentId || '',
      serviceDate: billingEvent.serviceDate ? String(billingEvent.serviceDate).split('T')[0] : todayStr,
      quantity: billingEvent.quantity || 1,
      unitPrice: (billingEvent.unitPrice ?? '') as number | '',
      chargeType: billingEvent.chargeType || 'ONE_TIME',
    }
  }
  const primary = occupants.find((o) => o.isPrimary) || occupants[0]
  return {
    description: '',
    sourceModule: 'MANUAL' as BillingEventSourceModule,
    selectedResidentId: primary?.id || folio?.primaryResidentId || '',
    serviceDate: todayStr,
    quantity: 1,
    unitPrice: '' as number | '',
    chargeType: 'ONE_TIME',
  }
}

export const AddMiscellaneousChargeModal: React.FC<AddMiscellaneousChargeModalProps> = ({
  open,
  onOpenChange,
  unit,
  folio,
  occupants = [],
  billingEvent,
  onSuccess,
}) => {
  if (!open) return null

  return (
    <AddMiscellaneousChargeForm
      key={billingEvent?.id ?? `new-${unit?.id ?? 'unit'}`}
      open={open}
      onOpenChange={onOpenChange}
      unit={unit}
      folio={folio}
      occupants={occupants}
      billingEvent={billingEvent}
      onSuccess={onSuccess}
    />
  )
}

const AddMiscellaneousChargeForm: React.FC<AddMiscellaneousChargeModalProps> = ({
  open,
  onOpenChange,
  unit,
  folio,
  occupants = [],
  billingEvent,
  onSuccess,
}) => {
  const unitId = unit?.id || ''
  const unitNumber = unit?.unitNumber || ''
  const billingAccountId = folio?.id
  const propertyId = folio?.propertyId
  const initial = getInitialFormState(billingEvent, occupants, folio)

  const [description, setDescription] = useState(initial.description)
  const [sourceModule, setSourceModule] = useState<BillingEventSourceModule>(initial.sourceModule)
  const [selectedResidentId, setSelectedResidentId] = useState(initial.selectedResidentId)
  const [serviceDate, setServiceDate] = useState(initial.serviceDate)
  const [quantity, setQuantity] = useState(initial.quantity)
  const [unitPrice, setUnitPrice] = useState<number | ''>(initial.unitPrice)
  const [chargeType, setChargeType] = useState(initial.chargeType)

  const createEventMutation = useCreateBillingEvent(unitId)

  const handleApplyPreset = (preset: (typeof PRESET_CHARGES)[0]) => {
    setDescription(preset.desc)
    setSourceModule(preset.cat)
    setUnitPrice(preset.defaultPrice)
  }

  const numericPrice = typeof unitPrice === 'number' ? unitPrice : 0
  const subtotal = Math.round(quantity * numericPrice * 100) / 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    if (!numericPrice || numericPrice <= 0) return

    await createEventMutation.mutateAsync({
      billingAccountId,
      unitId,
      residentId: selectedResidentId || undefined,
      propertyId,
      sourceModule,
      sourceType: 'MISCELLANEOUS',
      chargeType,
      description: description.trim(),
      quantity: Number(quantity) || 1,
      unitPrice: numericPrice,
      amount: subtotal,
      serviceDate,
    })

    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border border-gray-100 shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">Add Miscellaneous / Ad-Hoc Charge</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                Post one-off consumption or maintenance charge to Flat{' '}
                <span className="font-semibold text-gray-800">{unitNumber}</span>. It will be queued in Pending Charges.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Quick Presets */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Preset Templates
              </Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_CHARGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50/60 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 transition text-gray-700 font-medium cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Item Description */}
            <div className="space-y-1.5">
              <Label htmlFor="misc-desc" className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                Charge Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="misc-desc"
                placeholder="e.g. Bathroom plumbing repair, Guest dinner, AC filter cleaning..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            {/* Category & Charge Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-gray-400" />
                  Category / Module
                </Label>
                <Select value={sourceModule} onValueChange={(val) => setSourceModule(val as BillingEventSourceModule)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">🔧 Maintenance & Repairs</SelectItem>
                    <SelectItem value="HOUSEKEEPING">🧹 Housekeeping & Cleaning</SelectItem>
                    <SelectItem value="FNB">🍽️ Food & Dining Ad-hoc</SelectItem>
                    <SelectItem value="TRANSPORT">🚗 Transport & Shuttle</SelectItem>
                    <SelectItem value="CARE">💊 Care Assistance</SelectItem>
                    <SelectItem value="ACTIVITY">🎯 Activity & Recreation</SelectItem>
                    <SelectItem value="SYSTEM">⚙️ General / Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Billing Type</Label>
                <Select value={chargeType} onValueChange={setChargeType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_TIME">One-Time Charge</SelectItem>
                    <SelectItem value="RECURRING">Recurring</SelectItem>
                    <SelectItem value="AD_HOC">Ad-Hoc Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resident Occupant & Service Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  Billed To Resident
                </Label>
                {occupants.length > 0 ? (
                  <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Occupant" />
                    </SelectTrigger>
                    <SelectContent>
                      {occupants.map((occ) => (
                        <SelectItem key={occ.id} value={occ.id}>
                          {occ.name} {occ.isPrimary ? '(Primary)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-9 px-3 flex items-center text-xs text-gray-400 bg-gray-50 rounded-md border border-gray-200">
                    Primary Folio Holder
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="misc-date"
                  className="text-xs font-semibold text-gray-700 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Service Date
                  </span>
                  <span className="text-[11px] font-normal text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    {formatDateDDMMYYYY(serviceDate)}
                  </span>
                </Label>
                <Input
                  id="misc-date"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Quantity, Unit Price & Total */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="misc-qty" className="text-xs font-semibold text-gray-700">
                  Quantity
                </Label>
                <Input
                  id="misc-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="misc-price" className="text-xs font-semibold text-gray-700 flex items-center gap-0.5">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                  Rate (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="misc-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  required
                  className="h-9 text-sm font-semibold text-gray-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Total Charge</Label>
                <div className="h-9 px-3 flex items-center justify-end font-bold text-sm bg-amber-50/80 text-amber-900 border border-amber-200/80 rounded-md">
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {subtotal > 0 && (
                <span>
                  Adding <strong className="text-gray-900">₹{subtotal.toFixed(2)}</strong> to pending charges
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createEventMutation.isPending}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEventMutation.isPending || !description.trim() || !numericPrice}
                className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {createEventMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Charge
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
