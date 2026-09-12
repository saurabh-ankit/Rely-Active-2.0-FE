import { Link, useLocation, useParams } from 'react-router-dom'
import { useInventoryDetail, useInventoryProperties, useInventoryVendorOptions } from '@/hooks/react-query/inventory'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { InventoryPage, FormSection, InventoryLoading, InventoryLoadError } from './PageLayout'
import { categoryPath, useInventoryNavigation, withInventoryReturn } from './navigation'

export function ItemDetailsPage() {
  const { categoryId = '', itemId = '' } = useParams()
  const item = useInventoryDetail('items', itemId)
  const category = useInventoryDetail('categories', categoryId)
  const properties = useInventoryProperties()
  const vendors = useInventoryVendorOptions()
  const location = useLocation()
  const { back } = useInventoryNavigation(categoryPath(categoryId))
  if (item.isPending || category.isPending || properties.isPending || vendors.isPending) return <InventoryLoading />
  if (item.isError || category.isError || properties.isError || vendors.isError)
    return (
      <InventoryLoadError
        retry={() => {
          void item.refetch()
          void category.refetch()
          void properties.refetch()
          void vendors.refetch()
        }}
      />
    )
  if (item.data.categoryId !== categoryId) return <p role="alert">This item does not belong to this category.</p>
  const record = item.data
  const base = `${categoryPath(categoryId)}/items/${itemId}`
  const target = (suffix: string) => withInventoryReturn(`${base}/${suffix}`, location.pathname + location.search)
  const rows = record.locationIds.map((id) => ({
    id,
    name: properties.data.find((p) => p.id === id)?.property_name ?? 'Unavailable location',
    vendors:
      record.vendorAssignments
        .filter((a) => a.locationId === id)
        .map((a) => vendors.data.find((v) => v.id === a.vendorId)?.name ?? 'Unavailable supplier')
        .join(', ') || 'No suppliers assigned',
    thresholds: record.locationThresholds?.find((t) => t.locationId === id) ?? record,
  }))
  const displayQuantity = (quantity: number) =>
    `${quantity / record.packQuantity} ${record.packType} (${quantity} ${record.packUnit})`
  return (
    <InventoryPage title={record.name} description={category.data.name} onBack={back}>
      <div className="flex flex-wrap gap-2">
        <Button render={<Link to={target('edit')} />}>Edit Item</Button>
        <Button variant="outline" render={<Link to={target('vendors')} />}>
          Manage Suppliers
        </Button>
        <Button variant="outline" render={<Link to={target('thresholds')} />}>
          Manage Thresholds
        </Button>
      </div>
      <FormSection title="Item Information">
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            ['Name', record.name],
            ['Category', category.data.name],
            ['Status', record.isActive ? 'Active' : 'Inactive'],
            ['Package', `${record.packQuantity} ${record.packUnit} per ${record.packType}`],
            ...category.data.fieldDefinitions.map((f) => [
              f.fieldLabel,
              String(record.customFields.find((v) => v.fieldDefinitionId === f.id)?.value ?? '—'),
            ]),
          ].map(([name, value], index) => (
            <div key={`${name}-${index}`}>
              <dt className="text-sm text-muted-foreground">{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </FormSection>
      <FormSection title="Suppliers by Location">
        <DataTable
          data={rows}
          getRowId={(r) => r.id}
          columns={[
            { accessorKey: 'name', header: 'Location' },
            { accessorKey: 'vendors', header: 'Assigned Suppliers' },
          ]}
        />
      </FormSection>
      <FormSection title="Thresholds by Location">
        <DataTable
          data={rows}
          getRowId={(r) => r.id}
          columns={[
            { accessorKey: 'name', header: 'Location' },
            ...(['minQuantity', 'maxQuantity', 'threshold'] as const).map((key, index) => ({
              id: key,
              header: ['Min Quantity', 'Max Quantity', 'Threshold'][index],
              cell: ({ row }: { row: { original: (typeof rows)[number] } }) =>
                displayQuantity(row.original.thresholds[key]),
            })),
          ]}
        />
      </FormSection>
    </InventoryPage>
  )
}
