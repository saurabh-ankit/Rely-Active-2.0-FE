import { Globe2, Lock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUpdateDashboardSettings } from '@/hooks/react-query/dashboard'
import type { DashboardSettings, DashboardTabKey } from '@/lib/types/dashboard'
import { cn } from '@/lib/utils'
import { DASHBOARD_TABS } from '../tabs'

/** Choose which dashboard tabs show. Saved for the whole company, so it changes every property. */
export function CustomizeTabsDialog({
  open,
  onOpenChange,
  settings,
  locationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: DashboardSettings
  locationId?: string | null
}) {
  const [selected, setSelected] = useState<DashboardTabKey[]>(settings.visibleTabs)
  const [wasOpen, setWasOpen] = useState(open)
  const update = useUpdateDashboardSettings(locationId)

  // Start from the saved choice each time the dialog opens.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setSelected(settings.visibleTabs)
  }

  const toggle = (tab: DashboardTabKey, on: boolean) =>
    setSelected((prev) => (on ? [...prev, tab] : prev.filter((t) => t !== tab)))
  const changed =
    selected.length !== settings.visibleTabs.length || selected.some((t) => !settings.visibleTabs.includes(t))

  const save = () =>
    update.mutate(
      DASHBOARD_TABS.map((t) => t.value).filter((t) => t === 'dashboard' || selected.includes(t)),
      { onSuccess: () => onOpenChange(false) },
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customise dashboard tabs</DialogTitle>
          <DialogDescription>Choose which tabs appear on the dashboard.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          <div>
            <p className="font-semibold">These tabs apply to all properties.</p>
            <p className="mt-0.5 text-sky-800">
              Every user will see the same dashboard tabs on every location under this company, not just the one
              selected now.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>
            {selected.filter((t) => t !== 'dashboard').length + 1} of {DASHBOARD_TABS.length} tabs selected
          </span>
          <span className="flex gap-3">
            <button
              type="button"
              className="font-semibold text-[#005390] hover:underline"
              onClick={() => setSelected(DASHBOARD_TABS.map((t) => t.value))}
            >
              Select all
            </button>
            <button
              type="button"
              className="font-semibold text-[#005390] hover:underline"
              onClick={() => setSelected(['dashboard'])}
            >
              Clear
            </button>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DASHBOARD_TABS.map(({ value, label, icon: Icon, description }) => {
            const locked = value === 'dashboard'
            const checked = locked || selected.includes(value)
            return (
              <div
                key={value}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 transition-colors',
                  checked ? 'border-[#005390]/40 bg-[#005390]/5' : 'border-gray-200 bg-white',
                  locked ? 'cursor-not-allowed' : 'cursor-pointer hover:border-[#005390]/40',
                )}
              >
                <Checkbox
                  id={`dashboard-tab-${value}`}
                  checked={checked}
                  disabled={locked}
                  onCheckedChange={(on) => toggle(value, Boolean(on))}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`dashboard-tab-${value}`}
                  className={cn('min-w-0 flex-1', locked ? 'cursor-not-allowed' : 'cursor-pointer')}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1f2937]">
                    <Icon className="h-3.5 w-3.5 text-[#005390]" />
                    {label}
                    {locked && <Lock className="h-3 w-3 text-gray-400" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{description}</span>
                </label>
              </div>
            )
          })}
        </div>

        {settings.updatedAt && (
          <p className="text-[11px] text-gray-400">
            Last changed
            {settings.updatedByName ? ` by ${settings.updatedByName}` : ''} on{' '}
            {new Date(settings.updatedAt).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={!changed || update.isPending}
            className="bg-[#005390] text-white hover:bg-[#00467a]"
          >
            {update.isPending ? 'Saving…' : 'Save for all properties'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
