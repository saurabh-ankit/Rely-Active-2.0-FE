import { useParams } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useInventoryDetail, useInventoryProperties, useAssignInventoryLocations } from '@/hooks/react-query/inventory'
import { inventoryLocationsSchema } from '@/lib/validations/inventory'
import { InventoryPage, FormSection, InventoryLoading, InventoryLoadError } from './PageLayout'
import { LocationTable, type LocationOption } from './LocationTable'
import { inventoryLocationOptions } from './locationOptions'
import { FormActions, RootError } from './FormControls'
import { inventoryBase, useInventoryNavigation } from './navigation'
import { setInventoryFormError } from './formErrors'
export function LocationsPage({ kind }: { kind: 'categories' | 'vendors' }) {
  const params = useParams()
  const id = (kind === 'categories' ? params.categoryId : params.vendorId) ?? ''
  const query = useInventoryDetail(kind, id)
  const properties = useInventoryProperties()
  if (query.isPending || properties.isPending) return <InventoryLoading />
  if (query.isError || properties.isError)
    return (
      <InventoryLoadError
        retry={() => {
          void query.refetch()
          void properties.refetch()
        }}
      />
    )
  return (
    <LocationsEditor
      key={id}
      kind={kind}
      record={query.data}
      options={inventoryLocationOptions(properties.data, query.data.locationIds)}
    />
  )
}
function LocationsEditor({
  kind,
  record,
  options,
}: {
  kind: 'categories' | 'vendors'
  record: { id: string; name: string; locationIds: string[] }
  options: LocationOption[]
}) {
  const { back } = useInventoryNavigation(inventoryBase, kind === 'categories' ? record.id : undefined)
  const mutation = useAssignInventoryLocations(kind, record.id)
  const form = useForm<z.infer<typeof inventoryLocationsSchema>>({
    resolver: zodResolver(inventoryLocationsSchema),
    defaultValues: { locationIds: record.locationIds },
  })
  return (
    <InventoryPage
      title="Manage Locations"
      description={record.name}
      onBack={() => {
        if (!mutation.isPending) back()
      }}
    >
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            try {
              await mutation.mutateAsync(data.locationIds)
              toast.success('Locations saved')
              back()
            } catch (error) {
              setInventoryFormError(form, error)
            }
          })}
        >
          <fieldset disabled={mutation.isPending} className="flex min-w-0 flex-col gap-6">
            <FormSection title="Location Assignments">
              <LocationTable options={options} />
            </FormSection>
            <RootError />
            <FormActions pending={mutation.isPending} onClose={back} />
          </fieldset>
        </form>
      </FormProvider>
    </InventoryPage>
  )
}
