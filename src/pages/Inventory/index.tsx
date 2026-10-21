import { useState, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import {
  FolderOpen,
  Package,
  Users,
  ClipboardList,
  ArrowLeftRight,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ChevronRight,
  Eye,
  Plus,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { InventoryTabs } from '@/components/inventory/InventoryTabs'
import { ActiveStatus, InventoryStatus } from '@/components/inventory/InventoryStatus'
import StatCard from '@/pages/AssetManagement/components/StatCard'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useLocation } from '@/hooks/useLocation'
import { useDebounce } from '@/hooks/useDebounce'
import { useCenterData, useCenterList, useCenterOptions } from '@/hooks/react-query/centerInventory'
import type {
  CenterAccess,
  CenterCategory,
  CenterItem,
  CenterStats,
  CenterLists,
  CenterListParams,
  PurchaseOrder,
  StockTransaction,
} from '@/lib/types/centerInventory'
import { poStatusLabels, sectionAccess } from '@/lib/types/centerInventory'
import { ErrorNotice, Section, Status } from './shared'
import { money, quantityDisplay } from './utils'
import { PurchaseOrderForm } from './PurchaseOrderForm'
import { AssignItemsForm } from './AssignItemsForm'
import { StockInForm } from './StockInForm'
import { SupplierList } from './Suppliers'
import { PODetail, TransactionDetail, ItemDetail } from './Details'
import { PageHeader } from '@/components/common/PageHeader'
import { CountBadge, EntityCell, LocationChips, RowActionButtons } from '@/components/inventory/InventoryCells'
export default function InventoryPage() {
  const { selectedLocationId } = useLocation()
  return (
    <div className="min-w-0 space-y-6 pb-8">
      <PageHeader
        icon={Package}
        title="Inventory"
        description="Manage property inventory: items, stock, purchase orders and suppliers."
      />

      {selectedLocationId ? (
        <PropertyInventory key={selectedLocationId} locationId={selectedLocationId} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Select a property</EmptyTitle>
            <EmptyDescription>Select a property from the header to view its inventory.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
function PropertyInventory({ locationId }: { locationId: string }) {
  const access = useCenterData<CenterAccess>(locationId, 'access')
  const [params, setParams] = useSearchParams()
  // Ignore detail state from a different property; every new link carries its scope.
  const sameProperty = !params.get('locationId') || params.get('locationId') === locationId
  const categoryId = sameProperty ? (params.get('id') ?? params.get('categoryId') ?? '') : ''
  const navigate = (values: Record<string, string>) => setParams({ locationId, ...values })
  if (access.isPending) return <Skeleton className="h-64" />
  if (access.isError) return <ErrorNotice error={access.error} retry={() => void access.refetch()} />
  return categoryId ? (
    <CategoryInventory
      key={categoryId}
      locationId={locationId}
      categoryId={categoryId}
      access={access.data}
      params={params}
      navigate={navigate}
    />
  ) : (
    <CategoryList
      locationId={locationId}
      onSelect={(c) => navigate({ id: c.id, category: c.name.toLowerCase().replace(/\W+/g, '-'), tab: 'items' })}
    />
  )
}
function CategoryList({ locationId, onSelect }: { locationId: string; onSelect: (category: CenterCategory) => void }) {
  return (
    <InventoryTable
      locationId={locationId}
      kind="categories"
      columns={[
        {
          accessorKey: 'name',
          header: 'Category',
          cell: ({ row }) => (
            <EntityCell
              icon={FolderOpen}
              image={row.original.image}
              title={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto p-0 cursor-pointer text-left hover:text-[#005390] hover:underline hover:bg-transparent font-normal whitespace-normal justify-start inline"
                  onClick={() => onSelect(row.original)}
                >
                  {row.original.name}
                </Button>
              }
              subtitle={row.original.description}
            />
          ),
        },
        {
          accessorKey: 'itemCount',
          header: 'Items',
          cell: ({ row }) => <CountBadge count={row.original.itemCount ?? 0} noun="item" />,
        },
        {
          id: 'status',
          header: 'Status',
          cell: ({ row }) => <ActiveStatus active={row.original.isActive} />,
        },
      ]}
    />
  )
}
function CategoryInventory({
  locationId,
  categoryId,
  access,
  params,
  navigate,
}: {
  locationId: string
  categoryId: string
  access: CenterAccess
  params: URLSearchParams
  navigate: (values: Record<string, string>) => void
}) {
  const category = useCenterData<CenterCategory>(locationId, `categories/${categoryId}`)
  const stats = useCenterData<CenterStats>(locationId, 'stats', { categoryId })
  const [modal, setModal] = useState<'po' | 'stock' | 'assign' | null>(null)
  // Each tab is an Inventory sub-module with its own access.
  const itemsAccess = sectionAccess(access, 'INVENTORY.ITEMS')
  const suppliersAccess = sectionAccess(access, 'INVENTORY.SUPPLIERS')
  const poAccess = sectionAccess(access, 'INVENTORY.PURCHASE_ORDERS')
  const txAccess = sectionAccess(access, 'INVENTORY.TRANSACTIONS')
  const tabAccess: Record<string, boolean> = {
    items: itemsAccess.view,
    suppliers: suppliersAccess.view,
    'purchase-orders': poAccess.view,
    transactions: txAccess.view,
  }
  const requested = params.get('tab') ?? ''
  const current = tabAccess[requested] ? requested : (Object.keys(tabAccess).find((t) => tabAccess[t]) ?? 'items')
  const poId = params.get('poId'),
    transactionId = params.get('transactionId'),
    itemId = params.get('itemId')
  const go = (values: Record<string, string>) =>
    navigate({ id: categoryId, category: params.get('category') ?? '', ...values })
  const showPO = (id: string) => go({ tab: 'purchase-orders', poId: id })
  const showTransaction = (id: string) => go({ tab: 'transactions', transactionId: id })
  if (category.isPending) return <Skeleton className="h-64" />
  if (category.isError) return <ErrorNotice error={category.error} retry={() => void category.refetch()} />
  return (
    <div className="min-w-0 space-y-6">
      {/* Where we are: Inventory › category */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-gray-500">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate({})}
          className="h-auto p-0 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-[#005390]"
        >
          <ArrowLeft className="size-3.5" />
          Back to Categories
        </Button>
        <ChevronRight className="size-3.5 text-gray-300" />
        <span>Inventory</span>
        <ChevronRight className="size-3.5 text-gray-300" />
        <span className="text-[#005390]">{category.data.name}</span>
      </nav>

      {/* The category this page is about */}
      <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-[#005390]/15 bg-gradient-to-r from-[#005390]/[0.07] to-white p-5">
        {category.data.image ? (
          <img
            src={category.data.image}
            alt=""
            className="size-16 shrink-0 rounded-2xl object-cover ring-2 ring-white shadow-sm"
          />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#005390] text-white shadow-sm">
            <FolderOpen className="size-8" />
          </span>
        )}
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[#005390]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#005390]">
            Category
          </span>
          <h2 className="mt-1 break-words text-2xl font-bold text-gray-900">{category.data.name}</h2>
          {category.data.description && <p className="text-sm text-gray-500">{category.data.description}</p>}
        </div>
      </div>
      {stats.isError ? (
        <ErrorNotice error={stats.error} retry={() => void stats.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Items"
            value={stats.data?.totalItems ?? '—'}
            description="Items in this category"
            icon={Package}
            color="blue"
            isLoading={stats.isPending}
          />
          <StatCard
            title="Low Stock"
            value={stats.data?.lowStockItems ?? '—'}
            description="Items needing replenishment"
            icon={AlertTriangle}
            color="orange"
            isLoading={stats.isPending}
          />
          <StatCard
            title="Expiring Soon"
            value={stats.data?.expiringSoon ?? '—'}
            description="Items approaching expiry"
            icon={Clock}
            color="red"
            isLoading={stats.isPending}
          />
        </div>
      )}
      <InventoryTabs
        value={current}
        onValueChange={(value) => go({ tab: value })}
        tabs={[
          {
            value: 'items',
            label: 'Items',
            shortLabel: 'Items',
            icon: Package,
            content: (
              <>
                {itemId ? (
                  <ItemDetail
                    locationId={locationId}
                    id={itemId}
                    category={category.data}
                    access={itemsAccess}
                    onBack={() => go({ tab: 'items' })}
                    onTransaction={showTransaction}
                  />
                ) : (
                  <Section title={`Items in ${category.data.name}`}>
                    <ItemList
                      locationId={locationId}
                      categoryId={categoryId}
                      onSelect={(id) => go({ tab: 'items', itemId: id })}
                      onPO={() => setModal('po')}
                      canCreate={poAccess.create}
                    />
                  </Section>
                )}
              </>
            ),
          },
          {
            value: 'suppliers',
            label: 'Suppliers',
            shortLabel: 'Suppliers',
            icon: Users,
            content: (
              <>
                <Section title={`Suppliers for ${category.data.name}`}>
                  <SupplierList locationId={locationId} categoryId={categoryId} access={access} />
                </Section>
              </>
            ),
          },
          {
            value: 'purchase-orders',
            label: 'Purchase Orders',
            shortLabel: 'Purchase Orders',
            icon: ClipboardList,
            content: (
              <>
                {poId ? (
                  <PODetail
                    locationId={locationId}
                    id={poId}
                    categoryId={categoryId}
                    access={poAccess}
                    onBack={() => go({ tab: 'purchase-orders' })}
                    onTransaction={showTransaction}
                  />
                ) : (
                  <Section
                    title={`Purchase orders for ${category.data.name}`}
                    action={
                      poAccess.create ? (
                        <Button onClick={() => setModal('po')}>
                          <Plus data-icon="inline-start" />
                          Create Purchase Order
                        </Button>
                      ) : undefined
                    }
                  >
                    <POList locationId={locationId} categoryId={categoryId} onSelect={showPO} />
                  </Section>
                )}
              </>
            ),
          },
          {
            value: 'transactions',
            label: 'Transactions',
            shortLabel: 'Transactions',
            icon: ArrowLeftRight,
            content: (
              <>
                {transactionId ? (
                  <TransactionDetail
                    locationId={locationId}
                    id={transactionId}
                    onBack={() => go({ tab: 'transactions' })}
                    onPO={showPO}
                  />
                ) : (
                  <Section
                    title={`Stock transactions in ${category.data.name}`}
                    action={
                      txAccess.create ? (
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => setModal('stock')}>Stock In</Button>
                          <Button variant="outline" onClick={() => setModal('assign')}>
                            Assign Items
                          </Button>
                        </div>
                      ) : undefined
                    }
                  >
                    <TransactionList locationId={locationId} categoryId={categoryId} onSelect={showTransaction} />
                  </Section>
                )}
              </>
            ),
          },
        ].filter((tab) => tabAccess[tab.value])}
      />
      {modal === 'po' && (
        <PurchaseOrderForm
          locationId={locationId}
          categoryId={categoryId}
          onClose={() => setModal(null)}
          onSaved={(id) => {
            setModal(null)
            showPO(id)
          }}
        />
      )}
      {modal === 'assign' && (
        <AssignItemsForm
          locationId={locationId}
          categoryId={categoryId}
          onClose={() => setModal(null)}
          onSaved={(id) => {
            setModal(null)
            showTransaction(id)
          }}
        />
      )}
      {modal === 'stock' && (
        <StockInForm
          locationId={locationId}
          categoryId={categoryId}
          onClose={() => setModal(null)}
          onSaved={(id) => {
            setModal(null)
            showTransaction(id)
          }}
        />
      )}
    </div>
  )
}
function InventoryTable<K extends keyof CenterLists>({
  locationId,
  kind,
  categoryId,
  columns,
  filters = {},
  filterActions,
}: {
  locationId: string
  kind: K
  categoryId?: string
  columns: ColumnDef<CenterLists[K]>[]
  filters?: CenterListParams
  filterActions?: ReactNode
}) {
  const scope = JSON.stringify({ locationId, kind, categoryId, filters })
  const [state, setState] = useState({ scope, search: '', pagination: { pageIndex: 0, pageSize: 10 } })
  // Reset results when filters change without remounting the toolbar's focused controls.
  if (state.scope !== scope) setState({ scope, search: '', pagination: { pageIndex: 0, pageSize: 10 } })
  const { search, pagination } = state
  const searchInput = useMemo(() => ({ scope: state.scope, search }), [state.scope, search])
  const debounced = useDebounce(searchInput, 300)
  const debouncedSearch = debounced.scope === scope ? debounced.search : ''
  const query = useCenterList(locationId, kind, {
    ...filters,
    ...(categoryId ? { categoryId } : {}),
    search: debouncedSearch,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  })
  return (
    <DataTable
      columns={columns}
      data={query.data?.records ?? []}
      getRowId={(r) => r.id}
      isLoading={query.isPending}
      error={query.error ? query.error.message : undefined}
      onRetry={() => void query.refetch()}
      manualPagination
      pagination={pagination}
      onPaginationChange={(updater) =>
        setState((current) => ({
          ...current,
          pagination: typeof updater === 'function' ? updater(current.pagination) : updater,
        }))
      }
      rowCount={query.data?.pagination.totalItems ?? 0}
      searchValue={search}
      onSearchChange={(value) => {
        setState((current) => ({ ...current, search: value, pagination: { ...current.pagination, pageIndex: 0 } }))
      }}
      filterActions={filterActions}
      searchPlaceholder={`Search ${kind === 'purchase-orders' ? 'purchase orders' : kind}…`}
    />
  )
}
function SupplierFilter({
  locationId,
  value,
  onChange,
}: {
  locationId: string
  value: string
  onChange: (value: string) => void
}) {
  const suppliers = useCenterOptions(locationId, 'suppliers')
  return (
    <NativeSelect aria-label="Filter by supplier" value={value} onChange={(e) => onChange(e.target.value)}>
      <NativeSelectOption value="">All Suppliers</NativeSelectOption>
      {suppliers.data?.map((s) => (
        <NativeSelectOption key={s.id} value={s.id}>
          {s.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
function ItemList({
  locationId,
  categoryId,
  onSelect,
  onPO,
  canCreate,
}: {
  locationId: string
  categoryId: string
  onSelect: (id: string) => void
  onPO: () => void
  canCreate: boolean
}) {
  const [supplierId, setSupplierId] = useState(''),
    [stockFilter, setStockFilter] = useState('')
  const columns: ColumnDef<CenterItem>[] = [
    {
      accessorKey: 'name',
      header: 'Item',
      cell: ({ row }) => (
        <EntityCell
          icon={Package}
          title={
            <Button
              type="button"
              variant="ghost"
              className="h-auto p-0 cursor-pointer text-left hover:text-[#005390] hover:underline hover:bg-transparent font-normal whitespace-normal justify-start inline"
              onClick={() => onSelect(row.original.id)}
            >
              {row.original.name}
            </Button>
          }
        />
      ),
    },
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
      id: 'suppliers',
      header: 'Suppliers',
      cell: ({ row }) => (
        <LocationChips
          icon={Truck}
          iconClass="text-amber-600"
          empty="No suppliers assigned"
          names={row.original.suppliers.map((s) => s.name)}
        />
      ),
    },
    {
      id: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const item = row.original
        const low = item.quantity < item.threshold
        const out = item.quantity <= 0
        return (
          <div className="flex min-w-[220px] flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{item.stockDisplay}</span>
              {out ? (
                <InventoryStatus tone="red">Out of stock</InventoryStatus>
              ) : low ? (
                <InventoryStatus tone="amber">Low Stock</InventoryStatus>
              ) : null}
            </div>
            <span className="text-[11px] text-gray-500">
              Min {quantityDisplay(item.minQuantity, item)} · Reorder at {quantityDisplay(item.threshold, item)} · Max{' '}
              {item.maxQuantity ? quantityDisplay(item.maxQuantity, item) : '—'}
            </span>
            {low && canCreate && (
              <Button
                type="button"
                variant="ghost"
                onClick={onPO}
                className="h-auto inline-flex w-fit cursor-pointer items-center gap-1 rounded-md border border-[#005390]/30 bg-[#005390]/5 px-2 py-0.5 text-[11px] font-semibold text-[#005390] hover:bg-[#005390]/10"
              >
                <Plus className="size-3" />
                Create PO
              </Button>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <ActiveStatus active={row.original.isActive} />,
    },
    {
      id: 'actions',
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <RowActionButtons actions={[{ label: 'View details', icon: Eye, onClick: () => onSelect(row.original.id) }]} />
      ),
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <InventoryTable
        filterActions={
          <div className="flex flex-wrap gap-3">
            <SupplierFilter locationId={locationId} value={supplierId} onChange={setSupplierId} />
            <NativeSelect
              aria-label="Filter by stock"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <NativeSelectOption value="">All Stock</NativeSelectOption>
              <NativeSelectOption value="below_min">Below Minimum</NativeSelectOption>
              <NativeSelectOption value="below_threshold">Below Threshold</NativeSelectOption>
              <NativeSelectOption value="out_of_stock">Out of Stock</NativeSelectOption>
            </NativeSelect>
          </div>
        }

        locationId={locationId}
        categoryId={categoryId}
        kind="items"
        columns={columns}
        filters={{ ...(supplierId ? { supplierId } : {}), ...(stockFilter ? { stockFilter } : {}) }}
      />
    </div>
  )
}
function POList({
  locationId,
  categoryId,
  onSelect,
}: {
  locationId: string
  categoryId: string
  onSelect: (id: string) => void
}) {
  const [status, setStatus] = useState(''),
    [supplierId, setSupplierId] = useState('')
  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'poNumber',
      header: 'PO Number',
      cell: ({ row }) => (
        <Button variant="link" onClick={() => onSelect(row.original.id)}>
          {row.original.poNumber}
        </Button>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier / Recipient',
      cell: ({ row }) =>
        row.original.transactionType === 'issue'
          ? (row.original.recipientName ?? '—')
          : (row.original.supplier?.name ?? '—'),
    },
    { accessorKey: 'itemCount', header: 'Items' },
    { id: 'amount', header: 'Total Amount', cell: ({ row }) => money(row.original.totalAmount) },
    { id: 'status', header: 'Status', cell: ({ row }) => <Status status={row.original.status} /> },
    { id: 'date', header: 'Created Date', cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button variant="ghost" onClick={() => onSelect(row.original.id)}>
          View Details
        </Button>
      ),
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <InventoryTable
        filterActions={
          <div className="flex flex-wrap gap-3">
            <SupplierFilter locationId={locationId} value={supplierId} onChange={setSupplierId} />
            <NativeSelect aria-label="Filter PO status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <NativeSelectOption value="">All Statuses</NativeSelectOption>
              {Object.entries(poStatusLabels).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        }

        locationId={locationId}
        categoryId={categoryId}
        kind="purchase-orders"
        columns={columns}
        filters={{ ...(status ? { status } : {}), ...(supplierId ? { supplierId } : {}) }}
      />
    </div>
  )
}
function TransactionList({
  locationId,
  categoryId,
  onSelect,
}: {
  locationId: string
  categoryId: string
  onSelect: (id: string) => void
}) {
  const stats = useCenterData<CenterStats>(locationId, 'stats', { categoryId })
  const [supplierId, setSupplierId] = useState(''),
    [startDate, setStartDate] = useState(''),
    [endDate, setEndDate] = useState('')
  const columns: ColumnDef<StockTransaction>[] = [
    {
      accessorKey: 'transactionNumber',
      header: 'Transaction ID',
      cell: ({ row }) => (
        <Button variant="link" onClick={() => onSelect(row.original.id)}>
          {row.original.transactionNumber}
        </Button>
      ),
    },
    { accessorKey: 'date', header: 'Date' },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.transactionType === 'issue' ? 'outline' : 'secondary'}>
          {row.original.transactionType === 'issue' ? 'Stock Out' : 'Stock In'}
        </Badge>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier / Recipient',
      cell: ({ row }) =>
        row.original.transactionType === 'issue'
          ? (row.original.recipientName ?? '—')
          : (row.original.supplier?.name ?? '—'),
    },
    { accessorKey: 'itemCount', header: 'Items' },
    {
      id: 'total',
      header: 'MRP Amount',
      cell: ({ row }) => (row.original.mrpAmount == null ? '—' : money(row.original.mrpAmount)),
    },
    {
      id: 'source',
      header: 'Source',
      cell: ({ row }) =>
        row.original.transactionType === 'issue'
          ? 'Assign Items'
          : row.original.purchaseOrderId
            ? 'Purchase Order'
            : 'Direct Stock In',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button variant="ghost" onClick={() => onSelect(row.original.id)}>
          View Details
        </Button>
      ),
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Transactions"
          value={stats.data?.totalTransactions ?? '—'}
          description="All inventory movements"
          icon={ArrowLeftRight}
          color="blue"
          isLoading={stats.isPending}
        />
        <StatCard
          title="Total Purchases"
          value={stats.data?.totalPurchases ?? '—'}
          description="Stock received"
          icon={Package}
          color="green"
          isLoading={stats.isPending}
        />
        <StatCard
          title="Total Issues"
          value={stats.data?.totalIssues ?? '—'}
          description="Stock assigned"
          icon={Users}
          color="purple"
          isLoading={stats.isPending}
        />
      </div>

      <InventoryTable
        filterActions={
          <div className="flex flex-wrap items-end gap-3">
            <SupplierFilter locationId={locationId} value={supplierId} onChange={setSupplierId} />
            <label htmlFor="transaction-from" className="flex flex-col gap-1 text-sm">
              From
              <Input
                id="transaction-from"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label htmlFor="transaction-to" className="flex flex-col gap-1 text-sm">
              To
              <Input
                id="transaction-to"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        }

        locationId={locationId}
        categoryId={categoryId}
        kind="transactions"
        columns={columns}
        filters={{
          ...(supplierId ? { supplierId } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        }}
      />
    </div>
  )
}
