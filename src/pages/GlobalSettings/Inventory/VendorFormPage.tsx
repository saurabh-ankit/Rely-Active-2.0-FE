import { useParams } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { MapPin, Truck } from 'lucide-react'
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
      title={record ? 'Edit Supplier' : 'Add Supplier'}
      description="Manage supplier details and the locations they serve."
      onBack={() => {
        if (!mutation.isPending) back()
      }}
      backLabel="Back to Suppliers"
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
              toast.success('Supplier saved')
              back()
            } catch (error) {
              setInventoryFormError(form, error)
            }
          })}
        >
          <fieldset disabled={mutation.isPending} className="flex min-w-0 flex-col gap-6">
            <FormSection
              icon={Truck}
              title="Supplier details"
              description="Who the supplier is and how to reach them. Fields marked * are required."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <FormInput name="name" label="Supplier Name *" />
                <FormInput name="contactPerson" label="Contact Person *" />
                <FormInput name="phone" label="Phone Number *" type="tel" />
                <FormInput name="email" label="Email Address" type="email" />
                <div className="md:col-span-2">
                  <FormInput name="address" label="Address *" type="textarea" />
                </div>
                <div className="md:col-span-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <FormCheck name="isActive" label="Active" />
                  <p className="mt-1 pl-6 text-xs text-gray-500">
                    Inactive vendors can't be used for new purchase orders.
                  </p>
                </div>
              </div>
            </FormSection>
            <FormSection
              icon={MapPin}
              title="Locations served"
              description="The properties that can buy from this supplier. Pick at least one."
            >
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
