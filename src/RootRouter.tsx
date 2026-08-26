import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/layouts/Layout'
import CompanyPage from '@/pages/Company'
import ComponentShowcase from '@/pages/ComponentShowcase'
import DashboardPage from '@/pages/Dashboard'
import GlobalSettingsPage from '@/pages/GlobalSettings'
import LoginPage from '@/pages/Login'
import SectionPage from '@/pages/SectionPage'
import SetupPage from '@/pages/Setup'

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="company" element={<CompanyPage />} />
        <Route path="global-settings" element={<GlobalSettingsPage />} />
        <Route path="components" element={<ComponentShowcase />} />

        {/* rely-active-1.0 Side Nav Routes */}
        <Route path="admin/residents" element={<SectionPage title="Resident Management" />} />
        <Route path="admin/employees" element={<SectionPage title="Employee Directory" />} />
        <Route path="admin/medical/*" element={<SectionPage title="Medical Management" />} />
        <Route path="admin/billing-management/*" element={<SectionPage title="Billing Management" />} />
        <Route path="admin/shift-roster-management" element={<SectionPage title="Shift & Roster Management" />} />
        <Route path="admin/visitor-history" element={<SectionPage title="Visitors Management" />} />
        <Route path="admin/events" element={<SectionPage title="Event Management" />} />
        <Route path="admin/fnb-history" element={<SectionPage title="Food & Beverages" />} />
        <Route path="admin/inventory/*" element={<SectionPage title="Inventory Management" />} />
        <Route path="admin/asset-management" element={<SectionPage title="Asset Management" />} />
        <Route path="admin/feedback-and-training" element={<SectionPage title="Feedback And Training" />} />

        {/* Setting fallbacks */}
        <Route path="personal-care-tasks" element={<SectionPage title="Personal Care Tasks (ADL)" />} />
        <Route path="vitals" element={<SectionPage title="Vital Settings" />} />
        <Route path="lab-report" element={<SectionPage title="Lab Report Settings" />} />
        <Route path="care-features" element={<SectionPage title="Care Tasks & Features" />} />
        <Route path="room-features" element={<SectionPage title="Room Features" />} />
        <Route path="feedback" element={<SectionPage title="Feedback Forms" />} />
        <Route path="document-templates" element={<SectionPage title="Resident Document Templates" />} />
        <Route path="consent-templates" element={<SectionPage title="Resident Consent Templates" />} />
        <Route path="daily-routines" element={<SectionPage title="Daily Routine Templates" />} />
        <Route path="whatsapp" element={<SectionPage title="WhatsApp Manager" />} />
        <Route path="roster-settings" element={<SectionPage title="Roster Settings" />} />
        <Route path="locations" element={<SectionPage title="Properties & Locations" />} />
        <Route path="device-permissions" element={<SectionPage title="Device Permissions" />} />
        <Route path="email-config" element={<SectionPage title="Email Configuration" />} />
        <Route path="tokens" element={<SectionPage title="Token & License Management" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
