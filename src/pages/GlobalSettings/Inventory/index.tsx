import { toast } from 'sonner'
import { ItemDetailsPage } from './ItemDetailsPage'
import { ItemThresholdsPage } from './ItemThresholdsPage'
import { ItemImportPage } from './ItemImportPage'
import { Routes, Route, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import type { ColumnDef, PaginationState, SortingState, Updater } from '@tanstack/react-table'
import { FolderOpen, Building2, Plus, MoreHorizontal, Pencil, MapPin, Users, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
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
function Status({ active }: { active: boolean }) {
  return <Badge variant={active ? 'secondary' : 'outline'}>{active ? 'Active' : 'Inactive'}</Badge>
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
      <NativeSelect
        aria-label="Filter status"
        value={search.get('status') ?? ''}
        onChange={(e) => update({ status: e.target.value, page: '1' })}
      >
        <NativeSelectOption value="">All statuses</NativeSelectOption>
        <NativeSelectOption value="true">Active</NativeSelectOption>
        <NativeSelectOption value="false">Inactive</NativeSelectOption>
      </NativeSelect>
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
      description="Manage categories, vendors and availability across your locations."
      onBack={() => navigate('/global-settings')}
    >
      <FormSection title="Inventory">
        <Tabs value={tab} onValueChange={(value) => setSearch({ tab: String(value) })}>
          <TabsList>
            <TabsTrigger value="categories">
              <FolderOpen />
              Categories
            </TabsTrigger>
            <TabsTrigger value="vendors">
              <Users />
              Vendors
            </TabsTrigger>
          </TabsList>
          <TabsContent value="categories">
            <MasterList kind="categories" />
          </TabsContent>
          <TabsContent value="vendors">
            <MasterList kind="vendors" />
          </TabsContent>
        </Tabs>
      </FormSection>
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
  const columns: ColumnDef<Master>[] = [
    {
      accessorKey: 'name',
      header: nameHeader as ColumnDef<Master>['header'],
      cell: ({ row }) => {
        const record = row.original
        return (
          <div className="flex items-center gap-3">
            {'image' in record && record.image ? (
              <img src={record.image} alt="" className="size-10 rounded-lg object-cover" />
            ) : kind === 'categories' ? (
              <FolderOpen className="size-8 text-muted-foreground" />
            ) : (
              <Building2 className="size-8 text-muted-foreground" />
            )}
            <div>
              {kind === 'categories' ? (
                <Link
                  className="font-semibold hover:underline"
                  to={`${categoryPath(record.id)}?${new URLSearchParams({ origin: search })}`}
                >
                  {record.name}
                </Link>
              ) : (
                <span className="font-semibold">{record.name}</span>
              )}
              {'description' in record && record.description ? (
                <p className="max-w-sm truncate text-xs text-muted-foreground">{record.description}</p>
              ) : 'contactPerson' in record && record.contactPerson ? (
                <p className="text-xs text-muted-foreground">Contact: {record.contactPerson}</p>
              ) : null}
            </div>
          </div>
        )
      },
    },
    ...(kind === 'categories'
      ? [
          {
            id: 'items',
            header: 'Items',
            cell: ({ row }: { row: { original: Master } }) =>
              'itemCount' in row.original ? row.original.itemCount : 0,
          },
        ]
      : [
          {
            id: 'contact',
            header: 'Contact Info',
            cell: ({ row }: { row: { original: Master } }) =>
              'email' in row.original ? (
                <div className="flex flex-col gap-1">
                  <span>{row.original.email || '—'}</span>
                  <span>{row.original.phone || '—'}</span>
                </div>
              ) : null,
          },
        ]),
    ...(kind === 'vendors' ? [{ accessorKey: 'address', header: 'Address' }] : []),
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Status active={row.original.isActive} /> },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <RowActions
          name={row.original.name}
          actions={[
            ...(kind === 'categories'
              ? [
                  {
                    label: 'View Inventory',
                    icon: FolderOpen,
                    onClick: () =>
                      navigate(`${categoryPath(row.original.id)}?${new URLSearchParams({ origin: search })}`),
                  },
                ]
              : []),
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => navigate(target(`${inventoryBase}/${kind}/${row.original.id}/edit`)),
            },
            ...(kind === 'vendors'
              ? [
                  {
                    label: row.original.isActive ? 'Deactivate' : 'Reactivate',
                    icon: Pencil,
                    onClick: () => {
                      if (!statusMutation.isPending)
                        void statusMutation
                          .mutateAsync({ id: row.original.id, isActive: !row.original.isActive })
                          .then(() => toast.success('Supplier status updated'))
                          .catch(() => toast.error('Unable to update supplier status'))
                    },
                  },
                ]
              : []),
            {
              label: 'Manage Locations',
              icon: MapPin,
              onClick: () => navigate(target(`${inventoryBase}/${kind}/${row.original.id}/locations`)),
            },
          ]}
        />
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
          <Button onClick={() => navigate(target(`${inventoryBase}/${kind}/new`))}>
            <Plus data-icon="inline-start" />
            Add {kind === 'categories' ? 'Category' : 'Vendor'}
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
  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: 'name',
      header: nameHeader as ColumnDef<InventoryItem>['header'],
      cell: ({ row }) => (
        <Link
          className="font-semibold hover:underline"
          to={`${categoryPath(categoryId)}/items/${row.original.id}${search}`}
        >
          {row.original.name}
          {category.data.fieldDefinitions.some((f) => f.fieldName.toLowerCase() === 'formulation') && (
            <span className="block text-xs font-normal text-muted-foreground">
              {String(
                row.original.customFields.find(
                  (v) =>
                    v.fieldDefinitionId ===
                    category.data.fieldDefinitions.find((f) => f.fieldName.toLowerCase() === 'formulation')?.id,
                )?.value ?? '',
              )}
            </span>
          )}
        </Link>
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
      cell: ({ row }) => `${row.original.packQuantity} ${row.original.packUnit} per ${row.original.packType}`,
    },
    {
      id: 'vendors',
      header: 'Vendors',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.vendorAssignments.length ? (
            [...new Set(row.original.vendorAssignments.map((a) => a.vendorId))].map((id) => (
              <Badge key={id} variant="outline">
                {vendors.data?.find((v) => v.id === id)?.name ?? 'Vendor'}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">No vendors</span>
          )}
        </div>
      ),
    },
    {
      id: 'locations',
      header: 'Locations',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.locationIds.length ? (
            row.original.locationIds.map((id) => (
              <Badge key={id} variant="outline">
                {properties.data?.find((p) => p.id === id)?.property_name ?? 'Location'}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">No locations</span>
          )}
        </div>
      ),
    },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Status active={row.original.isActive} /> },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
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
              icon: Pencil,
              onClick: () => navigate(`${categoryPath(categoryId)}/items/${row.original.id}/thresholds${search}`),
            },
            {
              label: 'Manage Suppliers',
              icon: Users,
              onClick: () => navigate(`${categoryPath(categoryId)}/items/${row.original.id}/vendors${search}`),
            },
          ]}
        />
      ),
    },
  ]
  return (
    <InventoryPage
      title={category.data.name}
      description={category.data.description ?? 'Manage inventory items in this category.'}
      onBack={() => navigate(`${inventoryBase}${params.get('origin') || ''}`)}
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate(`${categoryPath(categoryId)}/edit?${editParams}`)}>
          Edit Category
        </Button>
        <Button variant="outline" onClick={() => navigate(`${categoryPath(categoryId)}/locations?${editParams}`)}>
          Manage Locations
        </Button>
      </div>
      <Tabs
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
      >
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <FormSection title="Inventory Items">
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
                  <NativeSelect
                    aria-label="Filter supplier"
                    value={vendorId}
                    onChange={(e) =>
                      setCategorySearch((previous) => {
                        const next = new URLSearchParams(previous)
                        if (e.target.value) next.set('vendorId', e.target.value)
                        else next.delete('vendorId')
                        next.set('page', '1')
                        return next
                      })
                    }
                  >
                    <NativeSelectOption value="">All suppliers</NativeSelectOption>
                    {vendors.data?.map((v) => (
                      <NativeSelectOption key={v.id} value={v.id}>
                        {v.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Button
                    variant="outline"
                    disabled={!category.data.isActive}
                    onClick={() => navigate(`${categoryPath(categoryId)}/import${search}`)}
                  >
                    Import Items
                  </Button>
                  <Button
                    disabled={!category.data.isActive}
                    onClick={() => navigate(`${categoryPath(categoryId)}/items/new${search}`)}
                  >
                    <Plus data-icon="inline-start" />
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
        </TabsContent>
        <TabsContent value="suppliers">
          <FormSection title="Suppliers">
            <MasterList kind="vendors" returnTo={`${categoryPath(categoryId)}${search}`} />
          </FormSection>
        </TabsContent>
      </Tabs>
    </InventoryPage>
  )
}
