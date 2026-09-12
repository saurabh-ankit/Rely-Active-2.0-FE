import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { FormProvider, useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field'
import { DataTable } from '@/components/ui/data-table'
import { useInventoryDetail, useSaveInventory, useUploadInventoryImage } from '@/hooks/react-query/inventory'
import { inventoryCategoryFormSchema, inventoryImageSchema, parseInventoryValue } from '@/lib/validations/inventory'
import type { InventoryCategory } from '@/lib/types/inventory'
import { FormInput, FormCheck, FormActions, RootError, SelectOptions } from './FormControls'
import { setInventoryFormError } from './formErrors'
import { InventoryPage, FormSection, InventoryLoading, InventoryLoadError } from './PageLayout'
import { inventoryBase, inventoryReturnUrl } from './navigation'
import { InventoryDialog } from './InventoryDialog'
const standardFields = [
  { name: 'Item name', type: 'Text' },
  { name: 'Package type', type: 'Selection' },
  { name: 'Base units per package', type: 'Whole number' },
  { name: 'Stock unit', type: 'Selection' },
]
function CategoryFieldRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const type = useWatch({ name: `fieldDefinitions.${index}.fieldType` })
  return (
    <FormSection
      title={`Custom field ${index + 1}`}
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Remove custom field ${index + 1}`}
          onClick={onRemove}
        >
          <Trash2 data-icon="inline-start" />
          Remove
        </Button>
      }
    >
      <FieldGroup>
        <FormInput name={`fieldDefinitions.${index}.fieldName`} label="Field name" />
        <FormInput name={`fieldDefinitions.${index}.fieldLabel`} label="Field label" />
        <FormInput name={`fieldDefinitions.${index}.fieldType`} label="Field type">
          <SelectOptions values={['text', 'number', 'select', 'date', 'boolean']} />
        </FormInput>
        {type === 'select' && (
          <FormInput name={`fieldDefinitions.${index}.options`} label="Options (one per line)" type="textarea" />
        )}
        <FormInput
          name={`fieldDefinitions.${index}.defaultValue`}
          label={type === 'boolean' ? 'Default value (true or false)' : 'Default value'}
          type={type === 'date' ? 'date' : 'text'}
        />
        <FormInput name={`fieldDefinitions.${index}.displayOrder`} label="Display order" type="number" />
        <FormCheck name={`fieldDefinitions.${index}.isRequired`} label="Required" />
      </FieldGroup>
    </FormSection>
  )
}
export function CategoryFormPage() {
  const { categoryId = '' } = useParams()
  const query = useInventoryDetail('categories', categoryId)
  if (categoryId && query.isPending) return <InventoryLoading />
  if (categoryId && query.isError) return <InventoryLoadError retry={() => void query.refetch()} />
  return <CategoryEditor key={categoryId || 'new'} record={categoryId ? query.data : undefined} />
}
export function CategoryEditor({ record }: { record?: InventoryCategory }) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const back = () => navigate(inventoryReturnUrl(inventoryBase, search, record?.id))
  const mutation = useSaveInventory('categories')
  const upload = useUploadInventoryImage()
  const [remove, setRemove] = useState<number>()
  const form = useForm<z.infer<typeof inventoryCategoryFormSchema>>({
    resolver: zodResolver(inventoryCategoryFormSchema),
    defaultValues: {
      name: record?.name ?? '',
      description: record?.description ?? '',
      image: record?.image ?? '',
      isActive: record?.isActive ?? true,
      fieldDefinitions:
        record?.fieldDefinitions.map((f) => ({
          definitionId: f.id,
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType,
          isRequired: f.isRequired,
          defaultValue: String(f.defaultValue ?? ''),
          options: f.enumValues.join('\n'),
          displayOrder: f.displayOrder,
        })) ?? [],
    },
  })
  const fields = useFieldArray({ control: form.control, name: 'fieldDefinitions' })
  const image = useWatch({ control: form.control, name: 'image' })
  const [imageError, setImageError] = useState('')
  const pending = mutation.isPending || upload.isPending
  return (
    <InventoryPage
      title={record ? 'Edit Category' : 'Add New Category'}
      description="Configure the information collected for items in this category."
      onBack={() => {
        if (!pending) back()
      }}
    >
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(async (data) => {
            if (pending || imageError) return
            try {
              await mutation.mutateAsync({
                id: record?.id,
                data: {
                  name: data.name,
                  description: data.description,
                  image: data.image ?? '',
                  isActive: data.isActive,
                  fieldDefinitions: data.fieldDefinitions.map(({ definitionId, options, defaultValue, ...f }) => ({
                    ...f,
                    ...(definitionId ? { id: definitionId } : {}),
                    enumValues:
                      f.fieldType === 'select'
                        ? options
                            .split('\n')
                            .map((x) => x.trim())
                            .filter(Boolean)
                        : [],
                    defaultValue: parseInventoryValue(f.fieldType, defaultValue),
                  })),
                },
              })
              toast.success('Category saved')
              back()
            } catch (error) {
              setInventoryFormError(form, error)
            }
          })}
        >
          <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
            <FormSection title="Basic Information">
              <FieldGroup>
                <FormInput name="name" label="Category Name *" />
                <FormInput name="description" label="Description" type="textarea" />
                <Field data-invalid={!!imageError}>
                  <FieldLabel htmlFor="category-image">Category Image</FieldLabel>
                  {image && (
                    <div className="flex items-center gap-3">
                      <img src={image} alt="Category preview" className="size-24 rounded-lg object-cover" />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          form.setValue('image', '', { shouldDirty: true })
                          setImageError('')
                          upload.reset()
                        }}
                      >
                        Remove image
                      </Button>
                    </div>
                  )}
                  <Input
                    id="category-image"
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    aria-invalid={!!imageError}
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const parsed = inventoryImageSchema.safeParse(file)
                      if (!parsed.success) {
                        setImageError(parsed.error.issues[0].message)
                        event.target.value = ''
                        return
                      }
                      setImageError('')
                      try {
                        const result = await upload.mutateAsync(file)
                        form.setValue('image', result.image, { shouldDirty: true, shouldValidate: true })
                      } catch {
                        setImageError('Image upload failed. Choose the file again or remove it.')
                      }
                      event.target.value = ''
                    }}
                  />
                  <FieldDescription>Optional. JPG, PNG or GIF, up to 10 MB.</FieldDescription>
                  {upload.isPending && <p role="status">Uploading image…</p>}
                  {imageError && (
                    <>
                      <FieldError>{imageError}</FieldError>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setImageError('')
                          upload.reset()
                        }}
                      >
                        Discard image selection
                      </Button>
                    </>
                  )}
                  <FieldError errors={[form.formState.errors.image]} />
                </Field>
                <FormCheck name="isActive" label="Active" />
              </FieldGroup>
            </FormSection>
            <FormSection title="Default Fields" description="These standard fields are available for every item.">
              <DataTable
                data={standardFields}
                columns={[
                  { accessorKey: 'name', header: 'Field' },
                  { accessorKey: 'type', header: 'Type' },
                ]}
              />
            </FormSection>
            <FormSection
              title="Custom Field Definitions"
              description="Define additional information for this category. Existing item values are preserved."
              action={
                <Button
                  type="button"
                  variant="outline"
                  disabled={fields.fields.length >= 100}
                  onClick={() =>
                    fields.append({
                      fieldName: '',
                      fieldLabel: '',
                      fieldType: 'text',
                      isRequired: false,
                      defaultValue: '',
                      options: '',
                      displayOrder: fields.fields.length,
                    })
                  }
                >
                  <Plus data-icon="inline-start" />
                  Add Field
                </Button>
              }
            >
              <div className="flex flex-col gap-4">
                {!fields.fields.length && (
                  <p className="text-sm text-muted-foreground">
                    No custom field definitions. Click Add Field to define one.
                  </p>
                )}
                {fields.fields.map((field, index) => (
                  <CategoryFieldRow
                    key={field.id}
                    index={index}
                    onRemove={() => (field.definitionId ? setRemove(index) : fields.remove(index))}
                  />
                ))}
                <FieldError errors={[form.formState.errors.fieldDefinitions]} />
              </div>
            </FormSection>
            <RootError />
            <FormActions onClose={back} pending={pending} disabled={!!imageError} />
          </fieldset>
        </form>
      </FormProvider>
      {remove !== undefined && (
        <InventoryDialog title="Remove custom field?" onClose={() => setRemove(undefined)}>
          <p>This change takes effect when you save the category. Fields containing item values cannot be removed.</p>
          <Button
            variant="destructive"
            onClick={() => {
              fields.remove(remove)
              setRemove(undefined)
            }}
          >
            Remove field
          </Button>
        </InventoryDialog>
      )}
    </InventoryPage>
  )
}
