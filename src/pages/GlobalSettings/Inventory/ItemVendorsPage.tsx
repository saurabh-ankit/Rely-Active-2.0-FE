import { useParams } from 'react-router-dom'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/ui/data-table'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  useInventoryDetail,
  useInventoryProperties,
  useInventoryVendorOptions,
  useAssignInventoryVendors,
} from '@/hooks/react-query/inventory'
import { inventoryAssignmentsSchema } from '@/lib/validations/inventory'
import type { InventoryItem, InventoryVendor } from '@/lib/types/inventory'
import { InventoryPage, FormSection, InventoryLoading, InventoryLoadError } from './PageLayout'
import { FormActions, RootError } from './FormControls'
import { categoryPath, useInventoryNavigation } from './navigation'
import { setInventoryFormError } from './formErrors'
export function ItemVendorsPage() {
  const { itemId = '', categoryId = '' } = useParams()
  const item = useInventoryDetail('items', itemId)
  const vendors = useInventoryVendorOptions()
  const properties = useInventoryProperties()
  if (item.isPending || vendors.isPending || properties.isPending) return <InventoryLoading />
  if (item.isError || vendors.isError || properties.isError)
    return (
      <InventoryLoadError
        retry={() => {
          void item.refetch()
          void vendors.refetch()
          void properties.refetch()
        }}
      />
    )
  if (item.data.categoryId !== categoryId)
    return (
      <Alert variant="destructive">
        <AlertDescription>This item does not belong to this category.</AlertDescription>
      </Alert>
    )
  return (
    <ItemVendorsEditor
      key={itemId}
      record={item.data}
      vendors={vendors.data}
      locations={item.data.locationIds.map((id) => ({
        id,
        name: properties.data.find((p) => p.id === id)?.property_name ?? 'Unavailable location',
      }))}
    />
  )
}
function ItemVendorsEditor({
  record,
  vendors,
  locations,
}: {
  record: InventoryItem
  vendors: InventoryVendor[]
  locations: { id: string; name: string }[]
}) {
  const { back } = useInventoryNavigation(categoryPath(record.categoryId))
  const mutation = useAssignInventoryVendors(record.id)
  const form = useForm<z.infer<typeof inventoryAssignmentsSchema>>({
    resolver: zodResolver(inventoryAssignmentsSchema),
    defaultValues: {
      assignments: record.vendorAssignments.map((a) => ({ vendorId: a.vendorId, locationId: a.locationId })),
    },
  })
  return (
    <InventoryPage
      title="Manage Vendors"
      description={record.name}
      onBack={() => {
        if (!mutation.isPending) back()
      }}
    >
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            try {
              await mutation.mutateAsync(data.assignments)
              toast.success('Vendor assignments saved')
              back()
            } catch (error) {
              setInventoryFormError(form, error)
            }
          })}
        >
          <fieldset disabled={mutation.isPending} className="flex min-w-0 flex-col gap-6">
            <FormSection
              title="Vendors by Location"
              description="Select vendors for each of the item's assigned locations."
            >
              <Controller
                name="assignments"
                control={form.control}
                render={({ field, fieldState }) => {
                  const selected = field.value
                  const eligible = locations.flatMap((location) =>
                    vendors
                      .filter((v) => v.isActive && v.locationIds.includes(location.id))
                      .map((v) => ({ vendorId: v.id, locationId: location.id })),
                  )
                  const has = (vendorId: string, locationId: string) =>
                    selected.some((a) => a.vendorId === vendorId && a.locationId === locationId)
                  const all = eligible.length > 0 && eligible.every((a) => has(a.vendorId, a.locationId))
                  return (
                    <>
                      <DataTable
                        data={locations}
                        filterKey="name"
                        searchPlaceholder="Search locations…"
                        getRowId={(r) => r.id}
                        filterActions={
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!eligible.length}
                            onClick={() =>
                              field.onChange(
                                all
                                  ? selected.filter(
                                      (a) =>
                                        !eligible.some(
                                          (e) => e.vendorId === a.vendorId && e.locationId === a.locationId,
                                        ),
                                    )
                                  : [...selected, ...eligible.filter((a) => !has(a.vendorId, a.locationId))],
                              )
                            }
                          >
                            {all ? 'Deselect All' : 'Select All'}
                          </Button>
                        }
                        columns={[
                          { accessorKey: 'name', header: 'Location' },
                          {
                            id: 'vendors',
                            header: 'Vendors',
                            cell: ({ row }) => {
                              const available = vendors.filter(
                                (v) =>
                                  (v.isActive && v.locationIds.includes(row.original.id)) || has(v.id, row.original.id),
                              )
                              return available.length ? (
                                <div className="flex flex-wrap gap-4">
                                  {available.map((v) => (
                                    <Field key={v.id} orientation="horizontal">
                                      <Checkbox
                                        id={`${row.original.id}-${v.id}`}
                                        checked={has(v.id, row.original.id)}
                                        aria-label={`${v.name} at ${row.original.name}`}
                                        onCheckedChange={(checked) =>
                                          field.onChange(
                                            checked
                                              ? [...selected, { vendorId: v.id, locationId: row.original.id }]
                                              : selected.filter(
                                                  (a) => a.vendorId !== v.id || a.locationId !== row.original.id,
                                                ),
                                          )
                                        }
                                      />
                                      <FieldLabel htmlFor={`${row.original.id}-${v.id}`}>
                                        {v.name}
                                        {v.isActive ? '' : ' (inactive)'}
                                      </FieldLabel>
                                    </Field>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No vendors available for this location</span>
                              )
                            },
                          },
                        ]}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </>
                  )
                }}
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
