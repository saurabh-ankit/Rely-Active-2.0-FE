import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/layouts/Layout'
import CompanyPage from '@/pages/Company'
import ComponentShowcase from '@/pages/ComponentShowcase'
import DashboardPage from '@/pages/Dashboard'
import EmployeeDirectoryPage from '@/pages/Employees'
import GlobalSettingsPage from '@/pages/GlobalSettings'
import LoginPage from '@/pages/Login'
import PropertyPage from '@/pages/Property'
import CreatePropertyPage from '@/pages/Property/CreatePropertyPage'
import ResidentPage from '@/pages/Resident'
import SectionPage from '@/pages/SectionPage'
import SetupPage from '@/pages/Setup'
import AssetManagementPage from '@/pages/AssetManagement'
import FnbManagementPage from '@/pages/FnbManagement'
import UserProfilePage from '@/pages/Profile'
import TicketsPage from '@/pages/Tickets'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />

      {/* Protected Operations Console Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="my-profile" element={<UserProfilePage />} />
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="company" element={<CompanyPage />} />
        <Route path="property" element={<PropertyPage />} />
        <Route path="property/create" element={<CreatePropertyPage />} />
        <Route path="property/edit/:id" element={<CreatePropertyPage />} />
        <Route
          path="global-settings"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/users"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="users" />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/residents"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="residents" />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/fnb-packages"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="fnb-packages" />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/fnb-dishes"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="fnb-dishes" />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/residents/edit/:id"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="edit-resident" />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/residents/details/:id"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="view-resident" />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/create-user"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="create-user" />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/edit-user/:id"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="edit-user" />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/permissions"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="permissions" />
            </ProtectedRoute>
          }
        />
        <Route
          path="global-settings/permissions/:userId"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GlobalSettingsPage initialView="permissions" />
            </ProtectedRoute>
          }
        />
        <Route path="components" element={<ComponentShowcase />} />

        {/* rely-active-1.0 Side Nav Routes */}
        <Route
          path="admin/residents"
          element={
            <ProtectedRoute resourceKey="RESIDENT" action="view">
              <ResidentPage initialView="list" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/residents/create"
          element={
            <ProtectedRoute resourceKey="RESIDENT" action="create">
              <ResidentPage initialView="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/residents/edit/:id"
          element={
            <ProtectedRoute resourceKey="RESIDENT" action="update">
              <ResidentPage initialView="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/residents/details/:id"
          element={
            <ProtectedRoute resourceKey="RESIDENT" action="view">
              <ResidentPage initialView="view" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/employees"
          element={
            <ProtectedRoute resourceKey="EMPLOYEE" action="view">
              <EmployeeDirectoryPage initialView="list" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/employees/create"
          element={
            <ProtectedRoute resourceKey="EMPLOYEE" action="create">
              <EmployeeDirectoryPage initialView="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/employees/edit/:id"
          element={
            <ProtectedRoute resourceKey="EMPLOYEE" action="update">
              <EmployeeDirectoryPage initialView="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/medical/*"
          element={
            <ProtectedRoute resourceKey="MEDICAL" action="view">
              <SectionPage title="Medical Management" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/billing-management/*"
          element={
            <ProtectedRoute resourceKey="BILLING" action="view">
              <SectionPage title="Billing Management" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/shift-roster-management"
          element={
            <ProtectedRoute resourceKey="ROSTER" action="view">
              <SectionPage title="Shift & Roster Management" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/visitor-history"
          element={
            <ProtectedRoute resourceKey="GNS" action="view">
              <SectionPage title="Visitors Management" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/events"
          element={
            <ProtectedRoute resourceKey="EVENTS" action="view">
              <SectionPage title="Event Management" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/fnb-history"
          element={
            <ProtectedRoute resourceKey="FNB" action="view">
              <FnbManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="fnb-management"
          element={
            <ProtectedRoute resourceKey="FNB" action="view">
              <FnbManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/inventory/*"
          element={
            <ProtectedRoute resourceKey="INVENTORY" action="view">
              <SectionPage title="Inventory Management" />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/asset-management"
          element={
            <ProtectedRoute resourceKey="ASSET" action="view">
              <AssetManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/tickets"
          element={
            <ProtectedRoute resourceKey="TICKETS" action="view">
              <TicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="tickets"
          element={
            <ProtectedRoute resourceKey="TICKETS" action="view">
              <TicketsPage />
            </ProtectedRoute>
          }
        />
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
        <Route path="locations" element={<Navigate to="/property" replace />} />
        <Route path="locations/create" element={<Navigate to="/property/create" replace />} />
        <Route path="locations/edit/:id" element={<CreatePropertyPage />} />
        <Route path="device-permissions" element={<SectionPage title="Device Permissions" />} />
        <Route path="email-config" element={<SectionPage title="Email Configuration" />} />
        <Route path="tokens" element={<SectionPage title="Token & License Management" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
