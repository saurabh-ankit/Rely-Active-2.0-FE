import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Sparkles, Shield, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  category?: string;
}

export default function ComingSoonPage({
  title,
  description,
  icon: Icon = Clock,
  category = "Enterprise Module",
}: ComingSoonPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[85vh] p-6 md:p-10 flex flex-col items-center justify-center w-full">
      <div className="max-w-2xl w-full text-center space-y-6">
        {/* Animated Badge & Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-white/90 shadow-xl border border-slate-200/80 flex items-center justify-center text-[#1E3A8A] relative z-10 backdrop-blur-md">
            <Icon className="w-12 h-12 text-[#F26A2E]" />
          </div>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-orange-400 to-blue-600 blur-xl opacity-20 animate-pulse" />
        </div>

        {/* Header Titles */}
        <div className="space-y-2">
          <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider text-[#1E3A8A] bg-[#1E3A8A]/10 border border-[#1E3A8A]/20 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>{category} • In Active Development</span>
          </span>

          <h1
            className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            {title}
          </h1>

          <p className="text-sm font-medium text-slate-600 max-w-lg mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-left">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">Next Release Phase</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Full integration with tenant scope and real-time live events.
              </p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">SSO & RBAC Protected</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Role-based access control and tenant isolation pre-configured.
              </p>
            </div>
          </div>
        </div>

        {/* Back Actions */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-orange text-xs font-bold py-3 px-6 shadow-md flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

          <button
            onClick={() => navigate("/properties")}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold py-3 px-6 rounded-xl shadow-sm transition-colors"
          >
            View Active Properties
          </button>
        </div>
      </div>
    </div>
  );
}
