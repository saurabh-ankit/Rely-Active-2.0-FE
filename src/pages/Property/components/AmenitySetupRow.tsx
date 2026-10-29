import { BedDouble, Clock3, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TimePicker } from '@/components/ui/time-picker'
import { cn } from '@/lib/utils'
import {
  SLOT_LENGTHS,
  priceUnitLabel,
  slotLengthLabel,
  type AmenityBookingUnit,
  type SelectedAmenity,
} from '../amenityBooking'

const UNIT_OPTIONS: { value: AmenityBookingUnit; label: string; hint: string; icon: typeof Clock3 }[] = [
  { value: 'SLOT', label: 'Timed slots', hint: 'Fixed-length slots, e.g. 1 hr', icon: Clock3 },
  { value: 'FULL_DAY', label: 'Full day', hint: 'Whole days; several at once', icon: Sun },
  { value: 'NIGHT', label: 'Overnight stay', hint: 'Check-in → check-out next day', icon: BedDouble },
]

const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-600'

interface AmenitySetupRowProps {
  amenity: SelectedAmenity
  onChange: (patch: Partial<SelectedAmenity>) => void
  onRemove: () => void
}

export function AmenitySetupRow({ amenity, onChange, onRemove }: AmenitySetupRowProps) {
  const idBase = `${amenity.amenityId || 'legacy'}-${amenity.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const id = (suffix: string) => `${idBase}-${suffix}`
  const unit = amenity.bookingUnit

  const timeField = (key: 'availableFrom' | 'availableTo' | 'checkInTime' | 'checkOutTime', label: string) => (
    <div>
      <Label htmlFor={id(key)} className={fieldLabel}>
        {label}
      </Label>
      <TimePicker id={id(key)} value={amenity[key] || ''} onChange={(val) => onChange({ [key]: val })} />
    </div>
  )

  return (
    <div className="rounded-xl border border-[#005390]/15 bg-white/80 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#005390] px-3 py-1 text-xs font-medium text-white shadow-sm">
          {amenity.name}
          {amenity.amenityId ? null : <span className="text-[10px] text-white/75">Legacy</span>}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Each switch says what its current state means, so "slot" and "payable" read on their own. */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
            <Switch
              id={id('slot')}
              checked={amenity.slotBookable}
              // A name-only (legacy) amenity isn't in the catalog, so it can't hold booking settings.
              disabled={!amenity.amenityId}
              // Only bookings are charged, so a non-bookable amenity can't stay payable.
              onCheckedChange={(checked) =>
                onChange({ slotBookable: checked, isPayable: checked && amenity.isPayable })
              }
              className="data-checked:bg-[#005390]"
            />
            <Label htmlFor={id('slot')} className="flex cursor-pointer flex-col items-start gap-0">
              <span className="text-[11px] font-semibold text-gray-800">Booking</span>
              <span className="text-[10px] font-normal text-gray-500">
                {!amenity.amenityId
                  ? 'Add it to the catalog to enable'
                  : amenity.slotBookable
                    ? 'Residents book it'
                    : 'Open use, no booking'}
              </span>
            </Label>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
              amenity.isPayable ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white',
            )}
            title={amenity.slotBookable ? undefined : 'Turn on booking to charge for it'}
          >
            <Switch
              id={id('payable')}
              checked={amenity.isPayable}
              disabled={!amenity.slotBookable}
              onCheckedChange={(checked) => onChange({ isPayable: checked })}
              className="data-checked:bg-emerald-600"
            />
            <Label
              htmlFor={id('payable')}
              className={cn(
                'flex flex-col items-start gap-0',
                amenity.slotBookable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="text-[11px] font-semibold text-gray-800">Payable</span>
              <span className={cn('text-[10px] font-normal', amenity.isPayable ? 'text-emerald-700' : 'text-gray-500')}>
                {amenity.isPayable
                  ? `Charged per ${priceUnitLabel(amenity)} to flat bill`
                  : amenity.slotBookable
                    ? 'Free to book'
                    : 'Needs booking'}
              </span>
            </Label>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${amenity.name}`}
            onClick={onRemove}
            className="h-6 w-6 rounded-full bg-[#005390] p-1 text-white hover:bg-[#004274]"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {amenity.slotBookable && (
        <div className="mt-2.5" role="radiogroup" aria-label={`How ${amenity.name} is booked`}>
          <p className={fieldLabel}>Booked as</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {UNIT_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
              const active = unit === value
              return (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ bookingUnit: value })}
                  className={cn(
                    'h-auto justify-start gap-2 whitespace-normal rounded-lg px-3 py-2 text-left font-normal',
                    active
                      ? 'border-[#005390] bg-[#005390]/10 text-[#005390] hover:bg-[#005390]/10 hover:text-[#005390]'
                      : 'border-gray-200 bg-white text-gray-700',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex flex-col">
                    <span className="text-xs font-semibold">{label}</span>
                    <span className={cn('text-[10px]', active ? 'text-[#005390]/80' : 'text-gray-500')}>{hint}</span>
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {!amenity.slotBookable && (
          <>
            {timeField('availableFrom', 'Available From (Optional)')}
            {timeField('availableTo', 'Available To (Optional)')}
          </>
        )}
        {amenity.slotBookable && unit === 'SLOT' && (
          <>
            {timeField('availableFrom', 'Opens At')}
            {timeField('availableTo', 'Closes At')}
            <div>
              <Label htmlFor={id('length')} className={fieldLabel}>
                Slot Length
              </Label>
              <Select
                value={String(amenity.slotDurationMinutes)}
                onValueChange={(val) => onChange({ slotDurationMinutes: Number(val) })}
              >
                <SelectTrigger id={id('length')} className="h-9 w-full rounded-lg bg-white text-xs">
                  <SelectValue>{slotLengthLabel(amenity.slotDurationMinutes)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SLOT_LENGTHS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {slotLengthLabel(minutes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        {amenity.slotBookable && unit === 'FULL_DAY' && (
          <>
            {timeField('availableFrom', 'Opens At (default 12:00 AM)')}
            {timeField('availableTo', 'Closes At (default 11:59 PM)')}
          </>
        )}
        {amenity.slotBookable && unit === 'NIGHT' && (
          <>
            {timeField('checkInTime', 'Check-in Time')}
            {timeField('checkOutTime', 'Check-out Time (Next Day)')}
          </>
        )}
        {amenity.isPayable && (
          <div>
            <Label htmlFor={id('price')} className={fieldLabel}>
              Price per {priceUnitLabel(amenity)} (₹)
            </Label>
            <Input
              id={id('price')}
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 800"
              value={amenity.price}
              onChange={(e) => onChange({ price: e.target.value })}
              className="h-9 rounded-lg bg-white text-xs"
            />
          </div>
        )}
      </div>

      {amenity.isPayable && Number(amenity.price) > 0 && unit !== 'SLOT' && (
        <p className="mt-1.5 text-[10px] text-emerald-700">
          e.g. a {unit === 'NIGHT' ? '3-night stay' : '3-day booking'} is billed 3 × ₹
          {Number(amenity.price).toLocaleString('en-IN')} = ₹{(Number(amenity.price) * 3).toLocaleString('en-IN')} to
          the flat.
        </p>
      )}
    </div>
  )
}
