import React, { useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  StopCircle,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import {
  useCareTaskAssignmentsQuery,
  useCareTaskCompletionsQuery,
  useDeleteCareTaskAssignmentMutation,
} from '@/hooks/react-query/medical'
import type { CareTaskAssignment, GroupedCareTaskAssignment, ResidentCareTaskCompletion } from '@/lib/types/medical'
import { AssignCareTaskDialog } from '@/components/common/AssignCareTaskDialog'
import { CompleteCareTaskDialog } from '@/components/common/CompleteCareTaskDialog'
import { notifyError, notifySuccess } from '@/utils/toast'
import { Button } from '@/components/ui/button'
import { cn, formatDisplayDate, formatDisplayDateTime } from '@/lib/utils'

const getBillingLabel = (type?: string) => {
  if (!type) return 'Session Wise'
  const upper = type.toUpperCase()
  if (upper.startsWith('MONTH')) return 'Monthly'
  if (upper.startsWith('SESS')) return 'Session Wise'
  return type
}

export type AssignedTasksTabType = 'PENDING' | 'COMPLETED'

export interface AssignedTasksTabProps {
  forcedPropertyId?: string | null
  forcedResidentId?: string | null
  isCompact?: boolean
}

export const AssignedTasksTab: React.FC<AssignedTasksTabProps> = ({
  forcedPropertyId,
  forcedResidentId,
  isCompact = false,
}) => {
  const { selectedLocationId } = useLocationContext()
  const effectiveLocId = forcedPropertyId !== undefined ? forcedPropertyId : selectedLocationId

  // Tab State: Pending Tasks by default
  const [activeTab, setActiveTab] = useState<AssignedTasksTabType>('PENDING')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('ALL')
  const [completedStatusFilter, setCompletedStatusFilter] = useState<string>('ALL')

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [completingAssignment, setCompletingAssignment] = useState<CareTaskAssignment | null>(null)

  // Query for Assignments (Filtered on BE for pending tasks)
  const assignmentsQueryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      pendingOnly: 'true',
      limit: 200,
    }
    const today = new Date()
    const todayYear = today.getFullYear()
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0')
    const todayDay = String(today.getDate()).padStart(2, '0')
    params.targetDate = `${todayYear}-${todayMonth}-${todayDay}`

    if (effectiveLocId && effectiveLocId !== 'all') {
      params.propertyId = effectiveLocId
    }
    if (forcedResidentId) {
      params.residentId = forcedResidentId
    }
    if (sourceFilter !== 'ALL') {
      params.source = sourceFilter
    }
    if (searchTerm.trim()) {
      params.search = searchTerm.trim()
    }
    return params
  }, [effectiveLocId, forcedResidentId, sourceFilter, searchTerm])

  const {
    data: assignmentsData,
    isLoading: isLoadingAssignments,
    refetch: refetchAssignments,
  } = useCareTaskAssignmentsQuery(assignmentsQueryParams)

  const assignments: CareTaskAssignment[] = useMemo(() => assignmentsData?.data || [], [assignmentsData])
  const matrix = assignmentsData?.matrix

  // Grouped assignments from BE, with resilient client-side fallback
  const rawGroupedAssignments: GroupedCareTaskAssignment[] = useMemo(() => {
    if (assignmentsData?.grouped && assignmentsData.grouped.length > 0) {
      return assignmentsData.grouped
    }
    // Fallback: If BE grouped isn't present, group client-side
    const timeToMinutes = (t?: string | null): number => {
      if (!t) return 0
      const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (!m || !m[1] || !m[2]) return 0
      let hrs = parseInt(m[1], 10)
      const mins = parseInt(m[2], 10)
      const mer = m[3]?.toUpperCase()
      if (mer === 'PM' && hrs < 12) hrs += 12
      if (mer === 'AM' && hrs === 12) hrs = 0
      return hrs * 60 + mins
    }

    const map = new Map<string, GroupedCareTaskAssignment>()
    for (const a of assignments) {
      const key = `${a.residentId}_${a.taskId}`
      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          residentId: a.residentId,
          resident: a.resident,
          taskId: a.taskId,
          task: a.task,
          propertyId: a.propertyId,
          property: a.property,
          packageSubscriptionId: a.packageSubscriptionId,
          carePackageId: a.carePackageId,
          carePackage: a.carePackage,
          source: a.source,
          sources: [a.source],
          billingType: a.billingType,
          price: a.price,
          frequency: a.frequency || 1,
          startDate: a.startDate,
          endDate: a.endDate,
          customInstructions: a.customInstructions,
          status: a.status,
          isStopped: a.isStopped,
          packageInfo: a.packageInfo,
          totalCompletionCount: 0,
          totalSlots: 0,
          slots: [],
        })
      } else {
        const existingGroup = map.get(key)!
        if (a.source && !existingGroup.sources?.includes(a.source)) {
          existingGroup.sources = [...(existingGroup.sources || []), a.source]
        }
        if (a.source === 'PACKAGE' || a.packageInfo?.isIncludedInPackage) {
          existingGroup.source = 'PACKAGE'
          existingGroup.packageInfo = a.packageInfo
          existingGroup.packageSubscriptionId = a.packageSubscriptionId || existingGroup.packageSubscriptionId
          existingGroup.carePackageId = a.carePackageId || existingGroup.carePackageId
          existingGroup.carePackage = a.carePackage || existingGroup.carePackage
        }
        if (!existingGroup.customInstructions && a.customInstructions) {
          existingGroup.customInstructions = a.customInstructions
        }
      }

      const g = map.get(key)!
      g.totalCompletionCount += a.completionCount || 0
      if (a.frequency && a.frequency > g.frequency) {
        g.frequency = a.frequency
      }

      const slotTime = a.time || '12:00 PM'
      const existingSlotIndex = g.slots.findIndex((s) => s.time === slotTime)

      if (existingSlotIndex >= 0) {
        const existingSlot = g.slots[existingSlotIndex]
        if (a.source === 'PACKAGE' && existingSlot?.source !== 'PACKAGE') {
          g.slots[existingSlotIndex] = {
            id: a.id,
            time: slotTime,
            frequency: a.frequency || 1,
            startDate: a.startDate,
            endDate: a.endDate,
            status: a.status,
            isStopped: a.isStopped,
            completionCount: a.completionCount || 0,
            completedAt: a.completedAt,
            completedBy: a.completedBy,
            nurseId: a.nurseId,
            nurse: a.nurse,
            completedByUser: a.completedByUser,
            customInstructions: a.customInstructions,
            source: a.source,
            rawAssignment: a,
          }
        }
      } else {
        g.slots.push({
          id: a.id,
          time: slotTime,
          frequency: a.frequency || 1,
          startDate: a.startDate,
          endDate: a.endDate,
          status: a.status,
          isStopped: a.isStopped,
          completionCount: a.completionCount || 0,
          completedAt: a.completedAt,
          completedBy: a.completedBy,
          nurseId: a.nurseId,
          nurse: a.nurse,
          completedByUser: a.completedByUser,
          customInstructions: a.customInstructions,
          source: a.source,
          rawAssignment: a,
        })
      }
    }
    return Array.from(map.values()).map((g) => {
      g.slots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
      g.totalSlots = g.slots.length
      return g
    })
  }, [assignmentsData?.grouped, assignments])

  // Displayed grouped assignments for Pending Tasks tab (Dual-layer BE + Client filtering)
  const displayedGroupedAssignments = useMemo(() => {
    return rawGroupedAssignments
      .map((group) => {
        // 0. Exclude stopped or cancelled assignments, or package tasks whose package is stopped
        if (group.isStopped || group.status === 'STOPPED' || group.status === 'CANCELLED') {
          return null
        }
        const hasPackage =
          group.source === 'PACKAGE' ||
          group.sources?.includes('PACKAGE') ||
          Boolean(group.packageSubscriptionId || group.carePackageId)
        if (hasPackage && !group.sources?.includes('ADDON')) {
          if (
            group.packageInfo?.isPackageStopped ||
            (group.packageInfo?.subscriptionStatus && group.packageInfo.subscriptionStatus !== 'ACTIVE')
          ) {
            return null
          }
        }

        // 1. Source filter: keep matching slots
        const validSlots = (group.slots || []).filter((slot) => {
          if (slot.isStopped || slot.status === 'STOPPED' || slot.status === 'CANCELLED') {
            return false
          }
          if (sourceFilter === 'PACKAGE') {
            const isPkgSlot =
              slot.source === 'PACKAGE' ||
              slot.rawAssignment?.source === 'PACKAGE' ||
              Boolean(slot.rawAssignment?.packageSubscriptionId || slot.rawAssignment?.carePackageId)
            return isPkgSlot
          } else if (sourceFilter === 'ADDON') {
            const isPkgSlot =
              slot.source === 'PACKAGE' ||
              slot.rawAssignment?.source === 'PACKAGE' ||
              Boolean(slot.rawAssignment?.packageSubscriptionId || slot.rawAssignment?.carePackageId)
            return !isPkgSlot
          }
          return true
        })

        if (validSlots.length === 0) return null

        // 2. Search Term filter
        if (searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase()
          const resName = `${group.resident?.firstName || ''} ${group.resident?.lastName || ''}`.toLowerCase()
          const taskName = (group.task?.careTaskName || '').toLowerCase()
          if (!resName.includes(term) && !taskName.includes(term)) return null
        }

        return {
          ...group,
          slots: validSlots,
        }
      })
      .filter((g): g is GroupedCareTaskAssignment => g !== null)
  }, [rawGroupedAssignments, sourceFilter, searchTerm])

  const totalPendingSlots = useMemo(() => {
    return displayedGroupedAssignments.reduce((acc, g) => acc + g.slots.length, 0)
  }, [displayedGroupedAssignments])

  const pendingCount = totalPendingSlots

  // Query for Completed Task Records
  const completionsQueryParams = useMemo(() => {
    const params: Record<string, unknown> = {}
    if (effectiveLocId && effectiveLocId !== 'all') {
      params.propertyId = effectiveLocId
    }
    if (forcedResidentId) {
      params.residentId = forcedResidentId
    }
    if (sourceFilter !== 'ALL') {
      params.source = sourceFilter
    }
    if (searchTerm.trim()) {
      params.search = searchTerm.trim()
    }
    return params
  }, [effectiveLocId, forcedResidentId, sourceFilter, searchTerm])

  const {
    data: completionsData,
    isLoading: isLoadingCompletions,
    refetch: refetchCompletions,
  } = useCareTaskCompletionsQuery(completionsQueryParams)

  const rawCompletions: ResidentCareTaskCompletion[] = useMemo(() => completionsData?.data || [], [completionsData])

  const completions = useMemo(() => {
    return rawCompletions.filter((c) => {
      if (completedStatusFilter !== 'ALL') {
        if (c.status !== completedStatusFilter) return false
      }
      if (sourceFilter === 'PACKAGE') {
        const isPkg =
          c.assignment?.source === 'PACKAGE' ||
          Boolean(c.assignment?.packageSubscriptionId || c.assignment?.carePackageId) ||
          c.description?.includes('Complimentary') ||
          c.description?.includes('Package')
        if (!isPkg) return false
      } else if (sourceFilter === 'ADDON') {
        const isPkg =
          c.assignment?.source === 'PACKAGE' ||
          Boolean(c.assignment?.packageSubscriptionId || c.assignment?.carePackageId) ||
          c.description?.includes('Complimentary') ||
          c.description?.includes('Package')
        if (isPkg) return false
      }
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase()
        const residentName = `${c.resident?.firstName || ''} ${c.resident?.lastName || ''}`.toLowerCase()
        const taskName = (c.task?.careTaskName || '').toLowerCase()
        const nurseName =
          `${c.completedByUser?.profile?.firstName || ''} ${c.completedByUser?.profile?.lastName || ''}`.toLowerCase()
        if (!residentName.includes(term) && !taskName.includes(term) && !nurseName.includes(term)) {
          return false
        }
      }
      return true
    })
  }, [rawCompletions, completedStatusFilter, sourceFilter, searchTerm])

  // Counts for tabs
  const allCount = matrix?.totalAssignments ?? assignments.length
  const completedCount = completionsData?.pagination?.total ?? rawCompletions.length

  const handleRefresh = () => {
    void refetchAssignments()
    void refetchCompletions()
  }

  // Mutations
  const deleteMutation = useDeleteCareTaskAssignmentMutation()

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this care task assignment?')) return
    try {
      await deleteMutation.mutateAsync(id)
      notifySuccess('Care task assignment deleted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete assignment'
      notifyError(msg)
    }
  }

  const isLoading = activeTab === 'COMPLETED' ? isLoadingCompletions : isLoadingAssignments

  return (
    <div className="space-y-6">
      {/* ── Summary Matrix Cards (if not compact) ─────────────────────────── */}
      {!isCompact && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>Total Care Tasks</span>
              <HeartHandshake className="size-4 text-[#005390]" />
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{allCount}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>Active / Pending</span>
              <Activity className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{pendingCount}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>Completed Sessions</span>
              <CheckCircle2 className="size-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">{completedCount}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>Stopped</span>
              <StopCircle className="size-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
              {matrix?.totalStopped ?? assignments.filter((a) => a.isStopped).length}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs Navigation Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
        <div className="inline-flex items-center gap-1 rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/70">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
              activeTab === 'PENDING'
                ? 'bg-white text-amber-700 shadow-xs dark:bg-slate-900 dark:text-amber-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            )}
          >
            <Clock className="size-3.5" />
            <span>Pending Tasks</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                activeTab === 'PENDING'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-gray-200/80 text-gray-700 dark:bg-slate-700 dark:text-gray-300',
              )}
            >
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer',
              activeTab === 'COMPLETED'
                ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            )}
          >
            <CheckCircle2 className="size-3.5" />
            <span>Completed Tasks</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-gray-200/80 text-gray-700 dark:bg-slate-700 dark:text-gray-300',
              )}
            >
              {completedCount}
            </span>
          </button>
        </div>

        {/* Assign Button */}
        <Button
          type="button"
          onClick={() => setIsAssignModalOpen(true)}
          className="rounded-xl bg-[#005390] px-4 py-2 text-xs font-bold text-white hover:bg-[#004375] cursor-pointer shadow-xs"
        >
          <Plus className="mr-1.5 size-4" />
          Assign Task to Resident
        </Button>
      </div>

      {/* ── Action & Filter Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'COMPLETED' ? 'Search completed task or nurse...' : 'Search resident or task...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-3 pl-9 text-xs text-gray-900 transition-colors focus:border-[#005390] focus:outline-none dark:border-gray-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Source Filter (Available for both Pending and Completed views) */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-[#005390] focus:outline-none dark:border-gray-800 dark:bg-slate-900 dark:text-gray-300"
        >
          <option value="ALL">All Sources</option>
          <option value="PACKAGE">Package Wise</option>
          <option value="ADDON">Add On Tasks</option>
        </select>

        {activeTab === 'COMPLETED' && (
          /* Completed Tab Status Filter */
          <select
            value={completedStatusFilter}
            onChange={(e) => setCompletedStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-[#005390] focus:outline-none dark:border-gray-800 dark:bg-slate-900 dark:text-gray-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        )}

        {/* Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-slate-800 cursor-pointer"
          title="Refresh List"
        >
          <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* ── Tables Container ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          {activeTab === 'COMPLETED' ? (
            /* ══════════════════════════════════════════════════════════════════════
               COMPLETED TASKS TABLE
               ══════════════════════════════════════════════════════════════════════ */
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="border-b border-gray-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-slate-800/40 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3.5">Care Task</th>
                  {!isCompact && <th className="px-4 py-3.5">Resident</th>}
                  <th className="px-4 py-3.5">Completed By</th>
                  <th className="px-4 py-3.5">Completed At</th>
                  <th className="px-4 py-3.5">Clinical Remarks / Notes</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoadingCompletions ? (
                  <tr>
                    <td colSpan={isCompact ? 5 : 6} className="py-12 text-center text-gray-400">
                      <Loader2 className="mx-auto size-6 animate-spin text-[#005390]" />
                      <p className="mt-2 text-xs">Loading completed care task sessions...</p>
                    </td>
                  </tr>
                ) : completions.length === 0 ? (
                  <tr>
                    <td colSpan={isCompact ? 5 : 6} className="py-12 text-center text-gray-400">
                      <CheckCircle2 className="mx-auto size-8 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        No completed tasks found
                      </p>
                      <p className="text-xs text-gray-400">
                        When care tasks are marked as completed, each session record will appear here with full audit
                        details.
                      </p>
                    </td>
                  </tr>
                ) : (
                  completions.map((completion) => {
                    const taskName = completion.task?.careTaskName || 'Care Task'
                    const resName =
                      `${completion.resident?.firstName || ''} ${completion.resident?.lastName || ''}`.trim() ||
                      'Resident'
                    const nurseUser = completion.completedByUser
                    const nurseName =
                      `${nurseUser?.profile?.firstName || ''} ${nurseUser?.profile?.lastName || ''}`.trim() ||
                      nurseUser?.username ||
                      nurseUser?.email ||
                      'Care Staff'
                    const pkgTitle = completion.assignment?.carePackage?.packageName || 'Care Package'
                    const isPackageTask =
                      completion.assignment?.source === 'PACKAGE' ||
                      Boolean(completion.assignment?.carePackageId) ||
                      Boolean(completion.assignment?.packageSubscriptionId)

                    return (
                      <tr
                        key={completion.id}
                        className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                      >
                        {/* Care Task & Package / Addon Badge */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-gray-900 dark:text-white">{taskName}</span>
                              {isPackageTask ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                                  <Sparkles className="size-2.5 text-purple-600 dark:text-purple-400" />
                                  {`Package: ${pkgTitle}`}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                                  Add-on Task
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Resident (when not compact) */}
                        {!isCompact && (
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-[#005390] dark:bg-blue-950 dark:text-blue-400 font-bold text-[10px]">
                                {resName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white">{resName}</div>
                                <div className="text-[10px] text-gray-400">
                                  {completion.resident?.phone || 'No phone'}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Completed By (Nurse / Staff) */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-bold text-[10px] border border-teal-200/70 dark:border-teal-800">
                              {nurseName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white text-xs">{nurseName}</div>
                              <div className="text-[10px] text-gray-400">Clinical Staff</div>
                            </div>
                          </div>
                        </td>

                        {/* Completed At Timestamp */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200 font-medium text-xs">
                            <Clock className="size-3.5 text-gray-400 shrink-0" />
                            <span>{formatDisplayDateTime(completion.completedAt)}</span>
                          </div>
                        </td>

                        {/* Clinical Remarks / Notes & Coverage */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            {completion.description?.includes('Complimentary') ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                                Package Covered
                              </span>
                            ) : completion.description?.includes('Exhausted') ||
                              completion.description?.includes('extra session') ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                <AlertCircle className="size-2.5 text-amber-600 dark:text-amber-400" />
                                Extra Usage (Billed)
                              </span>
                            ) : null}

                            {completion.remarks || completion.description ? (
                              <div className="max-w-[260px] text-xs text-gray-700 dark:text-gray-300 line-clamp-2 italic bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
                                "{completion.remarks || completion.description}"
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">No notes recorded</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* ══════════════════════════════════════════════════════════════════════
               ASSIGNED TASKS TABLE (ALL & PENDING TABS)
               ══════════════════════════════════════════════════════════════════════ */
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="border-b border-gray-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-slate-800/40 dark:text-gray-400">
                <tr>
                  {!isCompact && <th className="px-4 py-3.5">Resident</th>}
                  <th className="px-4 py-3.5">Care Task</th>
                  <th className="px-4 py-3.5">Billing Tier & Rate / Quota</th>
                  <th className="px-4 py-3.5">Schedule & Timing</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoadingAssignments ? (
                  <tr>
                    <td colSpan={isCompact ? 5 : 6} className="py-12 text-center text-gray-400">
                      <Loader2 className="mx-auto size-6 animate-spin text-[#005390]" />
                      <p className="mt-2 text-xs">Loading care task assignments...</p>
                    </td>
                  </tr>
                ) : displayedGroupedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={isCompact ? 5 : 6} className="py-12 text-center text-gray-400">
                      <HeartHandshake className="mx-auto size-8 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {activeTab === 'PENDING' ? 'No pending care tasks' : 'No care tasks found'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {activeTab === 'PENDING'
                          ? 'All assigned tasks have been handled or none are currently active.'
                          : 'Care package bundled tasks and custom assigned tasks will appear here.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedGroupedAssignments.map((group, groupIndex) => {
                    const resName =
                      `${group.resident?.firstName || ''} ${group.resident?.lastName || ''}`.trim() || 'Resident'
                    const taskName = group.task?.careTaskName || 'Care Task'
                    const isPackageTask =
                      group.source === 'PACKAGE' ||
                      group.sources?.includes('PACKAGE') ||
                      Boolean(group.packageSubscriptionId || group.carePackageId) ||
                      group.slots.some((s) => s.source === 'PACKAGE' || s.rawAssignment?.source === 'PACKAGE')
                    const isAddonTask =
                      group.sources?.includes('ADDON') ||
                      (group.source === 'ADDON' && !isPackageTask) ||
                      group.slots.some((s) => s.source === 'ADDON' || s.rawAssignment?.source === 'ADDON')
                    const pkgInfo = group.packageInfo
                    const pkgTitle = group.carePackage?.packageName || pkgInfo?.packageName || 'Care Package'
                    const fallbackTaskRate = Number(group.task?.price || group.price || 0)
                    const slots = group.slots
                    const firstSlot = slots[0]
                    const otherSlots = slots.slice(1)

                    return (
                      <React.Fragment key={group.groupKey}>
                        {/* ── Slot 1 (Primary Task Row) ────────────────── */}
                        <tr
                          className={cn(
                            'transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30',
                            groupIndex > 0 && 'border-t-2 border-gray-200/90 dark:border-gray-700/80',
                          )}
                        >
                          {/* Resident (when not compact) */}
                          {!isCompact && (
                            <td
                              rowSpan={slots.length}
                              className="px-4 py-3.5 align-top border-r border-gray-100/80 dark:border-gray-800/70 bg-white/70 dark:bg-slate-900/70"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-[#005390] dark:bg-blue-950 dark:text-blue-400 font-bold text-[10px]">
                                  {resName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">{resName}</div>
                                  <div className="text-[10px] text-gray-400">{group.resident?.phone || 'No phone'}</div>
                                </div>
                              </div>
                            </td>
                          )}

                          {/* Care Task Column */}
                          <td
                            rowSpan={slots.length}
                            className="px-4 py-3.5 align-top border-r border-gray-100/80 dark:border-gray-800/70 bg-white/70 dark:bg-slate-900/70"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-900 dark:text-white text-sm">{taskName}</span>
                                {isPackageTask && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                                    <Sparkles className="size-2.5 text-purple-600 dark:text-purple-400" />
                                    {`Package: ${pkgTitle}`}
                                  </span>
                                )}
                                {isAddonTask && (
                                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                                    Add-on Task
                                  </span>
                                )}
                                {slots.length > 1 && (
                                  <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-[#005390] border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
                                    {slots.length}x Daily • {slots.length} Slots
                                  </span>
                                )}
                              </div>
                              {group.customInstructions && (
                                <div className="text-[10px] text-gray-400 line-clamp-2 italic">
                                  "
                                  {group.customInstructions.replace(
                                    /\(0\s+complimentary\s+sessions?\)/i,
                                    '(Free / Included)',
                                  )}
                                  "
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Billing Tier & Rate / Quota */}
                          <td
                            rowSpan={slots.length}
                            className="px-4 py-3.5 align-top border-r border-gray-100/80 dark:border-gray-800/70 bg-white/70 dark:bg-slate-900/70"
                          >
                            {isPackageTask && pkgInfo ? (
                              (() => {
                                // If task has 0 price or rate <= 0, it is 100% Free / Included in package
                                if (fallbackTaskRate <= 0) {
                                  return (
                                    <div className="flex flex-col items-start gap-1">
                                      <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                                        <span>Included Free</span>
                                      </div>
                                      {group.totalCompletionCount > 0 ? (
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                          {group.totalCompletionCount} session
                                          {group.totalCompletionCount > 1 ? 's' : ''} completed
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                          No extra charge
                                        </span>
                                      )}
                                    </div>
                                  )
                                }

                                const extraCount = Math.max(
                                  0,
                                  group.totalCompletionCount - (pkgInfo.complimentaryCount || 0),
                                )

                                if (pkgInfo.complimentaryCount > 0) {
                                  return (
                                    <div className="flex flex-col items-start gap-1">
                                      {pkgInfo.remainingCount > 0 ? (
                                        <div className="flex flex-col gap-0.5">
                                          <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                                            <span>
                                              {pkgInfo.remainingCount} / {pkgInfo.complimentaryCount} free sessions left
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                            Extra rate: ₹{fallbackTaskRate.toLocaleString('en-IN')}/session
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-1">
                                          <div className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                            <AlertCircle className="size-3 text-amber-600 dark:text-amber-400" />
                                            <span>
                                              0 / {pkgInfo.complimentaryCount} free sessions left (Quota Used)
                                            </span>
                                          </div>

                                          {extraCount > 0 ? (
                                            <div className="flex flex-col gap-0.5">
                                              <div className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                                                <Sparkles className="size-2.5 text-blue-600 dark:text-blue-400" />
                                                <span>
                                                  +{extraCount} Extra Session{extraCount > 1 ? 's' : ''} (₹
                                                  {(extraCount * fallbackTaskRate).toLocaleString('en-IN')} billed)
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                @ ₹{fallbackTaskRate.toLocaleString('en-IN')}/session
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                              Next session: ₹{fallbackTaskRate.toLocaleString('en-IN')} (Pay-per-use)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                }

                                return (
                                  <div className="flex flex-col items-start gap-1">
                                    <div className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#005390] border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                                      <Sparkles className="size-2.5 text-[#005390] dark:text-blue-400" />
                                      <span>Pay-per-use</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                      ₹{fallbackTaskRate.toLocaleString('en-IN')}/session
                                    </span>
                                    {group.totalCompletionCount > 0 && (
                                      <span className="text-[10px] text-gray-400">
                                        {group.totalCompletionCount} session{group.totalCompletionCount > 1 ? 's' : ''}{' '}
                                        billed
                                      </span>
                                    )}
                                  </div>
                                )
                              })()
                            ) : (
                              <div className="flex flex-col items-start gap-1">
                                <div className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold border-blue-200 bg-blue-50/80 text-[#005390] dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                                  <span>{getBillingLabel(group.billingType)}</span>
                                  <span>•</span>
                                  <span>₹{Number(group.price || 0).toLocaleString('en-IN')}</span>
                                </div>
                                {group.totalCompletionCount > 0 && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                    {group.totalCompletionCount} session{group.totalCompletionCount > 1 ? 's' : ''}{' '}
                                    completed
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Schedule & Timing (Slot 1) */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium text-xs">
                              <Clock className="size-3.5 text-[#005390] dark:text-sky-400 shrink-0" />
                              <span className="font-bold text-gray-900 dark:text-white">
                                At {firstSlot.time || '12:00 PM'}
                              </span>
                              {slots.length > 1 && (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-slate-800 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700">
                                  Slot 1 of {slots.length}
                                </span>
                              )}
                              {isPackageTask && isAddonTask && (
                                <span
                                  className={cn(
                                    'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                                    firstSlot.source === 'PACKAGE' || firstSlot.rawAssignment?.source === 'PACKAGE'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300',
                                  )}
                                >
                                  {firstSlot.source === 'PACKAGE' || firstSlot.rawAssignment?.source === 'PACKAGE'
                                    ? 'Package'
                                    : 'Add-on'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              <span>From: {formatDisplayDate(firstSlot.startDate)}</span>
                              <span>
                                {' '}
                                • {firstSlot.endDate ? `To: ${formatDisplayDate(firstSlot.endDate)}` : 'Lifetime'}
                              </span>
                            </div>
                          </td>

                          {/* Status (Slot 1) */}
                          <td className="px-4 py-3.5 align-middle text-center">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold',
                                firstSlot.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : firstSlot.status === 'CANCELLED'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    : firstSlot.isStopped || firstSlot.status === 'STOPPED'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                              )}
                            >
                              {firstSlot.status}
                            </span>
                          </td>

                          {/* Actions (Slot 1) */}
                          <td className="px-4 py-3.5 align-middle text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {firstSlot.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  onClick={() => setCompletingAssignment(firstSlot.rawAssignment)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs transition-colors"
                                >
                                  <CheckCircle2 className="size-3" />
                                  Complete Task
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDelete(firstSlot.id)}
                                disabled={deleteMutation.isPending}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-600 dark:hover:bg-slate-800 cursor-pointer"
                                title="Delete Assignment"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ── Additional Slots for the same task ──────── */}
                        {otherSlots.map((slot, sIdx) => {
                          const slotNum = sIdx + 2
                          return (
                            <tr
                              key={slot.id}
                              className="border-t border-dashed border-gray-200/70 dark:border-gray-800/60 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                            >
                              {/* Schedule & Timing (Subsequent Slot) */}
                              <td className="px-4 py-3.5 align-middle">
                                <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium text-xs">
                                  <Clock className="size-3.5 text-[#005390] dark:text-sky-400 shrink-0" />
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    At {slot.time || '12:00 PM'}
                                  </span>
                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-slate-800 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700">
                                    Slot {slotNum} of {slots.length}
                                  </span>
                                  {isPackageTask && isAddonTask && (
                                    <span
                                      className={cn(
                                        'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                                        slot.source === 'PACKAGE' || slot.rawAssignment?.source === 'PACKAGE'
                                          ? 'bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300'
                                          : 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300',
                                      )}
                                    >
                                      {slot.source === 'PACKAGE' || slot.rawAssignment?.source === 'PACKAGE'
                                        ? 'Package'
                                        : 'Add-on'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  <span>From: {formatDisplayDate(slot.startDate)}</span>
                                  <span> • {slot.endDate ? `To: ${formatDisplayDate(slot.endDate)}` : 'Lifetime'}</span>
                                </div>
                              </td>

                              {/* Status (Subsequent Slot) */}
                              <td className="px-4 py-3.5 align-middle text-center">
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold',
                                    slot.status === 'ACTIVE'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : slot.status === 'CANCELLED'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : slot.isStopped || slot.status === 'STOPPED'
                                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                                  )}
                                >
                                  {slot.status}
                                </span>
                              </td>

                              {/* Actions (Subsequent Slot) */}
                              <td className="px-4 py-3.5 align-middle text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {slot.status === 'ACTIVE' && (
                                    <button
                                      type="button"
                                      onClick={() => setCompletingAssignment(slot.rawAssignment)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs transition-colors"
                                    >
                                      <CheckCircle2 className="size-3" />
                                      Complete Task
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDelete(slot.id)}
                                    disabled={deleteMutation.isPending}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-600 dark:hover:bg-slate-800 cursor-pointer"
                                    title="Delete Assignment"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Assign Care Task Modal ─────────────────────────────────────────── */}
      <AssignCareTaskDialog
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        initialResidentId={forcedResidentId}
        initialPropertyId={effectiveLocId}
        onSuccess={handleRefresh}
      />

      {/* ── Complete Care Task Modal ───────────────────────────────────────── */}
      <CompleteCareTaskDialog
        open={Boolean(completingAssignment)}
        onOpenChange={(open) => !open && setCompletingAssignment(null)}
        assignment={completingAssignment}
        onSuccess={handleRefresh}
      />
    </div>
  )
}

export default AssignedTasksTab
