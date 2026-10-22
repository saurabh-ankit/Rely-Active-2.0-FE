import { Navigate, Route, Routes } from 'react-router-dom'
import BillingFlatsPage from './BillingFlatsPage'
import InvoicePage from './InvoicePage'

export default function BillingManagementPage() {
  return (
    <Routes>
      <Route index element={<BillingFlatsPage />} />
      <Route path="invoice/:unitId" element={<InvoicePage />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  )
}
