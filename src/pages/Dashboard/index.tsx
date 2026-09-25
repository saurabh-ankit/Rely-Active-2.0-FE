import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock,
  FileText,
  Heart,
  IndianRupee,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Truck,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  Wallet,
  Wrench,
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
            <div className="rounded-2xl border border-[#c6f0d8] bg-[#e8f8f0] p-4">
              <div className="flex items-center justify-between">
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

              {/* Integrated Acuity Mini-Pills */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#c6f0d8]/80 text-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acuity:</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <span className="size-1.5 rounded-full bg-emerald-600" />
                  Stable: {stats?.residentStatus?.careLevelBreakdown?.stable ?? 0}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  <span className="size-1.5 rounded-full bg-amber-600" />
                  Moderate: {stats?.residentStatus?.careLevelBreakdown?.moderate ?? 0}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                  <span className="size-1.5 rounded-full bg-rose-600" />
                  Critical: {stats?.residentStatus?.careLevelBreakdown?.critical ?? 0}
                </span>
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
                <div className="flex flex-col items-center justify-center py-5 text-center text-gray-400">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-1.5">
                    <CheckCircle2 className="h-5 w-5" />
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

              {/* Pagination Footer (only when records exist) */}
              {criticalTotal > 0 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>
                    Showing {startIdx} to {endIdx} of {criticalTotal}
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
              )}
            </div>

            {/* Card 2: Resident Vitals Risk */}
            <div className="rounded-[24px] border border-white/80 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
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
              <div className="mt-3 p-3 rounded-2xl bg-[#eefaf3] border border-[#c6f0d8] flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-800">All Vitals Monitored</p>
                  <p className="text-[10px] text-emerald-700/80 mt-0.5">
                    No critical vital threshold breaches detected across active resident rooms.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Care Tasks & Maintenance in Right Column to balance height */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Care & Nursing Tasks */}
              <div className="rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-lg backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                        <CheckSquare className="h-3.5 w-3.5" />
                      </div>
                      <h2 className="text-xs font-bold text-[#2d3748]">Care Tasks</h2>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      Today
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-xl bg-[#f0f2f5] p-2 text-center">
                      <span className="text-[9px] font-bold uppercase text-gray-500">Completed</span>
                      {isLoading ? (
                        <Skeleton className="h-5 w-8 mx-auto mt-1" />
                      ) : (
                        <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                          {stats?.careTasks?.completedToday ?? 0}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl bg-[#f0f2f5] p-2 text-center">
                      <span className="text-[9px] font-bold uppercase text-gray-500">Active</span>
                      {isLoading ? (
                        <Skeleton className="h-5 w-8 mx-auto mt-1" />
                      ) : (
                        <p className="text-base font-extrabold text-[#005390] mt-0.5">
                          {stats?.careTasks?.activeAssignments ?? 0}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Routines</span>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/medical?section=care&tab=tasks')}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#005390] hover:underline"
                  >
                    <span>View</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Maintenance & Tickets */}
              <div className="rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-lg backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <Wrench className="h-3.5 w-3.5" />
                      </div>
                      <h2 className="text-xs font-bold text-[#2d3748]">Tickets</h2>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Facility
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mt-3 text-center">
                    <div className="rounded-xl bg-[#f0f2f5] p-1.5">
                      <span className="text-[9px] font-bold uppercase text-gray-500">Open</span>
                      {isLoading ? (
                        <Skeleton className="h-5 w-6 mx-auto mt-1" />
                      ) : (
                        <p className="text-base font-extrabold text-[#2d3748] mt-0.5">{stats?.tickets?.open ?? 0}</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-rose-50/80 border border-rose-100 p-1.5">
                      <span className="text-[9px] font-bold uppercase text-rose-600">Urgent</span>
                      {isLoading ? (
                        <Skeleton className="h-5 w-6 mx-auto mt-1" />
                      ) : (
                        <p className="text-base font-extrabold text-rose-700 mt-0.5">
                          {stats?.tickets?.criticalUrgent ?? 0}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-1.5">
                      <span className="text-[9px] font-bold uppercase text-emerald-600">Done</span>
                      {isLoading ? (
                        <Skeleton className="h-5 w-6 mx-auto mt-1" />
                      ) : (
                        <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                          {stats?.tickets?.resolvedToday ?? 0}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Requests</span>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/tickets')}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#005390] hover:underline"
                  >
                    <span>View</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Occupancy Tab */}
      {activeTab === 'occupancy' && (
        <div className="rounded-[24px] border border-white/80 bg-white/70 p-6 shadow-lg backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#2d3748]">Facility Occupancy & Capacity Management</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time room occupancy, tenant capacity, block structure, and vacancy tracking
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                {isLoading ? '...' : `${stats?.occupancy?.occupancyRate ?? 0}% Occupancy Rate`}
              </span>
              <button
                type="button"
                onClick={() => navigate('/property')}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#005390] hover:bg-[#004273] rounded-full transition-colors shadow-sm"
              >
                <span>Units Directory</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 4-KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Rooms / Capacity */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Total Units Capacity</span>
                <div className="p-2 rounded-xl bg-blue-100/80 text-[#005390]">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-[#005390] mt-2">{stats?.occupancy?.totalRooms ?? 0}</p>
              )}
              <p className="text-[11px] text-gray-500 mt-1">
                {stats?.occupancy?.totalBlocks ?? 0} block{(stats?.occupancy?.totalBlocks ?? 0) === 1 ? '' : 's'} •{' '}
                {stats?.occupancy?.totalFloors ?? 0} floor{(stats?.occupancy?.totalFloors ?? 0) === 1 ? '' : 's'}
              </p>
            </div>

            {/* Occupied Rooms */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Occupied Units</span>
                <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700">
                  <BedDouble className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-emerald-700 mt-2">{stats?.occupancy?.occupiedRooms ?? 0}</p>
              )}
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                {stats?.occupancy?.statusBreakdown?.ownerOccupied ?? 0} owner •{' '}
                {stats?.occupancy?.statusBreakdown?.tenantOccupied ?? 0} tenant
              </p>
            </div>

            {/* Available Vacancies */}
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Available Vacancies</span>
                <div className="p-2 rounded-xl bg-amber-100/80 text-amber-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-amber-600 mt-2">
                  {stats?.occupancy?.availableVacancies ?? 0}
                </p>
              )}
              <p className="text-[11px] text-amber-700 mt-1">
                {stats?.occupancy?.statusBreakdown?.booked
                  ? `${stats.occupancy.statusBreakdown.booked} on hold / booked`
                  : 'Ready for admission'}
              </p>
            </div>

            {/* On-site Residing Residents */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Physically Residing</span>
                <div className="p-2 rounded-xl bg-indigo-100/80 text-indigo-700">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2 rounded" />
              ) : (
                <div className="mt-2">
                  <p className="text-2xl font-extrabold text-indigo-700">{stats?.occupancy?.residingResidents ?? 0}</p>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, stats?.occupancy?.occupancyRate ?? 0))}%` }}
                    />
                  </div>
                </div>
              )}
              <p className="text-[11px] text-gray-500 mt-1">Active community residents</p>
            </div>
          </div>

          {/* Sub-panels: Occupancy Status Breakdown & Unit Configurations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Occupancy Status Breakdown */}
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#005390]" />
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Occupancy Distribution</h4>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/property')}
                  className="text-[11px] font-bold text-[#005390] hover:underline flex items-center gap-1"
                >
                  Manage Units <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-2.5 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Owner</span>
                  <p className="text-lg font-black text-emerald-700 mt-1">
                    {stats?.occupancy?.statusBreakdown?.ownerOccupied ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-2.5 text-center">
                  <span className="text-[10px] font-bold text-blue-800 uppercase">Tenant</span>
                  <p className="text-lg font-black text-[#005390] mt-1">
                    {stats?.occupancy?.statusBreakdown?.tenantOccupied ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-2.5 text-center">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Vacant</span>
                  <p className="text-lg font-black text-amber-700 mt-1">
                    {stats?.occupancy?.statusBreakdown?.vacant ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-2.5 text-center">
                  <span className="text-[10px] font-bold text-purple-800 uppercase">Booked / Hold</span>
                  <p className="text-lg font-black text-purple-700 mt-1">
                    {stats?.occupancy?.statusBreakdown?.booked ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Unit Types Breakdown */}
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Unit Configurations</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/residents')}
                    className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1"
                  >
                    Resident Directory <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {stats?.occupancy?.unitTypeBreakdown && Object.keys(stats.occupancy.unitTypeBreakdown).length > 0 ? (
                    Object.entries(stats.occupancy.unitTypeBreakdown).map(([type, count]) => (
                      <div
                        key={type}
                        className="rounded-xl bg-purple-50/70 border border-purple-100 px-3 py-2 flex items-center gap-2"
                      >
                        <span className="text-xs font-bold text-purple-900">{type}:</span>
                        <span className="text-xs font-black text-purple-700">{count} units</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500">
                      Standard residential units configured
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-gradient-to-r from-[#005390]/5 via-emerald-50/30 to-blue-50/20 border border-gray-200 p-2.5 flex items-center justify-between text-xs text-gray-600">
                <span>
                  Facility occupancy rate:{' '}
                  <strong className="text-[#005390]">{stats?.occupancy?.occupancyRate ?? 0}%</strong>
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Capacity Optimized
                </span>
              </div>
            </div>
          </div>

          {/* Guidance Banner */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#005390] shrink-0" />
              <span>
                Residents assigned to property rooms automatically update physical occupancy and capacity metrics.
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/property')}
              className="font-bold underline hover:text-[#005390] shrink-0 ml-4"
            >
              Explore Property Units &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="rounded-[24px] border border-white/80 bg-white/70 p-6 shadow-lg backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#2d3748]">Monthly Revenue & Billing Summary</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Consolidated invoicing, collections, and recurring subscriptions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-[#005390]/10 text-[#005390] border border-[#005390]/20 px-3 py-1 rounded-full">
                Current Month
              </span>
              <button
                type="button"
                onClick={() => navigate('/admin/billing-management')}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#005390] hover:bg-[#004273] rounded-full transition-colors shadow-sm"
              >
                <span>Billing Console</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 4-KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invoiced */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Total Invoiced</span>
                <div className="p-2 rounded-xl bg-blue-100/80 text-[#005390]">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-28 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-[#005390] mt-2">
                  ₹ {(stats?.billing?.totalBilled ?? 0).toLocaleString('en-IN')}
                </p>
              )}
              <p className="text-[11px] text-gray-500 mt-1">
                {stats?.billing?.totalInvoices ?? 0} invoice{(stats?.billing?.totalInvoices ?? 0) === 1 ? '' : 's'}{' '}
                issued
              </p>
            </div>

            {/* Total Collected */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Total Collected</span>
                <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-28 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-emerald-700 mt-2">
                  ₹ {(stats?.billing?.totalCollected ?? 0).toLocaleString('en-IN')}
                </p>
              )}
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">Realized revenue to date</p>
            </div>

            {/* Pending / Overdue */}
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Outstanding Due</span>
                <div className="p-2 rounded-xl bg-amber-100/80 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-28 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-amber-600 mt-2">
                  ₹ {(stats?.billing?.pendingAmount ?? 0).toLocaleString('en-IN')}
                </p>
              )}
              <p className="text-[11px] text-amber-700 mt-1">
                {stats?.billing?.pendingInvoicesCount ?? 0} pending • ₹{' '}
                {(stats?.billing?.overdueAmount ?? 0).toLocaleString('en-IN')} overdue
              </p>
            </div>

            {/* Collection Efficiency */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Collection Rate</span>
                <div className="p-2 rounded-xl bg-indigo-100/80 text-indigo-700">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2 rounded" />
              ) : (
                <div className="mt-2">
                  <p className="text-2xl font-extrabold text-indigo-700">
                    {stats?.billing?.collectionEfficiency ?? 0}%
                  </p>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, stats?.billing?.collectionEfficiency ?? 0))}%` }}
                    />
                  </div>
                </div>
              )}
              <p className="text-[11px] text-gray-500 mt-1">Efficiency ratio</p>
            </div>
          </div>

          {/* Sub-panels: Invoice Status Pipeline & Subscriptions Recurring Engine */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Invoice Pipeline Card */}
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#005390]" />
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Invoice Status Breakdown</h4>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/billing-management')}
                  className="text-[11px] font-bold text-[#005390] hover:underline flex items-center gap-1"
                >
                  View Invoices <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Paid</span>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  </div>
                  <p className="text-lg font-black text-emerald-700 mt-1">{stats?.billing?.statusCounts?.paid ?? 0}</p>
                </div>
                <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-800 uppercase">Partially Paid</span>
                    <Clock className="h-3 w-3 text-blue-600" />
                  </div>
                  <p className="text-lg font-black text-[#005390] mt-1">
                    {stats?.billing?.statusCounts?.partiallyPaid ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-800 uppercase">Overdue</span>
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                  </div>
                  <p className="text-lg font-black text-rose-700 mt-1">{stats?.billing?.statusCounts?.overdue ?? 0}</p>
                </div>
                <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Sent / Pending</span>
                    <Receipt className="h-3 w-3 text-amber-600" />
                  </div>
                  <p className="text-lg font-black text-amber-700 mt-1">{stats?.billing?.statusCounts?.sent ?? 0}</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-2.5 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-600 uppercase">Draft / Preview</span>
                    <FileText className="h-3 w-3 text-gray-500" />
                  </div>
                  <p className="text-lg font-black text-gray-700 mt-1">{stats?.billing?.statusCounts?.draft ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Recurring Services & Subscriptions Engine */}
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Recurring Subscriptions</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/medical?section=care&tab=packages')}
                    className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1"
                  >
                    Care Packages <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-3">
                    <span className="text-[10px] font-bold text-purple-800 uppercase">Active Care Packages</span>
                    <p className="text-xl font-extrabold text-purple-900 mt-1">
                      {stats?.billing?.subscriptions?.activeCarePackages ?? 0}
                    </p>
                    <p className="text-[10px] text-purple-600 mt-0.5">Enrolled residents</p>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Active Dining Plans</span>
                    <p className="text-xl font-extrabold text-amber-900 mt-1">
                      {stats?.billing?.subscriptions?.activeFnbPackages ?? 0}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Meal subscriptions</p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-gradient-to-r from-[#005390]/5 via-purple-50/30 to-emerald-50/20 border border-gray-200 p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Est. Monthly Subscription MRR</span>
                    <p className="text-base font-extrabold text-[#005390]">
                      ₹ {(stats?.billing?.subscriptions?.monthlyRecurring ?? 0).toLocaleString('en-IN')} / mo
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/80 border border-purple-200 px-2.5 py-1 rounded-full">
                    Recurring Pipeline
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Guidance Banner */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#005390] shrink-0" />
              <span>
                Automated billing runs compile accommodation, subscribed care packages, and F&amp;B meals into monthly
                statements.
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/billing-management')}
              className="font-bold underline hover:text-[#005390] shrink-0 ml-4"
            >
              Run Billing Cycle &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="rounded-[24px] border border-white/80 bg-white/70 p-6 shadow-lg backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#2d3748]">Inventory Stock & Supply Chain Operations</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time stock levels, low-stock reorder triggers, purchase orders, and supplier network
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  (stats?.inventory?.stockReorderAlerts ?? 0) > 0
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {isLoading ? '...' : `${stats?.inventory?.stockReorderAlerts ?? 0} Low Stock Alerts`}
              </span>
              <button
                type="button"
                onClick={() => navigate('/admin/inventory')}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#005390] hover:bg-[#004273] rounded-full transition-colors shadow-sm"
              >
                <span>Inventory Console</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 4-KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Catalog Items */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Cataloged Items</span>
                <div className="p-2 rounded-xl bg-blue-100/80 text-[#005390]">
                  <Boxes className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-[#005390] mt-2">
                  {stats?.inventory?.totalStockedItems ?? 0}
                </p>
              )}
              <p className="text-[11px] text-gray-500 mt-1">
                Across {stats?.inventory?.totalCategories ?? 0} item categories
              </p>
            </div>

            {/* Total On-Hand Quantity */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">On-Hand Stock</span>
                <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-emerald-700 mt-2">
                  {(stats?.inventory?.totalQuantityUnits ?? 0).toLocaleString('en-IN')}
                </p>
              )}
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                {stats?.inventory?.inStockItemsCount ?? 0} lines in stock
              </p>
            </div>

            {/* Stock Reorder Alerts */}
            <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Reorder Alerts</span>
                <div className="p-2 rounded-xl bg-rose-100/80 text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-rose-700 mt-2">
                  {stats?.inventory?.stockReorderAlerts ?? 0}
                </p>
              )}
              <p className="text-[11px] text-rose-600 mt-1">Zero or depleted threshold</p>
            </div>

            {/* Approved Suppliers */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Approved Suppliers</span>
                <div className="p-2 rounded-xl bg-indigo-100/80 text-indigo-700">
                  <Truck className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-indigo-700 mt-2">
                  {stats?.inventory?.approvedSuppliers ?? 0}
                </p>
              )}
              <p className="text-[11px] text-gray-500 mt-1">Active vendor network</p>
            </div>
          </div>

          {/* Sub-panels: Procurement & Material Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Procurement / Purchase Orders */}
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#005390]" />
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Procurement Orders</h4>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/inventory')}
                  className="text-[11px] font-bold text-[#005390] hover:underline flex items-center gap-1"
                >
                  Purchase Orders <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3">
                  <span className="text-[10px] font-bold text-blue-800 uppercase">Total Purchase Orders</span>
                  <p className="text-xl font-extrabold text-[#005390] mt-1">
                    {stats?.inventory?.purchaseOrders?.total ?? 0}
                  </p>
                  <p className="text-[10px] text-blue-600 mt-0.5">Facility POs issued</p>
                </div>
                <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Pending Approvals</span>
                  <p className="text-xl font-extrabold text-amber-700 mt-1">
                    {stats?.inventory?.purchaseOrders?.pending ?? 0}
                  </p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Awaiting fulfillment</p>
                </div>
              </div>
            </div>

            {/* Material Movements / Stock Transactions */}
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Stock Transactions</h4>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/inventory')}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  Movement History <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Goods Receipts (GRN)</span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-1">
                    {stats?.inventory?.transactions?.totalReceipts ?? 0}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Received from vendors</p>
                </div>
                <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-3">
                  <span className="text-[10px] font-bold text-purple-800 uppercase">Issues & Dispatches</span>
                  <p className="text-xl font-extrabold text-purple-700 mt-1">
                    {stats?.inventory?.transactions?.totalIssues ?? 0}
                  </p>
                  <p className="text-[10px] text-purple-600 mt-0.5">Care & facility issues</p>
                </div>
              </div>
            </div>
          </div>

          {/* Guidance Banner */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#005390] shrink-0" />
              <span>
                Stock consumed during resident care tasks and medical routines tracks directly against facility
                inventory in real-time.
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/inventory')}
              className="font-bold underline hover:text-[#005390] shrink-0 ml-4"
            >
              Manage Inventory Stock &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
