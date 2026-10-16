import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { EntityInput, EntityType, LevelLabels, StructureLevel } from '../../types'
import { createEntity, ENTITY_PRESETS, ENTITY_TYPES, LEVEL_OPTIONS, sameLevels } from './entityPresets'

interface AddEntityDialogProps {
  onOpenChange: (open: boolean) => void
  onCreate: (entity: EntityInput) => void
}

const LEVEL_NAMES: Record<StructureLevel, string> = { block: 'Block', floor: 'Floor', unit: 'Unit' }

/** Mounted fresh on each open, so it starts from the default preset every time. */
export function AddEntityDialog({ onOpenChange, onCreate }: AddEntityDialogProps) {
  const [type, setType] = useState<EntityType>('apartment')
  const [name, setName] = useState(ENTITY_PRESETS.apartment.name)
  const [levels, setLevels] = useState<StructureLevel[]>(ENTITY_PRESETS.apartment.levels)
  const [labels, setLabels] = useState<LevelLabels>(ENTITY_PRESETS.apartment.labels)

  const pickType = (next: EntityType) => {
    const preset = ENTITY_PRESETS[next]
    // Only replace the name if it's still the previous kind's default (or empty), never one the user typed.
    if (!name.trim() || name.trim() === ENTITY_PRESETS[type].name) setName(preset.name)
    setType(next)
    setLevels(preset.levels)
    setLabels(preset.labels)
  }

  const create = () => {
    onCreate(createEntity(type, { name: name.trim() || ENTITY_PRESETS[type].name, levels, level_labels: labels }))
    onOpenChange(false)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add entity</DialogTitle>
          <DialogDescription>A group of units in this property, like towers, villas or shops.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-700">What kind?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ENTITY_TYPES.map((t) => {
                const preset = ENTITY_PRESETS[t]
                const Icon = preset.icon
                const active = t === type
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pickType(t)}
                    className={cn(
                      'flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                      active
                        ? 'border-[#005390] bg-[#005390]/5 ring-2 ring-[#005390]/15'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', active ? 'text-[#005390]' : 'text-gray-400')} />
                    <span className="text-xs font-semibold text-gray-900">{preset.label}</span>
                    <span className="text-[10px] leading-tight text-gray-500">{preset.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="entity-name" className="text-xs font-semibold text-gray-700">
              Name
            </label>
            <input
              id="entity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Villas"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
            />
          </div>

          {type === 'apartment' ? (
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-700">How is it organised?</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {LEVEL_OPTIONS.map((option) => {
                  const active = sameLevels(option.levels, levels)
                  const Icon = option.icon
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setLevels(option.levels)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                        active
                          ? 'border-[#005390] bg-[#005390]/5 ring-2 ring-[#005390]/15'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#005390]' : 'text-gray-400')} />
                      <span>
                        <span className="block text-xs font-semibold text-gray-900">{option.label}</span>
                        <span className="block text-[10px] text-gray-500">{option.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-gray-50 px-3.5 py-2.5 text-xs text-gray-600">
              {ENTITY_PRESETS[type].label}s are a simple list ({ENTITY_PRESETS[type].prefix}01,{' '}
              {ENTITY_PRESETS[type].prefix}02…). Set one up, then add as many more like it as you need and edit any of
              them on its own.
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold text-gray-700">
              What do you call each level? <span className="font-normal text-gray-400">(optional)</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {levels.map((level) => (
                <div key={level} className="space-y-1">
                  <label htmlFor={`label-${level}`} className="text-[11px] text-gray-500">
                    {LEVEL_NAMES[level]}
                  </label>
                  <input
                    id={`label-${level}`}
                    value={labels[level] ?? ''}
                    placeholder={LEVEL_NAMES[level]}
                    onChange={(e) => setLabels((prev) => ({ ...prev, [level]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={create} className="bg-[#005390] text-white hover:bg-[#004274]">
            Add {name.trim() || 'entity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddEntityDialog
