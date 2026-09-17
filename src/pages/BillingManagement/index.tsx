import { Routes, Route, Navigate } from 'react-router-dom'
import { FlatsDirectoryScreen } from './components/FlatsDirectoryScreen'
import { FlatBillingDashboard } from './components/FlatBillingDashboard'

export default function BillingManagementPage() {
  return (
    <Routes>
      <Route index element={<FlatsDirectoryScreen />} />
      <Route path="unit/:unitId" element={<FlatBillingDashboard />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  )
}
