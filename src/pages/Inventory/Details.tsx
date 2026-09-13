import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { FieldGroup } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useCenterData, useCenterMutation, useCenterOptions } from '@/hooks/react-query/centerInventory'
import type {
  CenterAccess,
  CenterItem,
  CenterCategory,
  PurchaseOrder,
  StockTransaction,
} from '@/lib/types/centerInventory'
import { ItemEditor } from '@/pages/GlobalSettings/Inventory/ItemFormPage'
import type { InventoryCategory, InventoryItem, InventoryPackageOptions } from '@/lib/types/inventory'
import { Section, ErrorNotice, Status, FormField } from './shared'
import { money, quantityDisplay } from './utils'
import { PurchaseOrderForm } from './PurchaseOrderForm'
import { StockInForm } from './StockInForm'
export function PODetail({
  locationId,
  id,
  categoryId,
  access,
  onBack,
  onTransaction,
}: {
  locationId: string
  id: string
  categoryId: string
  access: CenterAccess
  onBack: () => void
  onTransaction: (id: string) => void
}) {
  const query = useCenterData<PurchaseOrder>(locationId, `purchase-orders/${id}`)
  const mutation = useCenterMutation(locationId)
  const [modal, setModal] = useState<'edit' | 'receive' | 'delete' | 'reject' | null>(null)
  if (query.isPending) return <Skeleton className="h-64" />
  if (query.isError) return <ErrorNotice error={query.error} retry={() => void query.refetch()} />
  const po = query.data
  const decide = async (action: 'approve' | 'reject') => {
    try {
      await mutation.mutateAsync({ path: `purchase-orders/${id}/decision`, data: { action } })
      toast.success(action === 'approve' ? 'Purchase order approved' : 'Purchase order rejected')
      setModal(null)
    } catch {
      /* mutation error is displayed below */
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <h2 className="text-xl font-semibold">{po.poNumber}</h2>
          <Status status={po.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {access.update && ['draft', 'approval_pending', 'approved'].includes(po.status) && (
            <Button variant="outline" onClick={() => setModal('edit')}>
              Edit PO
            </Button>
          )}
          {access.approve && po.status === 'approval_pending' && (
            <>
              <Button disabled={mutation.isPending} onClick={() => void decide('approve')}>
                Approve
              </Button>
              <Button variant="destructive" onClick={() => setModal('reject')}>
                Reject
              </Button>
            </>
          )}
          {access.create && ['approved', 'partially_received'].includes(po.status) && (
            <Button onClick={() => setModal('receive')}>Stock In</Button>
          )}
          {access.delete && ['draft', 'approval_pending'].includes(po.status) && (
            <Button variant="destructive" onClick={() => setModal('delete')}>
              Delete PO
            </Button>
          )}
        </div>
      </div>
      {mutation.error && <ErrorNotice error={mutation.error} />}
      <Section title="Purchase Order Information">
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ['Supplier', po.supplier?.name ?? '—'],
            ['Order Date', new Date(po.createdAt).toLocaleDateString()],
            ['Total Amount', money(po.totalAmount)],
            ['Notes', po.notes || '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Order Items">
        <DataTable
          data={po.items}
          getRowId={(r) => r.id}
          columns={[
            { accessorKey: 'itemName', header: 'Item' },
            { accessorKey: 'orderedDisplay', header: 'Ordered Quantity' },
            { accessorKey: 'receivedDisplay', header: 'Received Quantity' },
            {
              id: 'remaining',
              header: 'Remaining Quantity',
              cell: ({ row }) => quantityDisplay(row.original.remainingQuantity, row.original),
            },
            { id: 'price', header: 'Agreed Price / Package', cell: ({ row }) => money(row.original.agreedPrice) },
            {
              id: 'amount',
              header: 'Amount',
              cell: ({ row }) =>
                money((row.original.orderedQuantity / row.original.packQuantity) * Number(row.original.agreedPrice)),
            },
          ]}
        />
      </Section>
      <Section title="Stock In History">
        <DataTable
          data={po.receipts}
          getRowId={(r) => r.id}
          columns={[
            {
              id: 'number',
              header: 'Transaction',
              cell: ({ row }) => (
                <Button variant="link" onClick={() => onTransaction(row.original.id)}>
                  {row.original.transactionNumber}
                </Button>
              ),
            },
            { accessorKey: 'date', header: 'Date' },
            { accessorKey: 'notes', header: 'Notes' },
          ]}
        />
      </Section>
      {modal === 'edit' && (
        <PurchaseOrderForm
          locationId={locationId}
          categoryId={categoryId}
          record={po}
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      )}
      {modal === 'receive' && (
        <StockInForm
          locationId={locationId}
          categoryId={categoryId}
          po={po}
          onClose={() => setModal(null)}
          onSaved={(transactionId) => {
            setModal(null)
            onTransaction(transactionId)
          }}
        />
      )}
      {(modal === 'delete' || modal === 'reject') && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !mutation.isPending) setModal(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {modal === 'delete' ? 'Delete' : 'Reject'} {po.poNumber}?
              </DialogTitle>
              <DialogDescription>
                {modal === 'delete'
                  ? 'This removes the unreceived purchase order.'
                  : 'This cancels the purchase order without receiving any stock.'}
              </DialogDescription>
            </DialogHeader>
            {mutation.error && <ErrorNotice error={mutation.error} />}
            <DialogFooter>
              <Button variant="outline" disabled={mutation.isPending} onClick={() => setModal(null)}>
                Keep Order
              </Button>
              <Button
                variant="destructive"
                disabled={mutation.isPending}
                onClick={async () => {
                  if (modal === 'reject') {
                    await decide('reject')
                    return
                  }
                  try {
                    await mutation.mutateAsync({ path: `purchase-orders/${id}`, method: 'delete' })
                    toast.success('Purchase order deleted')
                    onBack()
                  } catch {
                    /* inline error */
                  }
                }}
              >
                {modal === 'delete' ? 'Delete' : 'Reject'} Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
export function TransactionDetail({
  locationId,
  id,
  onBack,
  onPO,
}: {
  locationId: string
  id: string
  onBack: () => void
  onPO: (id: string) => void
}) {
  const query = useCenterData<StockTransaction>(locationId, `transactions/${id}`)
  if (query.isPending) return <Skeleton className="h-64" />
  if (query.isError) return <ErrorNotice error={query.error} retry={() => void query.refetch()} />
  const record = query.data
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <h2 className="text-xl font-semibold">{record.transactionNumber}</h2>
      </div>
      <Section title="Transaction Information">
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ['Type', record.transactionType === 'issue' ? 'Stock Out' : 'Stock In'],
            ['Date', record.date],
            [
              record.transactionType === 'issue' ? 'Recipient' : 'Supplier',
              record.transactionType === 'issue' ? (record.recipientName ?? '—') : (record.supplier?.name ?? '—'),
            ],
            ...(record.transactionType === 'issue'
              ? [['Recipient Type', record.residentId ? 'Resident' : 'Staff']]
              : []),
            ['Purchase Cost', money(record.totalAmount)],
            ['MRP Amount', record.mrpAmount == null ? '—' : money(record.mrpAmount)],
            ['Notes', record.notes || '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-sm text-muted-foreground">Purchase Order</dt>
            <dd>
              {record.purchaseOrderId ? (
                <Button variant="link" onClick={() => onPO(record.purchaseOrderId!)}>
                  {record.poNumber}
                </Button>
              ) : record.transactionType === 'issue' ? (
                'Assign Items'
              ) : (
                'Direct Stock In'
              )}
            </dd>
          </div>
        </dl>
      </Section>
      <Section title={record.transactionType === 'issue' ? 'Assigned Items — Receipt Allocations' : 'Received Items'}>
        <DataTable
          data={record.items}
          getRowId={(r) => r.id}
          columns={[
            { accessorKey: 'itemName', header: 'Item' },
            { accessorKey: 'stockDisplay', header: 'Quantity' },
            { accessorKey: 'batchNumber', header: 'Batch Number' },
            { accessorKey: 'transitId', header: 'Transit ID' },
            { accessorKey: 'receivedDate', header: 'Received Date' },
            { accessorKey: 'manufacturedDate', header: 'Manufactured Date' },
            { accessorKey: 'expiryDate', header: 'Expiry Date' },
            { id: 'cost', header: 'Purchase Cost / Package', cell: ({ row }) => money(row.original.unitCost) },
            { id: 'mrp', header: 'MRP / Package', cell: ({ row }) => money(row.original.mrpPrice) },
            {
              id: 'mrpAmount',
              header: 'MRP Amount',
              cell: ({ row }) => (row.original.mrpAmount == null ? '—' : money(row.original.mrpAmount)),
            },
          ]}
        />
      </Section>
    </div>
  )
}
export function ItemDetail({
  locationId,
  id,
  category,
  access,
  onBack,
  onTransaction,
}: {
  locationId: string
  id: string
  category: CenterCategory
  access: CenterAccess
  onBack: () => void
  onTransaction: (id: string) => void
}) {
  const query = useCenterData<CenterItem>(locationId, `items/${id}`)
  const [modal, setModal] = useState<'suppliers' | 'thresholds' | 'edit' | null>(null)
  if (query.isPending) return <Skeleton className="h-64" />
  if (query.isError) return <ErrorNotice error={query.error} retry={() => void query.refetch()} />
  const item = query.data
  if (modal === 'edit') return <CenterItemEditor locationId={locationId} id={id} onClose={() => setModal(null)} />
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <h2 className="text-xl font-semibold">{item.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {access.update && (
            <>
              <Button variant="outline" onClick={() => setModal('edit')}>
                Edit Item
              </Button>
              <Button variant="outline" onClick={() => setModal('suppliers')}>
                Manage Suppliers
              </Button>
              <Button variant="outline" onClick={() => setModal('thresholds')}>
                Manage Thresholds
              </Button>
            </>
          )}
        </div>
      </div>
      <Section title="Item Information">
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ['Category', category.name],
            ['Status', item.isActive ? 'Active' : 'Inactive'],
            ['Package', `${item.packQuantity} ${item.packUnit} per ${item.packType}`],
            ['Current Stock', item.stockDisplay],
            ['Minimum', quantityDisplay(item.minQuantity, item)],
            ['Threshold', quantityDisplay(item.threshold, item)],
            ['Maximum', item.maxQuantity ? quantityDisplay(item.maxQuantity, item) : 'No maximum'],
            ...(category.fieldDefinitions ?? []).map((f) => [
              f.fieldLabel,
              String(item.customFields.find((v) => v.fieldDefinitionId === f.id)?.value ?? '—'),
            ]),
          ].map(([label, value], index) => (
            <div key={`${label}-${index}`}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Assigned Suppliers">
        <DataTable
          data={item.suppliers}
          getRowId={(r) => r.id}
          columns={[
            { accessorKey: 'name', header: 'Supplier' },
            { accessorKey: 'contactPerson', header: 'Contact Person' },
            { accessorKey: 'phone', header: 'Phone' },
            { accessorKey: 'email', header: 'Email' },
          ]}
        />
      </Section>
      <Section title="Stock Batches">
        <DataTable
          data={item.batches ?? []}
          getRowId={(r) => r.id}
          columns={[
            { accessorKey: 'batchNumber', header: 'Batch' },
            { accessorKey: 'stockDisplay', header: 'Quantity' },
            { accessorKey: 'receivedDate', header: 'Received Date' },
            { accessorKey: 'expiryDate', header: 'Expiry Date' },
            {
              id: 'action',
              header: 'Actions',
              cell: ({ row }) => (
                <Button variant="link" onClick={() => onTransaction(row.original.transactionId)}>
                  View Transaction
                </Button>
              ),
            },
          ]}
        />
      </Section>
      {modal && <ItemSettings locationId={locationId} item={item} mode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
function ItemSettings({
  locationId,
  item,
  mode,
  onClose,
}: {
  locationId: string
  item: CenterItem
  mode: 'suppliers' | 'thresholds'
  onClose: () => void
}) {
  const suppliers = useCenterOptions(locationId, 'suppliers')
  const mutation = useCenterMutation(locationId)
  const [supplierIds, setSupplierIds] = useState(item.suppliers.map((s) => s.id))
  const [thresholds, setThresholds] = useState({
    minQuantity: item.minQuantity,
    maxQuantity: item.maxQuantity,
    threshold: item.threshold,
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Manage {mode === 'suppliers' ? 'Suppliers' : 'Thresholds'} — {item.name}
          </DialogTitle>
          <DialogDescription>Changes apply to the selected property.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-5"
          onSubmit={async (event) => {
            event.preventDefault()
            try {
              await mutation.mutateAsync({
                path: `items/${item.id}/${mode}`,
                method: 'put',
                data: mode === 'suppliers' ? { supplierIds } : thresholds,
              })
              toast.success('Item updated')
              onClose()
            } catch {
              /* inline error */
            }
          }}
        >
          <FieldGroup>
            {mode === 'suppliers'
              ? suppliers.data
                  ?.filter((s) => s.isActive || supplierIds.includes(s.id))
                  .map((s) => (
                    <label className="flex items-center gap-3" key={s.id}>
                      <Checkbox
                        checked={supplierIds.includes(s.id)}
                        onCheckedChange={(checked) =>
                          setSupplierIds((current) =>
                            checked ? [...current, s.id] : current.filter((id) => id !== s.id),
                          )
                        }
                      />
                      {s.name}
                    </label>
                  ))
              : (['minQuantity', 'maxQuantity', 'threshold'] as const).map((key, index) => (
                  <FormField
                    key={key}
                    id={`threshold-${key}`}
                    label={`${['Minimum', 'Maximum (0 for no maximum)', 'Threshold'][index]} (${item.packUnit})`}
                  >
                    <Input
                      id={`threshold-${key}`}
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={thresholds[key]}
                      onChange={(e) => setThresholds((current) => ({ ...current, [key]: Number(e.target.value) }))}
                    />
                  </FormField>
                ))}
          </FieldGroup>
          {(mutation.error || suppliers.error) && <ErrorNotice error={mutation.error || suppliers.error} />}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || (mode === 'suppliers' && suppliers.isPending)}>
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CenterItemEditor({ locationId, id, onClose }: { locationId: string; id: string; onClose: () => void }) {
  const query = useCenterData<{
    record: InventoryItem
    category: InventoryCategory
    locations: { id: string; name: string }[]
  }>(locationId, `items/${id}/editor`)
  const options = useCenterData<InventoryPackageOptions>(locationId, 'package-options')
  const mutation = useCenterMutation(locationId)
  if (query.isPending || options.isPending) return <Skeleton className="h-64" />
  if (query.isError || options.isError)
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" onClick={onClose}>
          Back
        </Button>
        <ErrorNotice
          error={query.error || options.error}
          retry={() => {
            void query.refetch()
            void options.refetch()
          }}
        />
      </div>
    )
  return (
    <ItemEditor
      category={query.data.category}
      record={query.data.record}
      options={options.data}
      locations={query.data.locations}
      onBack={onClose}
      saveOverride={({ data }) => mutation.mutateAsync({ path: `items/${id}`, method: 'put', data })}
    />
  )
}
