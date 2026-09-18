import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema.ts'

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(dbPool, { schema })

export type Database = typeof db
