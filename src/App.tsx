import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  User,
  Users,
  Stethoscope,
  Package,
  ClipboardList,
  Calendar,
  UtensilsCrossed,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { LocationProvider } from "./context/LocationContext";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import CompanySetupPage from "./pages/onboarding/CompanySetupPage";
import PropertySetupPage from "./pages/onboarding/PropertySetupPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import FlatCreationPage from "./pages/property/FlatCreationPage";
import PropertiesPage from "./pages/properties/PropertiesPage";
import CreatePropertyWizardPage from "./pages/properties/CreatePropertyWizardPage";
import SettingsPage from "./pages/settings/SettingsPage";
import ComingSoonPage from "./pages/common/ComingSoonPage";

function RequireAuth({ children }: { children: ReactElement }) {
  const token = localStorage.getItem("ra_token");
  if (!token) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function App() {
  return (
    <LocationProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding/company" element={<RequireAuth><CompanySetupPage /></RequireAuth>} />
        <Route path="/onboarding/property" element={<RequireAuth><PropertySetupPage /></RequireAuth>} />

        {/* Core Implemented Modules */}
        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/properties" element={<RequireAuth><PropertiesPage /></RequireAuth>} />
        <Route path="/properties/new" element={<RequireAuth><CreatePropertyWizardPage /></RequireAuth>} />
        <Route path="/properties/new-unit" element={<RequireAuth><FlatCreationPage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

        {/* Sidebar Modules - Coming Soon Interfaces */}
        <Route
          path="/residents"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Resident Directory & Onboarding"
                description="Comprehensive senior profile management, care plans, emergency contacts, and room allocation tools."
                icon={User}
                category="Resident Management"
              />
            </RequireAuth>
          }
        />

        <Route
          path="/employees"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Staff & Caregiver Directory"
                description="Manage nurses, healthcare attendants, facility managers, and staff performance records."
                icon={Users}
                category="HR & Workforce"
              />
            </RequireAuth>
          }
        />

        <Route
          path="/medical"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Medical Care & EMR System"
                description="Electronic health records, vital sign tracking, prescription schedules, and physician visits."
                icon={Stethoscope}
                category="Healthcare Operations"
              />
            </RequireAuth>
          }
        />

        <Route
          path="/inventory"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Inventory & Asset Management"
                description="Real-time stock tracking for medical supplies, room linen, facility equipment, and consumables."
                icon={Package}
                category="Supply Chain"
              />
            </RequireAuth>
          }
        />

        <Route
          path="/roster"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Shift & Duty Roster"
                description="Automated caregiver shift scheduling, attendance tracking, and duty handover logs."
                icon={ClipboardList}
                category="Workforce Scheduling"
              />
            </RequireAuth>
          }
        />

        <Route
          path="/events"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Community Events & Activities"
                description="Senior engagement calendar, wellness workshops, recreational activities, and venue booking."
                icon={Calendar}
                category="Community Life"
              />
            </RequireAuth>
          }
        />

        <Route
          path="/food-beverage"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Food & Beverage Services"
                description="Resident dietary preferences, meal planning, daily kitchen orders, and nutrition logs."
                icon={UtensilsCrossed}
                category="Dining Services"
              />
            </RequireAuth>
          }
        />

        <Route
          path="/visitors"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Visitor & Delivery Gate Pass"
                description="Visitor check-ins, security gate passes, family visit approvals, and parcel tracking."
                icon={ShieldCheck}
                category="Security & Access"
              />
            </RequireAuth>
          }
        />

        <Route
          path="/billing"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Resident Billing & Invoicing"
                description="Automated monthly rental packages, utility metering, invoice generation, and payment gateway."
                icon={CreditCard}
                category="Financial Operations"
              />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </LocationProvider>
  );
}

export default App;
