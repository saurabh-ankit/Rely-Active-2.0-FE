import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Home, ArrowRight, Check } from "lucide-react";
import api from "../../lib/api";

const schema = z.object({
  title: z.string().min(2, "Property / Facility title is required"),
  propertyType: z.array(z.string()).min(1, "Select at least one property type"),
  developerName: z.string().min(2, "Developer / Builder name is required"),
  constructionStatus: z.string().default("COMPLETED"),
  address: z.string().min(5, "Address is required"),
  locality: z.string().min(2, "Locality is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(4, "Pincode is required"),
  country: z.string().default("India"),
});
type FormData = z.infer<typeof schema>;

const PROPERTY_TYPES = [
  { id: "RETIREMENT_VILLA", label: "Retirement Villa" },
  { id: "ASSISTED_LIVING", label: "Assisted Living Facility" },
  { id: "APARTMENT", label: "Senior Apartment Complex" },
  { id: "GATED_COMMUNITY", label: "Gated Senior Community" },
  { id: "MEMORY_CARE", label: "Memory Care Centre" },
];

export default function PropertySetupPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["RETIREMENT_VILLA", "APARTMENT"]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { country: "India", constructionStatus: "COMPLETED", propertyType: ["RETIREMENT_VILLA", "APARTMENT"] },
  });

  const toggleType = (id: string) => {
    const updated = selectedTypes.includes(id)
      ? selectedTypes.filter((t) => t !== id)
      : [...selectedTypes, id];
    setSelectedTypes(updated);
    setValue("propertyType", updated);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setApiError("");
    try {
      await api.post("/properties", { ...data, propertyType: selectedTypes });
      navigate("/dashboard");
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Failed to create property facility.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-3xl">
        {/* Onboarding Step Tracker */}
        <div className="flex items-center justify-center gap-3 mb-8 text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-500 px-3.5 py-1.5 rounded-full bg-white/40 border border-white/60">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
            <span>Company Profile</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-2 text-orange-600 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">2</span>
            <span>First Location / Property</span>
          </div>
        </div>

        <div className="glass-panel p-8 md:p-10 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl rely-logo-gradient text-white shadow-md">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Add First Property / Location Centre
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Register a senior living community or facility location.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit as any)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="field-label">Property / Facility Title *</label>
              <input
                {...register("title")}
                id="property-title"
                placeholder="e.g., Sunrise Senior Living — Hyderabad Campus"
                className="field-input"
              />
              {errors.title && <p className="field-error">{errors.title.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="field-label">Property Facility Types *</label>
              <div className="flex flex-wrap gap-2.5 mt-1">
                {PROPERTY_TYPES.map((t) => {
                  const selected = selectedTypes.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleType(t.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selected
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                          : "bg-white/70 text-slate-700 border border-slate-200 hover:bg-white"
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="field-label">Developer / Builder Name *</label>
              <input
                {...register("developerName")}
                id="developer-name"
                placeholder="e.g., Sunrise Infrastructure"
                className="field-input"
              />
              {errors.developerName && <p className="field-error">{errors.developerName.message}</p>}
            </div>

            <div>
              <label className="field-label">Construction Status</label>
              <select {...register("constructionStatus")} id="status" className="field-input">
                <option value="COMPLETED">Completed & Operational</option>
                <option value="UNDER_CONSTRUCTION">Under Construction</option>
                <option value="HANDOVER_READY">Ready for Handover</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="field-label">Street Address *</label>
              <input
                {...register("address")}
                id="address"
                placeholder="Plot 42, Hitech City Main Road"
                className="field-input"
              />
              {errors.address && <p className="field-error">{errors.address.message}</p>}
            </div>

            <div>
              <label className="field-label">Locality / Sector *</label>
              <input
                {...register("locality")}
                id="locality"
                placeholder="Madhapur / Whitefield"
                className="field-input"
              />
              {errors.locality && <p className="field-error">{errors.locality.message}</p>}
            </div>

            <div>
              <label className="field-label">City *</label>
              <input
                {...register("city")}
                id="city"
                placeholder="Hyderabad / Bengaluru"
                className="field-input"
              />
              {errors.city && <p className="field-error">{errors.city.message}</p>}
            </div>

            <div>
              <label className="field-label">State *</label>
              <input
                {...register("state")}
                id="state"
                placeholder="Telangana / Karnataka"
                className="field-input"
              />
              {errors.state && <p className="field-error">{errors.state.message}</p>}
            </div>

            <div>
              <label className="field-label">Pincode *</label>
              <input
                {...register("pincode")}
                id="pincode"
                placeholder="500081"
                className="field-input"
              />
              {errors.pincode && <p className="field-error">{errors.pincode.message}</p>}
            </div>

            {apiError && (
              <div className="md:col-span-2 rounded-xl px-4 py-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200">
                {apiError}
              </div>
            )}

            <div className="md:col-span-2 flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200/80">
              <button
                type="submit"
                disabled={loading}
                className="btn-orange text-xs font-bold py-3 px-6 shadow-md hover:shadow-orange-500/25"
              >
                {loading ? "Saving..." : <><span>Complete Setup & Enter Dashboard</span> <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
