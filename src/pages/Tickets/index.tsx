import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  MessageSquare,
  UserPlus,
  Clock,
  AlertCircle,
  Home,
  CheckCircle2,
  Ticket as TicketIcon,
  List,
  User,
  Check,
  X,
} from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { Ticket, TicketCategoryMaster, TicketPriority, TicketStatus } from '@/lib/types'
import { CreateTicketModal } from './components/CreateTicketModal'
import { SelectPersonDrawer } from './components/SelectPersonDrawer'
import { AddInvoiceModal } from './components/AddInvoiceModal'

export default function TicketsPage() {
  const { selectedLocationId } = useLocationContext()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<TicketCategoryMaster[]>([])
  const [activeTab, setActiveTab] = useState<'OPEN' | 'IN_PROGRESS' | 'CLOSED'>('OPEN')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [automateTickets, setAutomateTickets] = useState(false)

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isTatModalOpen, setIsTatModalOpen] = useState(false)

  // Fetch Master Categories & Sub-Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const url = API_ENDPOINTS.tickets.categories(selectedLocationId)
        const res = await apiClient.get(url)
        if (res.data?.data) {
          setCategories(res.data.data)
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      }
    }

    fetchCategories()
  }, [selectedLocationId])

  // Fetch Tickets matching location & active tab
  const fetchTickets = useCallback(async () => {
    setIsLoading(true)
    try {
      const url = API_ENDPOINTS.tickets.list(selectedLocationId)
      const res = await apiClient.get(url, {
        params: {
          tab: activeTab,
        },
      })
      if (res.data?.data) {
        const fetchedTickets: Ticket[] = res.data.data
        setTickets(fetchedTickets)

        if (fetchedTickets.length > 0) {
          const matching = fetchedTickets.find((t) => t.id === selectedTicket?.id)
          setSelectedTicket(matching || fetchedTickets[0])
        } else {
          setSelectedTicket(null)
        }
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedLocationId, activeTab, selectedTicket?.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTickets()
  }, [fetchTickets])

  // Handle Option Update (Category, Sub-Category, TAT, Priority, Status)
  const handleUpdateOption = async (payload: {
    categoryId?: string
    subCategoryId?: string
    tatOption?: string
    priority?: TicketPriority
    status?: TicketStatus
  }) => {
    if (!selectedTicket) return
    try {
      const url = API_ENDPOINTS.tickets.updateOptions(selectedTicket.id, selectedLocationId)
      await apiClient.patch(url, payload)

      // Optimistic update
      setSelectedTicket((prev) => (prev ? { ...prev, ...payload } : null))
      fetchTickets()
    } catch (err) {
      console.error('Failed to update ticket option:', err)
    }
  }

  // Find active category object & sub-categories
  const activeCategoryObj = categories.find(
    (c) => c.id === selectedTicket?.categoryId || c.name === selectedTicket?.category,
  )
  const availableSubCategories = activeCategoryObj?.subCategories || []

  // Check if selected ticket is assigned to Self (current logged-in user)
  const isSelfAssigned =
    Boolean(selectedTicket?.assignedToUserId) &&
    (selectedTicket?.assignedToUserId === user?.id ||
      selectedTicket?.assignedToUser?.id === user?.id ||
      selectedTicket?.assignedToUser?.email === user?.email)

  // Helper to format flat / unit display string cleanly without "undefined"
  const formatUnitLabel = (t: Ticket) => {
    const uNum = t.unit?.unit_number || t.unit?.unitNumber
    if (uNum) {
      return uNum.includes('-') ? uNum : `A, A-${uNum}`
    }
    if (t.title) {
      const match = t.title.match(/Flat\s+(.+)$/i)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    return 'A, 105'
  }

  // Helper to format date for stepper timeline
  const formatStepperDate = (dateStr: string | Date) => {
    const d = new Date(dateStr)
    const day = d.getDate()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[d.getMonth()]
    const year = d.getFullYear()
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${day} ${month}, ${year}. ${time}`
  }

  // Active Sub-Category Name helper
  const activeSubCategoryName =
    availableSubCategories.find((s) => s.id === selectedTicket?.subCategoryId)?.name ||
    selectedTicket?.subCategoryObj?.name ||
    'Electrical Maintenance'

  // Assigned Employee Name helper
  const getAssigneeName = (t: Ticket | null) => {
    if (!t) return 'Unassigned'
    if (t.assignedToUser?.email) {
      return t.assignedToUser.email.split('@')[0]
    }
    if (t.assignedToUserId) {
      if (user?.id && t.assignedToUserId === user.id) return 'Self'
      return 'Staff Member'
    }
    return 'Unassigned'
  }

  const assignedName = getAssigneeName(selectedTicket)

  // Check view status mode
  const isClosedView = selectedTicket?.status === 'CLOSED' || activeTab === 'CLOSED'
  const isInProgressView =
    activeTab === 'IN_PROGRESS' ||
    (selectedTicket &&
      (selectedTicket.status === 'IN_PROGRESS' ||
        selectedTicket.status === 'ON_HOLD' ||
        selectedTicket.status === 'RESOLVED'))

  return (
    <div className="space-y-6 pb-8">
      {/* Standard Header matching other module pages */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage service tickets, assign personnel, and update ticket resolution options.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#005390] hover:bg-[#004273] text-white text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add New Ticket
          </button>

          <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs font-semibold text-gray-700">Automate Tickets</span>
            <button
              type="button"
              onClick={() => setAutomateTickets(!automateTickets)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                automateTickets ? 'bg-[#005390]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  automateTickets ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets Queue List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[680px]">
          {/* Tab Filter Header with Primary Brand Blue */}
          <div className="grid grid-cols-3 border-b border-gray-200 text-center font-bold text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('OPEN')}
              className={`py-3.5 transition-colors cursor-pointer border-b-2 font-bold ${
                activeTab === 'OPEN'
                  ? 'bg-[#005390] text-white border-[#005390]'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-transparent'
              }`}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('IN_PROGRESS')}
              className={`py-3.5 transition-colors cursor-pointer border-b-2 font-bold ${
                activeTab === 'IN_PROGRESS'
                  ? 'bg-[#005390] text-white border-[#005390]'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-transparent'
              }`}
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CLOSED')}
              className={`py-3.5 transition-colors cursor-pointer border-b-2 font-bold ${
                activeTab === 'CLOSED'
                  ? 'bg-[#005390] text-white border-[#005390]'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-transparent'
              }`}
            >
              Closed
            </button>
          </div>

          {/* Tickets Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {isLoading ? (
              <div className="p-8 text-center text-xs font-semibold text-gray-400">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-gray-400">No tickets in this section</div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id
                const unitStr = formatUnitLabel(t)
                const itemAssignee = getAssigneeName(t)
                const isItemSelf =
                  Boolean(t.assignedToUserId) &&
                  (t.assignedToUserId === user?.id ||
                    t.assignedToUser?.id === user?.id ||
                    t.assignedToUser?.email === user?.email ||
                    itemAssignee === 'Self')

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full text-left p-4 transition-all cursor-pointer relative ${
                      isSelected ? 'bg-[#005390] text-white shadow-2xs' : 'bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-bold tracking-tight">{t.ticketNumber}</span>
                      <span
                        className={`text-[11px] flex items-center gap-1 ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}
                      >
                        <Clock className="w-3 h-3" />
                        {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                      <div className={`flex items-center gap-1 ${isSelected ? 'text-gray-200' : 'text-gray-600'}`}>
                        <Home className="w-3.5 h-3.5" />
                        {unitStr}
                      </div>

                      {t.status === 'CLOSED' ? (
                        <span
                          className={`text-[10px] font-bold ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`}
                        >
                          {isItemSelf ? 'Completed by Self' : 'Completed by Technician'}
                        </span>
                      ) : t.assignedToUserId || t.assignedToUser ? (
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-200' : 'text-blue-600'}`}>
                          {isItemSelf ? 'Self' : `Assigned to ${itemAssignee}`}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-200' : 'text-amber-600'}`}>
                          Unassigned
                        </span>
                      )}
                    </div>

                    <div className={`text-xs truncate font-medium ${isSelected ? 'text-gray-100' : 'text-gray-500'}`}>
                      <MessageSquare className="w-3 h-3 inline mr-1 opacity-70" />
                      {t.title || t.description || 'Service Ticket'}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Ticket Workspace Detail (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[680px] relative flex flex-col">
          {selectedTicket ? (
            isClosedView ? (
              /* CLOSED TICKET VIEW MATCHING SCREENSHOT */
              <div className="space-y-6 flex-1">
                {/* Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                      <TicketIcon className="w-5 h-5 text-[#005390]" />
                    </div>
                    <span className="text-xl font-mono font-extrabold text-gray-900">
                      {selectedTicket.ticketNumber}
                    </span>
                  </div>

                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-extrabold">
                    Closed
                  </span>
                </div>

                {/* Progress Stepper Box matching screenshot */}
                <div className="border border-dashed border-gray-300 rounded-2xl p-6 bg-white shadow-2xs space-y-4">
                  <div className="flex items-center justify-between relative px-6">
                    {/* Progress Bar Line */}
                    <div className="absolute left-12 right-12 top-4 h-0.5 bg-emerald-500 -z-0" />

                    {/* Step 1: Request Raised */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Request Raised</span>
                      <span className="text-[10px] font-medium text-gray-500 max-w-[100px] leading-tight">
                        Request raised at {formatStepperDate(selectedTicket.createdAt)}
                      </span>
                    </div>

                    {/* Step 2: Task Completed */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Task Completed</span>
                      <span className="text-[10px] font-medium text-gray-500 max-w-[100px] leading-tight">
                        Task marked as completed
                      </span>
                    </div>

                    {/* Step 3: Ticket Closed */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Ticket Closed</span>
                      <span className="text-[10px] font-medium text-gray-500 max-w-[100px] leading-tight">00</span>
                    </div>

                    {/* Step 4: Feedback */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 bg-white text-emerald-600 font-bold flex items-center justify-center text-xs shadow-2xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Feedback</span>
                      <span className="text-[10px] font-medium text-gray-500 max-w-[100px] leading-tight">Pending</span>
                    </div>
                  </div>
                </div>

                {/* Metadata Section */}
                <div className="space-y-3 pt-2 text-sm text-gray-800">
                  <div className="flex items-center gap-2 font-bold text-gray-900">
                    <Home className="w-4 h-4 text-gray-800" />
                    <span>{formatUnitLabel(selectedTicket)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Department :</span>
                    <span className="font-bold text-gray-900">
                      {selectedTicket.department?.name || selectedTicket.category || 'General Service'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Category :</span>
                    <span className="font-bold text-gray-900">
                      {selectedTicket.category || 'Rely Advantage Service'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Sub Category :</span>
                    <span className="font-bold text-gray-900">{activeSubCategoryName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Raised By :</span>
                    <span className="font-bold text-gray-900">
                      {selectedTicket.raisedBy || selectedTicket.raisedByUser?.email?.split('@')[0] || 'Resident'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-gray-500 font-semibold">Completed By :</span>
                    <span className="font-bold text-emerald-700">
                      {selectedTicket.completedBy || (isSelfAssigned ? 'Self' : assignedName)}
                    </span>
                  </div>

                  {selectedTicket.tatUpdatedBy && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-500 font-semibold">TAT Updated By :</span>
                      <span className="font-bold text-blue-900">{selectedTicket.tatUpdatedBy}</span>
                    </div>
                  )}

                  {selectedTicket.escalatedBy && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-gray-500 font-semibold">Escalated By :</span>
                      <span className="font-bold text-red-700">{selectedTicket.escalatedBy}</span>
                    </div>
                  )}
                </div>

                {/* Readonly Description Box */}
                <div className="pt-2">
                  <textarea
                    rows={2}
                    readOnly
                    value={selectedTicket.title || selectedTicket.description || 'Hello'}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none resize-none shadow-2xs"
                  />
                </div>

                {/* Attachments Section (Only shown if real attachments exist) */}
                {Array.isArray(selectedTicket.attachments) && selectedTicket.attachments.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900">Attachments :</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedTicket.attachments.map((att: string, idx: number) => (
                        <img
                          key={idx}
                          src={att}
                          alt={`Attachment ${idx + 1}`}
                          className="w-44 h-28 rounded-2xl object-cover border border-gray-200 shadow-sm"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Floating Comment Chat Thread Trigger */}
                <div className="absolute bottom-6 right-6">
                  <div className="bg-[#005390] text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold cursor-pointer hover:bg-[#004273] transition-all">
                    <MessageSquare className="w-4 h-4" />
                    <span>{selectedTicket.ticketNumber}</span>
                  </div>
                </div>
              </div>
            ) : isInProgressView ? (
              /* IN PROGRESS EXECUTION VIEW MATCHING DESIGN SYSTEM */
              <div className="space-y-6 flex-1">
                {/* Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                      <TicketIcon className="w-5 h-5 text-[#005390]" />
                    </div>
                    <span className="text-xl font-mono font-extrabold text-gray-900">
                      {selectedTicket.ticketNumber}
                    </span>
                  </div>

                  {/* Status Badge Dropdown */}
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateOption({ status: e.target.value as TicketStatus })}
                    className="px-3 py-1.5 bg-amber-50/90 text-amber-800 border border-amber-200 rounded-xl text-xs font-extrabold focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="OPEN">Open ∨</option>
                    <option value="IN_PROGRESS">In progress ∨</option>
                    <option value="ON_HOLD">On hold ∨</option>
                    <option value="RESOLVED">Resolved ∨</option>
                    <option value="CLOSED">Closed ∨</option>
                  </select>
                </div>

                {/* Progress Stepper Tracker Box styled with primary brand blue */}
                <div className="border border-dashed border-gray-300 rounded-2xl p-6 bg-white shadow-2xs space-y-4">
                  <div className="flex items-center justify-between relative px-6">
                    {/* Progress Bar Background Line */}
                    <div className="absolute left-12 right-12 top-4 h-0.5 bg-blue-200 -z-0" />

                    {/* Step 1: Request Raised */}
                    <div className="flex flex-col items-center z-10 space-y-2">
                      <div className="w-8 h-8 rounded-full border-2 border-[#005390] bg-white text-[#005390] font-bold flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Request Raised</span>
                    </div>

                    {/* Step 2: Request Accepted */}
                    <div className="flex flex-col items-center z-10 space-y-2">
                      <div className="w-8 h-8 rounded-full border-2 border-[#005390] bg-white text-[#005390] font-bold flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Request Accepted</span>
                    </div>

                    {/* Step 3: Ticket Closed */}
                    <div className="flex flex-col items-center z-10 space-y-2">
                      <div
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedTicket.status === 'CLOSED' || selectedTicket.status === 'RESOLVED'
                            ? 'border-[#005390] bg-[#005390] text-white'
                            : 'border-[#005390] bg-white text-[#005390]'
                        } font-bold flex items-center justify-center text-xs shadow-2xs`}
                      >
                        {selectedTicket.status === 'CLOSED' || selectedTicket.status === 'RESOLVED' ? (
                          <Check className="w-4.5 h-4.5" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#005390]" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-gray-900">Ticket Closed</span>
                    </div>

                    {/* Step 4: Feedback */}
                    <div className="flex flex-col items-center z-10 space-y-2">
                      <div className="w-8 h-8 rounded-full border-2 border-[#005390] bg-white text-[#005390] font-bold flex items-center justify-center text-xs shadow-2xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#005390]" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Feedback</span>
                    </div>
                  </div>
                </div>

                {/* Detail Metadata List */}
                <div className="space-y-4 pt-2 text-sm text-gray-800">
                  <div className="flex items-center gap-2 font-bold text-gray-900">
                    <Home className="w-4 h-4 text-gray-800" />
                    <span>{formatUnitLabel(selectedTicket)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Department :</span>
                    <span className="font-bold text-gray-900">
                      {selectedTicket.department?.name || selectedTicket.category || 'General Service'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Category :</span>
                    <span className="font-bold text-gray-900">{selectedTicket.category || 'R&M (Repair)'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Sub Category :</span>
                    <span className="font-bold text-gray-900">{activeSubCategoryName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Raised By :</span>
                    <span className="font-bold text-gray-900">
                      {selectedTicket.raisedBy || selectedTicket.raisedByUser?.email?.split('@')[0] || 'Resident'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">TAT :</span>
                    <span className="font-bold text-gray-900">{selectedTicket.tatOption || '1-2 hour'}</span>
                    <button
                      type="button"
                      onClick={() => setIsTatModalOpen(true)}
                      className="text-[#005390] hover:underline font-bold text-xs cursor-pointer ml-2"
                    >
                      Change TAT
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Assigned :</span>
                    <span className="font-bold text-gray-900">{assignedName}</span>
                    <button
                      type="button"
                      onClick={() => setIsAssignDrawerOpen(true)}
                      className="text-[#005390] hover:underline font-bold text-xs cursor-pointer ml-2"
                    >
                      Change Assignee
                    </button>
                  </div>
                </div>

                {/* Add Invoice Details CTA Button styled with primary color */}
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="w-full py-3.5 border-2 border-[#005390] text-[#005390] hover:bg-blue-50/60 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs"
                  >
                    <Plus className="w-4 h-4" /> Add Invoice Details
                  </button>
                </div>
              </div>
            ) : (
              /* OPEN TICKET CREATION / OPTION SELECTOR VIEW */
              <div className="space-y-6 flex-1">
                {/* Header Title & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-extrabold font-mono text-gray-900">
                        {selectedTicket.ticketNumber}
                      </span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateOption({ status: e.target.value as TicketStatus })}
                        className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="OPEN">Open ∨</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>

                      {isSelfAssigned && (
                        <span className="px-2.5 py-1 bg-blue-50 text-[#005390] border border-blue-200 rounded-lg text-xs font-bold">
                          Self Assigned
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-gray-400" />
                        {formatUnitLabel(selectedTicket)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(selectedTicket.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description Input Box */}
                <div>
                  <textarea
                    rows={2}
                    value={selectedTicket.title || selectedTicket.description || ''}
                    readOnly
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none resize-none"
                  />
                </div>

                {/* Department Section */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-md inline-block">
                    Department
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['Repair & Maintenance', 'Concierge'].map((deptName) => {
                      const currentDeptName = selectedTicket.department?.name || selectedTicket.category
                      const isSelected = currentDeptName.toLowerCase().includes(deptName.split(' ')[0].toLowerCase())

                      return (
                        <button
                          key={deptName}
                          type="button"
                          disabled
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-not-allowed ${
                            isSelected
                              ? 'bg-[#005390] text-white shadow-2xs'
                              : 'bg-gray-100/70 text-gray-400 opacity-60'
                          }`}
                        >
                          {deptName}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Sub Category Pills (Job Categories) */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-md inline-block">
                    Sub Category / Job Category
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(selectedTicket.category?.includes('Concierge')
                      ? [
                          { id: 'sub-hk', name: 'Housekeeping' },
                          { id: 'sub-laundry', name: 'Laundry' },
                          { id: 'sub-support', name: 'Customer Support' },
                          { id: 'sub-trans', name: 'Transportation' },
                          { id: 'sub-others', name: 'Others' },
                        ]
                      : [
                          { id: 'sub-elec', name: 'Electrical' },
                          { id: 'sub-carp', name: 'Carpentry' },
                          { id: 'sub-plum', name: 'Plumbing' },
                          { id: 'sub-misc', name: 'Miscellaneous' },
                        ]
                    ).map((sub) => {
                      const tRecord = selectedTicket as unknown as Record<string, unknown>
                      const jobCatName =
                        selectedTicket.jobCategory?.name ||
                        (typeof tRecord.jobCategory === 'string' ? tRecord.jobCategory : '') ||
                        (typeof tRecord.subCategory === 'string' ? tRecord.subCategory : '') ||
                        selectedTicket.subCategoryObj?.name ||
                        activeSubCategoryName ||
                        ''

                      const isSelected =
                        selectedTicket.jobCategoryId === sub.id ||
                        selectedTicket.subCategoryId === sub.id ||
                        (jobCatName && jobCatName.toLowerCase() === sub.name.toLowerCase()) ||
                        (jobCatName && jobCatName.toLowerCase().includes(sub.name.toLowerCase())) ||
                        (selectedTicket.category &&
                          selectedTicket.category.toLowerCase().includes(sub.name.toLowerCase())) ||
                        (selectedTicket.title && selectedTicket.title.toLowerCase().includes(sub.name.toLowerCase()))

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          disabled
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-not-allowed ${
                            isSelected
                              ? 'bg-[#005390] text-white shadow-2xs'
                              : 'bg-gray-100/70 text-gray-400 opacity-60'
                          }`}
                        >
                          {sub.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* TAT SLA Options */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-md inline-block">
                    TAT SLA
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['30 mins', '1-2 hour', '2-5 hours', 'Custom'].map((tat) => {
                      const isSelected = selectedTicket.tatOption === tat

                      return (
                        <button
                          key={tat}
                          type="button"
                          onClick={() => handleUpdateOption({ tatOption: tat })}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#005390] text-white shadow-2xs'
                              : 'bg-amber-50/80 text-amber-900 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {tat}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Priority Pills */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-md inline-block">
                    Priority
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'CRITICAL', label: 'Critical' },
                      { key: 'HIGH', label: 'High' },
                      { key: 'MEDIUM', label: 'Medium' },
                      { key: 'LOW', label: 'Low' },
                    ].map((p) => {
                      const isSelected = selectedTicket.priority === p.key

                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => handleUpdateOption({ priority: p.key as TicketPriority })}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#005390] text-white shadow-2xs'
                              : 'bg-amber-50/80 text-amber-900 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAssignDrawerOpen(true)}
                    className="px-5 py-2.5 bg-[#005390] hover:bg-[#004273] text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" /> Assign Person
                  </button>

                  {isSelfAssigned && selectedTicket.status !== 'CLOSED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateOption({ status: 'CLOSED' })}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Close Ticket
                    </button>
                  )}
                </div>

                {/* Bottom Floating Comment Chat Thread Trigger */}
                <div className="absolute bottom-6 right-6">
                  <div className="bg-[#005390] hover:bg-[#004273] text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold cursor-pointer transition-all">
                    <MessageSquare className="w-4 h-4" />
                    <span>{selectedTicket.ticketNumber}</span>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-12">
              <AlertCircle className="w-12 h-12 mb-3 text-gray-300" />
              <h3 className="text-base font-bold text-gray-700">No Ticket Selected</h3>
              <p className="text-xs text-gray-500 mt-1">
                Select a ticket from the left panel to manage options and assign employees.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals & Drawers */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        locationId={selectedLocationId}
        onSuccess={fetchTickets}
      />

      <SelectPersonDrawer
        isOpen={isAssignDrawerOpen}
        ticket={selectedTicket}
        locationId={selectedLocationId}
        onClose={() => setIsAssignDrawerOpen(false)}
        onAssignSuccess={fetchTickets}
      />

      <AddInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        ticket={selectedTicket}
        locationId={selectedLocationId}
        onSuccess={fetchTickets}
      />

      {/* Change TAT Modal */}
      {isTatModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-gray-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Change TAT SLA</h3>
              <button
                type="button"
                onClick={() => setIsTatModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['30 mins', '1-2 hour', '2-5 hours', 'Custom'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    handleUpdateOption({ tatOption: option })
                    setIsTatModalOpen(false)
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    selectedTicket.tatOption === option
                      ? 'border-[#005390] bg-blue-50 text-[#005390]'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
