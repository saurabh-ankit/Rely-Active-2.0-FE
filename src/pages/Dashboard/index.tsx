import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Heart,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Package,
  RefreshCw,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStatsQuery } from '@/hooks/react-query/dashboard'
import { useLocation } from '@/hooks/useLocation'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { selectedLocationId } = useLocation()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'occupancy' | 'billing' | 'inventory'>('dashboard')
  const [criticalPage, setCriticalPage] = useState(1)
  const [prevLocationId, setPrevLocationId] = useState(selectedLocationId)

  // Reset pagination when location switches
  if (prevLocationId !== selectedLocationId) {
    setPrevLocationId(selectedLocationId)
    setCriticalPage(1)
  }

  const {
    data: stats,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDashboardStatsQuery(selectedLocationId, {
    page: criticalPage,
    limit: 6,
  })

  const criticalResidents = stats?.criticalResidents?.items ?? []
  const criticalTotal = stats?.criticalResidents?.total ?? 0
  const criticalTotalPages = stats?.criticalResidents?.totalPages ?? 1
  const criticalLimit = stats?.criticalResidents?.limit ?? 6

  const startIdx = criticalTotal > 0 ? (criticalPage - 1) * criticalLimit + 1 : 0
  const endIdx = Math.min(criticalPage * criticalLimit, criticalTotal)

  return (
    <div className="space-y-5">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748]">Dashboard</h1>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          title="Refresh dashboard stats"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-[#005390]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center justify-between">
          <span>Failed to load dashboard statistics. Please try refreshing.</span>
          <button type="button" onClick={() => refetch()} className="font-bold underline hover:text-rose-900 ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Top Tabs Bar */}
      <div className="flex w-full overflow-x-auto gap-2 rounded-[20px] bg-[#dce0e4] p-1.5 border border-white/60 shadow-inner no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'dashboard' ? 'bg-[#005390] text-white shadow-md' : 'text-[#5c6370] hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('occupancy')}
          className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'occupancy' ? 'bg-[#005390] text-white shadow-md' : 'text-[#5c6370] hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Occupancy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'billing' ? 'bg-[#005390] text-white shadow-md' : 'text-[#5c6370] hover:text-slate-900'
          }`}
        >
          <IndianRupee className="h-4 w-4" />
          <span>Billing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'inventory' ? 'bg-[#005390] text-white shadow-md' : 'text-[#5c6370] hover:text-slate-900'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Inventory</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Resident Status Overview */}
          <div className="lg:col-span-6 rounded-[24px] border border-white/80 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#e3f7ec] text-[#1e8252]">
                <Heart className="h-4 w-4 fill-[#1e8252]" />
              </div>
              <h2 className="text-sm font-bold text-[#2d3748]">Resident Status Overview</h2>
            </div>

            {/* Active Residents Banner Card */}
            <div className="rounded-2xl border border-[#c6f0d8] bg-[#e8f8f0] p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1e8252]">ACTIVE RESIDENTS</span>
                <p className="text-xs text-[#489970] mt-0.5">Residents currently under active care</p>
              </div>
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <Skeleton className="h-9 w-12 rounded-lg" />
                ) : (
                  <span className="text-3xl font-extrabold text-[#1e8252]">
                    {stats?.residentStatus?.activeResidents ?? 0}
                  </span>
                )}
                <div className="flex size-9 items-center justify-center rounded-xl bg-white text-[#1e8252] shadow-sm">
                  <UserCheck className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Grid of Metric Cards */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Row 1 */}
              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                    TODAY'S ADMISSIONS
                  </span>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-1 rounded" />
                  ) : (
                    <p className="text-xl font-bold text-[#2d3748] mt-0.5">
                      {stats?.residentStatus?.todayAdmissions ?? 0}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">Admitted in last 24h</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
                  <UserPlus className="h-4 w-4" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                    TODAY'S DISCHARGES
                  </span>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-1 rounded" />
                  ) : (
                    <p className="text-xl font-bold text-[#2d3748] mt-0.5">
                      {stats?.residentStatus?.todayDischarges ?? 0}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">Discharged in last 24h</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#fdeef2] text-[#d9486c]">
                  <UserMinus className="h-4 w-4" />
                </div>
              </div>

              {/* Row 2 */}
              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">TOTAL RESIDENTS</span>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-1 rounded" />
                  ) : (
                    <p className="text-xl font-bold text-[#1e8252] mt-0.5">
                      {stats?.residentStatus?.totalResidents ?? 0}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">Admitted, discharge & MCCD initiated</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#e3f7ec] text-[#1e8252]">
                  <Users className="h-4 w-4" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                    TOTAL OUT RESIDENTS
                  </span>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-1 rounded" />
                  ) : (
                    <p className="text-xl font-bold text-[#d67e2a] mt-0.5">
                      {stats?.residentStatus?.totalOutResidents ?? 0}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">Hospitalized & out residents</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#fff4e5] text-[#d67e2a]">
                  <LogOut className="h-4 w-4" />
                </div>
              </div>

              {/* Row 3 */}
              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                    REGISTERED & PRE-ASSESSED
                  </span>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-1 rounded" />
                  ) : (
                    <p className="text-xl font-bold text-[#005390] mt-0.5">
                      {stats?.residentStatus?.registeredPreAssessed ?? 0}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">Registered, pre-assessed & skipped</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">TOTAL DISCHARGED</span>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-1 rounded" />
                  ) : (
                    <p className="text-xl font-bold text-[#d9486c] mt-0.5">
                      {stats?.residentStatus?.totalDischarged ?? 0}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">Discharge approved & completed</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#fdeef2] text-[#d9486c]">
                  <UserX className="h-4 w-4" />
                </div>
              </div>

              {/* Row 4 */}
              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">NOT ADMITTED</span>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-1 rounded" />
                  ) : (
                    <p className="text-xl font-bold text-[#2d3748] mt-0.5">{stats?.residentStatus?.notAdmitted ?? 0}</p>
                  )}
                  <p className="text-[10px] text-gray-400">Not admitted</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                    HOSPITALIZATION PENDING
                  </span>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-1 rounded" />
                  ) : (
                    <p className="text-xl font-bold text-[#2d3748] mt-0.5">
                      {stats?.residentStatus?.hospitalizationPending ?? 0}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">Hospitalization pending</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Critical Residents Alert & Resident Vitals Risk */}
          <div className="lg:col-span-6 space-y-5">
            {/* Card 1: Critical Residents Alert */}
            <div className="rounded-[24px] border border-white/80 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-[#fdeef2] text-[#d9486c]">
                    <Bell className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-[#2d3748]">Critical Residents Alert</h2>
                </div>
                <span className="text-xs font-bold text-[#d9486c] bg-[#fdeef2] px-3 py-1 rounded-full">
                  {isLoading ? '...' : `${criticalTotal} Residents`}
                </span>
              </div>

              {/* Resident Cards Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white/60 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-12 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : criticalResidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No Critical Residents</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    All residents currently under active care are in stable condition.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {criticalResidents.map((res) => (
                    <div
                      key={res.id}
                      className="group rounded-2xl border border-[#fcdbe2] bg-[#fff5f7] p-3.5 flex flex-col justify-between transition-all hover:shadow-md hover:border-[#f9a6b8]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#d9486c]" />
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/residents/details/${res.id}`)}
                              className="text-xs font-bold text-[#2d3748] truncate hover:text-[#005390] hover:underline text-left"
                            >
                              {res.name}
                            </button>
                          </div>
                          <span className="shrink-0 text-[9px] font-extrabold text-[#d9486c] tracking-wide uppercase">
                            {res.condition || res.riskLevel || 'CRITICAL'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium truncate">{res.room}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] font-semibold text-[#d9486c] truncate mr-2">{res.status}</span>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/residents/details/${res.id}`)}
                          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 transition hover:text-gray-700 shadow-sm group-hover:bg-[#005390] group-hover:text-white"
                          title="View Resident Details"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span>
                  {criticalTotal > 0 ? `Showing ${startIdx} to ${endIdx} of ${criticalTotal}` : 'Showing 0 to 0 of 0'}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={criticalPage <= 1 || isFetching}
                    onClick={() => setCriticalPage((p) => Math.max(1, p - 1))}
                    className="text-xs font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    &lt; Prev
                  </button>
                  <span className="font-bold text-[#2d3748]">
                    {criticalPage}/{criticalTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={criticalPage >= criticalTotalPages || isFetching}
                    onClick={() => setCriticalPage((p) => p + 1)}
                    className="text-xs font-semibold text-[#005390] hover:text-[#004274] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Resident Vitals Risk */}
            <div className="rounded-[24px] border border-white/80 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-[#fdeef2] text-[#d9486c]">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-[#2d3748]">Resident Vitals Risk</h2>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Continuous Monitoring
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Real-time vital tracking and threshold breach monitoring across all resident rooms.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Occupancy Tab */}
      {activeTab === 'occupancy' && (
        <div className="rounded-[24px] border border-white/80 bg-white/70 p-6 shadow-lg backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#2d3748]">Facility Occupancy Details</h3>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
              {isLoading ? '...' : `${stats?.occupancy?.occupancyRate ?? 0}% Occupancy Rate`}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="rounded-2xl bg-[#005390]/10 p-5">
              {isLoading ? (
                <Skeleton className="h-8 w-20 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-[#005390]">{stats?.occupancy?.totalRooms ?? 0}</p>
              )}
              <p className="text-xs font-medium text-gray-600 mt-1">Total Rooms</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/80 p-5">
              {isLoading ? (
                <Skeleton className="h-8 w-20 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-emerald-600">{stats?.occupancy?.occupiedRooms ?? 0}</p>
              )}
              <p className="text-xs font-medium text-gray-600 mt-1">Occupied Rooms</p>
            </div>
            <div className="rounded-2xl bg-[#005390]/10 p-5">
              {isLoading ? (
                <Skeleton className="h-8 w-20 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-[#005390]">{stats?.occupancy?.availableVacancies ?? 0}</p>
              )}
              <p className="text-xs font-medium text-gray-600 mt-1">Available Vacancies</p>
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="rounded-[24px] border border-white/80 bg-white/70 p-6 shadow-lg backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#2d3748]">Monthly Revenue & Billing Summary</h3>
            <span className="text-xs font-semibold bg-[#005390]/10 text-[#005390] border border-[#005390]/20 px-3 py-1 rounded-full">
              Current Month
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="rounded-2xl bg-emerald-50/80 p-5">
              {isLoading ? (
                <Skeleton className="h-8 w-32 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-emerald-600">
                  ₹ {(stats?.billing?.totalCollected ?? 0).toLocaleString('en-IN')}
                </p>
              )}
              <p className="text-xs font-medium text-gray-600 mt-1">Total Collected</p>
            </div>
            <div className="rounded-2xl bg-amber-50/80 p-5">
              {isLoading ? (
                <Skeleton className="h-8 w-32 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-amber-600">
                  ₹ {(stats?.billing?.pendingAmount ?? 0).toLocaleString('en-IN')}
                </p>
              )}
              <p className="text-xs font-medium text-gray-600 mt-1">Pending Invoices</p>
            </div>
            <div className="rounded-2xl bg-[#005390]/10 p-5">
              {isLoading ? (
                <Skeleton className="h-8 w-20 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-[#005390]">{stats?.billing?.collectionEfficiency ?? 0}%</p>
              )}
              <p className="text-xs font-medium text-gray-600 mt-1">Collection Efficiency</p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="rounded-[24px] border border-white/80 bg-white/70 p-6 shadow-lg backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#2d3748]">Inventory Stock Status</h3>
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              {isLoading ? '...' : `${stats?.inventory?.stockReorderAlerts ?? 0} Low Stock Items`}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="rounded-2xl bg-[#005390]/10 p-5">
              {isLoading ? (
                <Skeleton className="h-8 w-20 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-[#005390]">{stats?.inventory?.totalStockedItems ?? 0}</p>
              )}
              <p className="text-xs font-medium text-gray-600 mt-1">Total Stocked Items</p>
            </div>
            <div className="rounded-2xl bg-amber-50/80 p-5">
              {isLoading ? (
                <Skeleton className="h-8 w-20 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-amber-600">{stats?.inventory?.stockReorderAlerts ?? 0}</p>
              )}
              <p className="text-xs font-medium text-gray-600 mt-1">Stock Reorder Alerts</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/80 p-5">
              {isLoading ? (
                <Skeleton className="h-8 w-20 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-emerald-600">{stats?.inventory?.approvedSuppliers ?? 0}</p>
              )}
              <p className="text-xs font-medium text-gray-600 mt-1">Approved Suppliers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
