import { z } from 'zod'
import type { InventoryFieldDefinition, InventoryPackageOptions } from '@/lib/types/inventory'
const name = z.string().trim().min(1, 'Name is required').max(255)
const text = (max: number) => z.string().trim().max(max)
export const inventoryFieldFormSchema = z
  .object({
    definitionId: z.uuid().optional(),
    fieldName: name
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Use letters, numbers and underscores')
      .refine(
        (v) => !['name', 'packType', 'packUnit', 'packQuantity', 'categoryId', 'isActive'].includes(v),
        'Reserved item field',
      ),
    fieldLabel: name,
    fieldType: z.enum(['text', 'number', 'select', 'date', 'boolean']),
    isRequired: z.boolean(),
    defaultValue: z.string(),
    options: z.string(),
    displayOrder: z.number().int().min(0).max(10000),
  })
  .superRefine((v, ctx) => {
    const enumValues = v.options
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (v.fieldType === 'select' && (!enumValues.length || new Set(enumValues).size !== enumValues.length))
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Enter distinct options, one per line' })
    if (v.defaultValue !== '') {
      const error = inventoryFieldError({ ...v, enumValues }, parseInventoryValue(v.fieldType, v.defaultValue))
      if (error) ctx.addIssue({ code: 'custom', path: ['defaultValue'], message: error })
    }
  })
export const inventoryCategoryFormSchema = z.object({
  name: name.min(2, 'Category name must be at least 2 characters'),
  description: text(10000),
  image: z.union([
    z
      .url()
      .max(500)
      .refine((v) => /^https?:\/\//i.test(v), 'Use an HTTP or HTTPS URL'),
    z.literal(''),
  ]),
  isActive: z.boolean(),
  fieldDefinitions: z
    .array(inventoryFieldFormSchema)
    .max(100)
    .refine(
      (fields) => new Set(fields.map((f) => f.fieldName.toLowerCase())).size === fields.length,
      'Custom field names must be unique',
    ),
})
export const inventoryVendorFormSchema = z.object({
  name,
  contactPerson: text(255).min(1, 'Contact person is required'),
  email: z.union([z.email().max(255), z.literal('')]),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  address: text(10000).min(1, 'Address is required'),
  locationIds: z.array(z.uuid()),
  isActive: z.boolean(),
})
export const inventoryLocationsSchema = z.object({
  locationIds: z.array(z.uuid()).refine((v) => new Set(v).size === v.length, 'Duplicate locations'),
})
export const inventoryAssignmentsSchema = z.object({
  assignments: z
    .array(z.object({ vendorId: z.uuid(), locationId: z.uuid() }))
    .refine((v) => new Set(v.map((x) => `${x.vendorId}:${x.locationId}`)).size === v.length, 'Duplicate assignments'),
})
export function parseInventoryValue(type: string, value: string) {
  return value === ''
    ? null
    : type === 'number'
      ? Number(value)
      : type === 'boolean'
        ? value === 'true'
          ? true
          : value === 'false'
            ? false
            : value
        : value
}
export function inventoryFieldError(
  field: Pick<InventoryFieldDefinition, 'fieldType' | 'isRequired' | 'enumValues'>,
  value: unknown,
): string | null {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim()))
    return field.isRequired ? 'This field is required' : null
  if (field.fieldType === 'number')
    return typeof value === 'number' && Number.isFinite(value) ? null : 'Enter a finite number'
  if (field.fieldType === 'boolean') return typeof value === 'boolean' ? null : 'Choose yes or no'
  if (field.fieldType === 'select')
    return typeof value === 'string' && field.enumValues.includes(value) ? null : 'Choose a valid option'
  if (field.fieldType === 'date')
    return typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
      ? null
      : 'Enter a valid date'
  return typeof value === 'string' ? null : 'Enter text'
}
export const inventoryItemFormSchema = (definitions: InventoryFieldDefinition[], options: InventoryPackageOptions) =>
  z
    .object({
      name,
      isActive: z.boolean(),
      packType: z.string().min(1, 'Select a package type'),
      packUnit: z.string().min(1, 'Select a stock unit'),
      packQuantity: z.number().int().positive().max(2147483647),
      minQuantity: z.number().int('Enter a whole number of packages').min(0),
      maxQuantity: z.number().int('Enter a whole number of packages').min(0),
      threshold: z.number().int('Enter a whole number of packages').min(0),
      locationIds: z.array(z.uuid()).min(1, 'At least one location is required'),
      values: z.record(z.string(), z.string().max(10000)),
    })
    .superRefine((v, ctx) => {
      if (v.maxQuantity < v.minQuantity)
        ctx.addIssue({ code: 'custom', path: ['maxQuantity'], message: 'Maximum must be at least minimum' })
      for (const field of ['minQuantity', 'maxQuantity', 'threshold'] as const) {
        if (v[field] * v.packQuantity > 2147483647)
          ctx.addIssue({ code: 'custom', path: [field], message: 'Quantity exceeds 2,147,483,647 base units' })
      }
      if (!options.allowedUnitsByPackageType[v.packType]?.includes(v.packUnit))
        ctx.addIssue({ code: 'custom', path: ['packUnit'], message: 'Select a valid unit for this package' })
      for (const field of definitions) {
        const error = inventoryFieldError(field, parseInventoryValue(field.fieldType, v.values[field.id] ?? ''))
        if (error) ctx.addIssue({ code: 'custom', path: ['values', field.id], message: error })
      }
    })

export const inventoryImageSchema = z
  .instanceof(File)
  .refine((file) => ['image/jpeg', 'image/png', 'image/gif'].includes(file.type), 'Choose a JPG, PNG or GIF image')
  .refine((file) => file.size > 0 && file.size <= 10 * 1024 * 1024, 'Image must be no larger than 10 MB')

export const inventoryLocationThresholdsFormSchema = (packQuantity: number) =>
  z.object({
    locations: z.array(
      z
        .object({
          locationId: z.uuid(),
          minQuantity: z.number().int('Enter a whole number of packages').min(0),
          maxQuantity: z.number().int('Enter a whole number of packages').min(0),
          threshold: z.number().int('Enter a whole number of packages').min(0),
        })
        .superRefine((v, ctx) => {
          if (v.maxQuantity < v.minQuantity)
            ctx.addIssue({ code: 'custom', path: ['maxQuantity'], message: 'Maximum must be at least minimum' })
          for (const key of ['minQuantity', 'maxQuantity', 'threshold'] as const)
            if (v[key] * packQuantity > 2147483647)
              ctx.addIssue({ code: 'custom', path: [key], message: 'Quantity exceeds 2,147,483,647 base units' })
        }),
    ),
  })
