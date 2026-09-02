import { z } from 'zod'

export const propertyAssignmentFormSchema = z.object({
  locId: z.string(),
  propertyName: z.string().optional(),
  enabled: z.boolean(),
  price: z.union([z.number(), z.string()]),
  quantity: z.union([z.number(), z.string()]),
})

export const globalServiceFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Service name is required'),
    basePrice: z.number().min(0, 'Base price must be 0 or greater'),
    description: z.string(),
    propertyAssignments: z.array(propertyAssignmentFormSchema),
  })
  .superRefine((data, ctx) => {
    const enabledAssignments = data.propertyAssignments.filter((pa) => pa.enabled)
    const invalidQuantity = enabledAssignments.some((pa) => !pa.quantity || Number(pa.quantity) < 1)
    if (invalidQuantity) {
      ctx.addIssue({
        code: 'custom',
        message: 'Quantity must be at least 1 for each assigned property',
        path: ['propertyAssignments'],
      })
    }
  })

export type GlobalServiceFormValues = z.infer<typeof globalServiceFormSchema>
export type PropertyAssignmentFormValues = z.infer<typeof propertyAssignmentFormSchema>

export const globalServiceFormDefaultValues: GlobalServiceFormValues = {
  name: '',
  basePrice: 0,
  description: '',
  propertyAssignments: [],
}
