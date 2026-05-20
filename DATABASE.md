# TradeTrack Database

TradeTrack uses Prisma with Supabase PostgreSQL. Prisma models define the application schema, relationships, indexes, and constraints. Supabase/Postgres provides the underlying database and supports the RLS and tenant-safety foundation.

No real database URLs or credentials should be documented or committed.

## Core Ownership Model

The `Organization` owns tenant business data. Users do not directly own clients, jobs, quotes, invoices, or payments.

`OrganizationMember` links a `User` to an `Organization` with a role. Tenant queries use `organizationId` to scope business records.

## Main Entities

- `User`: authentication identity with email, name, password hash, verification state, accounts, sessions, and memberships.
- `Organization`: tenant/business account with slug, contact settings, invoice/quote numbering settings, reminder settings, suspension status, and related tenant data.
- `OrganizationMember`: links users to organizations and stores tenant role.
- `Client`: customer record owned by an organization.
- `Job`: work record owned by an organization and linked to a client. May link to one quote and one invoice.
- `Quote`: estimate/proposal owned by an organization and linked to a client.
- `QuoteLineItem`: stored inside `Quote.lineItems` as JSON line item data rather than a separate table.
- `Invoice`: invoice owned by an organization and linked to a client. May be linked from a job.
- `InvoiceLineItem`: stored inside `Invoice.lineItems` as JSON line item data rather than a separate table.
- `InvoicePayment`: payment record linked to an invoice and organization.
- `Reminder`: reminder scheduling/foundation record linked to an invoice and organization.
- `AdminAction`: audit-style log for platform admin actions.

The schema also includes auth/supporting models such as `Account`, `Session`, `VerificationToken`, `OrganizationInvite`, `Document`, and `EmailLog`.

## Relationship Flow

- Organization owns tenant data.
- Organization has many clients, jobs, quotes, invoices, payments, reminders, members, and invites.
- Client can have jobs, quotes, invoices, and documents.
- Quote can convert to a job.
- Job can convert to an invoice.
- Invoice can have many payments.
- Reminder records attach to invoices for overdue/follow-up workflows.

## Important Constraints

- Tenant-scoped tables include `organizationId`.
- Tenant models include indexes on `organizationId`.
- Quote numbers are unique per organization through `@@unique([organizationId, quoteNumber])`.
- Invoice numbers are unique per organization through `@@unique([organizationId, invoiceNumber])`.
- `Job.quoteId` is unique, preventing duplicate quote-to-job conversion.
- `Job.invoiceId` is unique, preventing duplicate job-to-invoice linkage.
- `Organization.isSuspended` supports platform admin suspension.
- Organization-scoped relations generally use cascading deletes so tenant cleanup can remove dependent data.

## RLS and Tenant-Safety Foundation

The codebase includes a Supabase RLS foundation migration and a `withOrgContext` helper. Tenant queries run inside a transaction that sets the PostgreSQL `app.current_org_id` setting. API routes also explicitly include `organizationId` in tenant queries.

This layered approach combines application-level scoping with a database-level RLS foundation.

## Related Docs

- [README.md](./README.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [API.md](./API.md)
- [DEPLOYMENT_QA.md](./DEPLOYMENT_QA.md)
