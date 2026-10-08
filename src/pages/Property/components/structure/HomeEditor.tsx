import type React from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { EntityInput, UnitInput, UnitType } from '../../types'
import {
  ASSET_FORM_OPTIONS,
  CONFIGURATION_OPTIONS,
  HOME_BHK_OPTIONS,
  homeErrors,
  homePrice,
  levelLabel,
  readHome,
  writeHome,
  type HomeDetails,
} from './entityPresets'

const fieldClass =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:ring-2 disabled:opacity-60'
const okBorder = 'border-gray-200 focus:border-[#005390] focus:ring-[#005390]/20'
const badBorder = 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'

/** "INR 60.00 L" (lakhs). */
const formatLakh = (amount: number | null | undefined) => `INR ${((amount ?? 0) / 100000).toFixed(2)} L`
const numberOrNull = (value: string) => (value === '' ? null : Number(value))

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </label>
      {children}
    </div>
  )
}

interface HomeEditorProps {
  entity: EntityInput
  unitIndex: number
  onChange: (unit: UnitInput) => void
  onDelete: () => void
  canDelete: boolean
  /** How many times each unit number is used in the property (lower-cased), to flag duplicates. */
  numberCounts: Map<string, number>
  /** Shown at the bottom next to Delete, e.g. "Apply to all villas". */
  footerAction?: React.ReactNode
}

/** Edits one villa / duplex / triplex: its number, sizes, BHK and price. */
export function HomeEditor({
  entity,
  unitIndex,
  onChange,
  onDelete,
  canDelete,
  numberCounts,
  footerAction,
}: HomeEditorProps) {
  const unit = entity.units?.[unitIndex]
  if (!unit) return null

  const isVilla = entity.entity_type === 'villa'
  const word = levelLabel(entity, 'unit')
  const home = readHome(unit)
  const update = (patch: Partial<HomeDetails>) => onChange(writeHome(entity, unit, { ...home, ...patch }))
  const id = (name: string) => `home-${unitIndex}-${name}`
  const duplicate = (numberCounts.get(unit.unit_number.trim().toLowerCase()) ?? 0) > 1
  const errors = [
    ...homeErrors(entity, unit),
    ...(duplicate ? [`${unit.unit_number} is already used in this property.`] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <h3 className="text-lg font-bold text-gray-900">{unit.unit_number || `New ${word.toLowerCase()}`}</h3>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-[11px] font-semibold text-blue-700">
          {word}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field id={id('number')} label={`${word} number`}>
          <input
            id={id('number')}
            value={unit.unit_number}
            onChange={(e) => onChange({ ...unit, unit_number: e.target.value })}
            className={cn(fieldClass, unit.unit_number.trim() && !duplicate ? okBorder : badBorder)}
          />
        </Field>
        <Field id={id('plot')} label="Plot size (sqft)">
          <input
            id={id('plot')}
            type="number"
            min={0}
            value={home.plotArea ?? ''}
            onChange={(e) => update({ plotArea: numberOrNull(e.target.value) })}
            className={cn(fieldClass, isVilla && !((home.plotArea ?? 0) > 0) ? badBorder : okBorder)}
          />
        </Field>
        {isVilla ? (
          <Field id={id('config')} label="Configuration">
            <select
              id={id('config')}
              value={home.configuration ?? 'G+1'}
              onChange={(e) => update({ configuration: e.target.value })}
              className={cn(fieldClass, okBorder)}
            >
              {CONFIGURATION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field id={id('form')} label="Asset form">
            <select
              id={id('form')}
              value={home.assetForm ?? 'Independent House'}
              onChange={(e) => update({ assetForm: e.target.value })}
              className={cn(fieldClass, okBorder)}
            >
              {ASSET_FORM_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
        )}
        {!isVilla && (
          <Field id={id('carpet')} label="Carpet area (sqft)">
            <input
              id={id('carpet')}
              type="number"
              min={0}
              value={home.carpetArea ?? ''}
              onChange={(e) => update({ carpetArea: numberOrNull(e.target.value) })}
              className={cn(fieldClass, (home.carpetArea ?? 0) > 0 ? okBorder : badBorder)}
            />
          </Field>
        )}
        <Field id={id('bhk')} label="BHK configuration">
          <select
            id={id('bhk')}
            value={home.bhk}
            onChange={(e) => update({ bhk: e.target.value as UnitType })}
            className={cn(fieldClass, okBorder)}
          >
            {HOME_BHK_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field id={id('pps')} label="Price per sqft (INR)">
          <input
            id={id('pps')}
            type="number"
            min={0}
            value={home.pricePerSqft ?? ''}
            onChange={(e) => update({ pricePerSqft: numberOrNull(e.target.value) })}
            className={cn(fieldClass, (home.pricePerSqft ?? 0) < 0 ? badBorder : okBorder)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-xs">
        <span className="text-gray-500">Price</span>
        <span className="font-bold text-gray-900">{formatLakh(homePrice(entity, home))}</span>
        <span className="text-gray-400">= price/sqft × {isVilla ? 'plot size' : 'carpet area'}</span>
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((msg) => (
            <li key={msg} className="text-xs text-red-600">
              {msg}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        {footerAction ?? <span />}
        <Button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete {word.toLowerCase()}
        </Button>
      </div>
    </div>
  )
}

export default HomeEditor
