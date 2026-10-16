import { useState } from 'react'
import { Layers, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const plural = (label: string, n: number) => `${label.toLowerCase()}${n === 1 ? '' : 's'}`

interface BulkAddProps {
  /** What one block is called here, e.g. "Tower" or "Villa". */
  label: string
  onAdd: (count: number) => void
}

/** "[ 3 ] + Add towers" / "[ 3 ] + Add villas" for the structure tree. */
export function BulkAddControl({ label, onAdd }: BulkAddProps) {
  const [count, setCount] = useState(1)
  const valid = Number.isInteger(count) && count >= 1 && count <= 50
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      <label htmlFor="bulk-add-count" className="sr-only">
        How many {plural(label, 2)} to add
      </label>
      <input
        id="bulk-add-count"
        type="number"
        min={1}
        max={50}
        value={Number.isNaN(count) ? '' : count}
        onChange={(e) => setCount(e.target.valueAsNumber)}
        className="h-7 w-16 rounded-md border border-gray-200 bg-white px-1.5 text-[11px] outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={() => onAdd(count)}
        className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3 w-3" /> Add {plural(label, valid ? count : 2)}
      </button>
    </div>
  )
}

interface ApplyToAllProps {
  label: string
  onApply: () => void
}

/** Copies the current tower/group's setup into all the others (shown below the form). */
export function ApplyToAllButton({ label, onApply }: ApplyToAllProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onApply}
      className="h-9 rounded-xl border-gray-300 px-4 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600"
    >
      <Layers className="mr-1.5 h-3.5 w-3.5" /> Apply to all {plural(label, 2)}
    </Button>
  )
}
