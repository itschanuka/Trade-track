import { withOrgContext } from "@/lib/db/withOrgContext";
import { sendWithResend } from "./client";
import {
  renderEmailVerificationTemplate,
  renderPasswordResetTemplate,
  renderReminderDigestTemplate,
  renderWelcomeTemplate,
  type EmailVerificationTemplateInput,
  type PasswordResetTemplateInput,
  type ReminderDigestTemplateInput,
  type WelcomeTemplateInput
} from "./templates";

type AuthEmailResult = {
  status: "sent" | "skipped";
};

type OrgEmailType = "reminder_digest" | "welcome";

type OrgEmailInput = {
  organizationId: string;
  to: string;
  type: OrgEmailType;
  subject: string;
  html: string;
  text: string;
};

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "Email failed to send.";
}

async function logEmailAttempt(input: {
  organizationId: string;
  to: string;
  subject: string;
  type: OrgEmailType;
  resendId?: string | null;
  status: "sent" | "failed";
  error?: string | null;
}) {
  await withOrgContext(input.organizationId, (tx) =>
    tx.emailLog.create({
      data: {
        organizationId: input.organizationId,
        to: input.to,
        subject: input.subject,
        type: input.type,
        resendId: input.resendId ?? undefined,
        status: input.status,
        error: input.error ?? null
      }
    })
  );
}

async function sendAuthEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<AuthEmailResult> {
  const result = await sendWithResend(input);

  return { status: result.status };
}

async function sendOrgEmail(input: OrgEmailInput) {
  try {
    const result = await sendWithResend(input);

    await logEmailAttempt({
      organizationId: input.organizationId,
      to: input.to,
      subject: input.subject,
      type: input.type,
      resendId: result.resendId,
      status: result.status === "sent" ? "sent" : "failed",
      error: result.status === "skipped" ? "RESEND_API_KEY missing; send skipped outside production." : null
    });

    return result;
  } catch (error) {
    await logEmailAttempt({
      organizationId: input.organizationId,
      to: input.to,
      subject: input.subject,
      type: input.type,
      status: "failed",
      error: safeErrorMessage(error)
    });

    throw error;
  }
}

export async function sendVerificationEmail(
  input: { to: string } & EmailVerificationTemplateInput
): Promise<AuthEmailResult> {
  const email = renderEmailVerificationTemplate(input);

  return sendAuthEmail({
    to: input.to,
    ...email
  });
}

export async function sendPasswordResetEmail(
  input: { to: string } & PasswordResetTemplateInput
): Promise<AuthEmailResult> {
  const email = renderPasswordResetTemplate(input);

  return sendAuthEmail({
    to: input.to,
    ...email
  });
}

export async function sendReminderDigestEmail(
  input: { organizationId: string; to: string } & ReminderDigestTemplateInput
) {
  const email = renderReminderDigestTemplate(input);

  return sendOrgEmail({
    organizationId: input.organizationId,
    to: input.to,
    type: "reminder_digest",
    ...email
  });
}

export async function sendWelcomeEmail(input: { organizationId: string; to: string } & WelcomeTemplateInput) {
  const email = renderWelcomeTemplate(input);

  return sendOrgEmail({
    organizationId: input.organizationId,
    to: input.to,
    type: "welcome",
    ...email
  });
}
