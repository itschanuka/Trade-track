# TradeTrack Architecture

TradeTrack is a Next.js SaaS application with a tenant-scoped user app, a platform admin area, Prisma data access, Supabase PostgreSQL storage, PDF generation, and a prepared FastAPI worker path for automation-oriented invoice processing.

## High-Level Overview

- Browser renders public pages, auth pages, tenant app pages, and admin pages.
- Next.js App Router handles UI, routing, layouts, server components, and API routes.
- Next.js API routes provide the Node.js backend layer.
- Prisma provides typed database access.
- Supabase PostgreSQL stores application data.
- Supabase Storage is used for generated PDFs through signed URLs only.
- FastAPI worker code lives in `services/invoice-worker`.
- n8n workflow planning lives in `docs/N8N_WORKFLOW_SPEC.md`.

## Request Flow

Typical tenant request flow:

1. Browser requests `/org/[slug]/...`.
2. Middleware extracts the tenant slug and sets a trusted request header.
3. Next.js renders the page or calls a Next.js API route.
4. Tenant API routes resolve organization context from the request and session.
5. Prisma queries run inside `withOrgContext`.
6. Supabase PostgreSQL returns tenant-scoped data.

## Tenant Routing

Local tenant routes use:

```text
/org/[slug]/dashboard
/org/[slug]/clients
/org/[slug]/jobs
/org/[slug]/quotes
/org/[slug]/invoices
/org/[slug]/settings
```

Middleware rewrites local `/org/[slug]` requests to the tenant app while preserving the slug in request headers. Production is prepared for subdomain routing through the same organization slug concept.

## User/Admin Model

- User: a normal tenant/business account.
- Admin: a platform operator.

The tenant is the `Organization`, not the user. Business data belongs to organizations. Users are linked to organizations through `OrganizationMember`.

Admin access is separate from organization roles and is checked through `lib/admin/access.ts`. Production admin access should be configured with `ADMIN_EMAIL`; local development can use the demo admin fallback.

## Authentication and Post-Login Redirect

NextAuth credentials authentication validates email/password and verified email status. After login, the client redirects to `/api/auth/post-login`.

Post-login behavior:

- Admin email redirects to `/admin`.
- Normal user redirects to the first active organization app path, such as `/org/test-contractor-co/dashboard`.
- Users without an organization are sent to onboarding.

## Data Isolation and Tenant Safety

Tenant API routes must:

- Require an authenticated session.
- Resolve organization context first.
- Verify the user is a member of the organization.
- Include `organizationId` in tenant queries.
- Use `withOrgContext`, which sets the PostgreSQL `app.current_org_id` value for RLS-aware query execution.

The codebase also includes a tenant-safety helper and RLS foundation migrations. Admin pages use `adminPrisma` server-side only and are guarded by admin checks.

## PDF Generation Flow

Quote and invoice PDF routes:

1. Resolve authenticated tenant organization context.
2. Load the quote or invoice with `organizationId` scoping.
3. Render HTML with server-side PDF templates.
4. Generate a PDF using Puppeteer and `@sparticuz/chromium`.
5. Upload to Supabase Storage under an organization-scoped path.
6. Return a short-lived signed URL.

No public Supabase storage URLs are exposed.

## Reminder and Overdue Invoice Flow

The app includes an overdue invoice reminder foundation at `/api/reminders/overdue`. It uses tenant-scoped invoice data and existing reminder models/settings to support follow-up automation. This is a foundation for reminders rather than a fully deployed production email scheduling system.

## FastAPI Worker Role

`services/invoice-worker` contains a FastAPI worker and Dockerfile. Its role is to support backend automation and worker-style processing outside the Next.js request lifecycle. It is prepared for containerized deployment but should not be described as deployed unless a deployment has actually been completed.

## GCP Cloud Run Readiness

The worker includes Docker and documentation intended for GCP Cloud Run deployment. Cloud Run is the planned target for the Python worker, while the Next.js app remains separately deployable.

## n8n Workflow Role

The n8n workflow spec documents automation planning for invoice/reminder workflows. It is a readiness artifact for operational automation, not a claim that a live n8n workflow is currently deployed.

## Target Deployment Architecture

Planned production architecture:

- Next.js app on Vercel
- Supabase PostgreSQL database
- Supabase Storage for generated PDFs
- FastAPI worker on GCP Cloud Run
- n8n automation workflow for reminder/operations orchestration

Related docs:

- [README.md](./README.md)
- [DATABASE.md](./DATABASE.md)
- [API.md](./API.md)
- [DEPLOYMENT_QA.md](./DEPLOYMENT_QA.md)
