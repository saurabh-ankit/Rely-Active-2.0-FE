import React, { useMemo, useState } from 'react'
import { X, Loader2, UserCheck, Stethoscope, Heart, Search, Trash2, AlertTriangle } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { toast } from 'sonner'
import { getFileUrl } from '@/lib/utils'

// ── Hooks ──────────────────────────────────────────────────────────────────────
import {
  useCareTeamQuery,
  useAssignCareTeamMutation,
  useRemoveCareTeamMemberMutation,
} from '@/hooks/react-query/resident'
import { useUsersByRoleQuery } from '@/hooks/react-query/user'

// ── Types ──────────────────────────────────────────────────────────────────────
import type { CareTeamMember, CareTeamRole } from '@/lib/services/residentService'
import type { UserItem } from '@/lib/types'

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

export interface AssignCareTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  residentName?: string
  propertyId?: string | null
  onSuccess?: () => void
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getUserDisplayName(user: UserItem): string {
  const fn = (user.profile as Record<string, string> | undefined)?.firstName || ''
  const ln = (user.profile as Record<string, string> | undefined)?.lastName || ''
  const full = `${fn} ${ln}`.trim()
  return full || user.username || 'Unknown'
}

function getMemberDisplayName(member: CareTeamMember): string {
  const fn = member.user?.profile?.firstName || ''
  const ln = member.user?.profile?.lastName || ''
  const full = `${fn} ${ln}`.trim()
  return full || member.user?.username || 'Unknown'
}

function getUserPrimaryRoleCode(user: UserItem): string {
  const locs = (user as unknown as { userLocations?: Array<{ role?: { code?: string } }> }).userLocations
  return locs?.[0]?.role?.code || ''
}

// ──────────────────────────────────────────────────────────────────────────────
// Dialog Content
// ──────────────────────────────────────────────────────────────────────────────

const AssignCareTeamContent: React.FC<{
  onClose: () => void
  residentId: string
  residentName?: string
  propertyId?: string | null
  onSuccess?: () => void
}> = ({ onClose, residentId, residentName, propertyId, onSuccess }) => {
  const { selectedLocationId } = useLocationContext()
  const effectiveLocId = propertyId || selectedLocationId || undefined

  // ── UI State ───────────────────────────────────────────────────────────────
  const [activeRole, setActiveRole] = useState<CareTeamRole>('DOCTOR')
  const [search, setSearch] = useState('')
  const [note, setNote] = useState('')

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: currentTeam = [], isLoading: loadingTeam, refetch: refetchTeam } = useCareTeamQuery(residentId)

  const roleCodesToFetch = useMemo(() => [activeRole], [activeRole])
  const { data: availableUsers = [], isLoading: loadingUsers } = useUsersByRoleQuery(
    roleCodesToFetch,
    effectiveLocId || null,
  )

  // ── Mutations ──────────────────────────────────────────────────────────────
  const assignMutation = useAssignCareTeamMutation(residentId)
  const removeMutation = useRemoveCareTeamMemberMutation(residentId)

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAssign = async (user: UserItem) => {
    if (!effectiveLocId) {
      toast.error('No location selected')
      return
    }
    try {
      await assignMutation.mutateAsync({
        userId: user.id,
        role: activeRole,
        locId: effectiveLocId,
        note: note.trim() || null,
      })
      toast.success(`${getUserDisplayName(user)} assigned as ${activeRole === 'DOCTOR' ? 'Doctor' : 'Nurse'}`)
      setNote('')
      void refetchTeam()
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to assign care team member')
    }
  }

  const handleRemove = async (memberId: string, memberName: string) => {
    try {
      await removeMutation.mutateAsync(memberId)
      toast.success(`${memberName} removed from care team`)
      void refetchTeam()
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to remove care team member')
    }
  }

  // ── Derived Data ───────────────────────────────────────────────────────────
  const activeTeam = currentTeam.filter((m) => m.isActive)
  const teamDoctors = activeTeam.filter((m) => m.role === 'DOCTOR')
  const teamNurses = activeTeam.filter((m) => m.role === 'NURSE')

  const assignedUserIds = new Set(activeTeam.map((m) => m.userId))

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return availableUsers
    const q = search.toLowerCase()
    return availableUsers.filter((u) => {
      const name = getUserDisplayName(u).toLowerCase()
      const code = ((u.profile as Record<string, string> | undefined)?.employeeCode || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }, [availableUsers, search])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/40 bg-white shadow-2xl dark:border-gray-800 dark:bg-slate-900 flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white">Assign Care Team</h2>
            {residentName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Managing care team for <span className="font-bold text-[#005390]">{residentName}</span>
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">
        {/* ── Left Panel: Current Team ────────────────────────────────────── */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 p-4 space-y-3 overflow-y-auto shrink-0 bg-gray-50/60 dark:bg-slate-950/40">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Current Care Team
          </h3>

          {loadingTeam ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[#005390]" />
            </div>
          ) : activeTeam.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-400" />
              <p className="text-xs text-gray-400 font-medium">No care team assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Doctors */}
              {teamDoctors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    <Stethoscope className="w-3 h-3" />
                    Doctors ({teamDoctors.length})
                  </div>
                  {teamDoctors.map((member) => {
                    const name = getMemberDisplayName(member)
                    const photo = member.user?.profile?.photoUrl
                    const isRemoving = removeMutation.isPending && removeMutation.variables === member.id
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-blue-100 dark:border-blue-950/60 shadow-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {photo ? (
                              <img src={getFileUrl(photo)} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{name}</p>
                            <p className="text-[10px] text-blue-500 font-medium">Doctor</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRemove(member.id, name)}
                          disabled={isRemoving}
                          className="p-1 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                          title="Remove"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Nurses */}
              {teamNurses.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                    <Heart className="w-3 h-3" />
                    Nurses ({teamNurses.length})
                  </div>
                  {teamNurses.map((member) => {
                    const name = getMemberDisplayName(member)
                    const photo = member.user?.profile?.photoUrl
                    const isRemoving = removeMutation.isPending && removeMutation.variables === member.id
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-rose-100 dark:border-rose-950/60 shadow-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {photo ? (
                              <img src={getFileUrl(photo)} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{name}</p>
                            <p className="text-[10px] text-rose-500 font-medium">Nurse</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRemove(member.id, name)}
                          disabled={isRemoving}
                          className="p-1 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                          title="Remove"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Panel: Assign New Member ──────────────────────────────── */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Assign New Member
          </h3>

          {/* Role Tabs */}
          <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => {
                setActiveRole('DOCTOR')
                setSearch('')
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeRole === 'DOCTOR'
                  ? 'bg-[#005390] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Doctor
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveRole('NURSE')
                setSearch('')
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeRole === 'NURSE'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Nurse
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeRole === 'DOCTOR' ? 'doctors' : 'nurses'}...`}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#005390] focus:outline-none dark:border-gray-700 dark:bg-slate-800 dark:text-white transition-colors"
            />
          </div>

          {/* Optional note */}
          <div className="space-y-1">
            <label htmlFor="care-team-note" className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Note (optional)
            </label>
            <input
              id="care-team-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Primary treating physician..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#005390] focus:outline-none dark:border-gray-700 dark:bg-slate-800 dark:text-white transition-colors"
            />
          </div>

          {/* User List */}
          {loadingUsers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#005390]" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <UserCheck className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-xs text-gray-400 font-medium">
                {search
                  ? `No ${activeRole === 'DOCTOR' ? 'doctors' : 'nurses'} match "${search}"`
                  : `No ${activeRole === 'DOCTOR' ? 'doctors' : 'nurses'} found for this location`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => {
                const name = getUserDisplayName(user)
                const photo = (user.profile as Record<string, string> | undefined)?.photoUrl
                const roleCode = getUserPrimaryRoleCode(user)
                const already = assignedUserIds.has(user.id)
                const isDoctor = roleCode === 'DOCTOR' || activeRole === 'DOCTOR'
                const isAssigning = assignMutation.isPending

                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 border transition-all ${
                      already
                        ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                        : 'border-gray-200 bg-white hover:border-[#005390]/30 hover:bg-blue-50/30 dark:border-gray-800 dark:bg-slate-900/60 dark:hover:border-[#005390]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ${
                          isDoctor
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700'
                        }`}
                      >
                        {photo ? (
                          <img src={getFileUrl(photo)} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                              isDoctor
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {activeRole}
                          </span>
                          {(user.profile as Record<string, string> | undefined)?.employeeCode && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              {(user.profile as Record<string, string>).employeeCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {already ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-1 rounded-lg shrink-0">
                        ✓ Assigned
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleAssign(user)}
                        disabled={isAssigning}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-xs ${
                          isDoctor ? 'bg-[#005390] hover:bg-[#004375]' : 'bg-rose-500 hover:bg-rose-600'
                        }`}
                      >
                        {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                        Assign
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────────────────────────────────────

export const AssignCareTeamDialog: React.FC<AssignCareTeamDialogProps> = ({
  open,
  onOpenChange,
  residentId,
  residentName,
  propertyId,
  onSuccess,
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <AssignCareTeamContent
        key={residentId}
        onClose={() => onOpenChange(false)}
        residentId={residentId}
        residentName={residentName}
        propertyId={propertyId}
        onSuccess={onSuccess}
      />
    </div>
  )
}

export default AssignCareTeamDialog
