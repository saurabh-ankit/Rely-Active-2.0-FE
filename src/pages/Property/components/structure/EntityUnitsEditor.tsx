import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BlockInput, EntityInput, FloorInput, UnitInput, UnitType } from '../../types'
import { ENTITY_PRESETS, levelLabel, newUnit, UNIT_TYPE_OPTIONS } from './entityPresets'

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20'

interface UnitGridProps {
  entity: EntityInput
  units: UnitInput[]
  onChange: (units: UnitInput[]) => void
  /** How many times each unit number is used in the whole property (lower-cased). */
  numberCounts: Map<string, number>
}

/** Next free numbers like V-01, V-02… skipping any already used in the property. */
function nextNumbers(prefix: string, count: number, numberCounts: Map<string, number>, pending: string[]) {
  const used = new Set([...numberCounts.keys(), ...pending.map((n) => n.toLowerCase())])
  const result: string[] = []
  for (let i = 1; result.length < count && i < 10000; i++) {
    const candidate = `${prefix}${String(i).padStart(2, '0')}`
    if (!used.has(candidate.toLowerCase())) result.push(candidate)
  }
  return result
}

/** Editable list of units: number, type, area and the entity's extra details. */
function UnitGrid({ entity, units, onChange, numberCounts }: UnitGridProps) {
  const preset = ENTITY_PRESETS[entity.entity_type]
  const unitName = levelLabel(entity, 'unit')
  const [prefix, setPrefix] = useState(preset.prefix)
  const [count, setCount] = useState(5)

  const update = (index: number, patch: Partial<UnitInput>) =>
    onChange(units.map((u, i) => (i === index ? { ...u, ...patch } : u)))
  const updateAttribute = (index: number, key: string, value: string) => {
    const current = units[index]?.attributes ?? {}
    update(index, { attributes: { ...current, [key]: value === '' ? null : Number(value) } })
  }
  const quickAdd = () => {
    const numbers = nextNumbers(prefix, Math.min(Math.max(count, 1), 200), numberCounts, [])
    onChange([...units, ...numbers.map((n) => newUnit(entity, n))])
  }

  return (
    <div className="space-y-3">
      {units.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
          No {unitName.toLowerCase()}s yet. Add some below.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500">
              <tr>
                <th className="px-3 py-2">{unitName} no.</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Area (sqft)</th>
                {preset.attributes.map((a) => (
                  <th key={a.key} className="px-3 py-2">
                    {a.label}
                    {a.suffix ? ` (${a.suffix})` : ''}
                  </th>
                ))}
                <th className="w-10 px-3 py-2">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {units.map((unit, index) => {
                const duplicate = (numberCounts.get(unit.unit_number.trim().toLowerCase()) ?? 0) > 1
                return (
                  <tr key={unit.id ?? index}>
                    <td className="px-3 py-1.5">
                      <input
                        aria-label={`${unitName} number`}
                        value={unit.unit_number}
                        onChange={(e) => update(index, { unit_number: e.target.value })}
                        className={cn(inputClass, duplicate && 'border-red-400 bg-red-50')}
                        title={duplicate ? 'This number is already used in the property' : undefined}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        aria-label="Type"
                        value={unit.unit_type}
                        onChange={(e) => update(index, { unit_type: e.target.value as UnitType })}
                        className={inputClass}
                      >
                        {UNIT_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        aria-label="Area"
                        type="number"
                        min={0}
                        value={unit.built_up_area ?? ''}
                        onChange={(e) =>
                          update(index, { built_up_area: e.target.value === '' ? null : Number(e.target.value) })
                        }
                        className={inputClass}
                      />
                    </td>
                    {preset.attributes.map((a) => (
                      <td key={a.key} className="px-3 py-1.5">
                        <input
                          aria-label={a.label}
                          type="number"
                          min={0}
                          value={(unit.attributes?.[a.key] as number | null | undefined) ?? ''}
                          onChange={(e) => updateAttribute(index, a.key, e.target.value)}
                          className={inputClass}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        aria-label={`Remove ${unit.unit_number}`}
                        onClick={() => onChange(units.filter((_, i) => i !== index))}
                        className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-gray-50 p-3">
        <div className="space-y-1">
          <label htmlFor={`qa-prefix-${entity.name}`} className="text-[11px] text-gray-500">
            Number prefix
          </label>
          <input
            id={`qa-prefix-${entity.name}`}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className={cn(inputClass, 'w-24')}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`qa-count-${entity.name}`} className="text-[11px] text-gray-500">
            How many
          </label>
          <input
            id={`qa-count-${entity.name}`}
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className={cn(inputClass, 'w-20')}
          />
        </div>
        <Button type="button" variant="outline" onClick={quickAdd} className="h-8 rounded-lg text-xs">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add {unitName.toLowerCase()}s
        </Button>
        <span className="text-[11px] text-gray-400">e.g. {nextNumbers(prefix, 1, numberCounts, [])[0]} onwards</span>
      </div>
    </div>
  )
}

interface EntityUnitsEditorProps {
  entity: EntityInput
  onChange: (entity: EntityInput) => void
  numberCounts: Map<string, number>
}

/** Structure editor for entities without towers: units only, floor → unit, or block → unit. */
export function EntityUnitsEditor({ entity, onChange, numberCounts }: EntityUnitsEditorProps) {
  const top = entity.levels[0]
  const blockName = levelLabel(entity, 'block')
  const floorName = levelLabel(entity, 'floor')

  if (top === 'unit') {
    return (
      <UnitGrid
        entity={entity}
        units={entity.units ?? []}
        onChange={(units) => onChange({ ...entity, units })}
        numberCounts={numberCounts}
      />
    )
  }

  if (top === 'floor') {
    const floors = entity.floors ?? []
    const setFloors = (next: FloorInput[]) => onChange({ ...entity, floors: next })
    const patchFloor = (index: number, patch: Partial<FloorInput>) =>
      setFloors(floors.map((f, i) => (i === index ? { ...f, ...patch } : f)))
    return (
      <div className="space-y-4">
        {floors.map((floor, index) => (
          <section key={floor.id ?? index} className="space-y-3 rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label htmlFor={`floor-no-${index}`} className="text-[11px] text-gray-500">
                  {floorName} no.
                </label>
                <input
                  id={`floor-no-${index}`}
                  type="number"
                  value={floor.floor_number}
                  onChange={(e) => patchFloor(index, { floor_number: Number(e.target.value) })}
                  className={cn(inputClass, 'w-24')}
                />
              </div>
              <div className="min-w-40 flex-1 space-y-1">
                <label htmlFor={`floor-name-${index}`} className="text-[11px] text-gray-500">
                  Name
                </label>
                <input
                  id={`floor-name-${index}`}
                  value={floor.floor_name ?? ''}
                  placeholder={`${floorName} ${floor.floor_number}`}
                  onChange={(e) => patchFloor(index, { floor_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFloors(floors.filter((_, i) => i !== index))}
                className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Remove {floorName.toLowerCase()}
              </Button>
            </div>
            <UnitGrid
              entity={entity}
              units={floor.units ?? []}
              onChange={(units) => patchFloor(index, { units })}
              numberCounts={numberCounts}
            />
          </section>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const nextNo = floors.reduce((max, f) => Math.max(max, Number(f.floor_number)), -1) + 1
            setFloors([...floors, { floor_number: nextNo, floor_name: '', units: [] }])
          }}
          className="rounded-xl text-xs"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add {floorName.toLowerCase()}
        </Button>
      </div>
    )
  }

  // block → unit
  const blocks = entity.blocks ?? []
  const setBlocks = (next: BlockInput[]) => onChange({ ...entity, blocks: next })
  const patchBlock = (index: number, patch: Partial<BlockInput>) =>
    setBlocks(blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <section key={block.id ?? index} className="space-y-3 rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1">
              <label htmlFor={`block-name-${index}`} className="text-[11px] text-gray-500">
                {blockName} name
              </label>
              <input
                id={`block-name-${index}`}
                value={block.block_name}
                onChange={(e) => patchBlock(index, { block_name: e.target.value })}
                className={inputClass}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBlocks(blocks.filter((_, i) => i !== index))}
              className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Remove {blockName.toLowerCase()}
            </Button>
          </div>
          <UnitGrid
            entity={entity}
            units={block.units ?? []}
            onChange={(units) => patchBlock(index, { units })}
            numberCounts={numberCounts}
          />
        </section>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => setBlocks([...blocks, { block_name: `${blockName} ${blocks.length + 1}`, units: [] }])}
        className="rounded-xl text-xs"
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add {blockName.toLowerCase()}
      </Button>
    </div>
  )
}

export default EntityUnitsEditor
