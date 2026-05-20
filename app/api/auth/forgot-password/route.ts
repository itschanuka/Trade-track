import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/errors";
import { ForgotPasswordSchema } from "@/lib/auth/schemas";
import {
  createActionToken,
  hoursFromNow,
  PASSWORD_RESET_TOKEN_TTL_HOURS,
  passwordResetIdentifier
} from "@/lib/auth/tokens";
import { getAppBaseUrl } from "@/lib/auth/urls";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/resend/auth-emails";

const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, we will send password reset instructions.";

export async function POST(req: Request) {
  try {
    const parsed = ForgotPasswordSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid email address.");
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, name: true }
    });

    if (!user) {
      return NextResponse.json({ message: GENERIC_RESET_MESSAGE });
    }

    const { token, tokenHash } = createActionToken();
    const expiresAt = hoursFromNow(PASSWORD_RESET_TOKEN_TTL_HOURS);

    await prisma.verificationToken.deleteMany({
      where: { identifier: passwordResetIdentifier(email) }
    });

    await prisma.verificationToken.create({
      data: {
        identifier: passwordResetIdentifier(email),
        token: tokenHash,
        expires: expiresAt
      }
    });

    const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresAt
    });

    return NextResponse.json({ message: GENERIC_RESET_MESSAGE });
  } catch (error) {
    console.error("Password reset request failed", error);
    return serverError();
  }
}
