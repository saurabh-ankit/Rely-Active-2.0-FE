import { describe, expect, it } from 'vitest'
import { inventoryItemFormSchema } from './inventory'

const schema = inventoryItemFormSchema([], {
  packageTypes: ['strip'],
  stockUnits: ['tablet'],
  allowedUnitsByPackageType: { strip: ['tablet'] },
})
const base = {
  name: 'Tablets',
  isActive: true,
  packType: 'strip',
  packUnit: 'tablet',
  packQuantity: 10,
  minQuantity: 3,
  maxQuantity: 10,
  threshold: 20,
  locationIds: ['00000000-0000-4000-8000-000000000004'],
  values: {},
}

describe('inventory package threshold validation', () => {
  it('allows an independent threshold and zero values', () => {
    expect(schema.safeParse(base).success).toBe(true)
    expect(schema.safeParse({ ...base, minQuantity: 0, maxQuantity: 0, threshold: 0 }).success).toBe(true)
  })
  it.each(['minQuantity', 'maxQuantity', 'threshold'])('rejects invalid %s package counts', (field) => {
    for (const value of [-1, 0.5, NaN, Infinity, 214748365, undefined])
      expect(schema.safeParse({ ...base, [field]: value }).success).toBe(false)
  })
  it('checks range and the exact base-unit boundary', () => {
    expect(schema.safeParse({ ...base, maxQuantity: 2 }).success).toBe(false)
    expect(schema.safeParse({ ...base, packQuantity: 1, threshold: 2147483647 }).success).toBe(true)
    expect(schema.safeParse({ ...base, packQuantity: 1, threshold: 2147483648 }).success).toBe(false)
  })
})
