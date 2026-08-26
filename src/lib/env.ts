import { z } from 'zod'

const schema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
  VITE_SOCKET_URL: z.string().url().default('http://localhost:4000'),
  VITE_APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VITE_FEATURE_FLAGS: z.string().default(''),
})

export const env = schema.parse(import.meta.env)
