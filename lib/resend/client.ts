export type ResendSendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type ResendSendResult =
  | {
      status: "sent";
      resendId: string | null;
    }
  | {
      status: "skipped";
      resendId: null;
    };

type ResendResponse = {
  id?: string;
};

export const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "TradeTrack <noreply@tradetrack.app>";
export const DEFAULT_REPLY_TO_EMAIL = process.env.SUPPORT_EMAIL ?? "support@tradetrack.app";

export async function sendWithResend(input: ResendSendInput): Promise<ResendSendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required to send email.");
    }

    return { status: "skipped", resendId: null };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: DEFAULT_FROM_EMAIL,
      reply_to: DEFAULT_REPLY_TO_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!response.ok) {
    throw new Error("Email failed to send through Resend.");
  }

  const data = (await response.json()) as ResendResponse;

  return { status: "sent", resendId: data.id ?? null };
}
