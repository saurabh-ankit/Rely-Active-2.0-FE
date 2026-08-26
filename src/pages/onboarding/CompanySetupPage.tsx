import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ArrowRight } from "lucide-react";
import api from "../../lib/api";

const schema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  registrationNumber: z.string().optional(),
  supportEmail: z.string().email("Valid support email is required"),
  supportPhone: z.string().min(8, "Support phone is required"),
  timeZone: z.string().default("Asia/Kolkata"),
  currencyCode: z.string().default("INR"),
});
type FormData = z.infer<typeof schema>;

export default function CompanySetupPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { timeZone: "Asia/Kolkata", currencyCode: "INR" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setApiError("");
    try {
      await api.patch("/company/profile", data);
      navigate("/onboarding/property");
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Failed to update company profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-2xl">
        {/* Onboarding Step Tracker */}
        <div className="flex items-center justify-center gap-3 mb-8 text-xs font-bold">
          <div className="flex items-center gap-2 text-orange-600 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Company Profile</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-2 text-slate-400 px-3.5 py-1.5 rounded-full bg-white/40 border border-white/60">
            <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px]">2</span>
            <span>First Location / Property</span>
          </div>
        </div>

        <div className="glass-panel p-8 md:p-10 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl rely-logo-gradient text-white shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Setup Senior Living Company
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Configure your organization's primary facility details.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit as any)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="field-label">Company / Organization Name *</label>
              <input
                {...register("companyName")}
                id="company-name"
                placeholder="e.g., Sunrise Senior Living Pvt. Ltd."
                className="field-input"
              />
              {errors.companyName && <p className="field-error">{errors.companyName.message}</p>}
            </div>

            <div>
              <label className="field-label">Registration / Tax ID</label>
              <input
                {...register("registrationNumber")}
                id="reg-number"
                placeholder="e.g., CIN-U12345KA2024"
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Support Email *</label>
              <input
                {...register("supportEmail")}
                id="support-email"
                type="email"
                placeholder="care@sunrisesenior.com"
                className="field-input"
              />
              {errors.supportEmail && <p className="field-error">{errors.supportEmail.message}</p>}
            </div>

            <div>
              <label className="field-label">Support Phone *</label>
              <input
                {...register("supportPhone")}
                id="support-phone"
                placeholder="+91 98765 43210"
                className="field-input"
              />
              {errors.supportPhone && <p className="field-error">{errors.supportPhone.message}</p>}
            </div>

            <div>
              <label className="field-label">Time Zone</label>
              <select {...register("timeZone")} id="timezone" className="field-input">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
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
                {loading ? "Saving..." : <><span>Save & Continue to Property</span> <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
