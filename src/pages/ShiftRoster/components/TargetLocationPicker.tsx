import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { TargetLocation } from '../types'

interface TargetLocationPickerProps {
  targetLocations: TargetLocation[]
  groupedTargetLocations: Array<{ label: string; items: TargetLocation[] }>
  targetScopeType: string
  selectedTargetId: string
  onTargetScopeTypeChange: (type: TargetLocation['type']) => void
  onTargetSelect: (target: TargetLocation) => void
  onAddCustomLocation: () => void
  error?: string
}

export function TargetLocationPicker({
  targetLocations,
  groupedTargetLocations,
  targetScopeType,
  selectedTargetId,
  onTargetScopeTypeChange,
  onTargetSelect,
  onAddCustomLocation,
  error,
}: TargetLocationPickerProps) {
  const scopeTypes = useMemo(
    () =>
      [
        { type: 'PROPERTY' as const, label: 'Property' },
        { type: 'BLOCK' as const, label: 'Block' },
        { type: 'FLOOR' as const, label: 'Floor' },
        { type: 'ROOM_UNIT' as const, label: 'Room / Unit' },
        { type: 'DEPARTMENT' as const, label: 'Department' },
        { type: 'CLINIC_VENUE' as const, label: 'Clinic Venue' },
        { type: 'SERVICE' as const, label: 'Service' },
      ].filter((s) => targetLocations.some((t) => t.type === s.type)),
    [targetLocations],
  )

  const filteredTargets = targetLocations.filter((t) => t.type === targetScopeType)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {scopeTypes.map((s) => (
          <Button
            key={s.type}
            type="button"
            size="sm"
            variant={targetScopeType === s.type ? 'default' : 'outline'}
            onClick={() => onTargetScopeTypeChange(s.type)}
          >
            {s.label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={onAddCustomLocation} className="gap-1">
          <Plus className="w-3 h-3" /> Add Location
        </Button>
      </div>

      <div>
        <Label>Target Location *</Label>
        <Select
          value={selectedTargetId}
          onValueChange={(id) => {
            const target = targetLocations.find((t) => t.id === id)
            if (target) onTargetSelect(target)
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select target location" />
          </SelectTrigger>
          <SelectContent>
            {groupedTargetLocations.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.items.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            {filteredTargets.length === 0 && (
              <SelectItem value="__none__" disabled>
                No locations for this scope
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    </div>
  )
}
