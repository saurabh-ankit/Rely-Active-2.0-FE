import { useParams } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { useInventoryDetail, useInventoryProperties, useSaveInventoryThresholds } from '@/hooks/react-query/inventory'
import { inventoryLocationThresholdsFormSchema } from '@/lib/validations/inventory'
import type { InventoryItem } from '@/lib/types/inventory'
import { InventoryPage, FormSection, InventoryLoading, InventoryLoadError } from './PageLayout'
import { FormActions, FormInput, RootError } from './FormControls'
import { categoryPath, useInventoryNavigation } from './navigation'
import { setInventoryFormError } from './formErrors'

export function ItemThresholdsPage() {
  const { itemId = '', categoryId = '' } = useParams()
  const item = useInventoryDetail('items', itemId)
  const properties = useInventoryProperties()
  if (item.isPending || properties.isPending) return <InventoryLoading />
  if (item.isError || properties.isError)
    return (
      <InventoryLoadError
        retry={() => {
          void item.refetch()
          void properties.refetch()
        }}
      />
    )
  if (item.data.categoryId !== categoryId) return <p role="alert">This item does not belong to this category.</p>
  const locations = properties.data.map((p) => ({ id: p.id, name: p.property_name }))
  for (const id of item.data.locationIds)
    if (!locations.some((l) => l.id === id)) locations.push({ id, name: 'Unavailable location' })
  return <ItemThresholdsEditor key={itemId} record={item.data} locations={locations} />
}
export function ItemThresholdsEditor({
  record,
  locations,
}: {
  record: InventoryItem
  locations: { id: string; name: string }[]
}) {
  const { back } = useInventoryNavigation(categoryPath(record.categoryId))
  const mutation = useSaveInventoryThresholds(record.id)
  const schema = inventoryLocationThresholdsFormSchema(record.packQuantity)
  const defaults = record.locationIds.map((locationId) => {
    const t = record.locationThresholds?.find((x) => x.locationId === locationId) ?? record
    return {
      locationId,
      minQuantity: t.minQuantity / record.packQuantity,
      maxQuantity: t.maxQuantity / record.packQuantity,
      threshold: t.threshold / record.packQuantity,
    }
  })
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { locations: defaults },
  })
  const rows = [...locations]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((l) => ({ ...l, index: defaults.findIndex((t) => t.locationId === l.id) }))
  return (
    <InventoryPage
      title="Manage Thresholds"
      description={`${record.name} · Enter whole ${record.packType} counts`}
      onBack={() => {
        if (!mutation.isPending) back()
      }}
    >
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(async (data) => {
            try {
              const changes = data.locations.filter(
                (t, i) =>
                  t.minQuantity !== defaults[i].minQuantity ||
                  t.maxQuantity !== defaults[i].maxQuantity ||
                  t.threshold !== defaults[i].threshold,
              )
              await mutation.mutateAsync(
                changes.map((t) => ({
                  locationId: t.locationId,
                  minQuantity: t.minQuantity * record.packQuantity,
                  maxQuantity: t.maxQuantity * record.packQuantity,
                  threshold: t.threshold * record.packQuantity,
                })),
              )
              toast.success('Location thresholds saved')
              back()
            } catch (error) {
              setInventoryFormError(form, error)
            }
          })}
        >
          <fieldset disabled={mutation.isPending} className="flex min-w-0 flex-col gap-6">
            <FormSection
              title="Thresholds by Location"
              description="Only assigned locations are editable. Changes here do not change thresholds at other locations."
            >
              <DataTable
                data={rows}
                getRowId={(r) => r.id}
                filterKey="name"
                searchPlaceholder="Search locations…"
                columns={[
                  { accessorKey: 'name', header: 'Location' },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: ({ row }) => (
                      <Badge variant="outline">{row.original.index >= 0 ? 'Assigned' : 'Not Assigned'}</Badge>
                    ),
                  },
                  ...(['minQuantity', 'maxQuantity', 'threshold'] as const).map((key, i) => ({
                    id: key,
                    header: ['Min Quantity', 'Max Quantity', 'Threshold'][i],
                    cell: ({ row }: { row: { original: (typeof rows)[number] } }) =>
                      row.original.index < 0 ? (
                        '—'
                      ) : (
                        <FormInput
                          name={`locations.${row.original.index}.${key}`}
                          label={`${['Min Quantity', 'Max Quantity', 'Threshold'][i]} at ${row.original.name}`}
                          type="number"
                          min={0}
                          step={1}
                        />
                      ),
                  })),
                ]}
              />
            </FormSection>
            <RootError />
            <FormActions pending={mutation.isPending} onClose={back} />
          </fieldset>
        </form>
      </FormProvider>
    </InventoryPage>
  )
}
