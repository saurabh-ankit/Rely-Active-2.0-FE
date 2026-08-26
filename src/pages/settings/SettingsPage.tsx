import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  ShieldCheck,
  Globe,
  CheckCircle2,
  Save,
  Users,
  MapPin,
  Stethoscope,
  Activity,
  FlaskConical,
  ClipboardList,
  Home,
  UserCheck,
  Package,
  MessageSquare,
  FileText,
  Clock,
  MessageCircle,
  Calendar,
  ChevronRight,
  UserPlus,
  X,
  Mail,
  Phone,
  User,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useLocation } from "../../context/LocationContext";

const companySchema = z.object({
  companyName: z.string().min(2, "Company name required"),
  registrationNumber: z.string().optional(),
  supportEmail: z.string().email("Valid email required"),
  supportPhone: z.string().min(8, "Phone required"),
  timeZone: z.string().default("Asia/Kolkata"),
  currencyCode: z.string().default("INR"),
});
type CompanyFormData = z.infer<typeof companySchema>;

// ─── Setting Section Types ────────────────────────────────────────────────────
interface SettingItem {
  icon: React.ElementType;
  label: string;
  description: string;
  href?: string;
  tabKey?: "GLOBAL" | "COMPANY" | "LOCATIONS" | "SECURITY";
}

interface SettingSection {
  title: string;
  icon: React.ElementType;
  items: SettingItem[];
}

const GLOBAL_SETTINGS_SECTIONS: SettingSection[] = [
  {
    title: "Medical Settings",
    icon: Stethoscope,
    items: [
      {
        icon: ClipboardList,
        label: "ADL",
        description: "Manage master ADL templates, create and configure ADL for resident assignments",
      },
      {
        icon: Activity,
        label: "Vital Settings",
        description: "Configure vital thresholds and monitoring parameters",
      },
      {
        icon: FlaskConical,
        label: "Lab Report Settings",
        description: "Manage lab report templates and clinical parameters",
      },
    ],
  },
  {
    title: "Operation Settings",
    icon: Building2,
    items: [
      {
        icon: Building2,
        label: "Property & Building Structure Setup",
        description: "Configure multi-building structures, towers, floors, unit templates and facility setup",
        href: "/properties/new",
      },
      {
        icon: ClipboardList,
        label: "Care Tasks",
        description: "Manage system-wide care tasks and service features",
      },
      {
        icon: Home,
        label: "Room Features",
        description: "Configure room amenities and facility features",
      },
      {
        icon: UserCheck,
        label: "Employees",
        description: "Manage global employee directory and staff profiles",
      },
      {
        icon: Users,
        label: "Global Residents",
        description: "Search and manage discharged residents across all locations",
      },
      {
        icon: Package,
        label: "Inventory",
        description: "Manage global stock levels and item master",
      },
      {
        icon: MessageSquare,
        label: "Feedback Forms",
        description: "Manage feedback templates and survey questions",
      },
      {
        icon: FileText,
        label: "Resident Document Templates",
        description: "Manage document templates for resident onboarding",
      },
      {
        icon: ShieldCheck,
        label: "Resident Consent Templates",
        description: "Manage consent form templates and legal documents",
      },
      {
        icon: Clock,
        label: "Resident Daily Routine Templates",
        description: "Configure daily routine fields and schedules",
      },
      {
        icon: MessageCircle,
        label: "WhatsApp Manager",
        description: "Manage and view WhatsApp conversations and chat history",
      },
      {
        icon: Calendar,
        label: "Roster Settings",
        description: "Configure shift access control buffers, pre-shift and post-shift entry windows",
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"GLOBAL" | "COMPANY" | "LOCATIONS" | "SECURITY">("GLOBAL");
  const { properties } = useLocation();

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // RBAC User & Role State
  const [users, setUsers] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);

  const [onboardForm, setOnboardForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    role: "PROPERTY_MANAGER",
    propertyIds: [] as string[],
  });
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState("");
  const [onboardError, setOnboardError] = useState("");

  // Custom Role Form State
  const [roleForm, setRoleForm] = useState({
    name: "",
    code: "",
    description: "",
    permissions: ["property.view"] as string[],
  });
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState("");
  const [roleError, setRoleError] = useState("");

  const AVAILABLE_PERMISSIONS = [
    { key: "property.view", label: "View Properties & Buildings", category: "Property" },
    { key: "property.update", label: "Manage Facility Setup", category: "Property" },
    { key: "resident.view", label: "View Resident Profiles", category: "Resident" },
    { key: "resident.manage", label: "Admit & Manage Residents", category: "Resident" },
    { key: "care.task.execute", label: "Execute Care Tasks & Vitals", category: "Medical Care" },
    { key: "roster.view", label: "View Duty Rosters", category: "Operations" },
    { key: "roster.manage", label: "Manage Staff Shifts & Rosters", category: "Operations" },
    { key: "billing.view", label: "View Rent Invoices & Billing", category: "Finance" },
    { key: "billing.manage", label: "Manage Invoicing & Collections", category: "Finance" },
    { key: "user.view", label: "View Staff Directory", category: "Administration" },
    { key: "user.manage", label: "Onboard Staff & Assign Scopes", category: "Administration" },
    { key: "visitor.manage", label: "Manage Visitor & Gate Access", category: "Security" },
  ];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema) as any,
  });

  // Fetch Users & Dynamic Roles from DB when SECURITY tab is active
  const fetchUsersAndRoles = async () => {
    setLoadingUsers(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get("/users"),
        api.get("/users/roles"),
      ]);
      setUsers(usersRes.data.data || []);
      const dbRoles = Array.isArray(rolesRes.data.data) ? rolesRes.data.data : [];
      setRolesList(dbRoles);
      if (dbRoles.length > 0 && !onboardForm.role) {
        setOnboardForm((prev) => ({ ...prev, role: dbRoles[0].code }));
      }
    } catch (err) {
      console.error("Failed to fetch users/roles", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "SECURITY") {
      fetchUsersAndRoles();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const res = await api.get("/company/profile");
        const data = res.data.data;
        if (data) {
          setValue("companyName", data.companyName || "");
          setValue("registrationNumber", data.registrationNumber || "");
          setValue("supportEmail", data.supportEmail || "");
          setValue("supportPhone", data.supportPhone || "");
          setValue("timeZone", data.timeZone || "Asia/Kolkata");
          setValue("currencyCode", data.currencyCode || "INR");
        }
      } catch (err) {
        console.error("Failed to load company profile", err);
      }
    };
    fetchCompanyProfile();
  }, [setValue]);

  const handleOnboardUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardSubmitting(true);
    setOnboardSuccess("");
    setOnboardError("");
    try {
      await api.post("/users", onboardForm);
      setOnboardSuccess("Staff user onboarded successfully.");
      setOnboardForm({ fullName: "", email: "", phoneNumber: "", role: "PROPERTY_MANAGER", propertyIds: [] });
      fetchUsersAndRoles();
      setTimeout(() => {
        setIsOnboardModalOpen(false);
        setOnboardSuccess("");
      }, 1200);
    } catch (err: any) {
      setOnboardError(err.response?.data?.message || "Failed to onboard user.");
    } finally {
      setOnboardSubmitting(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleSubmitting(true);
    setRoleSuccess("");
    setRoleError("");
    try {
      await api.post("/users/roles", roleForm);
      setRoleSuccess("Dynamic custom role created in database!");
      setRoleForm({ name: "", code: "", description: "", permissions: ["property.view"] });
      fetchUsersAndRoles();
      setTimeout(() => {
        setIsCreateRoleModalOpen(false);
        setRoleSuccess("");
      }, 1200);
    } catch (err: any) {
      setRoleError(err.response?.data?.message || "Failed to create dynamic role.");
    } finally {
      setRoleSubmitting(false);
    }
  };

  const roleColorMap: Record<string, string> = {
    SUPERADMIN: "bg-purple-100 text-purple-800 border-purple-200",
    TENANT_ADMIN: "bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20",
    PROPERTY_MANAGER: "bg-blue-100 text-blue-800 border-blue-200",
    CARETAKER: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ACCOUNTANT: "bg-amber-100 text-amber-800 border-amber-200",
    SECURITY_GUARD: "bg-slate-100 text-slate-800 border-slate-200",
  };

  const onSaveCompany = async (data: CompanyFormData) => {
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await api.patch("/company/profile", data);
      setSuccessMsg("Company profile updated successfully.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to update company settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 flex flex-col">
      {/* Settings Tab Pill Navigation */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto">
        {[
          { key: "GLOBAL", label: "Global Settings", icon: Globe },
          { key: "COMPANY", label: "Company Profile", icon: Home },
          { key: "LOCATIONS", label: `Locations (${properties.length})`, icon: MapPin },
          { key: "SECURITY", label: "Security & Roles (RBAC)", icon: ShieldCheck },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === key
                ? "bg-[#F26A2E] text-white shadow-md shadow-orange-500/30"
                : "bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── GLOBAL SETTINGS VIEW (1:1 Rely Assist Pattern) ──────────────────── */}
      {activeTab === "GLOBAL" && (
        <div className="space-y-8">
          {GLOBAL_SETTINGS_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title}>
                {/* Section Header */}
                <div className="flex items-center gap-2 mb-4">
                  <SectionIcon className="w-5 h-5 text-slate-700" />
                  <h2 className="text-base font-extrabold text-slate-800" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    {section.title}
                  </h2>
                </div>

                {/* Settings Card Grid (3-column) */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (item.href) navigate(item.href);
                          else if (item.tabKey) setActiveTab(item.tabKey);
                        }}
                        className="group bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left transition-all hover:shadow-md hover:border-slate-300 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-white border border-slate-200 shrink-0 mt-0.5">
                              <ItemIcon className="w-4 h-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 text-sm leading-tight">
                                {item.label}
                              </p>
                              <p className="text-xs text-slate-500 mt-1 leading-snug">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── COMPANY PROFILE ─────────────────────────────────────────────────── */}
      {activeTab === "COMPANY" && (
        <div className="max-w-3xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
              <div className="p-3 rounded-2xl rely-logo-gradient text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Organization Profile Settings
                </h2>
                <p className="text-xs text-slate-500">Update company contact info and default currency.</p>
              </div>
            </div>

            {successMsg && (
              <div className="mb-6 rounded-xl px-4 py-3 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 rounded-xl px-4 py-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSaveCompany as any)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="field-label">Company / Facility Name *</label>
                <input {...register("companyName")} className="field-input" placeholder="e.g. Sunrise Senior Living" />
                {errors.companyName && <p className="field-error">{errors.companyName.message}</p>}
              </div>

              <div>
                <label className="field-label">Registration / Tax ID</label>
                <input {...register("registrationNumber")} className="field-input" placeholder="e.g. CIN-U12345" />
              </div>

              <div>
                <label className="field-label">Support Email *</label>
                <input {...register("supportEmail")} className="field-input" placeholder="support@facility.com" />
                {errors.supportEmail && <p className="field-error">{errors.supportEmail.message}</p>}
              </div>

              <div>
                <label className="field-label">Support Phone *</label>
                <input {...register("supportPhone")} className="field-input" placeholder="+91 98765 43210" />
                {errors.supportPhone && <p className="field-error">{errors.supportPhone.message}</p>}
              </div>

              <div>
                <label className="field-label">Primary Time Zone</label>
                <select {...register("timeZone")} className="field-input">
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>

              <div>
                <label className="field-label">Default Currency</label>
                <select {...register("currencyCode")} className="field-input">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                <button type="submit" disabled={saving} className="btn-orange text-xs font-bold py-3 px-6 shadow-md">
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── LOCATIONS ───────────────────────────────────────────────────────── */}
      {activeTab === "LOCATIONS" && (
        <div className="max-w-3xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl rely-logo-gradient text-white">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    Registered Location Centres
                  </h2>
                  <p className="text-xs text-slate-500">Summary of active senior living campuses under your tenant.</p>
                </div>
              </div>
              <a href="/properties" className="btn-orange text-xs font-bold py-2 px-4">
                Manage Properties →
              </a>
            </div>
            <div className="divide-y divide-slate-100">
              {properties.map((p) => (
                <div key={p.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{p.title}</span>
                      <p className="text-xs text-slate-500">{p.locality}, {p.city}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECURITY / RBAC & DYNAMIC ROLE ONBOARDING ───────────────────────── */}
      {activeTab === "SECURITY" && (
        <div className="space-y-6">
          {/* Top Bar: Title + CTAs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl rely-logo-gradient text-white shadow-md shadow-orange-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Database-Driven RBAC & User Onboarding Hub
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Create dynamic custom roles, configure granular permission sets, and onboard staff.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsCreateRoleModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>+ Create Custom Role</span>
              </button>

              <button
                onClick={() => setIsOnboardModalOpen(true)}
                className="btn-orange text-xs font-bold py-2.5 px-5 shadow-md flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Onboard Staff User</span>
              </button>
            </div>
          </div>

          {/* Onboarded Staff Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" /> Active Staff Directory ({users.length})
            </h3>

            {loadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 px-2">Staff Member</th>
                      <th className="pb-3 px-2">Assigned DB Role</th>
                      <th className="pb-3 px-2">Assigned Facilities</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {u.fullName?.[0] || u.email[0]}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm">{u.fullName || "User"}</p>
                              <p className="text-slate-400 text-[11px]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${roleColorMap[u.role] || "bg-purple-100 text-purple-800 border-purple-200"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-slate-600">
                          {u.assignedProperties && u.assignedProperties.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.assignedProperties.map((ap: any) => (
                                <span key={ap.propertyId} className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded-md text-slate-700">
                                  🏢 {ap.title || "Facility"}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">All Locations (Global)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {u.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          <button className="text-xs font-bold text-orange-600 hover:text-orange-800 transition-colors cursor-pointer">
                            Manage →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No onboarded users found.</p>
            )}
          </div>

          {/* Dynamic Database Roles & Permissions Matrix Cards */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-500" /> Database-Driven Roles Matrix ({rolesList.length})
              </h3>
              <button
                onClick={() => setIsCreateRoleModalOpen(true)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
              >
                + Add Dynamic Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rolesList.map((role: any) => (
                <div key={role.id || role.code} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2 relative group hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${roleColorMap[role.code] || "bg-purple-100 text-purple-800 border-purple-200"}`}>
                        {role.code}
                      </span>
                      {role.isSystem ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">SYSTEM DEFAULT</span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">CUSTOM DYNAMIC</span>
                      )}
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-400">
                      {role.permissions?.includes("*") ? "All (*)" : `${role.permissions?.length} Perms`}
                    </span>
                  </div>
                  <p className="font-extrabold text-slate-900 text-sm leading-tight">{role.name}</p>
                  <p className="text-xs text-slate-500 leading-snug">{role.description || "No description provided."}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {role.permissions?.slice(0, 4).map((p: string) => (
                      <span key={p} className="text-[9px] font-semibold bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                    {role.permissions?.length > 4 && (
                      <span className="text-[9px] font-bold text-slate-400">+{role.permissions.length - 4} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── ONBOARD USER MODAL POPUP ────────────────────────────────────── */}
          {isOnboardModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl rely-logo-gradient text-white">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                        Onboard New Staff Member
                      </h3>
                      <p className="text-xs text-slate-500">Create staff credentials and assign dynamic DB role.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOnboardModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {onboardSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{onboardSuccess}</span>
                  </div>
                )}

                {onboardError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{onboardError}</span>
                  </div>
                )}

                <form onSubmit={handleOnboardUser} className="space-y-4">
                  <div>
                    <label className="field-label flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={onboardForm.fullName}
                      onChange={(e) => setOnboardForm({ ...onboardForm, fullName: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="field-input"
                    />
                  </div>

                  <div>
                    <label className="field-label flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={onboardForm.email}
                      onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                      placeholder="e.g. rajesh@relyactive.com"
                      className="field-input"
                    />
                  </div>

                  <div>
                    <label className="field-label flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
                    </label>
                    <input
                      type="text"
                      value={onboardForm.phoneNumber}
                      onChange={(e) => setOnboardForm({ ...onboardForm, phoneNumber: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="field-input"
                    />
                  </div>

                  <div>
                    <label className="field-label flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Select Dynamic Role (Database-Driven) *
                    </label>
                    <select
                      value={onboardForm.role}
                      onChange={(e) => setOnboardForm({ ...onboardForm, role: e.target.value })}
                      className="field-input font-bold"
                    >
                      {rolesList.map((r) => (
                        <option key={r.id || r.code} value={r.code}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Facility Assignment Checkboxes */}
                  <div>
                    <label className="field-label flex items-center gap-1 mb-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> Assign Property Access Scope
                    </label>
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      {properties.map((p) => {
                        const isChecked = onboardForm.propertyIds.includes(p.id);
                        return (
                          <label key={p.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setOnboardForm({ ...onboardForm, propertyIds: [...onboardForm.propertyIds, p.id] });
                                } else {
                                  setOnboardForm({
                                    ...onboardForm,
                                    propertyIds: onboardForm.propertyIds.filter((id) => id !== p.id),
                                  });
                                }
                              }}
                              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            />
                            <span>🏢 {p.title} ({p.city})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsOnboardModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={onboardSubmitting}
                      className="btn-orange text-xs font-bold py-2.5 px-6 shadow-md cursor-pointer"
                    >
                      {onboardSubmitting ? "Onboarding..." : "Confirm & Onboard"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── CREATE DYNAMIC CUSTOM ROLE MODAL POPUP ──────────────────────── */}
          {isCreateRoleModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-600 text-white">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                        Create Dynamic Custom Role
                      </h3>
                      <p className="text-xs text-slate-500">Define a custom role name and select granular permissions.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateRoleModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {roleSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{roleSuccess}</span>
                  </div>
                )}

                {roleError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{roleError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateRole} className="space-y-4">
                  <div>
                    <label className="field-label">Role Name *</label>
                    <input
                      type="text"
                      required
                      value={roleForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const code = val.toUpperCase().replace(/[^A-Z0-9]/g, "_");
                        setRoleForm({ ...roleForm, name: val, code });
                      }}
                      placeholder="e.g. Night Shift Supervisor"
                      className="field-input"
                    />
                  </div>

                  <div>
                    <label className="field-label">Role Code (Auto-generated) *</label>
                    <input
                      type="text"
                      required
                      value={roleForm.code}
                      onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. NIGHT_SHIFT_SUPERVISOR"
                      className="field-input font-mono text-xs font-bold bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="field-label">Description</label>
                    <textarea
                      rows={2}
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      placeholder="Brief summary of duties for this custom role..."
                      className="field-input"
                    />
                  </div>

                  {/* Permission Selection Checklist */}
                  <div>
                    <label className="field-label mb-2 block">Configure Permission Matrix *</label>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80 max-h-48 overflow-y-auto">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                        const isChecked = roleForm.permissions.includes(perm.key);
                        return (
                          <label key={perm.key} className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer p-1.5 rounded hover:bg-white transition-colors">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRoleForm({ ...roleForm, permissions: [...roleForm.permissions, perm.key] });
                                  } else {
                                    setRoleForm({
                                      ...roleForm,
                                      permissions: roleForm.permissions.filter((k) => k !== perm.key),
                                    });
                                  }
                                }}
                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span>{perm.label}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-100">{perm.category}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsCreateRoleModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={roleSubmitting}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      {roleSubmitting ? "Saving Role..." : "Save Role to Database"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
