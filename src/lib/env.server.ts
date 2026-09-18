import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
})

export function requireServerEnv() {
  return serverEnvSchema.parse(process.env)
}
