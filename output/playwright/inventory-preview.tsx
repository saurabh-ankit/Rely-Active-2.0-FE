import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Inventory from '../../src/pages/Inventory'
import InventorySettings from '../../src/pages/GlobalSettings/Inventory'
import '../../src/global.css'
localStorage.setItem('rely_active_property_id', 'location')
localStorage.setItem('rely_active_property_name', 'Maple Grove')
import { useLocationStore } from '../../src/lib/stores/locationStore'
useLocationStore.getState().setSelectedLocation('location', 'Maple Grove')
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
  >
    <BrowserRouter>
      <main className="mx-auto min-h-screen max-w-7xl bg-slate-50 p-4 sm:p-8">
        <Routes>
          <Route path="/global-settings/inventory/*" element={<InventorySettings />} />
          <Route path="*" element={<Inventory />} />
        </Routes>
      </main>
    </BrowserRouter>
  </QueryClientProvider>,
)
