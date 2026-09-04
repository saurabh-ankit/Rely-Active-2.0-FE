/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import {
  getGateStats,
  getGateEntries,
  getGatePreapproveds,
  updateGateEntryStatus,
  addGateEntryItems,
} from '@/lib/api/gate'

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

export default function GateManagementPage() {
  const { selectedLocationId } = useLocationContext()
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [preapproved, setPreapproved] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'ENTRIES' | 'INVITES'>('ENTRIES')
  const [isLoading, setIsLoading] = useState(false)

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

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Visitors & Gate Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track visitors, manage walk-in approvals, and monitor gate operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setEntriesPage(1)
              setPreapprovedPage(1)
            }}
            className="p-2 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Inside">Inside</option>
            <option value="Completed">Completed</option>
            <option value="PendingApproval">Walk-ins (Pending)</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
          </select>
          <select
            value={visitorTypeFilter}
            onChange={(e) => {
              setVisitorTypeFilter(e.target.value)
              setEntriesPage(1)
              setPreapprovedPage(1)
            }}
            className="p-2 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="Guest">Guest</option>
            <option value="Delivery">Delivery</option>
            <option value="Cab">Cab</option>
            <option value="Office">Office</option>
            <option value="Other">Other</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value)
              setEntriesPage(1)
              setPreapprovedPage(1)
            }}
            className="p-2 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <button
            type="button"
            onClick={() => setActiveTab('ENTRIES')}
            className={`py-3.5 transition-colors cursor-pointer border-b-2 font-bold ${
              activeTab === 'ENTRIES'
                ? 'bg-[#005390] text-white border-[#005390]'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-transparent'
            }`}
          >
            Entry Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INVITES')}
            className={`py-3.5 transition-colors cursor-pointer border-b-2 font-bold ${
              activeTab === 'INVITES'
                ? 'bg-[#005390] text-white border-[#005390]'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-transparent'
            }`}
          >
            Pre-Approved (L1 App)
          </button>
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
                  <th className="pb-3 px-2 font-semibold">Time</th>
                  <th className="pb-3 px-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500 font-medium">
                      No entries found
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
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
                        {(entry.createdByUser as any) && (
                          <div>
                            <span className="font-semibold text-gray-500 text-[10px] uppercase">Requested By:</span>{' '}
                            <span className="text-gray-700 text-xs">
                              {(entry.createdByUser as any).username || (entry.createdByUser as any).email}
                            </span>
                          </div>
                        )}
                        {(entry.approvedByUser as any) && (
                          <div>
                            <span className="font-semibold text-gray-500 text-[10px] uppercase">Approved By:</span>{' '}
                            <span className="text-gray-700 text-xs">
                              {(entry.approvedByUser as any).username || (entry.approvedByUser as any).email}
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
                          !entry.createdByUser &&
                          !entry.approvedByUser &&
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
                      <td className="py-4 px-2 text-xs text-gray-600 font-medium">
                        {entry.createdAt && (
                          <div className="text-blue-600 mb-1 font-semibold whitespace-nowrap">
                            Entry: {new Date(entry.createdAt).toLocaleString()}
                          </div>
                        )}
                        {entry.clockedInAt ? `In: ${new Date(entry.clockedInAt).toLocaleTimeString()}` : '-'} <br />
                        {entry.clockedOutAt ? `Out: ${new Date(entry.clockedOutAt).toLocaleTimeString()}` : ''}
                      </td>
                      <td className="py-4 px-2">
                        {entry.status === 'PendingApproval' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateStatus(entry, 'Approved')}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(entry, 'Rejected')}
                              className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                              title="Reject"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {entry.status === 'Inside' && (
                          <div className="flex flex-col gap-2 items-start">
                            <button
                              onClick={() => initiateForceCheckout(entry)}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md border border-gray-300 w-full"
                            >
                              Force Checkout
                            </button>
                            {entry.visitorType === 'Office' && (
                              <button
                                onClick={() => {
                                  setSelectedEntry(entry)
                                  setItems([{ itemName: '', quantity: 1 }])
                                  setIsItemModalOpen(true)
                                }}
                                className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-md border border-blue-200 w-full whitespace-nowrap"
                              >
                                + Add Items
                              </button>
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
                  <th className="pb-3 px-2 font-semibold">Expected</th>
                  <th className="pb-3 px-2 font-semibold">Status</th>
                  <th className="pb-3 px-2 font-semibold">QR Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preapproved.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-500 font-medium">
                      No preapproved found
                    </td>
                  </tr>
                ) : (
                  preapproved.map((preapproved) => (
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
                            {new Date(preapproved.startDate).toLocaleDateString()}
                          </div>
                        )}
                        {preapproved.endDate && preapproved.scheduleType === 'FREQUENT' && (
                          <div>
                            <span className="font-semibold text-gray-500">End Date:</span>{' '}
                            {new Date(preapproved.endDate).toLocaleDateString()}
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
            <button
              disabled={activeTab === 'ENTRIES' ? entriesPage === 1 : preapprovedPage === 1}
              onClick={() =>
                activeTab === 'ENTRIES'
                  ? setEntriesPage((p) => Math.max(1, p - 1))
                  : setPreapprovedPage((p) => Math.max(1, p - 1))
              }
              className="px-3 py-1.5 border border-gray-300 bg-white rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 font-semibold"
            >
              Previous
            </button>
            <button
              disabled={
                activeTab === 'ENTRIES' ? entriesPage >= entriesTotalPages : preapprovedPage >= preapprovedTotalPages
              }
              onClick={() =>
                activeTab === 'ENTRIES' ? setEntriesPage((p) => p + 1) : setPreapprovedPage((p) => p + 1)
              }
              className="px-3 py-1.5 border border-gray-300 bg-white rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {photoViewerData && photoViewerData.photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-white/10 rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full p-2 flex items-center justify-center min-h-[300px]">
            <button
              onClick={() => setPhotoViewerData(null)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white shadow-lg backdrop-blur-md transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {photoViewerData.photos.length > 1 && (
              <button
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
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white shadow-lg backdrop-blur-md transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={photoViewerData.photos[photoViewerData.currentIndex]}
              alt={`Visitor capture ${photoViewerData.currentIndex + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />

            {photoViewerData.photos.length > 1 && (
              <button
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
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white shadow-lg backdrop-blur-md transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {photoViewerData.photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
                {photoViewerData.photos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPhotoViewerData((prev) => (prev ? { ...prev, currentIndex: idx } : null))
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${idx === photoViewerData.currentIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Item Modal for Office Walkin */}
      {isItemModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Add Items for Office Visitor</h2>
            <p className="text-sm text-gray-500 mb-6">
              Provide the items (e.g., Gate Pass items) this visitor is carrying.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-4 px-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={item.itemName}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[idx].itemName = e.target.value
                      setItems(newItems)
                    }}
                    className="flex-1 p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[idx].quantity = Number(e.target.value)
                      setItems(newItems)
                    }}
                    className="w-20 p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-red-500 p-2 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setItems([...items, { itemName: '', quantity: 1 }])}
                className="text-sm text-[#005390] font-bold mt-2 flex items-center gap-1 hover:underline"
              >
                + Add Another Item
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsItemModalOpen(false)
                  setSelectedEntry(null)
                }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItems}
                className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 shadow-sm"
              >
                Save Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Items Modal */}
      {isVerifyItemModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-indigo-500" /> Verify Exit Items
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Please check off items before completing exit.</p>
              </div>
              <button
                onClick={() => {
                  setIsVerifyItemModalOpen(false)
                  setSelectedEntry(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {(selectedEntry.items as any[]).map((item: any) => (
                  <div
                    key={item.id as string}
                    className="flex items-center gap-3 bg-white p-3 border rounded-xl shadow-sm"
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={checkedItems.includes(item.id as string)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCheckedItems([...checkedItems, item.id as string])
                        } else {
                          setCheckedItems(checkedItems.filter((id) => id !== item.id))
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-700">{item.itemName as string}</p>
                      <p className="text-xs text-gray-500 font-semibold uppercase mt-0.5">
                        Quantity: {item.quantity as number}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setIsVerifyItemModalOpen(false)
                  setSelectedEntry(null)
                }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyAndCheckout}
                disabled={checkedItems.length !== (selectedEntry.items as any[]).length}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 shadow-sm"
              >
                Complete Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
