import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import {
  FolderOpen,
  Package,
  Users,
  ClipboardList,
  ArrowLeftRight,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
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
import { poStatusLabels } from '@/lib/types/centerInventory'
import StatCard from '@/pages/AssetManagement/components/StatCard'
import StatsGrid from '@/pages/AssetManagement/components/StatsGrid'
import { ErrorNotice, Status } from './shared'
import { money, quantityDisplay } from './utils'
import { PurchaseOrderForm } from './PurchaseOrderForm'
import { AssignItemsForm } from './AssignItemsForm'
import { StockInForm } from './StockInForm'
import { SupplierList } from './Suppliers'
import { PODetail, TransactionDetail, ItemDetail } from './Details'

export default function InventoryPage() {
  const { selectedLocationId, selectedLocationName } = useLocation()
  const statsQuery = useCenterData<CenterStats>(selectedLocationId ?? '', 'stats', {}, !!selectedLocationId)
  const stats = statsQuery.data

  return (
    <div className="space-y-6 pb-8">
      {/* Header matching Asset Management */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {selectedLocationName
              ? `Track and manage inventory at ${selectedLocationName}`
              : 'Track and manage items, stock levels, suppliers, and purchase orders'}
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-3">
            {stats.lowStockItems > 0 && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-3 py-1">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{stats.lowStockItems} Low Stock</span>
                <span className="sm:hidden">{stats.lowStockItems}</span>
              </Badge>
            )}
            {stats.outOfStockItems > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-200 px-3 py-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{stats.outOfStockItems} Out of Stock</span>
                <span className="sm:hidden">{stats.outOfStockItems}</span>
              </Badge>
            )}
            {stats.expiringSoon > 0 && (
              <Badge className="bg-pink-100 text-pink-800 border-pink-200 px-3 py-1">
                <Clock className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{stats.expiringSoon} Expiring Soon</span>
                <span className="sm:hidden">{stats.expiringSoon}</span>
              </Badge>
            )}
          </div>
        )}
      </div>

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
  const statsQuery = useCenterData<CenterStats>(locationId, 'stats')
  const [params, setParams] = useSearchParams()

  const sameProperty = !params.get('locationId') || params.get('locationId') === locationId
  const activeTab = sameProperty ? (params.get('tab') ?? 'items') : 'items'
  const categoryId = sameProperty ? (params.get('categoryId') ?? params.get('id') ?? '') : ''
  const poId = sameProperty ? (params.get('poId') ?? '') : ''
  const transactionId = sameProperty ? (params.get('transactionId') ?? '') : ''
  const itemId = sameProperty ? (params.get('itemId') ?? '') : ''

  const [modal, setModal] = useState<'po' | 'stock' | 'assign' | null>(null)

  const navigate = (values: Record<string, string>) => {
    const next: Record<string, string> = { locationId }
    for (const [k, v] of Object.entries(values)) {
      if (v) next[k] = v
    }
    setParams(next)
  }

  const go = (values: Record<string, string>) => {
    navigate({
      tab: values.tab ?? activeTab,
      categoryId: values.categoryId !== undefined ? values.categoryId : categoryId,
      ...values,
    })
  }

  const showPO = (id: string) => go({ tab: 'purchase-orders', poId: id })
  const showTransaction = (id: string) => go({ tab: 'transactions', transactionId: id })
  const showItem = (id: string) => go({ tab: 'items', itemId: id })

  if (access.isPending) return <Skeleton className="h-64" />
  if (access.isError) return <ErrorNotice error={access.error} retry={() => void access.refetch()} />

  const stats = statsQuery.data || {
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    expiringSoon: 0,
    totalValue: 0,
    totalPurchases: 0,
    totalIssues: 0,
    totalTransactions: 0,
  }
  const statsLoading = statsQuery.isPending
  const canCreate = access.data?.create ?? false

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <StatsGrid>
        <StatCard
          title="Total Items"
          value={statsLoading ? '...' : stats.totalItems.toString()}
          description="All registered items"
          icon={Package}
          color="blue"
          isLoading={statsLoading}
        />
        <StatCard
          title="In Stock"
          value={statsLoading ? '...' : Math.max(0, stats.totalItems - stats.outOfStockItems).toString()}
          description="Ready / available stock"
          icon={CheckCircle}
          color="green"
          isLoading={statsLoading}
        />
        <StatCard
          title="Low Stock"
          value={statsLoading ? '...' : stats.lowStockItems.toString()}
          description="Below threshold"
          icon={AlertTriangle}
          color="orange"
          isLoading={statsLoading}
        />
        <StatCard
          title="Out of Stock"
          value={statsLoading ? '...' : stats.outOfStockItems.toString()}
          description="Requires replenishment"
          icon={AlertCircle}
          color="red"
          isLoading={statsLoading}
        />
        <StatCard
          title="Expiring Soon"
          value={statsLoading ? '...' : stats.expiringSoon.toString()}
          description="Within next 15 days"
          icon={Clock}
          color="pink"
          isLoading={statsLoading}
        />
        <StatCard
          title="Stock In"
          value={statsLoading ? '...' : stats.totalPurchases.toString()}
          description="Inward receipts / POs"
          icon={ArrowDownLeft}
          color="cyan"
          isLoading={statsLoading}
        />
        <StatCard
          title="Stock Out"
          value={statsLoading ? '...' : stats.totalIssues.toString()}
          description="Assigned / issued items"
          icon={ArrowUpRight}
          color="purple"
          isLoading={statsLoading}
        />
        <StatCard
          title="Total Value"
          value={statsLoading ? '...' : money(stats.totalValue)}
          description="Total inventory valuation"
          icon={Sparkles}
          color="yellow"
          isLoading={statsLoading}
        />
      </StatsGrid>

      {/* Main Content Tabs */}
      <ResponsiveTabs
        value={activeTab}
        onValueChange={(tab) => go({ tab, itemId: '', poId: '', transactionId: '' })}
        className="w-full"
        tabs={[
          {
            value: 'items',
            label: 'Items',
            shortLabel: 'Items',
            icon: Package,
            content: itemId ? (
              <ItemDetail
                locationId={locationId}
                id={itemId}
                access={access.data}
                onBack={() => go({ tab: 'items', itemId: '' })}
                onTransaction={showTransaction}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <ItemList
                    locationId={locationId}
                    categoryId={categoryId}
                    onCategoryChange={(catId) => go({ tab: 'items', categoryId: catId })}
                    onSelect={showItem}
                    onStockIn={() => setModal('stock')}
                    onAssign={() => setModal('assign')}
                    onPO={() => setModal('po')}
                    canCreate={canCreate}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'categories',
            label: 'Categories',
            shortLabel: 'Categories',
            icon: FolderOpen,
            content: (
              <CategoryList
                locationId={locationId}
                onSelect={(c) => go({ tab: 'items', categoryId: c.id, itemId: '' })}
              />
            ),
          },
          {
            value: 'suppliers',
            label: 'Suppliers',
            shortLabel: 'Suppliers',
            icon: Users,
            content: (
              <Card>
                <CardContent className="p-6">
                  <SupplierList
                    locationId={locationId}
                    categoryId={categoryId || undefined}
                    access={access.data}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'purchase-orders',
            label: 'Purchase Orders',
            shortLabel: 'Orders',
            icon: ClipboardList,
            content: poId ? (
              <PODetail
                locationId={locationId}
                id={poId}
                categoryId={categoryId || undefined}
                access={access.data}
                onBack={() => go({ tab: 'purchase-orders', poId: '' })}
                onTransaction={showTransaction}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <POList
                    locationId={locationId}
                    categoryId={categoryId}
                    onCategoryChange={(catId) => go({ tab: 'purchase-orders', categoryId: catId })}
                    onSelect={showPO}
                    onCreatePO={() => setModal('po')}
                    canCreate={canCreate}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'transactions',
            label: 'Transactions',
            shortLabel: 'Trans.',
            icon: ArrowLeftRight,
            content: transactionId ? (
              <TransactionDetail
                locationId={locationId}
                id={transactionId}
                onBack={() => go({ tab: 'transactions', transactionId: '' })}
                onPO={showPO}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <TransactionList
                    locationId={locationId}
                    categoryId={categoryId}
                    onCategoryChange={(catId) => go({ tab: 'transactions', categoryId: catId })}
                    onSelect={showTransaction}
                    onStockIn={() => setModal('stock')}
                    onAssign={() => setModal('assign')}
                    canCreate={canCreate}
                  />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />

      {/* Modals */}
      {modal === 'po' && (
        <PurchaseOrderForm
          locationId={locationId}
          categoryId={categoryId || undefined}
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
          categoryId={categoryId || undefined}
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
          categoryId={categoryId || undefined}
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

function CategoryList({
  locationId,
  onSelect,
}: {
  locationId: string
  onSelect: (category: CenterCategory) => void
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <InventoryTable
          locationId={locationId}
          kind="categories"
          columns={[
            {
              accessorKey: 'name',
              header: 'Name',
              cell: ({ row }) => (
                <div className="flex items-center gap-3">
                  {row.original.image ? (
                    <img src={row.original.image} alt="" className="size-10 rounded-lg object-cover" />
                  ) : (
                    <FolderOpen className="size-8 text-muted-foreground" />
                  )}
                  <div>
                    <Button
                      variant="link"
                      className="p-0 font-medium text-blue-600"
                      onClick={() => onSelect(row.original)}
                    >
                      {row.original.name}
                    </Button>
                    <p className="max-w-md truncate text-sm text-muted-foreground">{row.original.description}</p>
                  </div>
                </div>
              ),
            },
            { accessorKey: 'itemCount', header: 'Items' },
            {
              id: 'status',
              header: 'Status',
              cell: ({ row }) => <Badge variant="secondary">{row.original.isActive ? 'Active' : 'Inactive'}</Badge>,
            },
            {
              id: 'actions',
              header: 'Actions',
              cell: ({ row }) => (
                <Button variant="ghost" onClick={() => onSelect(row.original)}>
                  View Items
                </Button>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
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
  filterActions?: React.ReactNode
}) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
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
      onPaginationChange={setPagination}
      rowCount={query.data?.pagination.totalItems ?? 0}
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value)
        setPagination((p) => ({ ...p, pageIndex: 0 }))
      }}
      searchPlaceholder={`Search ${kind === 'purchase-orders' ? 'purchase orders' : kind}…`}
      filterActions={filterActions}
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
    <NativeSelect
      aria-label="Filter by supplier"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-auto h-9 text-xs"
    >
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
  onCategoryChange,
  onSelect,
  onStockIn,
  onAssign,
  onPO,
  canCreate,
}: {
  locationId: string
  categoryId?: string
  onCategoryChange?: (categoryId: string) => void
  onSelect: (id: string) => void
  onStockIn: () => void
  onAssign: () => void
  onPO: () => void
  canCreate: boolean
}) {
  const [supplierId, setSupplierId] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const categories = useCenterOptions(locationId, 'categories')

  const columns: ColumnDef<CenterItem>[] = [
    {
      accessorKey: 'name',
      header: 'Item Name',
      cell: ({ row }) => (
        <Button variant="link" className="p-0 font-medium text-blue-600" onClick={() => onSelect(row.original.id)}>
          {row.original.name}
        </Button>
      ),
    },
    {
      id: 'package',
      header: 'Package',
      cell: ({ row }) => `${row.original.packQuantity} ${row.original.packUnit} / ${row.original.packType}`,
    },
    {
      id: 'suppliers',
      header: 'Suppliers',
      cell: ({ row }) => row.original.suppliers.map((s) => s.name).join(', ') || 'No suppliers assigned',
    },
    {
      id: 'stock',
      header: 'Current Stock',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{row.original.stockDisplay}</span>
          <span className="text-xs text-muted-foreground">
            Min: {quantityDisplay(row.original.minQuantity, row.original)} · Threshold:{' '}
            {quantityDisplay(row.original.threshold, row.original)} · Max:{' '}
            {row.original.maxQuantity ? quantityDisplay(row.original.maxQuantity, row.original) : '—'}
          </span>
          {row.original.quantity < row.original.threshold && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="destructive">Low Stock</Badge>
              {canCreate && (
                <Button variant="link" className="text-xs h-auto p-0" onClick={onPO}>
                  Create PO
                </Button>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge variant="secondary">{row.original.isActive ? 'Active' : 'Inactive'}</Badge>,
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

  const filterActions = (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Filter by category"
        value={categoryId ?? ''}
        onChange={(e) => onCategoryChange?.(e.target.value)}
        className="w-auto h-9 text-xs"
      >
        <NativeSelectOption value="">All Categories</NativeSelectOption>
        {categories.data?.map((c) => (
          <NativeSelectOption key={c.id} value={c.id}>
            {c.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <SupplierFilter locationId={locationId} value={supplierId} onChange={setSupplierId} />
      <NativeSelect
        aria-label="Filter by stock"
        value={stockFilter}
        onChange={(e) => setStockFilter(e.target.value)}
        className="w-auto h-9 text-xs"
      >
        <NativeSelectOption value="">All Stock</NativeSelectOption>
        <NativeSelectOption value="below_min">Below Minimum</NativeSelectOption>
        <NativeSelectOption value="below_threshold">Below Threshold</NativeSelectOption>
        <NativeSelectOption value="out_of_stock">Out of Stock</NativeSelectOption>
      </NativeSelect>
      {canCreate && (
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" onClick={onStockIn}>
            <ArrowDownLeft className="h-4 w-4 mr-1 text-cyan-600" />
            Stock In
          </Button>
          <Button variant="outline" onClick={onAssign}>
            <ArrowUpRight className="h-4 w-4 mr-1 text-purple-600" />
            Assign Items
          </Button>
          <Button onClick={onPO}>
            <Plus className="h-4 w-4 mr-1" />
            Create PO
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <InventoryTable
      key={`${categoryId}-${supplierId}-${stockFilter}`}
      locationId={locationId}
      categoryId={categoryId || undefined}
      kind="items"
      columns={columns}
      filters={{ ...(supplierId ? { supplierId } : {}), ...(stockFilter ? { stockFilter } : {}) }}
      filterActions={filterActions}
    />
  )
}

function POList({
  locationId,
  categoryId,
  onCategoryChange,
  onSelect,
  onCreatePO,
  canCreate,
}: {
  locationId: string
  categoryId?: string
  onCategoryChange?: (categoryId: string) => void
  onSelect: (id: string) => void
  onCreatePO?: () => void
  canCreate?: boolean
}) {
  const [status, setStatus] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const categories = useCenterOptions(locationId, 'categories')

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'poNumber',
      header: 'PO Number',
      cell: ({ row }) => (
        <Button variant="link" className="p-0 font-medium text-blue-600" onClick={() => onSelect(row.original.id)}>
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

  const filterActions = (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Filter by category"
        value={categoryId ?? ''}
        onChange={(e) => onCategoryChange?.(e.target.value)}
        className="w-auto h-9 text-xs"
      >
        <NativeSelectOption value="">All Categories</NativeSelectOption>
        {categories.data?.map((c) => (
          <NativeSelectOption key={c.id} value={c.id}>
            {c.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <SupplierFilter locationId={locationId} value={supplierId} onChange={setSupplierId} />
      <NativeSelect
        aria-label="Filter PO status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-auto h-9 text-xs"
      >
        <NativeSelectOption value="">All Statuses</NativeSelectOption>
        {Object.entries(poStatusLabels).map(([value, label]) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {canCreate && onCreatePO && (
        <div className="ml-auto">
          <Button onClick={onCreatePO}>
            <Plus className="h-4 w-4 mr-1" />
            Create Purchase Order
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <InventoryTable
      key={`${status}-${supplierId}-${categoryId}`}
      locationId={locationId}
      categoryId={categoryId || undefined}
      kind="purchase-orders"
      columns={columns}
      filters={{ ...(status ? { status } : {}), ...(supplierId ? { supplierId } : {}) }}
      filterActions={filterActions}
    />
  )
}

function TransactionList({
  locationId,
  categoryId,
  onCategoryChange,
  onSelect,
  onStockIn,
  onAssign,
  canCreate,
}: {
  locationId: string
  categoryId?: string
  onCategoryChange?: (categoryId: string) => void
  onSelect: (id: string) => void
  onStockIn?: () => void
  onAssign?: () => void
  canCreate?: boolean
}) {
  const [supplierId, setSupplierId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const categories = useCenterOptions(locationId, 'categories')

  const columns: ColumnDef<StockTransaction>[] = [
    {
      accessorKey: 'transactionNumber',
      header: 'Transaction ID',
      cell: ({ row }) => (
        <Button variant="link" className="p-0 font-medium text-blue-600" onClick={() => onSelect(row.original.id)}>
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

  const filterActions = (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Filter by category"
        value={categoryId ?? ''}
        onChange={(e) => onCategoryChange?.(e.target.value)}
        className="w-auto h-9 text-xs"
      >
        <NativeSelectOption value="">All Categories</NativeSelectOption>
        {categories.data?.map((c) => (
          <NativeSelectOption key={c.id} value={c.id}>
            {c.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <SupplierFilter locationId={locationId} value={supplierId} onChange={setSupplierId} />
      <Input
        type="date"
        value={startDate}
        max={endDate || undefined}
        onChange={(e) => setStartDate(e.target.value)}
        className="w-auto h-9 text-xs"
        placeholder="From"
      />
      <Input
        type="date"
        value={endDate}
        min={startDate || undefined}
        onChange={(e) => setEndDate(e.target.value)}
        className="w-auto h-9 text-xs"
        placeholder="To"
      />
      {canCreate && (
        <div className="flex items-center gap-2 ml-auto">
          {onStockIn && (
            <Button variant="outline" onClick={onStockIn}>
              <ArrowDownLeft className="h-4 w-4 mr-1 text-cyan-600" />
              Stock In
            </Button>
          )}
          {onAssign && (
            <Button variant="outline" onClick={onAssign}>
              <ArrowUpRight className="h-4 w-4 mr-1 text-purple-600" />
              Assign Items
            </Button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <InventoryTable
      key={`${supplierId}-${startDate}-${endDate}-${categoryId}`}
      locationId={locationId}
      categoryId={categoryId || undefined}
      kind="transactions"
      columns={columns}
      filters={{
        ...(supplierId ? { supplierId } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      }}
      filterActions={filterActions}
    />
  )
}
