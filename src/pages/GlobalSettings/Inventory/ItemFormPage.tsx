import { useParams } from 'react-router-dom'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { FieldGroup } from '@/components/ui/field'
import { NativeSelectOption } from '@/components/ui/native-select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  useInventoryDetail,
  useInventoryProperties,
  useInventoryPackageOptions,
  useSaveInventory,
} from '@/hooks/react-query/inventory'
import { inventoryItemFormSchema, parseInventoryValue } from '@/lib/validations/inventory'
import type { InventoryCategory, InventoryItem, InventoryPackageOptions } from '@/lib/types/inventory'
import { InventoryPage, FormSection, InventoryLoading, InventoryLoadError } from './PageLayout'
import { LocationTable, type LocationOption } from './LocationTable'
import { inventoryLocationOptions } from './locationOptions'
import { FormInput, FormCheck, FormActions, RootError, SelectOptions } from './FormControls'
import { categoryPath, useInventoryNavigation } from './navigation'
import { setInventoryFormError } from './formErrors'
export function ItemFormPage() {
  const { categoryId = '', itemId = '' } = useParams()
  const category = useInventoryDetail('categories', categoryId)
  const item = useInventoryDetail('items', itemId)
  const properties = useInventoryProperties()
  const options = useInventoryPackageOptions()
  if (category.isPending || properties.isPending || options.isPending || (itemId && item.isPending))
    return <InventoryLoading />
  if (category.isError || properties.isError || options.isError || (itemId && item.isError))
    return (
      <InventoryLoadError
        retry={() => {
          void category.refetch()
          void properties.refetch()
          void options.refetch()
          if (itemId) void item.refetch()
        }}
      />
    )
  if (itemId && item.data?.categoryId !== categoryId)
    return (
      <Alert variant="destructive">
        <AlertDescription>This item does not belong to this category.</AlertDescription>
      </Alert>
    )
  return (
    <ItemEditor
      key={itemId || 'new'}
      category={category.data}
      record={itemId ? item.data : undefined}
      options={options.data}
      locations={inventoryLocationOptions(properties.data, item.data?.locationIds, category.data.locationIds)}
    />
  )
}
export function ItemEditor({
  category,
  record,
  options,
  locations,
}: {
  category: InventoryCategory
  record?: InventoryItem
  options: InventoryPackageOptions
  locations: LocationOption[]
}) {
  const { back } = useInventoryNavigation(categoryPath(category.id))
  const mutation = useSaveInventory('items')
  const schema = inventoryItemFormSchema(category.fieldDefinitions, options)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: record?.name ?? '',
      isActive: record?.isActive ?? true,
      packType: record?.packType ?? '',
      packUnit: record?.packUnit ?? '',
      packQuantity: record?.packQuantity ?? 1,
      locationIds: record?.locationIds ?? [],
      values: Object.fromEntries(
        category.fieldDefinitions.map((f) => [
          f.id,
          String(
            (record ? record.customFields.find((v) => v.fieldDefinitionId === f.id)?.value : f.defaultValue) ?? '',
          ),
        ]),
      ),
    },
  })
  const packType = useWatch({ control: form.control, name: 'packType' })
  return (
    <InventoryPage
      title={record ? 'Edit Inventory Item' : 'Add Inventory Item'}
      description={category.name}
      onBack={() => {
        if (!mutation.isPending) back()
      }}
    >
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(async ({ values, ...data }) => {
            try {
              await mutation.mutateAsync({
                id: record?.id,
                data: {
                  ...data,
                  categoryId: category.id,
                  customFields: category.fieldDefinitions.map((f) => ({
                    fieldDefinitionId: f.id,
                    value: parseInventoryValue(f.fieldType, values[f.id] ?? ''),
                  })),
                },
              })
              toast.success('Item saved')
              back()
            } catch (error) {
              setInventoryFormError(form, error)
            }
          })}
        >
          <fieldset disabled={mutation.isPending} className="flex min-w-0 flex-col gap-6">
            <FormSection title="Basic Information">
              <FieldGroup>
                <FormInput name="name" label="Item Name *" />
                <FormCheck name="isActive" label="Active" />
              </FieldGroup>
            </FormSection>
            <FormSection title="Packaging">
              <FieldGroup>
                <FormInput name="packType" label="Package Type *">
                  <SelectOptions values={options.packageTypes} />
                </FormInput>
                <FormInput name="packQuantity" label="Pack Quantity *" type="number" />
                <FormInput name="packUnit" label="Pack Unit *">
                  <SelectOptions values={options.allowedUnitsByPackageType[packType] ?? []} />
                </FormInput>
              </FieldGroup>
            </FormSection>
            {category.fieldDefinitions.length > 0 && (
              <FormSection title="Additional Information">
                <FieldGroup>
                  {category.fieldDefinitions.map((f) => (
                    <FormInput
                      key={f.id}
                      name={`values.${f.id}`}
                      label={`${f.fieldLabel}${f.isRequired ? ' *' : ''}`}
                      type={f.fieldType === 'date' ? 'date' : 'text'}
                    >
                      {f.fieldType === 'select' ? (
                        <SelectOptions values={f.enumValues} />
                      ) : f.fieldType === 'boolean' ? (
                        <>
                          <NativeSelectOption value="">Select yes or no</NativeSelectOption>
                          <NativeSelectOption value="true">Yes</NativeSelectOption>
                          <NativeSelectOption value="false">No</NativeSelectOption>
                        </>
                      ) : undefined}
                    </FormInput>
                  ))}
                </FieldGroup>
              </FormSection>
            )}
            <FormSection title="Locations" description="Select from the locations assigned to this category.">
              <LocationTable options={locations} />
            </FormSection>
            <RootError />
            <FormActions pending={mutation.isPending} onClose={back} />
          </fieldset>
        </form>
      </FormProvider>
    </InventoryPage>
  )
}
