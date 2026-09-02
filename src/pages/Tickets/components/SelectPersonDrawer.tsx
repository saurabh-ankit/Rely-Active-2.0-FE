import { useState, useEffect } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuth } from '@/hooks/useAuth'
import type { AssignableEmployee, Ticket } from '@/lib/types'

interface Props {
  isOpen: boolean
  ticket: Ticket | null
  locationId: string | null
  onClose: () => void
  onAssignSuccess: () => void
}

export function SelectPersonDrawer({ isOpen, ticket, locationId, onClose, onAssignSuccess }: Props) {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<AssignableEmployee[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !ticket) return

    const fetchEmployees = async () => {
      setIsLoading(true)
      try {
        const url = API_ENDPOINTS.tickets.assignableEmployees(
          locationId,
          ticket.departmentId || undefined,
          ticket.jobCategoryId || undefined,
        )
        const res = await apiClient.get(url)
        if (res.data?.data) {
          setEmployees(res.data.data)
        }
      } catch (err) {
        console.error('Failed to fetch assignable employees:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployees()
  }, [isOpen, ticket, locationId])

  if (!isOpen || !ticket) return null

  // Filter out the logged-in user from the employee list below Self to avoid duplicate name/role entries
  const otherEmployees = employees.filter((emp) => {
    if (user?.id && emp.id === user.id) return false
    if (user?.email && emp.email?.toLowerCase() === user.email.toLowerCase()) return false
    return true
  })

  // Get metrics for current logged in user if available
  const currentUserMetrics = employees.find(
    (emp) => (user?.id && emp.id === user.id) || (user?.email && emp.email?.toLowerCase() === user.email.toLowerCase()),
  )

  const handleAssign = async () => {
    setIsSubmitting(true)
    try {
      const url = API_ENDPOINTS.tickets.assign(ticket.id, locationId)
      // If Self (null) selected, pass logged-in user id or null
      const targetUserId = selectedUserId === null ? user?.id || null : selectedUserId
      await apiClient.patch(url, {
        assignedToUserId: targetUserId,
      })
      onAssignSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to assign ticket:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-sm bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Select a person</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Employee List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#005390]" />
                <p className="text-xs font-medium">Loading department employees...</p>
              </div>
            ) : (
              <>
                {/* Self Option representing current user */}
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    selectedUserId === null
                      ? 'border-[#005390] bg-blue-50/50 shadow-2xs'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    S
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">Self</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Tickets Assigned : {currentUserMetrics?.totalAssigned ?? 0}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        Open : {currentUserMetrics?.openCount ?? 0}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Closed : {currentUserMetrics?.closedCount ?? 0}
                      </span>
                    </div>
                  </div>
                  {selectedUserId === null && <Check className="w-5 h-5 text-[#005390] shrink-0" />}
                </button>

                {/* Other Employees List (Excludes duplicate Self / logged in user) */}
                {otherEmployees.map((emp) => {
                  const isSelected = selectedUserId === emp.id

                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedUserId(emp.id)}
                      className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#005390] bg-blue-50/50 shadow-2xs'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {emp.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">{emp.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Tickets Assigned : {emp.totalAssigned}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                            Open : {emp.openCount}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Closed : {emp.closedCount}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-[#005390] shrink-0" />}
                    </button>
                  )
                })}
              </>
            )}
          </div>

          {/* Footer CTA */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={handleAssign}
              disabled={isSubmitting}
              className="w-full py-3 bg-[#f5b895] hover:bg-[#e89d71] text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
