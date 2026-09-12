import { useParams } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { FieldGroup } from '@/components/ui/field'
import { useInventoryDetail, useInventoryProperties, useSaveInventory } from '@/hooks/react-query/inventory'
import { inventoryVendorFormSchema } from '@/lib/validations/inventory'
import type { InventoryVendor } from '@/lib/types/inventory'
import { InventoryPage, FormSection, InventoryLoading, InventoryLoadError } from './PageLayout'
import { FormInput, FormCheck, FormActions, RootError } from './FormControls'
import { LocationTable, type LocationOption } from './LocationTable'
import { inventoryLocationOptions } from './locationOptions'
import { inventoryBase, useInventoryNavigation } from './navigation'
import { setInventoryFormError } from './formErrors'
export function VendorFormPage() {
  const { vendorId = '' } = useParams()
  const vendor = useInventoryDetail('vendors', vendorId)
  const properties = useInventoryProperties()
  if (properties.isPending || (vendorId && vendor.isPending)) return <InventoryLoading />
  if (properties.isError || (vendorId && vendor.isError))
    return (
      <InventoryLoadError
        retry={() => {
          void properties.refetch()
          if (vendorId) void vendor.refetch()
        }}
      />
    )
  return (
    <VendorEditor
      key={vendorId || 'new'}
      record={vendorId ? vendor.data : undefined}
      locations={inventoryLocationOptions(properties.data, vendor.data?.locationIds)}
    />
  )
}
function VendorEditor({ record, locations }: { record?: InventoryVendor; locations: LocationOption[] }) {
  const { back } = useInventoryNavigation(inventoryBase)
  const mutation = useSaveInventory('vendors')
  const form = useForm<z.infer<typeof inventoryVendorFormSchema>>({
    resolver: zodResolver(inventoryVendorFormSchema),
    defaultValues: {
      name: record?.name ?? '',
      contactPerson: record?.contactPerson ?? '',
      email: record?.email ?? '',
      phone: record?.phone ?? '',
      address: record?.address ?? '',
      isActive: record?.isActive ?? true,
      locationIds: record?.locationIds ?? [],
    },
  })
  return (
    <InventoryPage
      title={record ? 'Edit Vendor' : 'Add Vendor'}
      description="Manage vendor details and the locations they serve."
      onBack={() => {
        if (!mutation.isPending) back()
      }}
    >
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(async (data) => {
            if (!record && !data.locationIds.length) {
              form.setError('locationIds', { message: 'At least one location is required' })
              return
            }
            try {
              await mutation.mutateAsync({
                id: record?.id,
                data: { ...data, email: data.email ?? '', phone: data.phone ?? '' },
              })
              toast.success('Vendor saved')
              back()
            } catch (error) {
              setInventoryFormError(form, error)
            }
          })}
        >
          <fieldset disabled={mutation.isPending} className="flex min-w-0 flex-col gap-6">
            <FormSection title="Vendor Information">
              <FieldGroup>
                <FormInput name="name" label="Vendor Name *" />
                <FormInput name="contactPerson" label="Contact Person *" />
                <FormInput name="email" label="Email Address" type="email" />
                <FormInput name="phone" label="Phone Number *" type="tel" />
                <FormInput name="address" label="Address *" type="textarea" />
                <FormCheck name="isActive" label="Active" />
              </FieldGroup>
            </FormSection>
            <FormSection title="Locations" description="Select the locations served by this vendor.">
              <LocationTable options={locations} />
            </FormSection>
            <RootError />
            <FormActions onClose={back} pending={mutation.isPending} />
          </fieldset>
        </form>
      </FormProvider>
    </InventoryPage>
  )
}
