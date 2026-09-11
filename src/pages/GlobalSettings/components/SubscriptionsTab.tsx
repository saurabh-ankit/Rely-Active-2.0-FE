import React, { useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  IndianRupee,
  Package,
  RefreshCw,
  Search,
  User,
} from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { usePackageSubscriptionsQuery, useUpdateSubscriptionStatusMutation } from '@/hooks/react-query/medical'
import type { PackageSubscriptionResponse } from '@/lib/types/medical'
import { formatDisplayDate } from '@/lib/utils'
import { notifyError, notifySuccess } from '@/utils/toast'
import { ChangePackageDialog } from '@/components/common/ChangePackageDialog'
import { Button } from '@/components/ui/button'

interface SubscriptionsTabProps {
  isPropertyMode?: boolean
  forcedPropertyId?: string | null
}

export const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ forcedPropertyId }) => {
  const { selectedLocationId } = useLocationContext()
  const effectiveLocId = forcedPropertyId || selectedLocationId

  const { data: subsData, isLoading, refetch } = usePackageSubscriptionsQuery(effectiveLocId)
  const updateStatusMutation = useUpdateSubscriptionStatusMutation()

  const subscriptions: PackageSubscriptionResponse[] = useMemo(() => subsData?.data || [], [subsData])

  const [searchTerm, setSearchTerm] = useState('')
  const [expandedResidents, setExpandedResidents] = useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [expandedAdditionalTasks, setExpandedAdditionalTasks] = useState<Set<string>>(new Set())

  const [changePackageModalOpen, setChangePackageModalOpen] = useState(false)
  const [selectedSubForChange, setSelectedSubForChange] = useState<{
    id: string
    currentPackageId?: string
    residentName?: string
  } | null>(null)

  // Group subscriptions by resident
  const subscriptionsByResident = useMemo(() => {
    const grouped = new Map<string, PackageSubscriptionResponse[]>()
    subscriptions.forEach((sub) => {
      const resId = sub.resident?.id || sub.residentId || 'unknown'
      if (!grouped.has(resId)) {
        grouped.set(resId, [])
      }
      grouped.get(resId)!.push(sub)
    })
    return grouped
  }, [subscriptions])

  // Filter groups by search term (resident name / patient number / flat)
  const filteredResidentEntries = useMemo(() => {
    const entries = Array.from(subscriptionsByResident.entries())
    if (!searchTerm.trim()) return entries
    const term = searchTerm.toLowerCase().trim()
    return entries.filter(([, subs]) => {
      const resident = subs[0]?.resident || subs[0]?.patient
      const fullName = (resident?.fullName || '').toLowerCase()
      const patientNumber = (resident?.patientNumber || '').toLowerCase()
      const pkgMatches = subs.some((s) =>
        (s.carePackage?.name || s.carePackage?.packageName || '').toLowerCase().includes(term),
      )
      return fullName.includes(term) || patientNumber.includes(term) || pkgMatches
    })
  }, [subscriptionsByResident, searchTerm])

  const toggleResidentAccordion = (residentId: string) => {
    setExpandedResidents((prev) => {
      const next = new Set(prev)
      if (next.has(residentId)) next.delete(residentId)
      else next.add(residentId)
      return next
    })
  }

  const toggleRowExpand = (subId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(subId)) next.delete(subId)
      else next.add(subId)
      return next
    })
  }

  const toggleAdditionalTasks = (resId: string) => {
    setExpandedAdditionalTasks((prev) => {
      const next = new Set(prev)
      if (next.has(resId)) next.delete(resId)
      else next.add(resId)
      return next
    })
  }

  const handleStop = async (sub: PackageSubscriptionResponse) => {
    const resName = sub.resident?.fullName || 'resident'
    if (!window.confirm(`Are you sure you want to STOP the subscription for ${resName}?`)) {
      return
    }

    try {
      await updateStatusMutation.mutateAsync({
        subscriptionId: sub.id,
        payload: {
          status: 'INACTIVE',
          endDate: new Date().toISOString(),
        },
      })
      notifySuccess('Subscription Stopped', `Package subscription for ${resName} is now Inactive.`)
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to stop subscription.'
      notifyError('Action Failed', msg)
    }
  }

  const handleResume = async (sub: PackageSubscriptionResponse) => {
    const resName = sub.resident?.fullName || 'resident'
    try {
      await updateStatusMutation.mutateAsync({
        subscriptionId: sub.id,
        payload: {
          status: 'ACTIVE',
        },
      })
      notifySuccess('Subscription Resumed', `Package subscription for ${resName} is now Active.`)
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resume subscription.'
      notifyError('Action Failed', msg)
    }
  }

  const openChangeModal = (sub: PackageSubscriptionResponse) => {
    setSelectedSubForChange({
      id: sub.id,
      currentPackageId: sub.carePackage?.id || sub.carePackageId,
      residentName: sub.resident?.fullName || 'Resident',
    })
    setChangePackageModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Active
          </span>
        )
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Inactive
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Cancelled
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Completed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Container Matching Screenshot 2 */}
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Package Subscriptions ({subscriptions.length})
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">View and manage resident package subscriptions</p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by resident name or flat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-xs rounded-2xl border border-gray-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] shadow-xs"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-12 text-center text-sm text-gray-400 shadow-xl backdrop-blur-xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#005390]" />
          Loading package subscriptions...
        </div>
      ) : subscriptionsByResident.size === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-12 text-center text-sm text-gray-500 shadow-xl backdrop-blur-xl">
          <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          No package subscriptions recorded yet. Assign a package during resident onboarding.
        </div>
      ) : filteredResidentEntries.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-8 text-center text-sm text-gray-500 shadow-xl backdrop-blur-xl">
          No residents found matching &quot;{searchTerm}&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResidentEntries.map(([residentId, resSubs]) => {
            const resident = resSubs[0]?.resident || resSubs[0]?.patient
            const isResidentExpanded = expandedResidents.has(residentId)
            const activeSubsCount = resSubs.filter((s) => s.status === 'ACTIVE').length
            const totalSubsCount = resSubs.length
            const totalCosted = resSubs.reduce((sum, s) => sum + (Number(s.costed) || 0), 0)

            // Additional tasks collected across this resident's subscriptions
            const additionalTasks = resSubs[0]?.additionalTasks || []
            const isAddTasksExpanded = expandedAdditionalTasks.has(residentId)
            const totalAddCost = additionalTasks.reduce((sum, t) => sum + (Number(t.price) || 0), 0)

            return (
              <div
                key={residentId}
                className="rounded-3xl border border-white/60 bg-white/90 shadow-lg backdrop-blur-xl overflow-hidden transition-all duration-200"
              >
                {/* Resident Header Accordion Row */}
                <button
                  type="button"
                  onClick={() => toggleResidentAccordion(residentId)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 bg-gray-50/70 hover:bg-gray-100/80 transition-colors text-left cursor-pointer border-b border-gray-100"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-7 items-center justify-center text-gray-500 transition-transform">
                      {isResidentExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <div className="flex size-9 items-center justify-center rounded-2xl bg-gray-200/70 text-gray-600 shadow-2xs">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm sm:text-base text-gray-900">
                        {resident?.fullName || 'Resident'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>ID: {resident?.patientNumber || 'N/A'}</span>
                        <span>•</span>
                        <span>
                          {totalSubsCount} {totalSubsCount === 1 ? 'subscription' : 'subscriptions'} ({activeSubsCount}{' '}
                          active)
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-gray-800">
                          Total Costed: ₹
                          {totalCosted.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Subscriptions Table Inside Accordion */}
                {isResidentExpanded && (
                  <div className="p-4 sm:p-6 space-y-6">
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-3 w-10 text-center"></th>
                            <th className="py-3 px-4">Package Name</th>
                            <th className="py-3 px-4">Start Date</th>
                            <th className="py-3 px-4">End Date</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Days Utilized</th>
                            <th className="py-3 px-4">Costed</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {resSubs.map((sub) => {
                            const isRowExpanded = expandedRows.has(sub.id)
                            const isActive = sub.status === 'ACTIVE'
                            const canResume = sub.status === 'INACTIVE' && !sub.isPrevious
                            const features = sub.features || sub.packageFeatures || []

                            return (
                              <React.Fragment key={sub.id}>
                                <tr className="hover:bg-gray-50/80 transition-colors">
                                  {/* Expand Chevron */}
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => toggleRowExpand(sub.id)}
                                      className="size-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-200/60 text-gray-500 cursor-pointer"
                                    >
                                      {isRowExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </button>
                                  </td>

                                  {/* Package Name & Cost */}
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-gray-900">
                                      {sub.carePackage?.name || sub.carePackage?.packageName || 'Unnamed Package'}
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                      ₹
                                      {Number(
                                        sub.carePackage?.cost || sub.carePackage?.packageCost || sub.totalCost || 0,
                                      ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </td>

                                  {/* Start Date */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1.5 text-gray-700">
                                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                      <span>{formatDisplayDate(sub.startDate)}</span>
                                    </div>
                                  </td>

                                  {/* End Date */}
                                  <td className="py-3 px-4">
                                    {sub.endDate ? (
                                      <div className="flex items-center gap-1.5 text-gray-700">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{formatDisplayDate(sub.endDate)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 font-medium">N/A</span>
                                    )}
                                  </td>

                                  {/* Status */}
                                  <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>

                                  {/* Days Utilized */}
                                  <td className="py-3 px-4 font-semibold text-gray-800">
                                    {sub.daysUtilized !== undefined ? `${sub.daysUtilized} days` : 'N/A'}
                                  </td>

                                  {/* Costed */}
                                  <td className="py-3 px-4 font-bold text-gray-900">
                                    ₹
                                    {Number(sub.costed || 0).toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3 px-4 text-right">
                                    <div className="inline-flex items-center gap-2 justify-end">
                                      {isActive && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openChangeModal(sub)}
                                          className="h-8 px-3 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold shadow-2xs"
                                        >
                                          Change Package
                                        </Button>
                                      )}
                                      {isActive && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleStop(sub)}
                                          disabled={updateStatusMutation.isPending}
                                          className="h-8 px-3 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold shadow-2xs"
                                        >
                                          Stop
                                        </Button>
                                      )}
                                      {canResume && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleResume(sub)}
                                          disabled={updateStatusMutation.isPending}
                                          className="h-8 px-3 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold shadow-2xs"
                                        >
                                          Resume
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {/* Expanded Row for Features */}
                                {isRowExpanded && (
                                  <tr>
                                    <td colSpan={8} className="p-0">
                                      <div className="p-4 sm:p-5 bg-gray-50/90 border-t border-b border-gray-200 space-y-4">
                                        <div className="flex items-center gap-2">
                                          <IndianRupee className="h-4 w-4 text-gray-500" />
                                          <span className="font-semibold text-gray-800">Package Cost:</span>
                                          <span className="text-sm font-bold text-[#005390]">
                                            ₹
                                            {Number(
                                              sub.carePackage?.cost ||
                                                sub.carePackage?.packageCost ||
                                                sub.totalCost ||
                                                0,
                                            ).toLocaleString('en-IN', {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}
                                          </span>
                                        </div>

                                        <div>
                                          <h4 className="font-bold text-gray-800 mb-2.5 flex items-center gap-2">
                                            <Package className="h-4 w-4 text-[#005390]" />
                                            Package Tasks ({features.length})
                                          </h4>
                                          {features.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                              {features.map((feat) => (
                                                <div
                                                  key={feat.id}
                                                  className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs flex items-center justify-between"
                                                >
                                                  <div>
                                                    <div className="font-semibold text-gray-900 text-xs">
                                                      {feat.name}
                                                    </div>
                                                    {feat.description && (
                                                      <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                                                        {feat.description}
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-3 text-right shrink-0 ml-2">
                                                    <div>
                                                      <div className="text-[10px] text-gray-400 font-medium">
                                                        Complimentary
                                                      </div>
                                                      {feat.complimentaryCount > 0 ? (
                                                        <div className="font-bold text-[#005390] text-xs">
                                                          {feat.complimentaryCount}
                                                        </div>
                                                      ) : (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                          Free
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div>
                                                      <div className="text-[10px] text-gray-400 font-medium">
                                                        Remaining
                                                      </div>
                                                      {feat.complimentaryCount > 0 ? (
                                                        <div
                                                          className={`font-bold text-xs ${
                                                            feat.remainingCount === 0
                                                              ? 'text-rose-600'
                                                              : feat.remainingCount < feat.complimentaryCount
                                                                ? 'text-amber-600'
                                                                : 'text-emerald-600'
                                                          }`}
                                                        >
                                                          {feat.remainingCount}
                                                        </div>
                                                      ) : (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                          Unlimited
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-gray-400">
                                              No task features bundled in this package.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Additional Tasks Done Section Matching Screenshot 2 */}
                    <div className="border border-orange-200 rounded-2xl overflow-hidden bg-orange-50/40 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => toggleAdditionalTasks(residentId)}
                        className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-orange-50/90 hover:bg-orange-100/70 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600 shrink-0" />
                          <span className="font-bold text-xs sm:text-sm text-gray-900">
                            Additional Tasks Done (exclusive of subscribed package) ({additionalTasks.length})
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-orange-600 ml-1">
                            Total: ₹
                            {totalAddCost.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        {isAddTasksExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </button>

                      {isAddTasksExpanded && (
                        <div className="p-3 sm:p-4 space-y-3 bg-white border-t border-orange-100">
                          {additionalTasks.length > 0 ? (
                            additionalTasks.map((task) => (
                              <div
                                key={task.id}
                                className="border border-orange-200/80 rounded-xl p-3.5 bg-orange-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="font-bold text-xs sm:text-sm text-gray-900">{task.taskName}</div>
                                  {task.description && (
                                    <div className="text-[11px] text-gray-500">{task.description}</div>
                                  )}
                                  <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-0.5">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                                      <span>
                                        {new Date(task.completedAt).toLocaleString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                    {task.nurseName && <span>By: {task.nurseName}</span>}
                                  </div>
                                </div>

                                <div className="text-left sm:text-right shrink-0">
                                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Charge</div>
                                  <div className="text-sm font-black text-orange-600">
                                    ₹
                                    {Number(task.price).toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center text-xs text-gray-400">
                              No additional tasks recorded outside subscribed package.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Change Package Modal Dialog */}
      {selectedSubForChange && (
        <ChangePackageDialog
          isOpen={changePackageModalOpen}
          onOpenChange={setChangePackageModalOpen}
          subscriptionId={selectedSubForChange.id}
          locationId={effectiveLocId}
          currentPackageId={selectedSubForChange.currentPackageId}
          residentName={selectedSubForChange.residentName}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  )
}

export default SubscriptionsTab
