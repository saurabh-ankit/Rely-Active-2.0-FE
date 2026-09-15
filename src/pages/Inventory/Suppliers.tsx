import { useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { toast } from 'sonner'
import type { PaginationState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Truck, AlertTriangle } from 'lucide-react'
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
  categoryId?: string
  access: CenterAccess
}) {
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [selected, setSelected] = useState<{ supplier: CenterSupplier; mode: 'view' | 'edit' | 'delete' } | null>(null)
  const query = useCenterData<SupplierListResponse>(locationId, 'suppliers', {
    ...(categoryId ? { categoryId } : {}),
    search: debouncedSearch,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    ...(status ? { isActive: status } : {}),
  })
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Vendors"
          value={query.data?.summary.totalSuppliers ?? '—'}
          description="Vendors for this category"
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
          description="Vendor purchase orders"
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
        searchPlaceholder="Search vendors…"
        filterActions={
          <NativeSelect
            aria-label="Vendor status"
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
            header: 'Vendor Name',
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl rounded-3xl p-6 shadow-2xl border border-gray-100">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                mode === 'delete' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'
              }`}
            >
              {mode === 'delete' ? <AlertTriangle className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {mode === 'view' ? 'Vendor Details' : mode === 'edit' ? 'Edit Vendor' : 'Delete Vendor'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                {mode === 'delete'
                  ? `Delete ${supplier.name}? The vendor will be deactivated. Existing transaction history is retained.`
                  : supplier.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {mode === 'view' ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-gray-50/70 border border-gray-100 p-4">
              {[
                ['Name', supplier.name],
                ['Contact Person', supplier.contactPerson],
                ['Email', supplier.email],
                ['Phone', supplier.phone],
                ['Address', supplier.address],

                ['Purchase Orders', supplier.purchaseOrderCount],
              ].map(([label, value]) => (
                <div key={label} className="space-y-0.5">
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</dt>
                  <dd className="text-sm font-medium text-gray-900">{value ?? '—'}</dd>
                </div>
              ))}
              <div className="space-y-0.5">
                <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</dt>
                <dd className="mt-1">
                  <ActiveStatus active={supplier.isActive} />
                </dd>
              </div>
            </dl>
            <DialogFooter className="border-t border-gray-100 pt-4 flex items-center justify-end gap-2">
              <Button variant="outline" className="rounded-xl border-gray-200 cursor-pointer" onClick={onClose}>
                Close
              </Button>
              {canUpdate && (
                <Button
                  className="bg-[#005390] hover:bg-[#004170] text-white font-bold rounded-xl shadow-md cursor-pointer"
                  onClick={onEdit}
                >
                  Edit Vendor
                </Button>
              )}
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
                toast.success(mode === 'delete' ? 'Vendor removed' : 'Vendor updated')
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
                    label={`${['Vendor Name', 'Contact Person', 'Email', 'Phone'][index]}${key === 'email' ? '' : ' *'}`}
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
            <DialogFooter className="border-t border-gray-100 pt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-gray-200 cursor-pointer"
                disabled={mutation.isPending}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={mode === 'delete' ? 'destructive' : 'default'}
                className={
                  mode === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md cursor-pointer'
                    : 'bg-[#005390] hover:bg-[#004170] text-white font-bold rounded-xl shadow-md cursor-pointer'
                }
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving…' : mode === 'delete' ? 'Delete Vendor' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
