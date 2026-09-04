import { useState, useEffect, useCallback } from 'react'
import { Users, CheckCircle2, Clock, LogOut, Ban, QrCode, ShieldAlert, X, Home } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { getGateStats, getGateEntries, getGatePreapproveds, updateGateEntryStatus } from '@/lib/api/gate'

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
  const [entries, setEntries] = useState<Record<string, unknown>[]>([])
  const [preapproved, setPreapproved] = useState<Record<string, unknown>[]>([])
  const [activeTab, setActiveTab] = useState<'ENTRIES' | 'INVITES'>('ENTRIES')
  const [isLoading, setIsLoading] = useState(false)

  const [entriesPage, setEntriesPage] = useState(1)
  const [entriesTotalPages, setEntriesTotalPages] = useState(1)
  const [preapprovedPage, setPreapprovedPage] = useState(1)
  const [preapprovedTotalPages, setPreapprovedTotalPages] = useState(1)
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [visitorTypeFilter, setVisitorTypeFilter] = useState('')
  const [viewPhoto, setViewPhoto] = useState<string | null>(null)

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

  const handleUpdateStatus = async (entryId: string, status: string) => {
    try {
      await updateGateEntryStatus(selectedLocationId!, entryId, status)
      fetchData()
    } catch (error) {
      console.error('Failed to update entry status', error)
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
                              onClick={() => setViewPhoto(entry.visitorPhotos[0])}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') setViewPhoto(entry.visitorPhotos[0])
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
                        {!entry.unit?.unit_number &&
                          !entry.company &&
                          !entry.vehicleNumber &&
                          !entry.personToMeet &&
                          !entry.notes &&
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
                        {entry.clockedInAt ? `In: ${new Date(entry.clockedInAt).toLocaleTimeString()}` : '-'} <br />
                        {entry.clockedOutAt ? `Out: ${new Date(entry.clockedOutAt).toLocaleTimeString()}` : ''}
                      </td>
                      <td className="py-4 px-2">
                        {entry.status === 'PendingApproval' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateStatus(entry.id, 'Approved')}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(entry.id, 'Rejected')}
                              className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                              title="Reject"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {entry.status === 'Inside' && (
                          <button
                            onClick={() => handleUpdateStatus(entry.id, 'Completed')}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md border border-gray-300"
                          >
                            Force Checkout
                          </button>
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
                              onClick={() => setViewPhoto(preapproved.visitorPhotos[0])}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') setViewPhoto(preapproved.visitorPhotos[0])
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
                      <td className="py-4 px-2 text-xs font-mono font-bold text-gray-500">{preapproved.qrCode}</td>
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
      {viewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl p-2 flex flex-col">
            <button
              onClick={() => setViewPhoto(null)}
              className="absolute -top-4 -right-4 p-2 bg-white rounded-full text-gray-500 hover:text-gray-900 shadow-md border border-gray-200 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={viewPhoto}
              alt="Enlarged visitor"
              className="w-full h-full object-contain rounded-xl max-h-[85vh]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
