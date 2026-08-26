import { useState, useRef, useEffect, type ReactNode } from "react";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import {
  LayoutGrid,
  Building2,
  User,
  Users,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
  Calendar,
  UtensilsCrossed,
  Package,
  CreditCard,
  Settings,
  Bell,
  Moon,
  ChevronDown,
  MapPin,
  Globe,
  Check,
  LogOut,
  UserCircle,
} from "lucide-react";
import { useLocation } from "../../context/LocationContext";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { selectedLocationId, setSelectedLocationId, properties } = useLocation();

  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const userJson = localStorage.getItem("ra_user");
  const user = userJson ? JSON.parse(userJson) : { email: "admin@relyactive.com", role: "SUPERADMIN" };

  const handleLogout = () => {
    localStorage.removeItem("ra_token");
    localStorage.removeItem("ra_user");
    navigate("/login");
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutGrid },
    { label: "Resident", path: "/residents", icon: User },
    { label: "Employees", path: "/employees", icon: Users },
    { label: "Medical", path: "/medical", icon: Stethoscope },
    { label: "Rooms & Occupancy", path: "/properties", icon: Building2 },
    { label: "Inventory", path: "/inventory", icon: Package },
    { label: "Shift & Roster", path: "/roster", icon: ClipboardList },
    { label: "Events", path: "/events", icon: Calendar },
    { label: "F&B", path: "/food-beverage", icon: UtensilsCrossed },
    { label: "Visitors", path: "/visitors", icon: ShieldCheck },
    { label: "Billing", path: "/billing", icon: CreditCard },
  ];

  // Get active location label
  const activeLocationTitle =
    selectedLocationId === "ALL"
      ? "All Locations (Consolidated)"
      : properties.find((p) => p.id === selectedLocationId)?.title || "Select Location";

  return (
    <div className="min-h-screen flex flex-col bg-[#dce1e7] text-slate-800">
      {/* Top Global Header Bar (1:1 with dev.relyassist.reverely.ai) */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-slate-300/40 bg-[#dce1e7]/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
        {/* Left: Brand Logo */}
        <div 
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl rely-logo-gradient flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-lg tracking-tighter" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              R
            </span>
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 leading-none tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              RELY ASSIST
            </h1>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* Custom Styled Location Dropdown Card */}
          <div className="relative" ref={locationDropdownRef}>
            <button
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className="flex items-center gap-2 bg-white/90 text-xs font-extrabold text-slate-800 py-1.5 px-3.5 rounded-full border border-slate-300 shadow-sm hover:border-slate-400 hover:bg-white transition-all cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#F26A2E] shrink-0" />
              <span className="max-w-[160px] truncate">{activeLocationTitle}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isLocationOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Custom Location Popup Menu */}
            {isLocationOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                    Location Scope
                  </span>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    {properties.length + 1} Available
                  </span>
                </div>

                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {/* Option 1: Consolidated View */}
                  <button
                    onClick={() => {
                      setSelectedLocationId("ALL");
                      setIsLocationOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all ${
                      selectedLocationId === "ALL"
                        ? "bg-[#1E3A8A]/10 text-[#1E3A8A] font-extrabold"
                        : "hover:bg-slate-100/80 text-slate-700 font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg ${selectedLocationId === "ALL" ? "bg-[#1E3A8A] text-white" : "bg-slate-100 text-slate-500"}`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs leading-none font-extrabold">All Locations</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Consolidated Enterprise View</p>
                      </div>
                    </div>
                    {selectedLocationId === "ALL" && <Check className="w-4 h-4 text-[#1E3A8A] shrink-0 ml-2" />}
                  </button>

                  {/* Property Branches */}
                  {properties.map((prop) => {
                    const isSelected = selectedLocationId === prop.id;
                    return (
                      <button
                        key={prop.id}
                        onClick={() => {
                          setSelectedLocationId(prop.id);
                          setIsLocationOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all ${
                          isSelected
                            ? "bg-[#1E3A8A]/10 text-[#1E3A8A] font-extrabold"
                            : "hover:bg-slate-100/80 text-slate-700 font-semibold"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg ${isSelected ? "bg-[#1E3A8A] text-white" : "bg-slate-100 text-slate-500"}`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs leading-none font-extrabold">{prop.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {prop.locality ? `${prop.locality}, ${prop.city}` : prop.city || "Property Location"}
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#1E3A8A] shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-500 shadow-sm border border-slate-200/80 transition-colors">
            <Moon className="w-4 h-4" />
          </button>

          {/* Notifications Bell */}
          <button className="relative p-2 rounded-full bg-white/80 hover:bg-white text-slate-500 shadow-sm border border-slate-200/80 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-extrabold px-1 rounded-full border border-white">
              73+
            </span>
          </button>

          {/* User Profile Avatar with Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              title={user.email}
              className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white hover:scale-105 transition-transform"
            >
              {user.email?.[0]?.toUpperCase() || "R"}
            </button>

            {/* Profile Dropdown Menu (1:1 Rely Assist Pattern) */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white/98 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 z-50">
                {/* User Info Header */}
                <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                  <p className="text-xs font-extrabold text-slate-800 truncate">{user.email}</p>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 inline-block mt-1">
                    {user.role || "ADMIN"}
                  </span>
                </div>

                {/* Profile Option */}
                <button
                  onClick={() => { navigate("/settings"); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  <span>Profile</span>
                </button>

                {/* Global Settings Option */}
                <button
                  onClick={() => { navigate("/settings"); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Global Settings</span>
                </button>

                {/* Divider */}
                <div className="my-1 border-t border-slate-100" />

                {/* Log out */}
                <button
                  onClick={() => { handleLogout(); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Shell with Floating Sidebar Panel */}
      <div className="flex-1 flex min-h-0 p-4 gap-5">
        {/* 1:1 Rely CRM Style Sidebar Panel */}
        <aside className="w-24 bg-[#e5e9f0]/90 backdrop-blur-xl rounded-[2.2rem] py-4 px-2 border border-white/90 shadow-xl hidden md:flex flex-col justify-between sticky top-20 h-[calc(100vh-6rem)] z-30 shrink-0 overflow-hidden">
          {/* Scrollable Nav Item Cards List */}
          <div className="w-full flex-1 overflow-y-auto space-y-3 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                routerLocation.pathname === item.path ||
                (item.path !== "/dashboard" && routerLocation.pathname.startsWith(item.path));

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
                >
                  {/* Square Icon Tile */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-white text-[#0088FF] shadow-md scale-105"
                        : "bg-white/60 text-slate-500 hover:bg-white hover:text-slate-800 shadow-xs border border-white/60"
                    }`}
                  >
                    <Icon className="w-6 h-6 stroke-[2]" />
                  </div>

                  {/* Label underneath */}
                  <span
                    className={`text-[11px] leading-tight text-center tracking-tight truncate max-w-full px-0.5 ${
                      isActive ? "font-bold text-[#0088FF]" : "font-semibold text-slate-600 group-hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Settings & Chevron Actions */}
          <div className="w-full pt-2 mt-2 border-t border-slate-300/60 flex flex-col items-center gap-2 shrink-0">
            {/* Settings Tile */}
            <button
              onClick={() => navigate("/settings")}
              className="w-full flex flex-col items-center justify-center gap-1 group cursor-pointer"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  routerLocation.pathname.startsWith("/settings")
                    ? "bg-white text-[#0088FF] shadow-md scale-105"
                    : "bg-white/60 text-slate-500 hover:bg-white hover:text-slate-800 shadow-xs"
                }`}
              >
                <Settings className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] leading-none text-center ${
                  routerLocation.pathname.startsWith("/settings") ? "font-bold text-[#0088FF]" : "font-semibold text-slate-600"
                }`}
              >
                Settings
              </span>
            </button>

            {/* Scroll Indicator Arrow Button (1:1 with Rely CRM) */}
            <div className="w-7 h-7 rounded-full bg-white/90 shadow-sm border border-slate-200/80 flex items-center justify-center text-slate-400 mt-0.5">
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </aside>

        {/* Main Workspace Content Canvas */}
        <main className="flex-1 min-w-0 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
