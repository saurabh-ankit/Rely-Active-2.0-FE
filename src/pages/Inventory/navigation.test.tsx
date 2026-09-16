import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as center from '@/lib/services/centerInventoryService'
import * as inventory from '@/lib/services/inventoryService'
import { useIsMobile } from '@/hooks/use-mobile'
import InventoryPage from './index'
import InventorySettings from '@/pages/GlobalSettings/Inventory'

vi.mock('@/lib/services/centerInventoryService')
vi.mock('@/lib/services/inventoryService')
vi.mock('@/hooks/use-mobile')
vi.mock('@/hooks/useLocation', () => ({
  useLocation: () => ({ selectedLocationId: 'location', selectedLocationName: 'Alpha' }),
}))
const category = {
  id: 'category',
  name: 'Housekeeping',
  description: 'Cleaning supplies',
  isActive: true,
  locationIds: [],
  itemCount: 0,
  fieldDefinitions: [],
}
const emptyList = { records: [], pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } }
const clients: QueryClient[] = []
function LocationProbe() {
  const { pathname, search } = useLocation()
  return (
    <output data-testid="location">
      {pathname}
      {search}
    </output>
  )
}
function mount(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/global-settings/inventory/*" element={<InventorySettings />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(center.getCenterData).mockImplementation(async (_location, path) => {
    if (path === 'access')
      return { view: true, create: true, update: true, delete: true, approve: true, autoApprove: true }
    if (path === 'categories/category') return category
    if (path === 'stats')
      return {
        totalItems: 0,
        lowStockItems: 0,
        expiringSoon: 0,
        totalTransactions: 0,
        totalPurchases: 0,
        totalIssues: 0,
      }
    return {
      ...emptyList,
      summary: { totalSuppliers: 0, activeSuppliers: 0, inactiveSuppliers: 0, totalPurchaseOrders: 0 },
    }
  })
  vi.mocked(center.getCenterList).mockResolvedValue(emptyList)
  vi.mocked(center.getCenterOptions).mockResolvedValue([])
  vi.mocked(inventory.getInventoryList).mockResolvedValue(emptyList)
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
})

async function selectTab(label: string, mobile: boolean) {
  const user = userEvent.setup()
  if (mobile) {
    // The tab selector is the first combobox, ahead of table filters and pagination.
    await user.click(screen.getAllByRole('combobox')[0])
    await user.click(await screen.findByRole('option', { name: label }))
  } else {
    await user.click(await screen.findByRole('tab', { name: new RegExp(`^${label}`) }))
  }
}

describe.each([false, true])('inventory navigation (mobile: %s)', (mobile) => {
  it('preserves category and property scope while changing tabs and opening Create', async () => {
    vi.mocked(useIsMobile).mockReturnValue(mobile)
    mount('/inventory?locationId=location&id=category&category=housekeeping&tab=items')
    await screen.findByText('Housekeeping')
    if (!mobile) expect(screen.getAllByRole('tab')).toHaveLength(4)
    await selectTab('Purchase Orders', mobile)
    expect(screen.getByTestId('location')).toHaveTextContent(
      'locationId=location&id=category&category=housekeeping&tab=purchase-orders',
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Create Purchase Order' }))
    expect(screen.getByRole('dialog', { name: 'Create Purchase Order' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await selectTab('Transactions', mobile)
    expect(screen.getByTestId('location')).toHaveTextContent('tab=transactions')
    const from = screen.getByLabelText('From')
    from.focus()
    fireEvent.change(from, { target: { value: '2026-09-01' } })
    expect(screen.getByLabelText('From')).toBe(from)
    expect(from).toHaveFocus()
    await waitFor(() =>
      expect(center.getCenterList).toHaveBeenCalledWith(
        'location',
        'transactions',
        expect.objectContaining({ startDate: '2026-09-01', page: 1 }),
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Back to Categories' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/inventory?locationId=location'))
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })
  it('restores the Global Settings tab from its URL and updates navigation', async () => {
    vi.mocked(useIsMobile).mockReturnValue(mobile)
    mount('/global-settings/inventory?tab=vendors')
    expect(await screen.findByRole('button', { name: 'Add Vendor' })).toBeInTheDocument()
    await selectTab('Categories', mobile)
    expect(screen.getByTestId('location')).toHaveTextContent('tab=categories')
    expect(await screen.findByRole('button', { name: 'Add Category' })).toBeInTheDocument()
  })
})
