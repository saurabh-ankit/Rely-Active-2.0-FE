import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import * as service from '@/lib/services/inventoryService'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import InventorySettings from './index'
import { ItemEditor } from './ItemFormPage'
import type { InventoryCategory, InventoryItem, InventoryPackageOptions } from '@/lib/types/inventory'
vi.mock('@/lib/services/inventoryService')
vi.mock('@/lib/services/propertyService')
const categoryId = '00000000-0000-4000-8000-000000000001'
const fieldId = '00000000-0000-4000-8000-000000000002'
const options: InventoryPackageOptions = {
  packageTypes: ['bottle', 'piece'],
  stockUnits: ['ml', 'piece'],
  allowedUnitsByPackageType: { bottle: ['ml'], piece: ['piece'] },
}
const category: InventoryCategory = {
  id: categoryId,
  name: 'Cleaning',
  description: null,
  image: null,
  isActive: true,
  locationIds: [],
  itemCount: 0,
  fieldDefinitions: [],
}
function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  )
}
function mount(children: ReactNode, initialEntry = '/global-settings/inventory') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/global-settings/inventory/*" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getPropertiesAPI).mockResolvedValue([])
  vi.mocked(service.getInventoryPackageOptions).mockResolvedValue(options)
})
afterEach(cleanup)
describe('inventory forms and query refresh', () => {
  it('validates a category, saves it, and refreshes the list through query hooks', async () => {
    let saved = false
    vi.mocked(service.getInventoryList).mockImplementation(async () => ({
      records: saved ? [category] : [],
      pagination: { page: 1, limit: 10, totalItems: saved ? 1 : 0, totalPages: saved ? 1 : 0 },
    }))
    vi.mocked(service.saveInventory).mockImplementation(async () => {
      saved = true
      return category
    })
    const user = userEvent.setup()
    mount(<InventorySettings />)
    await user.click(await screen.findByRole('button', { name: 'Add Category' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(service.saveInventory).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Category Name *'), 'Cleaning')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Cleaning')).toBeInTheDocument()
    expect(vi.mocked(service.getInventoryList).mock.calls.length).toBeGreaterThanOrEqual(2)
  })
  it('keeps explicitly cleared custom values cleared when editing', async () => {
    const withField: InventoryCategory = {
      ...category,
      fieldDefinitions: [
        {
          id: fieldId,
          categoryId,
          fieldName: 'notes',
          fieldLabel: 'Notes',
          fieldType: 'text',
          isRequired: false,
          defaultValue: 'Default note',
          enumValues: [],
          displayOrder: 0,
        },
      ],
    }
    const item: InventoryItem = {
      id: '00000000-0000-4000-8000-000000000003',
      categoryId,
      name: 'Cleaner',
      isActive: true,
      packType: 'bottle',
      packUnit: 'ml',
      packQuantity: 500,
      locationIds: [],
      customFields: [{ fieldDefinitionId: fieldId, value: null }],
      vendorAssignments: [],
    }
    vi.mocked(service.saveInventory).mockResolvedValue(item)
    const user = userEvent.setup()
    mount(<ItemEditor options={options} locations={[]} category={withField} record={item} />)
    expect(await screen.findByLabelText('Notes')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(service.saveInventory).toHaveBeenCalledWith(
        'items',
        expect.objectContaining({ customFields: [{ fieldDefinitionId: fieldId, value: null }] }),
        item.id,
      ),
    )
  })
  it('validates required dynamic fields and package metadata before calling the service', async () => {
    const withField: InventoryCategory = {
      ...category,
      fieldDefinitions: [
        {
          id: fieldId,
          categoryId,
          fieldName: 'quantity',
          fieldLabel: 'Quantity',
          fieldType: 'number',
          isRequired: true,
          defaultValue: null,
          enumValues: [],
          displayOrder: 0,
        },
      ],
    }
    const user = userEvent.setup()
    mount(<ItemEditor options={options} locations={[]} category={withField} />)
    await user.type(await screen.findByLabelText('Item Name *'), 'Cleaner')
    await user.selectOptions(screen.getByLabelText('Package Type *'), 'bottle')
    await user.selectOptions(screen.getByLabelText('Stock Unit *'), 'ml')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('This field is required')).toBeInTheDocument()
    expect(service.saveInventory).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Quantity *'), '0')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(service.saveInventory).toHaveBeenCalledWith(
        'items',
        expect.objectContaining({ customFields: [{ fieldDefinitionId: fieldId, value: 0 }] }),
        undefined,
      ),
    )
  })
  it('creates a category with an inline custom field in one save call', async () => {
    vi.mocked(service.getInventoryList).mockResolvedValue({
      records: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
    })
    vi.mocked(service.saveInventory).mockResolvedValue(category)
    const user = userEvent.setup()
    mount(<InventorySettings />)
    await user.click(await screen.findByRole('button', { name: 'Add Category' }))
    await user.type(screen.getByLabelText('Category Name *'), 'Pharmacy')
    await user.click(screen.getByRole('button', { name: 'Add Field' }))
    await user.type(screen.getByLabelText('Field name'), 'batchNumber')
    await user.type(screen.getByLabelText('Field label'), 'Batch Number')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(service.saveInventory).toHaveBeenCalledWith(
        'categories',
        expect.objectContaining({
          name: 'Pharmacy',
          fieldDefinitions: [
            expect.objectContaining({ fieldName: 'batchNumber', fieldLabel: 'Batch Number', enumValues: [] }),
          ],
        }),
        undefined,
      ),
    )
  })
})

describe('inventory page navigation and editing', () => {
  it('loads an edit page directly and preserves list state on Cancel', async () => {
    vi.mocked(service.getInventoryDetail).mockResolvedValue(category)
    vi.mocked(service.getInventoryList).mockResolvedValue({
      records: [category],
      pagination: { page: 2, limit: 10, totalItems: 12, totalPages: 2 },
    })
    const user = userEvent.setup()
    mount(
      <InventorySettings />,
      `/global-settings/inventory/categories/${categoryId}/edit?tab=categories&search=Clean&page=2`,
    )
    expect(await screen.findByLabelText('Category Name *')).toHaveValue('Cleaning')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/global-settings/inventory?tab=categories&search=Clean&page=2',
    )
    expect(await screen.findByPlaceholderText('Search categories…')).toHaveValue('Clean')
  })
  it('edits category definitions without changing their IDs', async () => {
    const definition = {
      id: fieldId,
      categoryId,
      fieldName: 'notes',
      fieldLabel: 'Notes',
      fieldType: 'text' as const,
      isRequired: false,
      defaultValue: null,
      enumValues: [],
      displayOrder: 0,
    }
    vi.mocked(service.getInventoryDetail).mockResolvedValue({ ...category, fieldDefinitions: [definition] })
    vi.mocked(service.getInventoryList).mockResolvedValue({
      records: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
    })
    vi.mocked(service.saveInventory).mockResolvedValue(category)
    const user = userEvent.setup()
    mount(<InventorySettings />, `/global-settings/inventory/categories/${categoryId}/edit`)
    await user.clear(await screen.findByLabelText('Field label'))
    await user.type(screen.getByLabelText('Field label'), 'Item Notes')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(service.saveInventory).toHaveBeenCalledWith(
        'categories',
        expect.objectContaining({
          fieldDefinitions: [expect.objectContaining({ id: fieldId, fieldLabel: 'Item Notes' })],
        }),
        categoryId,
      ),
    )
  })
  it('uploads a category image through the service and includes its URL in the save', async () => {
    vi.mocked(service.uploadInventoryImage).mockResolvedValue({ image: 'https://example.com/category.png' })
    vi.mocked(service.saveInventory).mockResolvedValue(category)
    vi.mocked(service.getInventoryList).mockResolvedValue({
      records: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
    })
    const user = userEvent.setup()
    mount(<InventorySettings />, '/global-settings/inventory/categories/new')
    await user.type(screen.getByLabelText('Category Name *'), 'Cleaning')
    await user.upload(
      screen.getByLabelText('Category Image'),
      new File(['image'], 'category.png', { type: 'image/png' }),
    )
    expect(await screen.findByAltText('Category preview')).toHaveAttribute('src', 'https://example.com/category.png')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(service.saveInventory).toHaveBeenCalledWith(
        'categories',
        expect.objectContaining({ image: 'https://example.com/category.png' }),
        undefined,
      ),
    )
  })
  it('keeps image failures visible and prevents accidental submission', async () => {
    vi.mocked(service.uploadInventoryImage).mockRejectedValue(new Error('Offline'))
    const user = userEvent.setup()
    mount(<InventorySettings />, '/global-settings/inventory/categories/new')
    await user.type(screen.getByLabelText('Category Name *'), 'Cleaning')
    await user.upload(
      screen.getByLabelText('Category Image'),
      new File(['image'], 'category.png', { type: 'image/png' }),
    )
    expect(await screen.findByText('Image upload failed. Choose the file again or remove it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Discard image selection' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})
