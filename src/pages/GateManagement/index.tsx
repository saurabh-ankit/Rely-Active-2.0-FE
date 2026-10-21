/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react'
import { format, isValid } from 'date-fns'
import {
  Users,
  CheckCircle2,
  Clock,
  LogOut,
  Ban,
  QrCode,
  ShieldAlert,
  X,
  Home,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
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
import { useLocationContext } from '@/hooks/useLocation'
import {
  getGateStats,
  getGateEntries,
  getGatePreapproveds,
  updateGateEntryStatus,
  addGateEntryItems,
} from '@/lib/services/gateService'
import type { GateEntry, GatePreapproved, GateStats } from '@/lib/types'
import type { GateStaffUser } from '@/lib/types/gate'
import { PageHeader } from '@/components/common/PageHeader'

interface StatCardProps {
  title: string
  value: number | undefined
  icon: React.ElementType
  colorClass: string
}

const StatCard = ({ title, value, icon: Icon, colorClass }: StatCardProps) => (
  <div className={`p-6 rounded-2xl border bg-white shadow-sm flex items-center gap-4 ${colorClass}`}>
    <div
      className={`p-4 rounded-xl flex-shrink-0 ${colorClass.replace('border-', 'bg-').replace('300', '100')} text-current`}
    >
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
    </div>
  </div>
)

const staffUserName = (u?: GateStaffUser | null) =>
  u ? `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim() || u.username || u.email || 'Staff' : ''

const APPROVER_BADGES: Record<string, { label: string; cls: string }> = {
  RESIDENT: { label: 'Resident', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  FAMILY_MEMBER: { label: 'Family member', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  STAFF: { label: 'Staff', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
}

const formatDateTime = (dateStr?: string | Date | null) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (!isValid(d)) return ''
  return format(d, 'dd/MM/yyyy, h:mm:ss a')
}

const formatDate = (dateStr?: string | Date | null) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (!isValid(d)) return ''
  return format(d, 'dd/MM/yyyy')
}

/** Who approved (or rejected) the entry, what kind of person they are, and when. */
const ApprovedByCell = ({ entry }: { entry: GateEntry }) => {
  // A pre-approved pass is approved by the resident who raised it (see Raised By); only a
  // staff decision at the gate (e.g. rejecting the pass) is shown here.
  if (entry.entrySource === 'Preapproved' && entry.approverType !== 'STAFF') {
    return <span className="text-gray-400">— Pre-approved</span>
  }
  if (!entry.approverType) {
    return entry.status === 'PendingApproval' ? (
      <span className="font-semibold text-purple-700">Awaiting approval</span>
    ) : (
      <span className="text-gray-400">Not recorded</span>
    )
  }
  const badge = APPROVER_BADGES[entry.approverType]
  return (
    <div className="space-y-1">
      <p className="font-bold text-gray-900">{entry.approverName || 'Unknown'}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {badge && (
          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
        )}
        {entry.status === 'Rejected' && <span className="text-[10px] font-bold text-red-600">Rejected</span>}
      </div>
      {entry.approvedAt && (
        <p className="text-[11px] text-gray-500 whitespace-nowrap">{formatDateTime(entry.approvedAt)}</p>
      )}
    </div>
  )
}

const personName = (p?: { firstName?: string; lastName?: string | null } | null) =>
  p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : ''

const PersonBadge = ({ type }: { type?: string | null }) => {
  const badge = type ? APPROVER_BADGES[type] : undefined
  return badge ? (
    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
  ) : null
}

/** Who raised the entry: the resident behind a pre-approval, or the guard who raised a walk-in. */
const RaisedByCell = ({ entry }: { entry: GateEntry }) => {
  const r = entry.raisedBy
  if (!r) return <span className="text-gray-400">Not recorded</span>
  return (
    <div className="space-y-1">
      <p className="font-bold text-gray-900">{r.name || 'Unknown'}</p>
      <PersonBadge type={r.type} />
      {r.type === 'FAMILY_MEMBER' && r.residentName && (
        <p className="text-[11px] text-gray-500">Household of {r.residentName}</p>
      )}
      {entry.createdAt && (
        <p className="text-[11px] text-gray-500 whitespace-nowrap">
          {/* A pre-approval was raised when the resident made the pass, not when the visitor arrived. */}
          {formatDateTime(entry.preapproved?.createdAt || entry.createdAt)}
        </p>
      )}
    </div>
  )
}

/** The resident (or family member) who made the pre-approval. */
const PreapprovedByCell = ({ preapproved }: { preapproved: GatePreapproved }) => {
  const resident = personName(preapproved.resident)
  const member = personName(preapproved.createdByFamilyMember)
  if (!resident && !member) return <span className="text-gray-400">Not recorded</span>
  return (
    <div className="space-y-1">
      <p className="font-bold text-gray-900">{member || resident}</p>
      <PersonBadge type={member ? 'FAMILY_MEMBER' : 'RESIDENT'} />
      {member && resident && <p className="text-[11px] text-gray-500">Household of {resident}</p>}
      {preapproved.unit?.unit_number && (
        <p className="text-[11px] text-gray-500">Flat {preapproved.unit.unit_number}</p>
      )}
    </div>
  )
}

export default function GateManagementPage() {
  const { selectedLocationId, hasResourcePermission } = useLocationContext()
  const canUpdateGNS = hasResourcePermission('GNS', 'update')
  const [stats, setStats] = useState<GateStats | null>(null)
  const [entries, setEntries] = useState<GateEntry[]>([])
  const [preapproved, setPreapproved] = useState<GatePreapproved[]>([])
  const [activeTab, setActiveTab] = useState<'ENTRIES' | 'INVITES'>('ENTRIES')
  const [isLoading, setIsLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [entriesPage, setEntriesPage] = useState(1)
  const [entriesTotalPages, setEntriesTotalPages] = useState(1)
  const [preapprovedPage, setPreapprovedPage] = useState(1)
  const [preapprovedTotalPages, setPreapprovedTotalPages] = useState(1)
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [visitorTypeFilter, setVisitorTypeFilter] = useState('')
  const [photoViewerData, setPhotoViewerData] = useState<{ photos: string[]; currentIndex: number } | null>(null)

  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)
  const [items, setItems] = useState<{ itemName: string; quantity: number }[]>([])
  const [isVerifyItemModalOpen, setIsVerifyItemModalOpen] = useState(false)
  const [checkedItems, setCheckedItems] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    if (!selectedLocationId) return
    setIsLoading(true)
    try {
      const [statsRes, entriesRes, preapprovedRes] = await Promise.all([
        getGateStats(selectedLocationId),
        getGateEntries(selectedLocationId, {
          page: entriesPage,
          limit: 10,
          date: dateFilter,
          status: statusFilter,
          visitorType: visitorTypeFilter,
        }),
        getGatePreapproveds(selectedLocationId, {
          page: preapprovedPage,
          limit: 10,
          date: dateFilter,
          status: statusFilter,
          visitorType: visitorTypeFilter,
        }),
      ])
      if (statsRes.success) setStats(statsRes.data)
      if (entriesRes.success) {
        setEntries(entriesRes.data.rows || [])
        setEntriesTotalPages(entriesRes.data.totalPages || 1)
      }
      if (preapprovedRes.success) {
        setPreapproved(preapprovedRes.data.rows || [])
        setPreapprovedTotalPages(preapprovedRes.data.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch gate data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedLocationId, entriesPage, preapprovedPage, dateFilter, statusFilter, visitorTypeFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  const handleUpdateStatus = async (entry: any, status: string, checkedItemsList?: string[]) => {
    try {
      await updateGateEntryStatus(selectedLocationId!, entry.id as string, status, checkedItemsList)
      fetchData()
    } catch (error) {
      console.error('Failed to update entry status', error)
    }
  }

  const initiateForceCheckout = (entry: any) => {
    if (entry.items && (entry.items as any[]).length > 0) {
      setSelectedEntry(entry)
      setCheckedItems((entry.items as any[]).filter((i: any) => i.isChecked).map((i: any) => i.id as string))
      setIsVerifyItemModalOpen(true)
    } else {
      handleUpdateStatus(entry, 'Completed')
    }
  }

  const handleVerifyAndCheckout = () => {
    if (!selectedEntry) return
    handleUpdateStatus(selectedEntry, 'Completed', checkedItems)
    setIsVerifyItemModalOpen(false)
    setSelectedEntry(null)
  }

  const handleAddItems = async () => {
    if (!selectedEntry) return
    const validItems = items.filter((i) => i.itemName.trim() !== '')
    try {
      await addGateEntryItems(selectedLocationId!, selectedEntry.id as string, validItems)
      setIsItemModalOpen(false)
      setSelectedEntry(null)
      fetchData()
    } catch (error) {
      console.error('Failed to add items', error)
    }
  }

  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      entry.visitorName?.toLowerCase().includes(term) ||
      entry.visitorPhone?.toLowerCase().includes(term) ||
      entry.vehicleNumber?.toLowerCase().includes(term) ||
      entry.unit?.unit_number?.toLowerCase().includes(term) ||
      entry.company?.toLowerCase().includes(term) ||
      entry.personToMeet?.toLowerCase().includes(term)
    )
  })

  const filteredPreapproved = preapproved.filter((item) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      item.visitorName?.toLowerCase().includes(term) ||
      item.visitorPhone?.toLowerCase().includes(term) ||
      item.vehicleNumber?.toLowerCase().includes(term) ||
      item.unit?.unit_number?.toLowerCase().includes(term) ||
      item.company?.toLowerCase().includes(term) ||
      item.personToMeet?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={ShieldCheck}
        title="Visitors & Gate Management"
        description="Track visitors, manage walk-in approvals, and monitor gate operations."
      />

      {/* Top Search & Filter Container Bar (Matching Image 1) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 p-3.5 rounded-2xl shadow-2xs">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            type="text"
            className="pl-9 pr-4 py-2 h-9 w-full rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 shadow-2xs focus:ring-2 focus:ring-[#005390]/20"
            placeholder="Search visitors by name, vehicle, unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={visitorTypeFilter}
            onChange={(e) => {
              setVisitorTypeFilter(e.target.value)
              setEntriesPage(1)
              setPreapprovedPage(1)
            }}
            className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 cursor-pointer shadow-2xs"
          >
            <option value="">Visitor Type: All Types</option>
            <option value="Guest">Visitor Type: Guest</option>
            <option value="Delivery">Visitor Type: Delivery</option>
            <option value="Cab">Visitor Type: Cab</option>
            <option value="Office">Visitor Type: Office</option>
            <option value="Other">Visitor Type: Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setEntriesPage(1)
              setPreapprovedPage(1)
            }}
            className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 cursor-pointer shadow-2xs"
          >
            <option value="">Status: All Statuses</option>
            <option value="Inside">Status: Inside</option>
            <option value="Completed">Status: Completed</option>
            <option value="PendingApproval">Status: Walk-ins (Pending)</option>
            <option value="Rejected">Status: Rejected</option>
            <option value="Expired">Status: Expired</option>
          </select>

          <input
            type="date"
            lang="en-IN"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value)
              setEntriesPage(1)
              setPreapprovedPage(1)
            }}
            className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 cursor-pointer shadow-2xs"
          />
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expected"
          value={stats?.expected}
          icon={Users}
          colorClass="border-blue-300 text-blue-600"
        />
        <StatCard
          title="Currently Inside"
          value={stats?.currentlyInside}
          icon={Home}
          colorClass="border-amber-300 text-amber-600"
        />
        <StatCard
          title="Total Completed"
          value={stats?.completed}
          icon={LogOut}
          colorClass="border-emerald-300 text-emerald-600"
        />
        <StatCard
          title="Pending Walk-ins"
          value={stats?.pendingWalkins}
          icon={Clock}
          colorClass="border-purple-300 text-purple-600"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="grid grid-cols-2 border-b border-gray-200 text-center font-bold text-xs">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setActiveTab('ENTRIES')}
            className={`py-3.5 h-auto rounded-none transition-colors cursor-pointer border-b-2 font-bold ${
              activeTab === 'ENTRIES'
                ? 'bg-[#005390] text-white hover:bg-[#005390] hover:text-white border-[#005390]'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-transparent'
            }`}
          >
            Entry Logs
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setActiveTab('INVITES')}
            className={`py-3.5 h-auto rounded-none transition-colors cursor-pointer border-b-2 font-bold ${
              activeTab === 'INVITES'
                ? 'bg-[#005390] text-white hover:bg-[#005390] hover:text-white border-[#005390]'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-transparent'
            }`}
          >
            Pre-Approved (by Resident)
          </Button>
        </div>

        <div className="p-6 overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 font-semibold">Loading data...</div>
          ) : activeTab === 'ENTRIES' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="pb-3 px-2 font-semibold">Visitor</th>
                  <th className="pb-3 px-2 font-semibold">Details</th>
                  <th className="pb-3 px-2 font-semibold">Type</th>
                  <th className="pb-3 px-2 font-semibold">Source</th>
                  <th className="pb-3 px-2 font-semibold">Status</th>
                  <th className="pb-3 px-2 font-semibold">Raised By</th>
                  <th className="pb-3 px-2 font-semibold">Approved By</th>
                  <th className="pb-3 px-2 font-semibold">Time</th>
                  <th className="pb-3 px-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-gray-500 font-medium">
                      No entries found
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          {entry.visitorPhotos && entry.visitorPhotos.length > 0 ? (
                            <div
                              className="flex -space-x-2 relative cursor-pointer group"
                              onClick={() => setPhotoViewerData({ photos: entry.visitorPhotos, currentIndex: 0 })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ')
                                  setPhotoViewerData({ photos: entry.visitorPhotos, currentIndex: 0 })
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              {entry.visitorPhotos.slice(0, 3).map((photo: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={photo}
                                  alt={entry.visitorName}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-white shrink-0 group-hover:opacity-80 transition-opacity"
                                />
                              ))}
                              {entry.visitorPhotos.length > 3 && (
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white text-gray-500 font-bold shrink-0 text-xs">
                                  +{entry.visitorPhotos.length - 3}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-500 font-bold shrink-0">
                              {entry.visitorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-sm text-gray-900">{entry.visitorName}</p>
                            <p className="text-xs text-gray-500">{entry.visitorPhone || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-xs text-gray-600 space-y-0.5">
                        {entry.unit?.unit_number && (
                          <div>
                            <span className="font-semibold text-gray-500">Flat:</span> {entry.unit.unit_number}
                          </div>
                        )}
                        {entry.company && (
                          <div>
                            <span className="font-semibold text-gray-500">Company:</span> {entry.company}
                          </div>
                        )}
                        {entry.personToMeet && (
                          <div>
                            <span className="font-semibold text-gray-500">To Meet:</span> {entry.personToMeet}
                          </div>
                        )}
                        {entry.vehicleNumber && (
                          <div>
                            <span className="font-semibold text-gray-500">Vehicle:</span> {entry.vehicleNumber}
                          </div>
                        )}
                        {entry.notes && (
                          <div>
                            <span className="font-semibold text-gray-500">Notes:</span> {entry.notes}
                          </div>
                        )}
                        {entry.preapproved?.scheduleType && (
                          <div>
                            <span className="font-semibold text-gray-500">Schedule:</span>{' '}
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] uppercase rounded font-bold border border-indigo-200">
                              {entry.preapproved.scheduleType}
                            </span>
                          </div>
                        )}
                        {entry.items && (entry.items as any[]).length > 0 && (
                          <div className="mt-2 bg-white rounded border border-gray-200 p-1.5 shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 border-b pb-0.5">
                              Assigned Items
                            </p>
                            <ul className="space-y-1">
                              {(entry.items as any[]).map((item: any) => (
                                <li key={item.id as string} className="flex justify-between items-center text-xs">
                                  <span
                                    className="text-gray-700 font-medium truncate max-w-[120px]"
                                    title={item.itemName as string}
                                  >
                                    {item.itemName as string}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400">x{item.quantity as number}</span>
                                    {item.isChecked ? (
                                      <span title="Verified">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                      </span>
                                    ) : (
                                      <div
                                        className="w-3 h-3 rounded-full border border-gray-300"
                                        title="Pending Verification"
                                      />
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!entry.unit?.unit_number &&
                          !entry.company &&
                          !entry.vehicleNumber &&
                          !entry.personToMeet &&
                          !entry.notes &&
                          (!entry.items || (entry.items as any[]).length === 0) &&
                          !entry.preapproved?.scheduleType && <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-4 px-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-semibold">
                          {entry.visitorType}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                          {entry.entrySource === 'Preapproved' ? (
                            <QrCode className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          )}
                          {entry.entrySource}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-md font-bold ${
                            entry.status === 'Inside'
                              ? 'bg-amber-100 text-amber-800'
                              : entry.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.status === 'PendingApproval'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-xs">
                        <RaisedByCell entry={entry} />
                      </td>
                      <td className="py-4 px-2 text-xs">
                        <ApprovedByCell entry={entry} />
                      </td>
                      <td className="py-4 px-2 text-xs text-gray-600 font-medium">
                        {entry.createdAt && (
                          <div className="text-blue-600 mb-1 font-semibold whitespace-nowrap">
                            Entry: {formatDateTime(entry.createdAt)}
                          </div>
                        )}
                        {entry.clockedInAt ? `In: ${new Date(entry.clockedInAt).toLocaleTimeString()}` : '-'}
                        {entry.clockedInAt && entry.clockedInByUser && (
                          <span className="text-gray-400"> by {staffUserName(entry.clockedInByUser)}</span>
                        )}
                        <br />
                        {entry.clockedOutAt ? `Out: ${new Date(entry.clockedOutAt).toLocaleTimeString()}` : ''}
                        {entry.clockedOutAt && entry.clockedOutByUser && (
                          <span className="text-gray-400"> by {staffUserName(entry.clockedOutByUser)}</span>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        {canUpdateGNS && entry.status === 'PendingApproval' && (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleUpdateStatus(entry, 'Approved')}
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="sr-only">Approve</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleUpdateStatus(entry, 'Rejected')}
                              className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                              title="Reject"
                            >
                              <Ban className="w-4 h-4" />
                              <span className="sr-only">Reject</span>
                            </Button>
                          </div>
                        )}
                        {canUpdateGNS && entry.status === 'Inside' && (
                          <div className="flex flex-col gap-2 items-start">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => initiateForceCheckout(entry)}
                              className="text-xs h-7 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold border-gray-300 w-full"
                            >
                              Force Checkout
                            </Button>
                            {entry.visitorType === 'Office' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEntry(entry)
                                  setItems([{ itemName: '', quantity: 1 }])
                                  setIsItemModalOpen(true)
                                }}
                                className="text-xs h-7 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border-blue-200 w-full whitespace-nowrap"
                              >
                                + Add Items
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="pb-3 px-2 font-semibold">Visitor</th>
                  <th className="pb-3 px-2 font-semibold">Details</th>
                  <th className="pb-3 px-2 font-semibold">Type</th>
                  <th className="pb-3 px-2 font-semibold">Pre-Approved By</th>
                  <th className="pb-3 px-2 font-semibold">Expected</th>
                  <th className="pb-3 px-2 font-semibold">Status</th>
                  <th className="pb-3 px-2 font-semibold">QR Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPreapproved.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-gray-500 font-medium">
                      No preapproved found
                    </td>
                  </tr>
                ) : (
                  filteredPreapproved.map((preapproved) => (
                    <tr key={preapproved.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          {preapproved.visitorPhotos && preapproved.visitorPhotos.length > 0 ? (
                            <div
                              className="flex -space-x-2 relative cursor-pointer group"
                              onClick={() => setPhotoViewerData({ photos: preapproved.visitorPhotos, currentIndex: 0 })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ')
                                  setPhotoViewerData({ photos: preapproved.visitorPhotos, currentIndex: 0 })
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              {preapproved.visitorPhotos.slice(0, 3).map((photo: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={photo}
                                  alt={preapproved.visitorName}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-white shrink-0 group-hover:opacity-80 transition-opacity"
                                />
                              ))}
                              {preapproved.visitorPhotos.length > 3 && (
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white text-gray-500 font-bold shrink-0 text-xs">
                                  +{preapproved.visitorPhotos.length - 3}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-500 font-bold shrink-0">
                              {preapproved.visitorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-sm text-gray-900">{preapproved.visitorName}</p>
                            <p className="text-xs text-gray-500">{preapproved.visitorPhone || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-xs text-gray-600 space-y-0.5">
                        {preapproved.unit?.unit_number && (
                          <div>
                            <span className="font-semibold text-gray-500">Flat:</span> {preapproved.unit.unit_number}
                          </div>
                        )}
                        {preapproved.company && (
                          <div>
                            <span className="font-semibold text-gray-500">Company:</span> {preapproved.company}
                          </div>
                        )}
                        {preapproved.personToMeet && (
                          <div>
                            <span className="font-semibold text-gray-500">To Meet:</span> {preapproved.personToMeet}
                          </div>
                        )}
                        {preapproved.vehicleNumber && (
                          <div>
                            <span className="font-semibold text-gray-500">Vehicle:</span> {preapproved.vehicleNumber}
                          </div>
                        )}
                        {preapproved.notes && (
                          <div>
                            <span className="font-semibold text-gray-500">Notes:</span> {preapproved.notes}
                          </div>
                        )}
                        {preapproved.scheduleType && (
                          <div>
                            <span className="font-semibold text-gray-500">Schedule:</span>{' '}
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] uppercase rounded font-bold border border-indigo-200">
                              {preapproved.scheduleType}
                            </span>
                          </div>
                        )}
                        {!preapproved.unit?.unit_number &&
                          !preapproved.company &&
                          !preapproved.vehicleNumber &&
                          !preapproved.personToMeet &&
                          !preapproved.notes &&
                          !preapproved.scheduleType && <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-4 px-2 text-xs">
                        <PreapprovedByCell preapproved={preapproved} />
                      </td>
                      <td className="py-4 px-2">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-semibold border border-blue-200">
                          {preapproved.visitorType}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-xs text-gray-600 font-medium space-y-1">
                        {preapproved.startDate && (
                          <div>
                            <span className="font-semibold text-gray-500">
                              {preapproved.scheduleType === 'FREQUENT' ? 'Start Date:' : 'Date:'}
                            </span>{' '}
                            {formatDate(preapproved.startDate)}
                          </div>
                        )}
                        {preapproved.endDate && preapproved.scheduleType === 'FREQUENT' && (
                          <div>
                            <span className="font-semibold text-gray-500">End Date:</span>{' '}
                            {formatDate(preapproved.endDate)}
                          </div>
                        )}
                        {preapproved.startTime && (
                          <div>
                            <span className="font-semibold text-gray-500">Start Time:</span> {preapproved.startTime}
                          </div>
                        )}
                        {preapproved.endTime && (
                          <div>
                            <span className="font-semibold text-gray-500">End Time:</span> {preapproved.endTime}
                          </div>
                        )}
                        {!preapproved.startDate &&
                          !preapproved.endDate &&
                          !preapproved.startTime &&
                          !preapproved.endTime && <span className="text-gray-400">N/A</span>}
                      </td>
                      <td className="py-4 px-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-md font-bold ${
                            preapproved.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : preapproved.status === 'Scanned'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {preapproved.status}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        {preapproved.qrCodeImage ? (
                          <div
                            className="relative group inline-flex flex-col items-center gap-1 cursor-pointer"
                            onClick={() => setPhotoViewerData({ photos: [preapproved.qrCodeImage], currentIndex: 0 })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ')
                                setPhotoViewerData({ photos: [preapproved.qrCodeImage], currentIndex: 0 })
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <img
                              src={preapproved.qrCodeImage}
                              alt="QR Code"
                              className="w-12 h-12 object-contain rounded border border-gray-200 group-hover:opacity-80 transition-opacity bg-white"
                            />
                            <span className="text-[10px] font-mono font-bold text-gray-500">{preapproved.qrCode}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono font-bold text-gray-500">{preapproved.qrCode || '-'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50 text-sm">
          <span className="text-gray-500 font-medium">
            Page {activeTab === 'ENTRIES' ? entriesPage : preapprovedPage} of{' '}
            {activeTab === 'ENTRIES' ? entriesTotalPages : preapprovedTotalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeTab === 'ENTRIES' ? entriesPage === 1 : preapprovedPage === 1}
              onClick={() =>
                activeTab === 'ENTRIES'
                  ? setEntriesPage((p) => Math.max(1, p - 1))
                  : setPreapprovedPage((p) => Math.max(1, p - 1))
              }
              className="border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 font-semibold"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                activeTab === 'ENTRIES' ? entriesPage >= entriesTotalPages : preapprovedPage >= preapprovedTotalPages
              }
              onClick={() =>
                activeTab === 'ENTRIES' ? setEntriesPage((p) => p + 1) : setPreapprovedPage((p) => p + 1)
              }
              className="border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 font-semibold"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      <Dialog
        open={Boolean(photoViewerData && photoViewerData.photos.length > 0)}
        onOpenChange={(open) => {
          if (!open) setPhotoViewerData(null)
        }}
      >
        {photoViewerData && photoViewerData.photos.length > 0 && (
          <DialogContent className="sm:max-w-3xl p-4 gap-3">
            <DialogHeader className="pr-8">
              <DialogTitle className="text-base font-semibold">
                Visitor Photo{' '}
                {photoViewerData.photos.length > 1
                  ? `(${photoViewerData.currentIndex + 1} of ${photoViewerData.photos.length})`
                  : ''}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Gate entry capture preview
              </DialogDescription>
            </DialogHeader>

            <div className="relative flex items-center justify-center min-h-[300px] max-h-[70vh] bg-muted/30 rounded-xl overflow-hidden p-2 border">
              {photoViewerData.photos.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPhotoViewerData((prev) =>
                      prev
                        ? {
                            ...prev,
                            currentIndex: prev.currentIndex === 0 ? prev.photos.length - 1 : prev.currentIndex - 1,
                          }
                        : null,
                    )
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-md bg-background/90 backdrop-blur-sm hover:bg-background z-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="sr-only">Previous photo</span>
                </Button>
              )}

              <img
                src={photoViewerData.photos[photoViewerData.currentIndex]}
                alt={`Visitor capture ${photoViewerData.currentIndex + 1}`}
                className="w-full h-auto max-h-[65vh] object-contain rounded-lg"
              />

              {photoViewerData.photos.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPhotoViewerData((prev) =>
                      prev
                        ? {
                            ...prev,
                            currentIndex: prev.currentIndex === prev.photos.length - 1 ? 0 : prev.currentIndex + 1,
                          }
                        : null,
                    )
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-md bg-background/90 backdrop-blur-sm hover:bg-background z-10"
                >
                  <ChevronRight className="w-5 h-5" />
                  <span className="sr-only">Next photo</span>
                </Button>
              )}

              {photoViewerData.photos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                  {photoViewerData.photos.map((_, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPhotoViewerData((prev) => (prev ? { ...prev, currentIndex: idx } : null))
                      }}
                      className={`h-2 min-w-0 p-0 rounded-full transition-all hover:bg-transparent ${
                        idx === photoViewerData.currentIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80 w-2'
                      }`}
                      aria-label={`Go to photo ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Item Modal for Office Walkin */}
      <Dialog
        open={Boolean(isItemModalOpen && selectedEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setIsItemModalOpen(false)
            setSelectedEntry(null)
          }
        }}
      >
        {isItemModalOpen && selectedEntry && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Items for Office Visitor</DialogTitle>
              <DialogDescription>Provide the items (e.g., Gate Pass items) this visitor is carrying.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-60 overflow-y-auto px-1 py-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    placeholder="Item Name"
                    value={item.itemName}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[idx].itemName = e.target.value
                      setItems(newItems)
                    }}
                    className="flex-1 text-sm"
                  />
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[idx].quantity = Number(e.target.value)
                      setItems(newItems)
                    }}
                    className="w-20 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Remove item</span>
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setItems([...items, { itemName: '', quantity: 1 }])}
                className="text-sm text-[#005390] font-bold p-0 h-auto hover:bg-transparent hover:underline"
              >
                + Add Another Item
              </Button>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsItemModalOpen(false)
                  setSelectedEntry(null)
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleAddItems} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Items
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Verify Items Modal */}
      <Dialog
        open={Boolean(isVerifyItemModalOpen && selectedEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setIsVerifyItemModalOpen(false)
            setSelectedEntry(null)
          }
        }}
      >
        {isVerifyItemModalOpen && selectedEntry && (
          <DialogContent className="sm:max-w-md p-0 overflow-hidden">
            <div className="p-4 border-b bg-muted/40">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                  <ShieldAlert className="w-5 h-5 text-indigo-500" /> Verify Exit Items
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Please check off items before completing exit.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto bg-muted/20">
              <div className="space-y-3">
                {(selectedEntry.items as any[]).map((item: any) => (
                  <div
                    key={item.id as string}
                    className="flex items-center gap-3 bg-card p-3 border rounded-xl shadow-xs"
                  >
                    <Checkbox
                      id={`verify-item-${item.id}`}
                      className="data-checked:bg-indigo-600 data-checked:border-indigo-600 data-checked:text-white"
                      checked={checkedItems.includes(item.id as string)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCheckedItems([...checkedItems, item.id as string])
                        } else {
                          setCheckedItems(checkedItems.filter((id) => id !== item.id))
                        }
                      }}
                    />
                    <label htmlFor={`verify-item-${item.id}`} className="flex-1 cursor-pointer">
                      <span className="block text-sm font-bold text-foreground">{item.itemName as string}</span>
                      <span className="block text-xs text-muted-foreground font-semibold uppercase mt-0.5">
                        Quantity: {item.quantity as number}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="p-4 border-t m-0 rounded-none bg-background gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsVerifyItemModalOpen(false)
                  setSelectedEntry(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleVerifyAndCheckout}
                disabled={checkedItems.length !== (selectedEntry.items as any[]).length}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Complete Checkout
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
