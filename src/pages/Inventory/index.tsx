import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { FolderOpen, Package, Users, ClipboardList, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import { ErrorNotice, Section, Status } from './shared'
import { money, quantityDisplay } from './utils'
import { PurchaseOrderForm } from './PurchaseOrderForm'
import { AssignItemsForm } from './AssignItemsForm'
import { StockInForm } from './StockInForm'
import { SupplierList } from './Suppliers'
import { PODetail, TransactionDetail, ItemDetail } from './Details'
const tabs = [
  { value: 'items', label: 'Items', icon: Package },
  { value: 'suppliers', label: 'Suppliers', icon: Users },
  { value: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
  { value: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
] as const
export default function InventoryPage() {
  const { selectedLocationId, selectedLocationName } = useLocation()
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          {selectedLocationName ? `Manage inventory at ${selectedLocationName}` : 'Manage property inventory'}
        </p>
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
    <Section title="Categories">
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
                  <Button variant="link" onClick={() => onSelect(row.original)}>
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
                View Inventory
              </Button>
            ),
          },
        ]}
      />
    </Section>
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
  const current = tabs.find((t) => t.value === params.get('tab'))?.value ?? 'items'
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate({})}>
            Back to Categories
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{category.data.name}</h2>
            <p className="text-sm text-muted-foreground">{category.data.description}</p>
          </div>
        </div>
      </div>
      {stats.isError ? (
        <ErrorNotice error={stats.error} retry={() => void stats.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ['Total Items', stats.data?.totalItems],
            ['Low Stock', stats.data?.lowStockItems],
            ['Expiring Soon', stats.data?.expiringSoon],
          ].map(([label, value]) => (
            <Section key={label} title={String(label)}>
              {value === undefined ? <Skeleton className="h-8" /> : <p className="text-2xl font-semibold">{value}</p>}
            </Section>
          ))}
        </div>
      )}
      <Tabs value={current} onValueChange={(value) => go({ tab: String(value) })}>
        <div className="overflow-x-auto">
          <TabsList variant="line">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                <tab.icon />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="items">
          <Tabs defaultValue="inventory">
            <TabsList variant="line">
              <TabsTrigger value="inventory">Inventory Items</TabsTrigger>
            </TabsList>
            <TabsContent value="inventory">
              {itemId ? (
                <ItemDetail
                  locationId={locationId}
                  id={itemId}
                  category={category.data}
                  access={access}
                  onBack={() => go({ tab: 'items' })}
                  onTransaction={showTransaction}
                />
              ) : (
                <Section title="Inventory Items">
                  <ItemList
                    locationId={locationId}
                    categoryId={categoryId}
                    onSelect={(id) => go({ tab: 'items', itemId: id })}
                    onPO={() => setModal('po')}
                    canCreate={access.create}
                  />
                </Section>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="suppliers">
          <Section title="Suppliers">
            <SupplierList locationId={locationId} categoryId={categoryId} access={access} />
          </Section>
        </TabsContent>
        <TabsContent value="purchase-orders">
          {poId ? (
            <PODetail
              locationId={locationId}
              id={poId}
              categoryId={categoryId}
              access={access}
              onBack={() => go({ tab: 'purchase-orders' })}
              onTransaction={showTransaction}
            />
          ) : (
            <Section
              title="Purchase Orders"
              action={access.create ? <Button onClick={() => setModal('po')}>Create Purchase Order</Button> : undefined}
            >
              <POList locationId={locationId} categoryId={categoryId} onSelect={showPO} />
            </Section>
          )}
        </TabsContent>
        <TabsContent value="transactions">
          <Tabs defaultValue="inventory">
            <TabsList variant="line">
              <TabsTrigger value="inventory">Inventory Item Transactions</TabsTrigger>
            </TabsList>
            <TabsContent value="inventory">
              {transactionId ? (
                <TransactionDetail
                  locationId={locationId}
                  id={transactionId}
                  onBack={() => go({ tab: 'transactions' })}
                  onPO={showPO}
                />
              ) : (
                <Section
                  title="Inventory Item Transactions"
                  action={
                    access.create ? (
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
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
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
}: {
  locationId: string
  kind: K
  categoryId?: string
  columns: ColumnDef<CenterLists[K]>[]
  filters?: CenterListParams
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
      header: 'Item Name',
      cell: ({ row }) => (
        <Button variant="link" onClick={() => onSelect(row.original.id)}>
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
          <span>{row.original.stockDisplay}</span>
          <span className="text-xs text-muted-foreground">
            Min: {quantityDisplay(row.original.minQuantity, row.original)} · Threshold:{' '}
            {quantityDisplay(row.original.threshold, row.original)} · Max:{' '}
            {row.original.maxQuantity ? quantityDisplay(row.original.maxQuantity, row.original) : '—'}
          </span>
          {row.original.quantity < row.original.threshold && (
            <div>
              <Badge variant="destructive">Low Stock</Badge>
              {canCreate && (
                <Button variant="link" onClick={onPO}>
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <SupplierFilter locationId={locationId} value={supplierId} onChange={setSupplierId} />
        <NativeSelect aria-label="Filter by stock" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <NativeSelectOption value="">All Stock</NativeSelectOption>
          <NativeSelectOption value="below_min">Below Minimum</NativeSelectOption>
          <NativeSelectOption value="below_threshold">Below Threshold</NativeSelectOption>
          <NativeSelectOption value="out_of_stock">Out of Stock</NativeSelectOption>
        </NativeSelect>
      </div>
      <InventoryTable
        key={`${supplierId}-${stockFilter}`}
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
      <InventoryTable
        key={`${status}-${supplierId}`}
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
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Total Transactions', stats.data?.totalTransactions],
          ['Total Purchases', stats.data?.totalPurchases],
          ['Total Issues', stats.data?.totalIssues],
        ].map(([label, value]) => (
          <Section title={String(label)} key={label}>
            <p className="text-2xl font-semibold">{value ?? '—'}</p>
          </Section>
        ))}
      </div>
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
      <InventoryTable
        key={`${supplierId}-${startDate}-${endDate}`}
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
