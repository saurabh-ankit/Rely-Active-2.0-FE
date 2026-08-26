import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Search,
  MapPin,
  Home,
  Users,
  X,
} from "lucide-react";
import api from "../../lib/api";
import { useLocation } from "../../context/LocationContext";

interface PropertyItem {
  id: string;
  title: string;
  propertyType: string[];
  developerName: string;
  constructionStatus: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  units: {
    id: string;
    towerName: string;
    unitNumber: string;
    unitType: string;
    occupancyModel?: "OWNER_OCCUPIED" | "TENANT_RENTED" | "VACANT" | "UNDER_REPAIR";
    occupancyStatus: "VACANT" | "RESERVED" | "OCCUPIED" | "UNDER_REPAIR";
    monthlyRent?: number;
    occupantName?: string;
  }[];
}

export default function PropertiesPage() {
  const navigate = useNavigate();
  const { refreshProperties } = useLocation();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Property Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDeveloper, setNewDeveloper] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLocality, setNewLocality] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await api.get("/properties");
      setProperties(res.data.data || []);
    } catch (err) {
      console.error("Failed to load properties list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAddress || !newCity || !newLocality) {
      setCreateError("Please fill out all required fields.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      await api.post("/properties", {
        title: newTitle,
        developerName: newDeveloper || "Rely Developer",
        constructionStatus: "COMPLETED",
        address: newAddress,
        locality: newLocality,
        city: newCity,
        state: newState || "Telangana",
        pincode: newPincode || "500081",
        country: "India",
        propertyType: ["RETIREMENT_VILLA", "APARTMENT"],
      });
      setShowAddModal(false);
      setNewTitle("");
      setNewAddress("");
      setNewLocality("");
      setNewCity("");
      await fetchProperties();
      await refreshProperties();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create property.");
    } finally {
      setCreating(false);
    }
  };

  // Compute unit metrics across all properties
  const allUnits = properties.flatMap((p) => p.units || []);
  const totalUnits = allUnits.length;
  const ownerOccupiedCount = allUnits.filter(
    (u) => u.occupancyModel === "OWNER_OCCUPIED" || u.occupancyStatus === "OCCUPIED"
  ).length;
  const tenantRentedCount = allUnits.filter((u) => u.occupancyModel === "TENANT_RENTED").length;
  const vacantCount = allUnits.filter(
    (u) => (u.occupancyModel === "VACANT" || !u.occupancyModel) && u.occupancyStatus === "VACANT"
  ).length;

  const filtered = properties.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase()) ||
      p.locality.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen p-6 md:p-10 flex flex-col">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200/80 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Rooms & Occupancy Dashboard
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Operational room availability, unit allocations, owner-occupied flats, and rental leases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/properties/new-unit")}
            className="btn-secondary text-xs font-bold py-3 px-4 flex items-center gap-2 shadow-sm"
          >
            <Home className="w-4 h-4 text-slate-600" />
            <span>+ Add Flat / Suite Asset</span>
          </button>
          <button
            onClick={() => navigate("/properties/new")}
            className="btn-orange text-xs font-bold py-3 px-5 shadow-lg flex items-center gap-2"
          >
            <Building2 className="w-4 h-4 text-white" />
            <span>+ Add Property Facility</span>
          </button>
        </div>
      </header>

      {/* KPI Overview Strip (4 Cards: Total, Owner, Tenant, Vacant) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="glass-card p-5 flex items-center gap-4 border border-slate-200/80">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Units</span>
            <div className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {totalUnits} Units
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Across {properties.length} Facilities</span>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4 border border-emerald-200/80 bg-emerald-50/30">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">🏠 Owner Occupied</span>
            <div className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {ownerOccupiedCount} Units
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">Purchased Flats</span>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4 border border-blue-200/80 bg-blue-50/30">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">🔑 Tenant Rented</span>
            <div className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {tenantRentedCount} Units
            </div>
            <span className="text-[11px] text-blue-600 font-semibold">Monthly Rental Leases</span>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4 border border-slate-200/80">
          <div className="p-3.5 rounded-2xl bg-slate-500/10 text-slate-600">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">⚪ Vacant & Available</span>
            <div className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {vacantCount} Vacant
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Ready for Allotment</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar + Occupancy Type Filter Pills */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by facility name, city or locality..."
            className="field-input pl-10 py-2.5 text-xs"
          />
        </div>

        {/* Occupancy Model Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: "ALL", label: "All Units" },
            { id: "OWNER_OCCUPIED", label: "🏠 Owner Occupied" },
            { id: "TENANT_RENTED", label: "🔑 Tenant Rented" },
            { id: "VACANT", label: "⚪ Vacant" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setOccupancyFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                occupancyFilter === f.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Properties List & Unit Breakdown Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs font-bold text-slate-500">Loading rooms and occupancy details...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-12 text-center rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            No Facilities Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No properties match your current search criteria.
          </p>
          <button
            onClick={() => navigate("/properties/new")}
            className="btn-orange text-xs py-2.5 px-4 font-bold flex items-center gap-2 mx-auto mt-2"
          >
            <Building2 className="w-4 h-4 text-white" />
            <span>+ Add First Property Facility</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {filtered.map((p) => {
            const pUnits = p.units || [];
            const displayUnits = pUnits.filter((u) => {
              if (occupancyFilter === "ALL") return true;
              if (occupancyFilter === "OWNER_OCCUPIED") return u.occupancyModel === "OWNER_OCCUPIED" || u.occupancyStatus === "OCCUPIED";
              if (occupancyFilter === "TENANT_RENTED") return u.occupancyModel === "TENANT_RENTED";
              if (occupancyFilter === "VACANT") return u.occupancyStatus === "VACANT";
              return true;
            });

            const pOwnerCount = pUnits.filter((u) => u.occupancyModel === "OWNER_OCCUPIED" || u.occupancyStatus === "OCCUPIED").length;
            const pTenantCount = pUnits.filter((u) => u.occupancyModel === "TENANT_RENTED").length;
            const pVacantCount = pUnits.filter((u) => u.occupancyStatus === "VACANT").length;

            return (
              <div key={p.id} className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
                {/* Facility Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-extrabold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                        {p.title}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>{p.address}, {p.locality}, {p.city}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                      🏠 {pOwnerCount} Owner
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/60">
                      🔑 {pTenantCount} Tenant
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                      ⚪ {pVacantCount} Vacant
                    </span>
                  </div>
                </div>

                {/* Units Grid */}
                {displayUnits.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    No units matching "{occupancyFilter}" filter in this facility.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayUnits.map((u) => {
                      const isOwner = u.occupancyModel === "OWNER_OCCUPIED" || u.occupancyStatus === "OCCUPIED";
                      const isTenant = u.occupancyModel === "TENANT_RENTED";

                      return (
                        <div
                          key={u.id}
                          className="bg-white rounded-xl p-4 border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                  {u.towerName}
                                </span>
                                <h4 className="text-base font-extrabold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                                  Unit {u.unitNumber}
                                </h4>
                              </div>

                              {isOwner ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  🏠 Owner Occupied
                                </span>
                              ) : isTenant ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                  🔑 Tenant Rented
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                                  ⚪ Vacant
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 font-medium mb-3">
                              Type: <span className="font-bold text-slate-700">{u.unitType || "Flat"}</span>
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                            <span className="text-[11px] font-semibold text-slate-500">
                              {isTenant && u.monthlyRent ? `₹${u.monthlyRent.toLocaleString()}/mo` : "Standard Unit"}
                            </span>
                            <button
                              onClick={() => navigate("/properties/new-unit")}
                              className="text-[11px] font-bold text-orange-600 hover:text-orange-700"
                            >
                              Manage →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl rely-logo-gradient text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Add Property / Location Centre
                </h2>
                <p className="text-xs text-slate-500">Register a new senior living facility location.</p>
              </div>
            </div>

            <form onSubmit={handleCreateProperty} className="flex flex-col gap-4">
              <div>
                <label className="field-label">Facility Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sunrise Senior Village — Pune Campus"
                  className="field-input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Developer Name</label>
                  <input
                    type="text"
                    value={newDeveloper}
                    onChange={(e) => setNewDeveloper(e.target.value)}
                    placeholder="Sunrise Infrastructure"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Locality / Sector *</label>
                  <input
                    type="text"
                    value={newLocality}
                    onChange={(e) => setNewLocality(e.target.value)}
                    placeholder="Koregaon Park"
                    className="field-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Street Address *</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Plot 18, North Main Road"
                  className="field-input"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="field-label">City *</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Pune"
                    className="field-input"
                    required
                  />
                </div>
                <div>
                  <label className="field-label">State</label>
                  <input
                    type="text"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    placeholder="Maharashtra"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Pincode</label>
                  <input
                    type="text"
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    placeholder="411001"
                    className="field-input"
                  />
                </div>
              </div>

              {createError && (
                <div className="rounded-xl p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs py-2.5 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-orange text-xs py-2.5 px-5 font-bold"
                >
                  {creating ? "Creating..." : "Save Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
