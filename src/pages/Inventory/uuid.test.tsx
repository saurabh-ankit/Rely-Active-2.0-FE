import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import * as service from '@/lib/services/centerInventoryService'
import type { AssignmentInput, CenterItem } from '@/lib/types/centerInventory'
import type { InventoryVendor } from '@/lib/types/inventory'
import { PurchaseOrderForm } from './PurchaseOrderForm'
import { StockInForm } from './StockInForm'
import { AssignItemsForm } from './AssignItemsForm'

vi.mock('@/lib/services/centerInventoryService')
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const supplier: InventoryVendor = {
  id: 'supplier',
  name: 'Supplier One',
  isActive: true,
  locationIds: [],
  contactPerson: null,
  email: null,
  phone: null,
  address: null,
}
const item: CenterItem = {
  id: 'item',
  categoryId: 'category',
  name: 'Soap',
  isActive: true,
  packType: 'piece',
  packUnit: 'piece',
  packQuantity: 1,
  minQuantity: 0,
  maxQuantity: 100,
  threshold: 0,
  customFields: [],
  quantity: 10,
  stockDisplay: '10 pieces',
  wholePackagesOnly: true,
  suppliers: [supplier],
}
const props = { locationId: 'location', categoryId: 'category', onClose: vi.fn(), onSaved: vi.fn() }
const clients: QueryClient[] = []
function mount(form: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { ...render(form, { wrapper }), client }
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('crypto', { randomUUID: undefined })
  vi.mocked(service.getCenterOptions).mockImplementation(async (_location, kind) =>
    kind === 'suppliers' ? [supplier] : kind === 'items' ? [item] : [],
  )
  vi.mocked(service.getCenterData).mockResolvedValue({
    records: [],
    pagination: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
  })
  // Keep the form open after a failed request so a retry can verify ID stability.
  vi.mocked(service.mutateCenter).mockRejectedValue(new Error('Offline'))
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  vi.unstubAllGlobals()
})

describe('inventory forms without crypto.randomUUID', () => {
  it.each([
    { name: 'purchase order', Form: PurchaseOrderForm, add: 'Add Item', submit: 'Create Purchase Order' },
    { name: 'stock receipt', Form: StockInForm, add: 'Add Item / Batch', submit: 'Stock In' },
  ])('opens and edits a $name, retaining its request ID for retries', async ({ Form, add, submit }) => {
    const user = userEvent.setup()
    const { rerender } = mount(<Form {...props} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await screen.findByRole('option', { name: 'Supplier One' })
    await user.selectOptions(screen.getByLabelText(/(Supplier|Vendor) \*/), 'supplier')
    await user.click(screen.getByRole('button', { name: add }))
    expect(screen.getAllByLabelText('Item *')).toHaveLength(2)
    // Changing supplier resets rows and generates a fresh row key.
    await user.selectOptions(screen.getByLabelText(/(Supplier|Vendor) \*/), '')
    await user.selectOptions(screen.getByLabelText(/(Supplier|Vendor) \*/), 'supplier')
    expect(screen.getAllByLabelText('Item *')).toHaveLength(1)
    await user.selectOptions(screen.getByLabelText('Item *'), 'item')
    if (Form === StockInForm) {
      fireEvent.change(screen.getByLabelText('Received Quantity (piece)'), { target: { value: '1' } })
    }
    await user.click(screen.getByRole('button', { name: submit }))
    await waitFor(() => expect(service.mutateCenter).toHaveBeenCalledTimes(1))
    const first = vi.mocked(service.mutateCenter).mock.calls[0][3] as { requestId: string }
    expect(first.requestId).toMatch(uuidPattern)
    await screen.findByText('Offline')
    rerender(<Form {...props} />)
    await user.type(screen.getByLabelText('Notes'), 'Retry')
    await user.click(screen.getByRole('button', { name: submit }))
    await waitFor(() => expect(service.mutateCenter).toHaveBeenCalledTimes(2))
    expect(service.mutateCenter).toHaveBeenLastCalledWith(
      'location',
      Form === StockInForm ? 'stock-in' : 'purchase-orders',
      'post',
      expect.objectContaining({ requestId: first.requestId, notes: 'Retry' }),
    )
  })

  it('opens assignments and rotates the request ID only when the payload is edited', async () => {
    const { client, rerender } = mount(<AssignItemsForm {...props} />)
    expect(screen.getByRole('dialog', { name: 'Assign Items' })).toBeInTheDocument()
    const requestIds = () =>
      client
        .getQueryCache()
        .findAll({
          queryKey: ['center-inventory', 'location', 'assignment-preview'],
        })
        .map((query) => (query.queryKey[3] as AssignmentInput).requestId)
    const [initialId] = requestIds()
    expect(initialId).toMatch(uuidPattern)
    rerender(<AssignItemsForm {...props} />)
    expect(requestIds()).toEqual([initialId])
    fireEvent.change(screen.getByLabelText(/Assignment date/), { target: { value: '2026-09-16' } })
    await waitFor(() => expect(requestIds()).toHaveLength(2))
    expect(requestIds()[1]).toMatch(uuidPattern)
    expect(requestIds()[1]).not.toBe(initialId)
  })
})
