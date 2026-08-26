import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Building2, Users, HeartHandshake } from "lucide-react";
import api from "../../lib/api";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      email: "admin@relyactive.com",
      password: "admin123",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setApiError("");
    try {
      const res = await api.post("/auth/login", data);
      const { token, user } = res.data.data;
      localStorage.setItem("ra_token", token);
      localStorage.setItem("ra_user", JSON.stringify(user));

      const setupRes = await api.get("/company/setup-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (setupRes.data.data?.isSetupComplete) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding/company");
      }
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Login failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between p-6 md:p-12 overflow-hidden login-bg">
      {/* Top Left Brand Logo */}
      <header className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl rely-logo-gradient flex items-center justify-center shadow-md">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <span className="font-extrabold text-2xl tracking-widest text-slate-800" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            RELY
          </span>
          <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 border border-orange-500/20">
            ACTIVE 2.0
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 my-auto flex flex-col lg:flex-row items-center justify-between gap-12 max-w-7xl mx-auto w-full py-8">
        {/* Left Hero Section */}
        <div className="flex-1 max-w-xl text-left">
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.08] mb-6"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Care,<br />
            orchestrated<br />
            <span className="gradient-text-orange">at scale.</span>
          </h1>

          <p className="text-slate-600 text-lg leading-relaxed mb-8 font-medium max-w-lg">
            A multi-tenant ERP for senior living & real estate operations—properties, residents, care tasks, rosters and billing under one trusted roof.
          </p>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 border border-white/60 backdrop-blur-md">
              <Building2 className="w-5 h-5 text-orange-500" />
              <span className="text-xs font-bold text-slate-700">Multi-Location CRM</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 border border-white/60 backdrop-blur-md">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Resident Care & Roster</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 border border-white/60 backdrop-blur-md">
              <HeartHandshake className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Assisted Living Packages</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 border border-white/60 backdrop-blur-md">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold text-slate-700">Enterprise RBAC / UBAC</span>
            </div>
          </div>
        </div>

        {/* Right Glassmorphic Login Card */}
        <div className="w-full max-w-md">
          <div className="glass-panel p-8 md:p-10 shadow-2xl relative overflow-hidden">
            {/* Header Brand Icon */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl rely-logo-gradient flex items-center justify-center shadow-lg mb-3">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-extrabold text-2xl tracking-widest text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                RELY
              </span>
              <p className="text-xs text-slate-500 font-medium mt-1">
                A one stop solution for all your community needs.
              </p>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Welcome
              </h2>
              <p className="text-xs text-slate-500 mt-1">Let's see what's happening today...</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col gap-4">
              <div>
                <label className="field-label">Email</label>
                <input
                  {...register("email")}
                  id="login-email"
                  type="email"
                  placeholder="enter your email"
                  className="field-input"
                />
                {errors.email && <p className="field-error">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="field-label">Password</label>
                  <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-[11px] font-semibold text-orange-600 hover:underline">
                    Forgot Password
                  </a>
                </div>
                <div className="relative">
                  <input
                    {...register("password")}
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="enter password"
                    className="field-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="field-error">{errors.password.message}</p>}
              </div>

              {apiError && (
                <div className="rounded-xl px-4 py-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200">
                  {apiError}
                </div>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-orange w-full py-3.5 text-sm font-bold mt-2 shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Signing in..." : <><span>Login</span> <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs font-medium text-slate-500">
        © 2026 Rely Health Systems • A one stop solution for all your community needs.
      </footer>
    </div>
  );
}
