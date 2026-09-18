import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'

import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

config({ path: ['.env.local', '.env'] })

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    'university-email': { type: 'string' },
    'staff-id': { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
})

if (values.help) {
  printUsage()
  process.exit(0)
}

const [
  { db, dbPool },
  { authUsers, userRoles },
  { requireServerEnv },
  { hashPassword },
] = await Promise.all([
  import('../src/db/index.ts'),
  import('../src/db/schema.ts'),
  import('../src/lib/env.server.ts'),
  import('../src/lib/password.server.ts'),
])

const prompts = createInterface({ input: stdin, output: stdout })

try {
  requireServerEnv()

  const email = normalizeEmail(
    values.email ?? (await prompts.question('Admin email: ')),
  )
  const password =
    values.password ?? (await prompts.question('Admin password: '))
  const universityEmail = normalizeOptionalEmail(
    values['university-email'] ??
      (await prompts.question('University email (optional): ')),
  )
  const staffIdentifier = normalizeOptionalText(
    values['staff-id'] ?? (await prompts.question('Staff ID (optional): ')),
  )

  if (email.length === 0) {
    throw new Error('Admin email is required')
  }

  if (password.length < 8) {
    throw new Error('Admin password must be at least 8 characters')
  }

  const existingUserRows = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1)
  const existingUser = existingUserRows[0] as
    (typeof existingUserRows)[number] | undefined

  if (existingUser) {
    throw new Error(`A user already exists for ${email}`)
  }

  const createdUser = await db.transaction(async (transaction) => {
    const [user] = await transaction
      .insert(authUsers)
      .values({
        email,
        passwordHash: await hashPassword(password),
        universityEmail,
        staffIdentifier,
        emailVerifiedAt: new Date(),
      })
      .returning({ id: authUsers.id, email: authUsers.email })

    await transaction.insert(userRoles).values([
      { userId: user.id, role: 'user', createdByUserId: user.id },
      { userId: user.id, role: 'super_admin', createdByUserId: user.id },
    ])

    return user
  })

  console.log(`Created super-admin account for ${createdUser.email}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  prompts.close()
  await dbPool.end()
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeOptionalEmail(email: string | undefined) {
  const normalizedEmail = email?.trim().toLowerCase()
  return normalizedEmail ? normalizedEmail : undefined
}

function normalizeOptionalText(value: string | undefined) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : undefined
}

function printUsage() {
  console.log(`Create the first super-admin account.

Usage:
  npm run admin:create -- --email admin@example.edu --password "change-me-now"

Options:
  --email              Required admin sign-in email
  --password           Required password, minimum 8 characters
  --university-email   Optional university identity email
  --staff-id           Optional staff identifier
`)
}
