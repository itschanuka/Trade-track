# TradeTrack Deployment and QA

This document covers local verification, manual QA, deployment planning, environment variables, and security readiness. Use placeholders only for credentials and secrets.

## Local Verification Checklist

Run these before opening a PR or deployment:

```bash
npx prisma generate
npx prisma migrate dev
npm run db:seed:demo
npm run test
npm run typecheck
npm run lint
npm run build
```

## Manual QA Checklist

- Login as local/demo user.
- Confirm user login redirects to `/org/test-contractor-co/dashboard`.
- Create a client.
- Confirm the client appears immediately on the Clients page.
- Create a job linked to that client.
- Create a quote linked to that client.
- Convert an accepted quote to a job.
- Confirm the converted quote cannot create a duplicate job.
- Convert a completed job to an invoice.
- Record a payment and confirm paid amount/balance updates.
- Generate quote PDF.
- Generate invoice PDF.
- Confirm dashboard stats reflect real tenant data.
- Login as local/demo admin.
- Confirm admin login redirects to `/admin`.
- Confirm normal users cannot access `/admin`.
- Confirm admin pages do not expose passwords, tokens, secrets, or auth internals.

## Deployment Plan

1. Push code to GitHub.
2. Deploy the Next.js app to Vercel.
3. Configure Supabase PostgreSQL and storage.
4. Add production environment variables in Vercel using secret values.
5. Run Prisma migrations against the production database using a controlled migration process.
6. Deploy the FastAPI worker container to GCP Cloud Run when worker functionality is needed.
7. Configure n8n workflow automation from the existing workflow spec when reminder automation is ready.

Do not claim production deployment status until each service has actually been deployed and verified.

## Prisma Migration Strategy

Local development can use:

```bash
npx prisma migrate dev
```

Production should use reviewed migrations and a controlled deployment process, typically:

```bash
npx prisma migrate deploy
```

Run migrations with production credentials only in secure CI/CD or an approved operational environment.

## Required Environment Variables

Use placeholders only in documentation and examples.

```bash
DATABASE_URL="<postgres pooled connection string>"
DIRECT_URL="<postgres direct connection string>"
NEXTAUTH_URL="<app url>"
NEXTAUTH_SECRET="<random secret>"
NEXT_PUBLIC_APP_URL="<public app url>"
NEXT_PUBLIC_ROOT_DOMAIN="<root domain>"
ADMIN_EMAIL="<admin email>"
SUPABASE_URL="<supabase project url>"
SUPABASE_SERVICE_ROLE_KEY="<server-only service role key>"
SUPABASE_STORAGE_BUCKET="<storage bucket name>"
RESEND_API_KEY="<optional email provider key>"
```

Never expose real Supabase passwords, service role keys, API keys, database URLs, or production credentials in committed files.

## Demo Accounts

Local/demo only:

- User: `testuser1@gmail.com` / `user1`
- Admin: `admin@tradetrack.local` / `admin1`

Do not use demo credentials for real production data.

## Security Checklist

- No secrets committed.
- `.env` and `.env.local` are ignored or kept out of commits.
- API routes are protected.
- Admin routes are protected.
- Tenant data is scoped by organization.
- PDF storage uses organization-scoped paths and signed URLs.
- Service role keys remain server-side only.
- Demo credentials are local/demo only.

Note: the current `.gitignore` ignores `.env.local` and `.env*.local`. If a plain `.env` is used locally, keep it out of commits and consider adding it to ignore rules for stricter safety.

## Current Known Limitation

If `npm audit` still reports dependency vulnerabilities, treat that as pending dependency upgrade and security cleanup work. Track upgrades carefully because Next.js, Prisma, Puppeteer/Chromium, and auth dependencies can have compatibility constraints.

## Related Docs

- [README.md](./README.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [API.md](./API.md)
