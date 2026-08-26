import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/layouts/Layout'
import ComponentShowcase from '@/pages/ComponentShowcase'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="components" element={<ComponentShowcase />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
