import { renderToStaticMarkup } from "react-dom/server.browser";
import { DEFAULT_REPLY_TO_EMAIL } from "./client";

type EmailTemplateOutput = {
  subject: string;
  html: string;
  text: string;
};

export type EmailVerificationTemplateInput = {
  name: string;
  verificationUrl: string;
  expiresAt: Date;
};

export type PasswordResetTemplateInput = {
  name: string;
  resetUrl: string;
  expiresAt: Date;
};

export type ReminderDigestInvoice = {
  invoiceNumber: string;
  clientName: string;
  amount: string;
  daysOverdue?: number;
  daysSinceSent?: number;
  invoiceUrl: string;
};

export type ReminderDigestTemplateInput = {
  name: string;
  orgName: string;
  dashboardUrl: string;
  overdueInvoices: ReminderDigestInvoice[];
  followupInvoices: ReminderDigestInvoice[];
};

export type WelcomeTemplateInput = {
  name: string;
  orgName: string;
  orgUrl: string;
  dashboardUrl: string;
};

function formatDate(value: Date) {
  return value.toLocaleDateString("en", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function renderEmail(element: React.ReactElement) {
  return `<!doctype html>${renderToStaticMarkup(element)}`;
}

function EmailLayout({
  heading,
  reason,
  children
}: {
  heading: string;
  reason: string;
  children: React.ReactNode;
}) {
  return (
    <html>
      <body style={{ margin: 0, backgroundColor: "#f6f7f9", color: "#172033" }}>
        <div style={{ padding: "32px 16px", fontFamily: "Arial, sans-serif" }}>
          <div
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e6ec",
              padding: "32px"
            }}
          >
            <p style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: 700 }}>
              TradeTrack
            </p>
            <h1 style={{ margin: "0 0 16px", fontSize: "24px", lineHeight: "32px" }}>
              {heading}
            </h1>
            {children}
            <p style={{ margin: "28px 0 0", fontSize: "13px", color: "#5b6575" }}>
              {reason} Need help? Contact {DEFAULT_REPLY_TO_EMAIL}.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p style={{ margin: "28px 0" }}>
      <a
        href={href}
        style={{
          backgroundColor: "#1f6feb",
          color: "#ffffff",
          display: "inline-block",
          fontWeight: 700,
          padding: "12px 18px",
          textDecoration: "none"
        }}
      >
        {children}
      </a>
    </p>
  );
}

function InvoiceList({
  title,
  invoices,
  fallback
}: {
  title: string;
  invoices: ReminderDigestInvoice[];
  fallback: string;
}) {
  return (
    <div style={{ marginTop: "24px" }}>
      <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>{title}</h2>
      {invoices.length ? (
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          {invoices.map((invoice) => (
            <li key={`${invoice.invoiceNumber}-${invoice.invoiceUrl}`} style={{ marginBottom: "10px" }}>
              <a href={invoice.invoiceUrl}>{invoice.invoiceNumber}</a> for {invoice.clientName}:{" "}
              {invoice.amount}
              {typeof invoice.daysOverdue === "number"
                ? `, ${invoice.daysOverdue} day(s) overdue`
                : ""}
              {typeof invoice.daysSinceSent === "number"
                ? `, sent ${invoice.daysSinceSent} day(s) ago`
                : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0 }}>{fallback}</p>
      )}
    </div>
  );
}

function formatInvoiceText(invoice: ReminderDigestInvoice) {
  const overdue = typeof invoice.daysOverdue === "number" ? `, ${invoice.daysOverdue} day(s) overdue` : "";
  const followup =
    typeof invoice.daysSinceSent === "number" ? `, sent ${invoice.daysSinceSent} day(s) ago` : "";

  return `- ${invoice.invoiceNumber} for ${invoice.clientName}: ${invoice.amount}${overdue}${followup}
  ${invoice.invoiceUrl}`;
}

export function renderEmailVerificationTemplate(
  input: EmailVerificationTemplateInput
): EmailTemplateOutput {
  const subject = "Verify your TradeTrack email address";
  const text = `Hi ${input.name},

Thanks for signing up. Click the link below to verify your email address.

${input.verificationUrl}

This link expires in 24 hours.

If you didn't create a TradeTrack account, you can ignore this email.`;

  const html = renderEmail(
    <EmailLayout
      heading="Verify your email address"
      reason="You're receiving this because a TradeTrack account was created with this email."
    >
      <p>Hi {input.name},</p>
      <p>Thanks for signing up. Click the button below to verify your email address.</p>
      <ButtonLink href={input.verificationUrl}>Verify Email</ButtonLink>
      <p>This link expires in 24 hours.</p>
      <p>If you didn&apos;t create a TradeTrack account, you can ignore this email.</p>
      <p style={{ fontSize: "13px", color: "#5b6575" }}>Expires at {formatDate(input.expiresAt)}</p>
    </EmailLayout>
  );

  return { subject, html, text };
}

export function renderPasswordResetTemplate(
  input: PasswordResetTemplateInput
): EmailTemplateOutput {
  const subject = "Reset your TradeTrack password";
  const text = `Hi ${input.name},

You requested a password reset. Click the link below to set a new password.

${input.resetUrl}

This link expires in 1 hour.

If you didn't request this, ignore this email. Your password won't change.`;

  const html = renderEmail(
    <EmailLayout
      heading="Reset your password"
      reason="You're receiving this because a password reset was requested for TradeTrack."
    >
      <p>Hi {input.name},</p>
      <p>You requested a password reset. Click the button below to set a new password.</p>
      <ButtonLink href={input.resetUrl}>Reset Password</ButtonLink>
      <p>This link expires in 1 hour.</p>
      <p>If you didn&apos;t request this, ignore this email. Your password won&apos;t change.</p>
      <p style={{ fontSize: "13px", color: "#5b6575" }}>Expires at {formatDate(input.expiresAt)}</p>
    </EmailLayout>
  );

  return { subject, html, text };
}

export function renderReminderDigestTemplate(
  input: ReminderDigestTemplateInput
): EmailTemplateOutput {
  const count = input.overdueInvoices.length + input.followupInvoices.length;
  const subject = `${count} invoice(s) need your attention - ${input.orgName}`;
  const overdueList = input.overdueInvoices.map(formatInvoiceText).join("\n") || "None today.";
  const followupList = input.followupInvoices.map(formatInvoiceText).join("\n") || "None today.";
  const text = `Hi ${input.name},

Here's your daily payment follow-up for ${input.orgName}.

Overdue invoices:
${overdueList}

Follow-up invoices:
${followupList}

Open TradeTrack:
${input.dashboardUrl}

You're receiving this because reminders are enabled for your organization.`;

  const html = renderEmail(
    <EmailLayout
      heading={`Payment follow-up for ${input.orgName}`}
      reason="You're receiving this because reminders are enabled for your organization."
    >
      <p>Hi {input.name},</p>
      <p>Here&apos;s your daily payment follow-up for {input.orgName}.</p>
      <InvoiceList
        title="Overdue invoices"
        invoices={input.overdueInvoices}
        fallback="No overdue invoices today."
      />
      <InvoiceList
        title="Follow-up invoices"
        invoices={input.followupInvoices}
        fallback="No follow-up invoices today."
      />
      <ButtonLink href={input.dashboardUrl}>Open TradeTrack</ButtonLink>
    </EmailLayout>
  );

  return { subject, html, text };
}

export function renderWelcomeTemplate(input: WelcomeTemplateInput): EmailTemplateOutput {
  const subject = "You're set up on TradeTrack - here's where to start";
  const text = `Hi ${input.name},

${input.orgName} is ready on TradeTrack.

Your app:
${input.orgUrl}

Where to start:
1. Add your first client
2. Create a quote or invoice
3. Set up your business details in Settings

Go to your dashboard:
${input.dashboardUrl}

Need help? Reply to this email.`;

  const html = renderEmail(
    <EmailLayout
      heading="You're set up on TradeTrack"
      reason="You're receiving this because organization onboarding was completed."
    >
      <p>Hi {input.name},</p>
      <p>{input.orgName} is ready on TradeTrack.</p>
      <p>
        Your app:
        <br />
        <a href={input.orgUrl}>{input.orgUrl}</a>
      </p>
      <ol>
        <li>Add your first client</li>
        <li>Create a quote or invoice</li>
        <li>Set up your business details in Settings</li>
      </ol>
      <ButtonLink href={input.dashboardUrl}>Go to dashboard</ButtonLink>
    </EmailLayout>
  );

  return { subject, html, text };
}
