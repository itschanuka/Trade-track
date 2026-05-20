# TradeTrack

TradeTrack is a multi-tenant SaaS application for contractors and service businesses. It helps a small business manage the operational flow from client intake through jobs, quotes, invoices, reminders, and payments.

The core workflow is:

`Client -> Quote -> Job -> Invoice -> Reminder -> Payment`

TradeTrack solves the problem of scattered client, job, quote, and invoice tracking for solo contractors and small service teams. It demonstrates a focused, production-style SaaS foundation without unrelated modules such as billing, teams, documents, reports, pricing pages, or blog content.

## Features

- User authentication
- Organization onboarding
- Tenant dashboard
- Clients
- Jobs
- Quotes
- Quote-to-job conversion
- Invoices
- Job-to-invoice conversion
- Payments and balance tracking
- Quote and invoice PDF generation
- Overdue invoice reminder foundation
- Admin dashboard for platform operators

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Next.js API routes as the Node.js backend layer
- Prisma ORM
- Supabase PostgreSQL
- RLS and tenant-safety foundation
- FastAPI Python worker in `services/invoice-worker`
- Docker
- GCP Cloud Run readiness for the worker
- n8n workflow specification in `docs/N8N_WORKFLOW_SPEC.md`
- Vitest

## Active Routes

Public routes:

- `/`
- `/features`
- `/privacy`
- `/terms`

Auth routes:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/onboarding`
- `/onboarding/complete`

User app routes:

- `/org/[slug]/dashboard`
- `/org/[slug]/clients`
- `/org/[slug]/jobs`
- `/org/[slug]/quotes`
- `/org/[slug]/invoices`
- `/org/[slug]/settings`

Admin routes:

- `/admin`
- `/admin/organizations`
- `/admin/organizations/[id]`
- `/admin/users`
- `/admin/system`

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment files from safe placeholders. Do not commit real secrets.

Required local variables include database connection strings, NextAuth configuration, Supabase storage configuration for PDFs, and `ADMIN_EMAIL`. See [DEPLOYMENT_QA.md](./DEPLOYMENT_QA.md) for the variable names.

Generate Prisma Client and apply migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Seed demo data:

```bash
npm run db:seed:demo
```

Run the dev server:

```bash
npm run dev
```

## Local Demo Accounts

These credentials are local/demo only and must not be used for real production data.

- User: `testuser1@gmail.com` / `user1`
- Admin: `admin@tradetrack.local` / `admin1`

## Verification Commands

```bash
npx prisma generate
npx prisma migrate dev
npm run db:seed:demo
npm run test
npm run typecheck
npm run lint
npm run build
```

## Portfolio Value

TradeTrack demonstrates full-stack SaaS engineering across product design, authentication, tenant-aware routing, database modeling, server-side APIs, Prisma query design, tenant data isolation, PDF generation, automated tests, deployment readiness, and automation planning. It is intentionally scoped around a clean contractor workflow so the codebase can show production judgment without being diluted by unrelated roadmap modules.

## More Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [API.md](./API.md)
- [DEPLOYMENT_QA.md](./DEPLOYMENT_QA.md)
