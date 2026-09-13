import { Link, useParams } from 'react-router-dom'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
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
import type {
  InventoryCategory,
  InventoryItem,
  InventoryPackageOptions,
  InventoryPayloads,
} from '@/lib/types/inventory'
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
  saveOverride,
  onBack,
}: {
  category: InventoryCategory
  record?: InventoryItem
  options: InventoryPackageOptions
  locations: LocationOption[]
  saveOverride?: (input: { id: string | undefined; data: InventoryPayloads['items'] }) => Promise<unknown>
  onBack?: () => void
}) {
  const navigation = useInventoryNavigation(categoryPath(category.id))
  const back = onBack ?? navigation.back
  const globalMutation = useSaveInventory('items')
  const scopedMutation = useMutation({ mutationFn: saveOverride })
  const mutation = saveOverride ? scopedMutation : globalMutation
  const schema = inventoryItemFormSchema(category.fieldDefinitions, options)
  const sortedThresholds = [...(record?.locationThresholds ?? [])].sort((a, b) => {
    const aName = locations.find((l) => l.id === a.locationId)?.name ?? ''
    const bName = locations.find((l) => l.id === b.locationId)?.name ?? ''
    return aName.localeCompare(bName) || a.locationId.localeCompare(b.locationId)
  })
  const initialThresholds = sortedThresholds[0] ?? record
  const mixedThresholds = sortedThresholds.some(
    (t) =>
      t.minQuantity !== initialThresholds?.minQuantity ||
      t.maxQuantity !== initialThresholds?.maxQuantity ||
      t.threshold !== initialThresholds?.threshold,
  )
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: record?.name ?? '',
      isActive: record?.isActive ?? true,
      packType: record?.packType ?? '',
      packUnit: record?.packUnit ?? '',
      packQuantity: record?.packQuantity ?? 1,
      minQuantity: (initialThresholds?.minQuantity ?? 0) / (record?.packQuantity ?? 1),
      maxQuantity: (initialThresholds?.maxQuantity ?? 0) / (record?.packQuantity ?? 1),
      threshold: (initialThresholds?.threshold ?? 0) / (record?.packQuantity ?? 1),
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
                  minQuantity: data.minQuantity * data.packQuantity,
                  maxQuantity: data.maxQuantity * data.packQuantity,
                  threshold: data.threshold * data.packQuantity,
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
            <FormSection
              title="Stock Thresholds"
              description={
                mixedThresholds
                  ? 'Locations currently have different thresholds. Values shown are from the first location by name. Saving applies these values to all selected locations.'
                  : 'Enter whole package counts. Saving applies these values to all selected locations.'
              }
            >
              <FieldGroup>
                <FormInput
                  name="minQuantity"
                  label={`Min Quantity${packType ? ` (${packType})` : ''} *`}
                  type="number"
                  min={0}
                  step={1}
                />
                <FormInput
                  name="maxQuantity"
                  label={`Max Quantity${packType ? ` (${packType})` : ''} *`}
                  type="number"
                  min={0}
                  step={1}
                />
                <FormInput
                  name="threshold"
                  label={`Threshold${packType ? ` (${packType})` : ''} *`}
                  type="number"
                  min={0}
                  step={1}
                />
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
              {!locations.some((l) => !l.disabled) && (
                <p className="mt-3 text-sm">
                  No eligible locations.{' '}
                  <Link className="underline" to={`${categoryPath(category.id)}/locations?returnTo=category`}>
                    Manage category locations
                  </Link>{' '}
                  first.
                </p>
              )}
            </FormSection>
            <RootError />
            <FormActions pending={mutation.isPending} onClose={back} />
          </fieldset>
        </form>
      </FormProvider>
    </InventoryPage>
  )
}
