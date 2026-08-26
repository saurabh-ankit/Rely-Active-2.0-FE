import { useLocation } from "../context/LocationContext";

export default function LocationSwitcher() {
  const { selectedLocationId, setSelectedLocationId, properties, loadingProperties } = useLocation();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        <span>📍</span> Location:
      </span>
      <select
        value={selectedLocationId}
        onChange={(e) => setSelectedLocationId(e.target.value)}
        disabled={loadingProperties}
        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/80 border border-slate-300 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <option value="ALL">🌐 All Locations (Consolidated View)</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            🏢 {p.title} ({p.locality}, {p.city})
          </option>
        ))}
      </select>
    </div>
  );
}
