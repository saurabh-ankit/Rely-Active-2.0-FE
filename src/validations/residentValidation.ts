import { z } from 'zod'

export const residentFormSchema = z.object({
  unitId: z.string().min(1, 'Property Flat / Unit is required'),
  locId: z.string().min(1, 'Property Location is required'),
  companyId: z.string().optional(),
  residentType: z.enum(['OWNER', 'TENANT']),
  ownershipType: z.enum(['PRIMARY', 'CO_OWNER', 'DEPENDENT']).optional(),
  isResiding: z.boolean(),
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name cannot exceed 50 characters'),
  lastName: z.string().trim().max(50, 'Last name cannot exceed 50 characters').optional().or(z.literal('')),
  username: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || /^[a-zA-Z0-9_]{3,30}$/.test(val),
      'Username handle must be 3-30 characters (letters, numbers, underscores only)',
    ),
  password: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length >= 6, 'Password must be at least 6 characters long'),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || /^[0-9]{10}$/.test(val.replace(/[\s-]/g, '')),
      'Mobile phone must be a valid 10-digit number',
    ),
  emergencyContact: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || /^[0-9]{10}$/.test(val.replace(/[\s-]/g, '')),
      'Emergency contact phone must be a valid 10-digit number',
    ),
  bloodGroup: z.string().optional().or(z.literal('')),
  moveInDate: z.string().min(1, 'Move-in date is required'),
})

export type ResidentFormValues = z.infer<typeof residentFormSchema>
