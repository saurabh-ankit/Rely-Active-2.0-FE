import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Heart,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Package,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'occupancy' | 'billing' | 'inventory'>('dashboard')

  const criticalResidents = [
    { name: 'Mohan Das', room: 'Room room b', status: 'Patient in critical condition' },
    { name: 'Varun kumar Jha', room: 'Room R1 - Bed 1', status: 'Patient in critical condition' },
    { name: 'Snehlata Kumari', room: 'Room 130 - ICU - Bed A', status: 'Patient in critical condition' },
    { name: 'Rahul Kumar', room: 'Room 190 - ICU - Bed A', status: 'Patient in critical condition' },
    { name: 'Mousa Qadri', room: 'Room S - Bed 1', status: 'Patient in critical condition' },
    { name: 'Kunal Kumar', room: 'Room Premium 3', status: 'Patient in critical condition' },
  ]

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#2d3748]">Dashboard</h1>
      </div>

      {/* Top Tabs Bar */}
      <div className="flex w-full overflow-x-auto gap-2 rounded-[20px] bg-[#dce0e4] p-1.5 border border-white/60 shadow-inner no-scrollbar">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'dashboard' ? 'bg-[#005390] text-white shadow-md' : 'text-[#5c6370] hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('occupancy')}
          className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'occupancy' ? 'bg-[#005390] text-white shadow-md' : 'text-[#5c6370] hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Occupancy</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'billing' ? 'bg-[#005390] text-white shadow-md' : 'text-[#5c6370] hover:text-slate-900'
          }`}
        >
          <IndianRupee className="h-4 w-4" />
          <span>Billing</span>
        </button>

        <button
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
                <span className="text-3xl font-extrabold text-[#1e8252]">48</span>
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
                  <p className="text-xl font-bold text-[#2d3748] mt-0.5">0</p>
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
                  <p className="text-xl font-bold text-[#2d3748] mt-0.5">0</p>
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
                  <p className="text-xl font-bold text-[#1e8252] mt-0.5">50</p>
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
                  <p className="text-xl font-bold text-[#d67e2a] mt-0.5">6</p>
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
                  <p className="text-xl font-bold text-[#005390] mt-0.5">72</p>
                  <p className="text-[10px] text-gray-400">Registered, pre-assessed & skipped</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">TOTAL DISCHARGED</span>
                  <p className="text-xl font-bold text-[#d9486c] mt-0.5">19</p>
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
                  <p className="text-xl font-bold text-[#2d3748] mt-0.5">0</p>
                  <p className="text-[10px] text-gray-400">Not admitted</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-[#f0f2f5] p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                    HOSPITALIZATION PENDING
                  </span>
                  <p className="text-xl font-bold text-[#2d3748] mt-0.5">0</p>
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
                  19 Residents
                </span>
              </div>

              {/* Resident Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {criticalResidents.map((res, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-[#fcdbe2] bg-[#fff5f7] p-3.5 flex flex-col justify-between transition-all hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-[#d9486c]" />
                          <span className="text-xs font-bold text-[#2d3748]">{res.name}</span>
                        </div>
                        <span className="text-[9px] font-extrabold text-[#d9486c] tracking-wide uppercase">
                          CRITICAL
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">{res.room}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] font-semibold text-[#d9486c]">{res.status}</span>
                      <button className="flex size-6 items-center justify-center rounded-full bg-white text-gray-400 hover:text-gray-700 shadow-sm">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span>Showing 1 to 6 of 19</span>
                <div className="flex items-center gap-3">
                  <button className="text-xs font-semibold text-gray-400 hover:text-gray-700">&lt; Prev</button>
                  <span className="font-bold text-[#2d3748]">1/4</span>
                  <button className="text-xs font-semibold text-[#005390] hover:text-[#004274]">Next &gt;</button>
                </div>
              </div>
            </div>

            {/* Card 2: Resident Vitals Risk */}
            <div className="rounded-[24px] border border-white/80 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#fdeef2] text-[#d9486c]">
                  <Activity className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-[#2d3748]">Resident Vitals Risk</h2>
              </div>
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
              90.1% Occupancy Rate
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="rounded-2xl bg-[#005390]/10 p-5">
              <p className="text-3xl font-extrabold text-[#005390]">160</p>
              <p className="text-xs font-medium text-gray-600">Total Rooms</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/80 p-5">
              <p className="text-3xl font-extrabold text-emerald-600">144</p>
              <p className="text-xs font-medium text-gray-600">Occupied Rooms</p>
            </div>
            <div className="rounded-2xl bg-[#005390]/10 p-5">
              <p className="text-3xl font-extrabold text-[#005390]">16</p>
              <p className="text-xs font-medium text-gray-600">Available Vacancies</p>
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
              <p className="text-3xl font-extrabold text-emerald-600">₹ 4,85,000</p>
              <p className="text-xs font-medium text-gray-600">Total Collected</p>
            </div>
            <div className="rounded-2xl bg-amber-50/80 p-5">
              <p className="text-3xl font-extrabold text-amber-600">₹ 62,500</p>
              <p className="text-xs font-medium text-gray-600">Pending Invoices</p>
            </div>
            <div className="rounded-2xl bg-[#005390]/10 p-5">
              <p className="text-3xl font-extrabold text-[#005390]">92%</p>
              <p className="text-xs font-medium text-gray-600">Collection Efficiency</p>
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
              3 Low Stock Items
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="rounded-2xl bg-[#005390]/10 p-5">
              <p className="text-3xl font-extrabold text-[#005390]">540</p>
              <p className="text-xs font-medium text-gray-600">Total Stocked Items</p>
            </div>
            <div className="rounded-2xl bg-amber-50/80 p-5">
              <p className="text-3xl font-extrabold text-amber-600">3</p>
              <p className="text-xs font-medium text-gray-600">Stock Reorder Alerts</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/80 p-5">
              <p className="text-3xl font-extrabold text-emerald-600">12</p>
              <p className="text-xs font-medium text-gray-600">Approved Suppliers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
