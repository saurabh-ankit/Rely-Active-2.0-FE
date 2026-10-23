import { toast } from 'sonner'
import { ItemDetailsPage } from './ItemDetailsPage'
import { ItemThresholdsPage } from './ItemThresholdsPage'
import { ItemImportPage } from './ItemImportPage'
import { Routes, Route, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import type { ColumnDef, PaginationState, SortingState, Updater } from '@tanstack/react-table'
import {
  FolderOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  MapPin,
  Users,
  ArrowUpDown,
  Briefcase,
  Package,
  Gauge,
  Power,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { InventoryTabs } from '@/components/inventory/InventoryTabs'
import { ActiveStatus } from '@/components/inventory/InventoryStatus'
import {
  ContactCell,
  CountBadge,
  EntityCell,
  LocationChips,
  RowActionButtons,
} from '@/components/inventory/InventoryCells'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useInventoryList,
  useInventoryDetail,
  useInventoryVendorOptions,
  useInventoryProperties,
  useSetInventoryVendorStatus,
} from '@/hooks/react-query/inventory'
import type { InventoryCategory, InventoryVendor, InventoryItem, InventoryListParams } from '@/lib/types/inventory'
import { InventoryPage, FormSection, InventoryLoading, InventoryLoadError } from './PageLayout'
import { CategoryFormPage } from './CategoryFormPage'
import { VendorFormPage } from './VendorFormPage'
import { ItemFormPage } from './ItemFormPage'
import { LocationsPage } from './LocationsPage'
import { ItemVendorsPage } from './ItemVendorsPage'
import { inventoryBase, categoryPath, withInventoryReturn } from './navigation'

export default function InventorySettings() {
  return (
    <Routes>
      <Route index element={<GlobalInventory />} />
      <Route path="categories/new" element={<CategoryFormPage />} />
      <Route path="categories/:categoryId" element={<CategoryItems />} />
      <Route path="categories/:categoryId/edit" element={<CategoryFormPage />} />
      <Route path="categories/:categoryId/locations" element={<LocationsPage kind="categories" />} />
      <Route path="vendors/new" element={<VendorFormPage />} />
      <Route path="vendors/:vendorId/edit" element={<VendorFormPage />} />
      <Route path="vendors/:vendorId/locations" element={<LocationsPage kind="vendors" />} />
      <Route path="categories/:categoryId/import" element={<ItemImportPage />} />
      <Route path="categories/:categoryId/items/:itemId" element={<ItemDetailsPage />} />
      <Route path="categories/:categoryId/items/:itemId/thresholds" element={<ItemThresholdsPage />} />
      <Route path="categories/:categoryId/items/new" element={<ItemFormPage />} />
      <Route path="categories/:categoryId/items/:itemId/edit" element={<ItemFormPage />} />
      <Route path="categories/:categoryId/items/:itemId/vendors" element={<ItemVendorsPage />} />
      <Route
        path="*"
        element={
          <p>
            Inventory page not found. <Link to={inventoryBase}>Back to inventory</Link>
          </p>
        }
      />
    </Routes>
  )
}
function RowActions({
  name,
  actions,
}: {
  name: string
  actions: { label: string; icon: typeof Pencil; onClick: () => void }[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${name}`} />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {actions.map((action) => (
            <DropdownMenuItem key={action.label} onClick={action.onClick}>
              <action.icon />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
function useListState() {
  const [search, setSearch] = useSearchParams()
  const text = search.get('search') ?? ''
  const debounced = useDebounce(text, 300)
  const number = (key: string, fallback: number, max: number) => {
    const value = Number(search.get(key))
    return Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback
  }
  const pagination: PaginationState = { pageIndex: number('page', 1, 1000000) - 1, pageSize: number('limit', 10, 100) }
  const sorting: SortingState = [{ id: 'name', desc: search.get('order') === 'DESC' }]
  const update = (values: Record<string, string>) =>
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [key, value] of Object.entries(values)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  const params: InventoryListParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: debounced,
    sortBy: 'name',
    sortOrder: sorting[0].desc ? 'DESC' : 'ASC',
    ...(search.get('status') === 'true' || search.get('status') === 'false'
      ? { isActive: search.get('status') as 'true' | 'false' }
      : {}),
  }
  return {
    params,
    searchValue: text,
    onSearchChange: (value: string) => update({ search: value, page: '1' }),
    pagination,
    onPaginationChange: (updater: Updater<PaginationState>) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      update({ page: String(next.pageIndex + 1), limit: String(next.pageSize) })
    },
    sorting,
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      update({ order: next[0]?.desc ? 'DESC' : 'ASC', page: '1' })
    },
    filter: (
      <Select
        value={search.get('status') || 'all'}
        onValueChange={(val) => update({ status: val === 'all' ? '' : val, page: '1' })}
      >
        <SelectTrigger
          aria-label="Filter status"
          className="w-[140px] h-9 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
        >
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="true">Active</SelectItem>
          <SelectItem value="false">Inactive</SelectItem>
        </SelectContent>
      </Select>
    ),
  }
}
const nameHeader: ColumnDef<InventoryCategory>['header'] = ({ column }) => (
  <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
    Name
    <ArrowUpDown data-icon="inline-end" />
  </Button>
)
function GlobalInventory() {
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const tab = search.get('tab') === 'vendors' ? 'vendors' : 'categories'
  return (
    <InventoryPage
      title="Global Inventory Management"
      description="Manage categories, suppliers and availability across your locations."
      onBack={() => navigate('/global-settings')}
      backLabel="Back to Global Settings"
      icon={Briefcase}
    >
      <InventoryTabs
        value={tab}
        onValueChange={(value) => setSearch({ tab: value })}
        tabs={[
          {
            value: 'categories',
            label: 'Categories',
            shortLabel: 'Categories',
            icon: FolderOpen,
            content: <MasterList kind="categories" />,
          },
          {
            value: 'vendors',
            label: 'Suppliers',
            shortLabel: 'Suppliers',
            icon: Users,
            content: <MasterList kind="vendors" />,
          },
        ]}
      />
    </InventoryPage>
  )
}
function MasterList({ kind, returnTo }: { returnTo?: string; kind: 'categories' | 'vendors' }) {
  const statusMutation = useSetInventoryVendorStatus()
  const state = useListState()
  const query = useInventoryList(kind, state.params)
  const navigate = useNavigate()
  const { search } = useLocation()
  const target = (path: string) => (returnTo ? withInventoryReturn(`${path}${search}`, returnTo) : `${path}${search}`)
  type Master = InventoryCategory | InventoryVendor
  const properties = useInventoryProperties()
  const locationNames = (ids: string[]) => {
    const byId = new Map((properties.data ?? []).map((p) => [p.id, p.property_name]))
    return ids.map((id) => byId.get(id) ?? 'Unknown location')
  }
  const columns: ColumnDef<Master>[] = [
    {
      accessorKey: 'name',
      header: nameHeader as ColumnDef<Master>['header'],
      cell: ({ row }) => {
        const record = row.original
        return kind === 'categories' ? (
          <EntityCell
            icon={FolderOpen}
            image={'image' in record ? record.image : null}
            title={
              <Link
                className="hover:text-[#005390] hover:underline"
                to={`${categoryPath(record.id)}?${new URLSearchParams({ origin: search })}`}
              >
                {record.name}
              </Link>
            }
            subtitle={'description' in record ? record.description : null}
          />
        ) : (
          <EntityCell
            icon={Truck}
            tone="amber"
            title={record.name}
            subtitle={'address' in record && record.address ? record.address : null}
          />
        )
      },
    },
    ...(kind === 'categories'
      ? [
          {
            id: 'items',
            header: 'Items',
            cell: ({ row }: { row: { original: Master } }) => (
              <CountBadge count={'itemCount' in row.original ? row.original.itemCount : 0} noun="item" />
            ),
          },
        ]
      : [
          {
            id: 'contact',
            header: 'Contact',
            cell: ({ row }: { row: { original: Master } }) =>
              'email' in row.original ? (
                <ContactCell
                  person={row.original.contactPerson}
                  email={row.original.email}
                  phone={row.original.phone}
                />
              ) : null,
          },
        ]),
    {
      id: 'locations',
      header: kind === 'categories' ? 'Available at' : 'Serves locations',
      cell: ({ row }) => <LocationChips names={locationNames(row.original.locationIds)} />,
    },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <ActiveStatus active={row.original.isActive} /> },
    {
      id: 'actions',
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) =>
        kind === 'vendors' ? (
          // Suppliers: the few actions are shown as buttons rather than hidden in a menu.
          <RowActionButtons
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () => navigate(target(`${inventoryBase}/${kind}/${row.original.id}/edit`)),
              },
              {
                label: 'Locations',
                icon: MapPin,
                onClick: () => navigate(target(`${inventoryBase}/${kind}/${row.original.id}/locations`)),
              },
              {
                label: row.original.isActive ? 'Deactivate' : 'Reactivate',
                icon: Power,
                tone: row.original.isActive ? 'danger' : 'default',
                disabled: statusMutation.isPending,
                onClick: () =>
                  void statusMutation
                    .mutateAsync({ id: row.original.id, isActive: !row.original.isActive })
                    .then(() => toast.success('Supplier status updated'))
                    .catch(() => toast.error('Unable to update supplier status')),
              },
            ]}
          />
        ) : (
          <div className="flex justify-end">
            <RowActions
              name={row.original.name}
              actions={[
                {
                  label: 'View Inventory',
                  icon: FolderOpen,
                  onClick: () =>
                    navigate(`${categoryPath(row.original.id)}?${new URLSearchParams({ origin: search })}`),
                },
                {
                  label: 'Edit',
                  icon: Pencil,
                  onClick: () => navigate(target(`${inventoryBase}/${kind}/${row.original.id}/edit`)),
                },
                {
                  label: 'Manage Locations',
                  icon: MapPin,
                  onClick: () => navigate(target(`${inventoryBase}/${kind}/${row.original.id}/locations`)),
                },
              ]}
            />
          </div>
        ),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={query.data?.records ?? []}
      isLoading={query.isPending}
      error={query.isError ? 'Unable to load inventory records. Try again.' : undefined}
      onRetry={() => void query.refetch()}
      getRowId={(r) => r.id}
      searchValue={state.searchValue}
      onSearchChange={state.onSearchChange}
      searchPlaceholder={`Search ${kind}…`}
      filterActions={
        <>
          {state.filter}
          {query.isError && (
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          )}
          <Button
            className="bg-[#005390] hover:bg-[#004170] text-white font-bold rounded-xl shadow-md cursor-pointer"
            onClick={() => navigate(target(`${inventoryBase}/${kind}/new`))}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add {kind === 'categories' ? 'Category' : 'Supplier'}
          </Button>
        </>
      }
      manualPagination
      pagination={state.pagination}
      onPaginationChange={state.onPaginationChange}
      rowCount={query.data?.pagination.totalItems ?? 0}
      manualSorting
      sorting={state.sorting}
      onSortingChange={state.onSortingChange}
    />
  )
}
function CategoryItems() {
  const { categoryId = '' } = useParams()
  const category = useInventoryDetail('categories', categoryId)
  const state = useListState()
  const [categorySearch, setCategorySearch] = useSearchParams()
  const vendorId = categorySearch.get('vendorId') ?? ''
  const items = useInventoryList('items', { ...state.params, categoryId, ...(vendorId ? { vendorId } : {}) })
  const vendors = useInventoryVendorOptions()
  const properties = useInventoryProperties()
  const navigate = useNavigate()
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  if (category.isPending) return <InventoryLoading />
  if (category.isError) return <InventoryLoadError retry={() => void category.refetch()} />
  const editParams = new URLSearchParams(search)
  editParams.set('returnTo', 'category')
  const formulationField = category.data.fieldDefinitions.find((f) => f.fieldName.toLowerCase() === 'formulation')
  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: 'name',
      header: nameHeader as ColumnDef<InventoryItem>['header'],
      cell: ({ row }) => (
        <EntityCell
          icon={Package}
          title={
            <Link
              className="hover:text-[#005390] hover:underline"
              to={`${categoryPath(categoryId)}/items/${row.original.id}${search}`}
            >
              {row.original.name}
            </Link>
          }
          subtitle={
            formulationField
              ? String(row.original.customFields.find((v) => v.fieldDefinitionId === formulationField.id)?.value ?? '')
              : null
          }
        />
      ),
    },
    ...(category.data.fieldDefinitions.some((f) => f.fieldName.toLowerCase() === 'type')
      ? [
          {
            id: 'type',
            header: 'Type',
            cell: ({ row }: { row: { original: InventoryItem } }) =>
              String(
                row.original.customFields.find(
                  (v) =>
                    v.fieldDefinitionId ===
                    category.data.fieldDefinitions.find((f) => f.fieldName.toLowerCase() === 'type')?.id,
                )?.value ?? '—',
              ),
          },
        ]
      : []),
    {
      id: 'package',
      header: 'Package',
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <p className="text-sm font-semibold text-gray-900 tabular-nums">
            {row.original.packQuantity} {row.original.packUnit}
          </p>
          <p className="text-xs text-gray-500">per {row.original.packType}</p>
        </div>
      ),
    },
    {
      id: 'vendors',
      header: 'Suppliers',
      cell: ({ row }) => (
        <LocationChips
          icon={Truck}
          iconClass="text-amber-600"
          empty="No suppliers"
          names={[...new Set(row.original.vendorAssignments.map((a) => a.vendorId))].map(
            (id) => vendors.data?.find((v) => v.id === id)?.name ?? 'Vendor',
          )}
        />
      ),
    },
    {
      id: 'locations',
      header: 'Stocked at',
      cell: ({ row }) => (
        <LocationChips
          names={row.original.locationIds.map(
            (id) => properties.data?.find((p) => p.id === id)?.property_name ?? 'Location',
          )}
        />
      ),
    },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <ActiveStatus active={row.original.isActive} /> },
    {
      id: 'actions',
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            name={row.original.name}
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () => navigate(`${categoryPath(categoryId)}/items/${row.original.id}/edit${search}`),
              },
              {
                label: 'Manage Thresholds',
                icon: Gauge,
                onClick: () => navigate(`${categoryPath(categoryId)}/items/${row.original.id}/thresholds${search}`),
              },
              {
                label: 'Manage Suppliers',
                icon: Truck,
                onClick: () => navigate(`${categoryPath(categoryId)}/items/${row.original.id}/vendors${search}`),
              },
            ]}
          />
        </div>
      ),
    },
  ]
  return (
    <InventoryPage
      title={category.data.name}
      description={category.data.description ?? 'Manage inventory items in this category.'}
      onBack={() => navigate(`${inventoryBase}${params.get('origin') || ''}`)}
      backLabel="Back to Categories"
      icon={FolderOpen}
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-gray-200"
            onClick={() => navigate(`${categoryPath(categoryId)}/edit?${editParams}`)}
          >
            Edit Category
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-gray-200"
            onClick={() => navigate(`${categoryPath(categoryId)}/locations?${editParams}`)}
          >
            Manage Locations
          </Button>
        </div>
      }
    >
      <InventoryTabs
        value={categorySearch.get('categoryTab') === 'suppliers' ? 'suppliers' : 'items'}
        onValueChange={(value) =>
          setCategorySearch((previous) => {
            const next = new URLSearchParams(previous)
            next.set('categoryTab', String(value))
            next.delete('page')
            next.delete('search')
            next.delete('vendorId')
            return next
          })
        }
        tabs={[
          {
            value: 'items',
            label: 'Items',
            shortLabel: 'Items',
            icon: Package,
            content: (
              <FormSection
                icon={Package}
                title="Inventory Items"
                description="Items in this category: their package size, who supplies them and which properties stock them."
              >
                <DataTable
                  columns={columns}
                  data={items.data?.records ?? []}
                  isLoading={items.isPending}
                  error={items.isError ? 'Unable to load items. Try again.' : undefined}
                  onRetry={() => void items.refetch()}
                  getRowId={(r) => r.id}
                  searchValue={state.searchValue}
                  onSearchChange={state.onSearchChange}
                  searchPlaceholder="Search items…"
                  filterActions={
                    <>
                      {state.filter}
                      <Select
                        value={vendorId || 'all'}
                        onValueChange={(val) =>
                          setCategorySearch((previous) => {
                            const next = new URLSearchParams(previous)
                            if (val && val !== 'all') next.set('vendorId', val)
                            else next.delete('vendorId')
                            next.set('page', '1')
                            return next
                          })
                        }
                      >
                        <SelectTrigger
                          aria-label="Filter supplier"
                          className="w-auto min-w-[140px] h-9 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
                        >
                          <SelectValue placeholder="All suppliers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All suppliers</SelectItem>
                          {vendors.data?.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        className="rounded-xl border-gray-200"
                        disabled={!category.data.isActive}
                        onClick={() => navigate(`${categoryPath(categoryId)}/import${search}`)}
                      >
                        Import Items
                      </Button>
                      <Button
                        className="bg-[#005390] hover:bg-[#004170] text-white font-bold rounded-xl shadow-md cursor-pointer"
                        disabled={!category.data.isActive}
                        onClick={() => navigate(`${categoryPath(categoryId)}/items/new${search}`)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </>
                  }
                  manualPagination
                  pagination={state.pagination}
                  onPaginationChange={state.onPaginationChange}
                  rowCount={items.data?.pagination.totalItems ?? 0}
                  manualSorting
                  sorting={state.sorting}
                  onSortingChange={state.onSortingChange}
                />
              </FormSection>
            ),
          },
          {
            value: 'suppliers',
            label: 'Suppliers',
            shortLabel: 'Suppliers',
            icon: Users,
            content: (
              <FormSection icon={Users} title="Suppliers" description="Suppliers and the properties they serve.">
                <MasterList kind="vendors" returnTo={`${categoryPath(categoryId)}${search}`} />
              </FormSection>
            ),
          },
        ]}
      />
    </InventoryPage>
  )
}
