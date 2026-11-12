import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Settings2, Zap } from 'lucide-react'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { notifyError, notifySuccess } from '@/utils/toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface AutoAssignSetting {
  departmentId: string
  departmentName: string
  departmentCode: string
  isEnabled: boolean
  responseTimeoutMinutes: number
}

const RESPONSE_TIMES = [1, 2, 3, 5, 10]

/** Ticket departments only (the ones residents raise tickets in). */
const TICKET_DEPARTMENT_CODES = ['RNM', 'CON']

interface AutoAssignSettingsProps {
  locationId: string | null | undefined
  /** A department manager only sees (and changes) their own department. */
  managerType?: 'RNM' | 'CON' | string | null
}

/**
 * Tickets header control: the auto-assign toggle per department for the selected property.
 * When on, tickets raised by residents are offered to on-shift staff automatically.
 */
export function AutoAssignSettings({ locationId, managerType }: AutoAssignSettingsProps) {
  const [open, setOpen] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['tickets', 'auto-assign-settings', locationId], [locationId])

  const {
    data: settings = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey,
    enabled: !!locationId,
    queryFn: async (): Promise<AutoAssignSetting[]> => {
      const res = await apiClient.get(API_ENDPOINTS.tickets.autoAssignSettings(locationId))
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })
  const setSettings = (update: (all: AutoAssignSetting[]) => AutoAssignSetting[]) =>
    queryClient.setQueryData<AutoAssignSetting[]>(queryKey, (all = []) => update(all))

  const visible = useMemo(
    () =>
      settings.filter((s) => {
        const code = (s.departmentCode || '').toUpperCase()
        if (managerType === 'RNM' || managerType === 'CON') return code === managerType
        return TICKET_DEPARTMENT_CODES.includes(code)
      }),
    [settings, managerType],
  )
  const enabledCount = visible.filter((s) => s.isEnabled).length

  const save = async (setting: AutoAssignSetting, changes: Partial<AutoAssignSetting>) => {
    if (!locationId) return
    const next = { ...setting, ...changes }
    setSavingId(setting.departmentId)
    // Show the change straight away; put it back if saving fails
    setSettings((all) => all.map((s) => (s.departmentId === setting.departmentId ? next : s)))
    try {
      const res = await apiClient.put(API_ENDPOINTS.tickets.autoAssignSettings(locationId), {
        settings: [
          {
            departmentId: next.departmentId,
            isEnabled: next.isEnabled,
            responseTimeoutMinutes: next.responseTimeoutMinutes,
          },
        ],
      })
      if (Array.isArray(res.data?.data)) setSettings(() => res.data.data)
      if (changes.isEnabled !== undefined) {
        notifySuccess(`Auto-assign ${next.isEnabled ? 'turned on' : 'turned off'} for ${next.departmentName}`)
      } else {
        notifySuccess(`Response time set to ${next.responseTimeoutMinutes} min for ${next.departmentName}`)
      }
    } catch (error: unknown) {
      setSettings((all) => all.map((s) => (s.departmentId === setting.departmentId ? setting : s)))
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not save the auto-assign setting'
      notifyError(message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          void refetch()
        }}
        disabled={!locationId}
        className={cn(
          'flex items-center gap-2.5 bg-white px-3.5 py-2.5 rounded-xl border shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
          enabledCount > 0 ? 'border-[#005390]/30 hover:bg-[#005390]/5' : 'border-gray-200 hover:bg-gray-50',
        )}
        aria-label="Auto-assign settings"
      >
        <Zap className={cn('w-4 h-4', enabledCount > 0 ? 'text-[#005390]' : 'text-gray-400')} />
        <span className="text-sm font-semibold text-gray-700">Auto-assign</span>
        <span
          className={cn(
            'text-[11px] font-bold px-2 py-0.5 rounded-full',
            enabledCount > 0 ? 'bg-[#005390] text-white' : 'bg-gray-100 text-gray-500',
          )}
        >
          {enabledCount > 0 ? 'On' : 'Off'}
        </span>
        <Settings2 className="w-3.5 h-3.5 text-gray-400" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#005390]" /> Auto-assign tickets
            </DialogTitle>
            <DialogDescription>
              When on, tickets raised by residents are offered to the on-shift staff member with the least TAT load.
              They accept (and set the TAT) or reject with a reason; if nobody accepts, the ticket is escalated. Tickets
              created here are always assigned manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {loading && visible.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No ticket departments found for this property.</p>
            ) : (
              visible.map((s) => {
                const saving = savingId === s.departmentId
                return (
                  <div
                    key={s.departmentId}
                    className={cn(
                      'rounded-xl border p-4 transition-colors',
                      s.isEnabled ? 'border-[#005390]/30 bg-[#005390]/5' : 'border-gray-200 bg-white',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.departmentName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {s.isEnabled ? 'New resident tickets are assigned automatically' : 'Assigned manually'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        <Switch
                          checked={s.isEnabled}
                          disabled={saving}
                          onCheckedChange={(checked) => void save(s, { isEnabled: checked })}
                          aria-label={`Auto-assign for ${s.departmentName}`}
                          className="data-checked:bg-[#005390]"
                        />
                      </div>
                    </div>

                    {s.isEnabled && (
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#005390]/10 pt-3">
                        <span className="text-xs font-medium text-gray-600">Time for staff to respond</span>
                        <Select
                          value={String(s.responseTimeoutMinutes)}
                          disabled={saving}
                          onValueChange={(value) => void save(s, { responseTimeoutMinutes: Number(value) })}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RESPONSE_TIMES.map((m) => (
                              <SelectItem key={m} value={String(m)} className="text-xs">
                                {m} min
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
