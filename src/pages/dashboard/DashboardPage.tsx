import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Users,
  IndianRupee,
  Package,
  Heart,
  Building2,
  Bed,
  Wrench,
  BookmarkCheck,
  Percent,
  ClipboardList,
  ReceiptText,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "../../context/LocationContext";
import api from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardMetrics {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  reservedUnits: number;
  underRepairUnits: number;
  occupancyRate: number;
  activeResidents: number;
  careTasksToday: number;
  pendingInvoices: number;
}

interface PropertyBreakdown {
  id: string;
  title: string;
  locality: string;
  city: string;
  totalUnits: number;
  occupiedUnits: number;
}

interface DashboardData {
  scope: "ALL_LOCATIONS" | "SINGLE_LOCATION";
  metrics: DashboardMetrics;
  propertyBreakdown: PropertyBreakdown[];
}

// ─── Tab configuration ────────────────────────────────────────────────────────
const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "occupancy", label: "Occupancy", icon: Users },
  { key: "billing", label: "Billing", icon: IndianRupee },
  { key: "inventory", label: "Inventory", icon: Package },
] as const;
type TabKey = typeof TABS[number]["key"];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ElementType;
  color: "blue" | "emerald" | "amber" | "rose" | "purple" | "indigo";
  loading?: boolean;
}) {
  const colorMap = {
    indigo: { bg: "bg-indigo-50/70", text: "text-indigo-600", border: "border-indigo-200/80", num: "text-indigo-950" },
    blue: { bg: "bg-blue-50/70", text: "text-blue-600", border: "border-blue-200/80", num: "text-blue-950" },
    emerald: { bg: "bg-emerald-50/70", text: "text-emerald-600", border: "border-emerald-200/80", num: "text-emerald-950" },
    amber: { bg: "bg-amber-50/70", text: "text-amber-600", border: "border-amber-200/80", num: "text-amber-950" },
    rose: { bg: "bg-rose-50/70", text: "text-rose-600", border: "border-rose-200/80", num: "text-rose-950" },
    purple: { bg: "bg-purple-50/70", text: "text-purple-600", border: "border-purple-200/80", num: "text-purple-950" },
  };
  const c = colorMap[color];

  return (
    <div className={`bg-white/90 backdrop-blur-md rounded-2xl border ${c.border} p-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all`}>
      <div className="min-w-0 pr-2">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{label}</p>
        {loading ? (
          <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse mt-2" />
        ) : (
          <p className={`text-3xl font-extrabold mt-1 tracking-tight ${c.num}`} style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            {value}
          </p>
        )}
        {sublabel && <p className="text-[11px] font-medium text-slate-500 mt-1">{sublabel}</p>}
      </div>
      <div className={`p-3 rounded-2xl ${c.bg} ${c.text} border ${c.border} shrink-0 shadow-xs`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

// ─── Property Card ────────────────────────────────────────────────────────────
function PropertyCard({ prop }: { prop: PropertyBreakdown }) {
  const occ = prop.totalUnits > 0 ? Math.round((prop.occupiedUnits / prop.totalUnits) * 100) : 0;
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-extrabold text-slate-900 text-base leading-snug truncate" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            {prop.title}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{prop.locality}, {prop.city}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
          occ >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : occ >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"
        }`}>
          {occ}% occupied
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${occ >= 80 ? "bg-emerald-500" : occ >= 50 ? "bg-amber-500" : "bg-slate-400"}`}
          style={{ width: `${occ}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-1">
        <span>🏠 {prop.occupiedUnits} occupied</span>
        <span className="text-slate-400">⚪ {prop.totalUnits - prop.occupiedUnits} available</span>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-white/50 backdrop-blur-sm rounded-2xl border border-dashed border-slate-200">
      <div className="p-4 rounded-2xl bg-slate-100 text-slate-400 mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <p className="font-bold text-slate-800 text-sm">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { selectedLocationId } = useLocation();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/properties/stats/dashboard?propertyId=${selectedLocationId}`);
        setData(res.data.data);
      } catch (err: any) {
        setError("Failed to load dashboard data. Please try again.");
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedLocationId]);

  const m = data?.metrics;

  return (
    <div className="p-6 md:p-8 flex flex-col min-h-screen space-y-6">
      {/* ─── Dashboard Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/80 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Executive Dashboard
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Real-time senior living facility metrics, resident room occupancy, and care operations.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === key
                  ? "bg-[#1E3A8A] text-white shadow-sm"
                  : "bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Error Banner ────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ─── OVERVIEW TAB ────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Scope Badge Bar */}
          {data && (
            <div className="flex items-center justify-between bg-white/70 backdrop-blur-md rounded-2xl p-3 px-4 border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                  data.scope === "ALL_LOCATIONS"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {data.scope === "ALL_LOCATIONS" ? "📍 Consolidated — All Locations Scope" : "📍 Single Property View"}
                </span>
                <span className="text-xs text-slate-600 font-semibold">
                  {data.metrics.totalProperties} propert{data.metrics.totalProperties === 1 ? "y" : "ies"} · {data.metrics.totalUnits} total rooms
                </span>
              </div>
            </div>
          )}

          {/* ── Core KPI Grid (4-col) ──────────────────────────────── */}
          <section>
            <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-emerald-500" /> Resident & Occupancy Metrics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Active Residents"
                value={m ? m.occupiedUnits : "—"}
                sublabel="Currently checked in"
                icon={Users}
                color="emerald"
                loading={loading}
              />
              <StatCard
                label="Total Rooms"
                value={m ? m.totalUnits : "—"}
                sublabel="Across all properties"
                icon={Bed}
                color="indigo"
                loading={loading}
              />
              <StatCard
                label="Vacant Rooms"
                value={m ? m.vacantUnits : "—"}
                sublabel="Ready for admission"
                icon={BookmarkCheck}
                color="blue"
                loading={loading}
              />
              <StatCard
                label="Occupancy Rate"
                value={m ? `${m.occupancyRate}%` : "—"}
                sublabel="Overall fill rate"
                icon={Percent}
                color="emerald"
                loading={loading}
              />
              <StatCard
                label="Reserved"
                value={m ? m.reservedUnits : "—"}
                sublabel="Booking confirmed"
                icon={ClipboardList}
                color="amber"
                loading={loading}
              />
              <StatCard
                label="Under Maintenance"
                value={m ? m.underRepairUnits : "—"}
                sublabel="Rooms under repair"
                icon={Wrench}
                color="rose"
                loading={loading}
              />
              <StatCard
                label="Care Tasks Today"
                value={m ? m.careTasksToday : "—"}
                sublabel="Scheduled for today"
                icon={ClipboardList}
                color="blue"
                loading={loading}
              />
              <StatCard
                label="Pending Invoices"
                value={m ? m.pendingInvoices : "—"}
                sublabel="Awaiting settlement"
                icon={ReceiptText}
                color="amber"
                loading={loading}
              />
            </div>
          </section>

          {/* ── Property Breakdown ────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-blue-500" /> Facility Occupancy Breakdown
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : data?.propertyBreakdown && data.propertyBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.propertyBreakdown.map((prop) => (
                  <PropertyCard key={prop.id} prop={prop} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No properties configured"
                subtitle="Add your first property to start tracking occupancy and resident metrics."
              />
            )}
          </section>
        </div>
      )}

      {/* ─── OCCUPANCY TAB ───────────────────────────────────────────── */}
      {activeTab === "occupancy" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Occupied" value={m ? m.occupiedUnits : "—"} icon={Users} color="emerald" loading={loading} />
            <StatCard label="Vacant" value={m ? m.vacantUnits : "—"} icon={BookmarkCheck} color="blue" loading={loading} />
            <StatCard label="Reserved" value={m ? m.reservedUnits : "—"} icon={ClipboardList} color="amber" loading={loading} />
            <StatCard label="Under Repair" value={m ? m.underRepairUnits : "—"} icon={Wrench} color="rose" loading={loading} />
          </div>
          {loading ? (
            <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
          ) : data?.propertyBreakdown && data.propertyBreakdown.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.propertyBreakdown.map((prop) => (
                <PropertyCard key={prop.id} prop={prop} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="No occupancy data" subtitle="No properties with units found." />
          )}
        </div>
      )}

      {/* ─── BILLING TAB ─────────────────────────────────────────────── */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <StatCard label="Pending Invoices" value={m ? m.pendingInvoices : "—"} sublabel="Awaiting payment" icon={ReceiptText} color="amber" loading={loading} />
            <StatCard label="Active Residents" value={m ? m.occupiedUnits : "—"} sublabel="Billable residents" icon={Users} color="blue" loading={loading} />
          </div>
          <EmptyState
            icon={IndianRupee}
            title="Billing module coming soon"
            subtitle="Detailed invoice tracking, payment history, and demand letters will appear here."
          />
        </div>
      )}

      {/* ─── INVENTORY TAB ───────────────────────────────────────────── */}
      {activeTab === "inventory" && (
        <EmptyState
          icon={Package}
          title="Inventory module coming soon"
          subtitle="Stock levels, item master, and consumption tracking will appear here once inventory data is available."
        />
      )}
    </div>
  );
}
