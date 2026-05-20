# TradeTrack API

TradeTrack's backend is implemented through Next.js API routes in `app/api`. There is no separate Express server. The API layer runs inside the Next.js application and uses Prisma for database access.

Private tenant APIs require an authenticated session, organization context, and organization-scoped queries. Admin pages are primarily server-rendered and use server-side Prisma access only.

## Auth APIs

Routes:

- `/api/auth/[...nextauth]`
- `/api/auth/signup`
- `/api/auth/verify-email`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/auth/post-login`

Purpose:

- Credentials login through NextAuth.
- Signup, email verification, password reset, and post-login redirect.

Auth/session:

- Login/signup/reset routes have their own validation rules.
- `/api/auth/post-login` requires a session and redirects users or admins based on the authenticated email.

Tenant scoping:

- Auth identity is not tenant ownership. Tenant access is resolved after login through organization membership.

## Onboarding APIs

Routes:

- `/api/onboarding`
- `/api/onboarding/slug`

Purpose:

- Create organizations for users.
- Validate organization slug availability.

Auth/session:

- Organization creation requires an authenticated user.

Tenant scoping:

- Creates the organization and membership relationship. Business data remains organization-owned.

## Clients APIs

Routes:

- `/api/clients`
- `/api/clients/[id]`

Purpose:

- List, create, read, update, and soft-delete client records.

Main data:

- Client name, contact details, job type, notes, activity counts.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Uses organization context and `organizationId` filters.

## Jobs APIs

Routes:

- `/api/jobs`
- `/api/jobs/[id]`

Purpose:

- List, create, read, update, and delete jobs.

Main data:

- Client link, title, description, status, schedule/completion dates, location, materials, notes, quote/invoice references.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Uses organization context and validates linked clients belong to the same organization.

## Quotes APIs

Routes:

- `/api/quotes`
- `/api/quotes/[id]`

Purpose:

- List, create, read, update, and delete quotes.

Main data:

- Client link, quote number, status, dates, JSON line items, tax, totals, notes, conversion state.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Uses organization context and `organizationId` filters.

## Quote PDF API

Route:

- `/api/quotes/[id]/pdf`

Purpose:

- Generate a quote PDF and return a short-lived signed storage URL.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Quote lookup includes `organizationId`; storage paths are organization-scoped.

## Quote-to-Job Conversion API

Route:

- `/api/quotes/[id]/convert-to-job`

Purpose:

- Convert an accepted quote into a job.

Main data:

- Quote client, quote number, conversion timestamp, created job.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Quote and job operations are scoped to the current organization. Duplicate conversion is prevented by checks and unique `Job.quoteId`.

## Invoices APIs

Routes:

- `/api/invoices`
- `/api/invoices/[id]`

Purpose:

- List, create, read, update, and delete invoices.

Main data:

- Client link, invoice number, status, issue/due dates, JSON line items, tax, total, paid amount, balance, notes, payment instructions, job reference.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Uses organization context and validates linked clients belong to the same organization.

## Invoice Payment API

Route:

- `/api/invoices/[id]/payments`

Purpose:

- Record invoice payments and update paid amount, balance, and invoice status.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Invoice and payment records include the current `organizationId`.

## Invoice PDF API

Route:

- `/api/invoices/[id]/pdf`

Purpose:

- Generate an invoice PDF and return a short-lived signed storage URL.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Invoice lookup includes `organizationId`; storage paths are organization-scoped.

## Job-to-Invoice Conversion API

Route:

- `/api/jobs/[id]/convert-to-invoice`

Purpose:

- Convert a completed job into an invoice.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Job and invoice operations are scoped to the current organization. Duplicate job-to-invoice linkage is prevented by `Job.invoiceId`.

## Settings API

Route:

- `/api/settings`

Purpose:

- Update organization profile, invoice/quote defaults, tax settings, and reminder settings.

Auth/session:

- Requires a logged-in tenant user.

Tenant scoping:

- Updates only the current organization. Member users cannot change organization settings.

## Reminder/Overdue API

Route:

- `/api/reminders/overdue`

Purpose:

- Foundation for overdue invoice reminder scheduling/processing.

Auth/session:

- Requires authenticated tenant access.

Tenant scoping:

- Uses organization context and invoice/reminder records scoped to the current organization.

## Admin APIs and Pages

Admin functionality is implemented primarily as server-rendered pages under:

- `/admin`
- `/admin/organizations`
- `/admin/organizations/[id]`
- `/admin/users`
- `/admin/system`

Admin actions:

- Organization suspend/unsuspend is handled by a server action in `app/admin/actions.ts`.

Auth/session:

- Admin pages and actions require authenticated admin access through `lib/admin/access.ts`.

Tenant scoping:

- Admin database access is server-side only through `adminPrisma`. Admin pages select safe fields and do not expose auth internals.

## Security Expectations

- Private APIs require a session.
- Tenant APIs must resolve organization context before database access.
- Tenant queries must include organization scope.
- Admin access must use Admin-only checks.
- Service role keys must never be exposed to frontend code.
- Real secrets must never be committed or documented.

## Related Docs

- [README.md](./README.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [DEPLOYMENT_QA.md](./DEPLOYMENT_QA.md)
