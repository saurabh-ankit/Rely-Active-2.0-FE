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
const locationId = '00000000-0000-4000-8000-000000000004'
const locationOptions = [{ id: locationId, name: 'Alpha' }]
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
  vi.mocked(service.checkInventoryCategoryName).mockResolvedValue({ available: true })
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
      minQuantity: 0,
      maxQuantity: 0,
      threshold: 0,
      locationIds: [locationId],
      customFields: [{ fieldDefinitionId: fieldId, value: null }],
      vendorAssignments: [],
    }
    vi.mocked(service.saveInventory).mockResolvedValue(item)
    const user = userEvent.setup()
    mount(<ItemEditor options={options} locations={locationOptions} category={withField} record={item} />)
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
    mount(<ItemEditor options={options} locations={locationOptions} category={withField} />)
    await user.type(await screen.findByLabelText('Item Name *'), 'Cleaner')
    await user.selectOptions(screen.getByLabelText('Package Type *'), 'bottle')
    await user.selectOptions(screen.getByLabelText('Pack Unit *'), 'ml')
    await user.click(screen.getByRole('checkbox', { name: 'Alpha' }))
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

describe('shared item thresholds', () => {
  const stripOptions: InventoryPackageOptions = {
    packageTypes: ['strip'],
    stockUnits: ['tablet'],
    allowedUnitsByPackageType: { strip: ['tablet'] },
  }
  const item: InventoryItem = {
    id: '00000000-0000-4000-8000-000000000003',
    categoryId,
    name: 'Tablets',
    isActive: true,
    packType: 'strip',
    packUnit: 'tablet',
    packQuantity: 10,
    minQuantity: 30,
    maxQuantity: 100,
    threshold: 50,
    locationIds: [locationId],
    customFields: [],
    vendorAssignments: [],
  }
  it('creates base-unit thresholds and reopens them as package counts', async () => {
    vi.mocked(service.saveInventory).mockResolvedValue(item)
    const user = userEvent.setup()
    mount(<ItemEditor options={stripOptions} locations={locationOptions} category={category} />)
    expect(screen.getByLabelText('Min Quantity *')).toHaveValue(0)
    await user.type(screen.getByLabelText('Item Name *'), 'Tablets')
    await user.selectOptions(screen.getByLabelText('Package Type *'), 'strip')
    await user.selectOptions(screen.getByLabelText('Pack Unit *'), 'tablet')
    await user.click(screen.getByRole('checkbox', { name: 'Alpha' }))
    for (const [label, value] of [
      ['Pack Quantity *', '10'],
      ['Min Quantity (strip) *', '3'],
      ['Max Quantity (strip) *', '10'],
      ['Threshold (strip) *', '5'],
    ]) {
      await user.clear(screen.getByLabelText(label))
      await user.type(screen.getByLabelText(label), value)
    }
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(service.saveInventory).toHaveBeenCalledWith(
        'items',
        expect.objectContaining({ minQuantity: 30, maxQuantity: 100, threshold: 50 }),
        undefined,
      ),
    )
    cleanup()
    mount(<ItemEditor options={stripOptions} locations={locationOptions} category={category} record={item} />)
    expect(screen.getByLabelText('Min Quantity (strip) *')).toHaveValue(3)
    expect(screen.getByLabelText('Max Quantity (strip) *')).toHaveValue(10)
    expect(screen.getByLabelText('Threshold (strip) *')).toHaveValue(5)
  })
  it('shows partial API packages exactly and requests correction without silently rounding', async () => {
    const user = userEvent.setup()
    mount(
      <ItemEditor
        options={stripOptions}
        locations={locationOptions}
        category={category}
        record={{ ...item, threshold: 5 }}
      />,
    )
    expect(screen.getByLabelText('Threshold (strip) *')).toHaveValue(0.5)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter a whole number of packages')).toBeInTheDocument()
    expect(service.saveInventory).not.toHaveBeenCalled()
  })
  it('retains package counts when packaging changes and saves using the new pack size', async () => {
    vi.mocked(service.saveInventory).mockResolvedValue(item)
    const user = userEvent.setup()
    mount(<ItemEditor options={stripOptions} locations={locationOptions} category={category} record={item} />)
    await user.clear(screen.getByLabelText('Pack Quantity *'))
    await user.type(screen.getByLabelText('Pack Quantity *'), '20')
    expect(screen.getByLabelText('Min Quantity (strip) *')).toHaveValue(3)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(service.saveInventory).toHaveBeenCalledWith(
        'items',
        expect.objectContaining({ packQuantity: 20, minQuantity: 60, maxQuantity: 200, threshold: 100 }),
        item.id,
      ),
    )
  })
  it('blocks an invalid range and allows explicitly clearing thresholds to zero', async () => {
    vi.mocked(service.saveInventory).mockResolvedValue(item)
    const user = userEvent.setup()
    mount(<ItemEditor options={stripOptions} locations={locationOptions} category={category} record={item} />)
    await user.clear(screen.getByLabelText('Max Quantity (strip) *'))
    await user.type(screen.getByLabelText('Max Quantity (strip) *'), '2')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Maximum must be at least minimum')).toBeInTheDocument()
    expect(service.saveInventory).not.toHaveBeenCalled()
    for (const label of ['Min Quantity (strip) *', 'Max Quantity (strip) *', 'Threshold (strip) *']) {
      await user.clear(screen.getByLabelText(label))
      await user.type(screen.getByLabelText(label), '0')
    }
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(service.saveInventory).toHaveBeenCalledWith(
        'items',
        expect.objectContaining({ minQuantity: 0, maxQuantity: 0, threshold: 0 }),
        item.id,
      ),
    )
  })
})
