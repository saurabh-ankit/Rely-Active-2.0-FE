import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { calculateOpdSlots } from '../types'

interface OpdConfigSectionProps {
  shiftTime: string
  enableOpdSlots: boolean
  slotDurationMinutes: number
  slotBufferMinutes: number
  onEnableChange: (enabled: boolean) => void
  onDurationChange: (minutes: number) => void
  onBufferChange: (minutes: number) => void
}

export function OpdConfigSection({
  shiftTime,
  enableOpdSlots,
  slotDurationMinutes,
  slotBufferMinutes,
  onEnableChange,
  onDurationChange,
  onBufferChange,
}: OpdConfigSectionProps) {
  const previewSlots = useMemo(
    () => calculateOpdSlots(shiftTime, slotDurationMinutes, slotBufferMinutes),
    [shiftTime, slotDurationMinutes, slotBufferMinutes],
  )

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-purple-900">OPD Slot Configuration</h4>
          <p className="text-xs text-purple-700">Configure bookable consultation slots within the session window.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="enable-opd-slots" className="text-sm">
            Enable slots
          </Label>
          <Switch id="enable-opd-slots" checked={enableOpdSlots} onCheckedChange={onEnableChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Slot duration (minutes)</Label>
          <Input
            type="number"
            min={5}
            max={120}
            value={slotDurationMinutes}
            onChange={(e) => onDurationChange(Number(e.target.value) || 30)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Buffer between slots (minutes)</Label>
          <Input
            type="number"
            min={0}
            max={30}
            value={slotBufferMinutes}
            onChange={(e) => onBufferChange(Number(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      {enableOpdSlots && previewSlots.length > 0 && (
        <div>
          <p className="text-xs font-medium text-purple-800 mb-2">
            Preview: {previewSlots.length} slot(s) for {shiftTime}
          </p>
          <div className="flex flex-wrap gap-1">
            {previewSlots.map((slot) => (
              <Badge key={slot.slotNumber} variant="outline" className="text-[10px] bg-white">
                {slot.startTime}–{slot.endTime}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
