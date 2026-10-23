import { Link, useParams } from 'react-router-dom'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Boxes, Gauge, MapPin, Package, SlidersHorizontal } from 'lucide-react'
import { SelectItem } from '@/components/ui/select'
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
  const packQuantity = useWatch({ control: form.control, name: 'packQuantity' })
  const packUnit = useWatch({ control: form.control, name: 'packUnit' })
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
            <FormSection icon={Package} title="Item details" description="Fields marked * are required.">
              <div className="grid gap-5 md:grid-cols-2 md:items-start">
                <FormInput name="name" label="Item Name *" />
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <FormCheck name="isActive" label="Active" />
                  <p className="mt-1 pl-6 text-xs text-gray-500">Inactive items can't be ordered or issued.</p>
                </div>
              </div>
            </FormSection>
            <FormSection
              icon={Boxes}
              title="Packaging"
              description="How the item is bought, e.g. 25 kg per bag. Stock levels below are counted in these packages."
            >
              <div className="grid gap-5 md:grid-cols-3">
                <FormInput name="packType" label="Package Type *">
                  <SelectOptions values={options.packageTypes} />
                </FormInput>
                <FormInput name="packQuantity" label="Pack Quantity *" type="number" />
                <FormInput name="packUnit" label="Pack Unit *">
                  <SelectOptions values={options.allowedUnitsByPackageType[packType] ?? []} />
                </FormInput>
              </div>
              {packType && packUnit && Number(packQuantity) > 0 && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#005390]/5 px-3 py-1.5 text-xs text-[#005390]">
                  <Package className="size-3.5" />
                  One {packType} holds{' '}
                  <span className="font-semibold">
                    {packQuantity} {packUnit}
                  </span>
                </p>
              )}
            </FormSection>
            <FormSection
              icon={Gauge}
              title="Stock levels"
              description={
                mixedThresholds
                  ? 'Locations currently have different levels; the values shown are from the first location by name. Saving applies these values to all selected locations.'
                  : `Counted in whole ${packType || 'package'}s. Saving applies these values to all selected locations.`
              }
            >
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <FormInput
                    name="minQuantity"
                    label={`Min Quantity${packType ? ` (${packType})` : ''} *`}
                    type="number"
                    min={0}
                    step={1}
                  />
                  <p className="mt-1 text-xs text-gray-500">The least a property should keep in stock.</p>
                </div>
                <div>
                  <FormInput
                    name="threshold"
                    label={`Threshold${packType ? ` (${packType})` : ''} *`}
                    type="number"
                    min={0}
                    step={1}
                  />
                  <p className="mt-1 text-xs text-gray-500">At or below this the item shows as Low Stock.</p>
                </div>
                <div>
                  <FormInput
                    name="maxQuantity"
                    label={`Max Quantity${packType ? ` (${packType})` : ''} *`}
                    type="number"
                    min={0}
                    step={1}
                  />
                  <p className="mt-1 text-xs text-gray-500">The most a property should hold.</p>
                </div>
              </div>
            </FormSection>
            {category.fieldDefinitions.length > 0 && (
              <FormSection
                icon={SlidersHorizontal}
                title="Additional information"
                description={`Extra details recorded for every ${category.name} item.`}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  {category.fieldDefinitions.map((f) => (
                    <FormInput
                      key={f.id}
                      name={`values.${f.id}`}
                      label={`${f.fieldLabel}${f.isRequired ? ' *' : ''}`}
                      type={f.fieldType === 'date' ? 'date' : 'text'}
                      placeholder={f.fieldType === 'boolean' ? 'Select yes or no' : undefined}
                    >
                      {f.fieldType === 'select' ? (
                        <SelectOptions values={f.enumValues} />
                      ) : f.fieldType === 'boolean' ? (
                        <>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </>
                      ) : undefined}
                    </FormInput>
                  ))}
                </div>
              </FormSection>
            )}
            <FormSection
              icon={MapPin}
              title="Stocked at"
              description="The properties that keep this item. Only properties that use this category can be picked."
            >
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
