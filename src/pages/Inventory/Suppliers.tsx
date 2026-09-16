import { useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { toast } from 'sonner'
import type { PaginationState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ActiveStatus } from '@/components/inventory/InventoryStatus'
import StatCard from '@/pages/AssetManagement/components/StatCard'
import { Users, UserCheck, UserX, ClipboardList } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useCenterData, useCenterMutation } from '@/hooks/react-query/centerInventory'
import type { CenterAccess, CenterSupplier, SupplierListResponse } from '@/lib/types/centerInventory'
import { ErrorNotice, FormField } from './shared'

export function SupplierList({
  locationId,
  categoryId,
  access,
}: {
  locationId: string
  categoryId: string
  access: CenterAccess
}) {
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [selected, setSelected] = useState<{ supplier: CenterSupplier; mode: 'view' | 'edit' | 'delete' } | null>(null)
  const query = useCenterData<SupplierListResponse>(locationId, 'suppliers', {
    categoryId,
    search: debouncedSearch,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    ...(status ? { isActive: status } : {}),
  })
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Suppliers"
          value={query.data?.summary.totalSuppliers ?? '—'}
          description="Suppliers for this category"
          icon={Users}
          color="blue"
          isLoading={query.isPending}
        />
        <StatCard
          title="Active"
          value={query.data?.summary.activeSuppliers ?? '—'}
          description="Available for purchases"
          icon={UserCheck}
          color="green"
          isLoading={query.isPending}
        />
        <StatCard
          title="Inactive"
          value={query.data?.summary.inactiveSuppliers ?? '—'}
          description="Currently unavailable"
          icon={UserX}
          isLoading={query.isPending}
        />
        <StatCard
          title="Total Orders"
          value={query.data?.summary.totalPurchaseOrders ?? '—'}
          description="Supplier purchase orders"
          icon={ClipboardList}
          color="purple"
          isLoading={query.isPending}
        />
      </div>
      <DataTable
        data={query.data?.records ?? []}
        getRowId={(r) => r.id}
        isLoading={query.isPending}
        error={query.error?.message}
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
        searchPlaceholder="Search suppliers…"
        filterActions={
          <NativeSelect
            aria-label="Supplier status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
          >
            <NativeSelectOption value="">All Status</NativeSelectOption>
            <NativeSelectOption value="true">Active</NativeSelectOption>
            <NativeSelectOption value="false">Inactive</NativeSelectOption>
          </NativeSelect>
        }
        columns={[
          {
            accessorKey: 'name',
            header: 'Supplier Name',
            cell: ({ row }) => (
              <Button variant="link" onClick={() => setSelected({ supplier: row.original, mode: 'view' })}>
                {row.original.name}
              </Button>
            ),
          },
          {
            id: 'contact',
            header: 'Contact Info',
            cell: ({ row }) => (
              <div>
                {row.original.contactPerson}
                <p className="text-sm text-muted-foreground">
                  {row.original.email}
                  <br />
                  {row.original.phone}
                </p>
              </div>
            ),
          },
          { accessorKey: 'address', header: 'Address' },
          {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => <ActiveStatus active={row.original.isActive} />,
          },
          { accessorKey: 'purchaseOrderCount', header: 'Purchase Orders' },
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => setSelected({ supplier: row.original, mode: 'view' })}>
                  View
                </Button>
                {access.update && (
                  <Button variant="ghost" onClick={() => setSelected({ supplier: row.original, mode: 'edit' })}>
                    Edit
                  </Button>
                )}
                {access.delete && (
                  <Button variant="ghost" onClick={() => setSelected({ supplier: row.original, mode: 'delete' })}>
                    Delete
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
      {selected && (
        <SupplierDialog
          key={`${selected.supplier.id}-${selected.mode}`}
          locationId={locationId}
          supplier={selected.supplier}
          mode={selected.mode}
          canUpdate={access.update}
          onEdit={() => setSelected({ ...selected, mode: 'edit' })}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
function SupplierDialog({
  locationId,
  supplier,
  mode,
  canUpdate,
  onEdit,
  onClose,
}: {
  locationId: string
  supplier: CenterSupplier
  mode: 'view' | 'edit' | 'delete'
  canUpdate: boolean
  onEdit: () => void
  onClose: () => void
}) {
  const mutation = useCenterMutation(locationId)
  const [form, setForm] = useState({
    name: supplier.name,
    contactPerson: supplier.contactPerson ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    address: supplier.address ?? '',
    isActive: supplier.isActive,
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' ? 'Supplier Details' : mode === 'edit' ? 'Edit Supplier' : 'Delete Supplier'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'delete'
              ? `Delete ${supplier.name}? The supplier will be deactivated. Existing transaction history is retained.`
              : supplier.name}
          </DialogDescription>
        </DialogHeader>
        {mode === 'view' ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ['Name', supplier.name],
                ['Contact Person', supplier.contactPerson],
                ['Email', supplier.email],
                ['Phone', supplier.phone],
                ['Address', supplier.address],

                ['Purchase Orders', supplier.purchaseOrderCount],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words font-medium">{value ?? '—'}</dd>
                </div>
              ))}
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <ActiveStatus active={supplier.isActive} />
                </dd>
              </div>
            </dl>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {canUpdate && <Button onClick={onEdit}>Edit</Button>}
            </DialogFooter>
          </>
        ) : (
          <form
            className="flex min-w-0 flex-col gap-6"
            onSubmit={async (event) => {
              event.preventDefault()
              try {
                await mutation.mutateAsync({
                  path: `suppliers/${supplier.id}`,
                  method: mode === 'delete' ? 'delete' : 'put',
                  ...(mode === 'edit' ? { data: form } : {}),
                })
                toast.success(mode === 'delete' ? 'Supplier removed' : 'Supplier updated')
                onClose()
              } catch {
                /* inline error */
              }
            }}
          >
            {mode === 'edit' && (
              <FieldGroup>
                {(['name', 'contactPerson', 'email', 'phone'] as const).map((key, index) => (
                  <FormField
                    key={key}
                    id={`supplier-${key}`}
                    label={`${['Supplier Name', 'Contact Person', 'Email', 'Phone'][index]}${key === 'email' ? '' : ' *'}`}
                  >
                    <Input
                      id={`supplier-${key}`}
                      required={key !== 'email'}
                      type={key === 'email' ? 'email' : 'text'}
                      value={form[key]}
                      onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                    />
                  </FormField>
                ))}
                <FormField id="supplier-address" label="Address *">
                  <Textarea
                    id="supplier-address"
                    required
                    maxLength={10000}
                    value={form.address}
                    onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                  />
                </FormField>
                <FormField id="supplier-active" label="Status">
                  <NativeSelect
                    id="supplier-active"
                    value={String(form.isActive)}
                    onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.value === 'true' }))}
                  >
                    <NativeSelectOption value="true">Active</NativeSelectOption>
                    <NativeSelectOption value="false">Inactive</NativeSelectOption>
                  </NativeSelect>
                </FormField>
              </FieldGroup>
            )}
            {mutation.error && <ErrorNotice error={mutation.error} />}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={mode === 'delete' ? 'destructive' : 'default'}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving…' : mode === 'delete' ? 'Delete Supplier' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
