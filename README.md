# OAU Research and Innovation

A TanStack Start application for Obafemi Awolowo University research visibility, publication management, patent tracking, profile attribution, and innovation office workflows.

## Stack

- TanStack Start, TanStack Router, React 19, and Vite.
- Drizzle ORM with PostgreSQL.
- Tailwind CSS v4 with the Webflow-modern design direction in `src/styles.css`.
- First-party auth with Argon2id password hashing, hashed server-side sessions, and secure HTTP-only cookies.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Update `DATABASE_URL` in `.env.local` to point at your PostgreSQL database.

4. Generate and apply the first database migration:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Create the first super-admin account:

   ```bash
   npm run admin:create -- --email admin@example.edu --password "change-me-now"
   ```

6. Start development:

   ```bash
   npm run dev
   ```

## Current Foundation

- `auth_users`, `auth_sessions`, and `user_roles` implement the custom authentication base.
- `faculties`, `departments`, `staff`, and `profiles` separate account identity from university staff records and public attribution.
- `publications` and `patents` are first-class records with contributor tables.
- `review_events` captures audit decisions for both publications and patents.
- New public, sign-in, sign-up, and protected dashboard routes are available.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run check
npm run generate-routes
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Notes

- New self-service sign-ups receive only the `user` role.
- Lecturer, department admin, faculty admin, IPTTO officer, and super-admin access must be granted through `user_roles`.
- Staff ID and university email fields exist now but are not treated as automatic permission grants.
