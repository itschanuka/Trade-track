import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/errors";
import { SignupSchema } from "@/lib/auth/schemas";
import {
  createActionToken,
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
  hoursFromNow,
  verificationIdentifier
} from "@/lib/auth/tokens";
import { getAppBaseUrl } from "@/lib/auth/urls";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/resend/auth-emails";

const GENERIC_SIGNUP_MESSAGE =
  "If this email can be registered, we will send a verification link.";

export async function POST(req: Request) {
  try {
    const parsed = SignupSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid signup details.");
    }

    const email = parsed.data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true, name: true }
    });

    if (existingUser?.emailVerified) {
      return NextResponse.json({ message: GENERIC_SIGNUP_MESSAGE });
    }

    const { token, tokenHash } = createActionToken();
    const expiresAt = hoursFromNow(EMAIL_VERIFICATION_TOKEN_TTL_HOURS);
    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          email,
          name: parsed.data.name,
          password: hashedPassword
        },
        select: { id: true, email: true, name: true }
      }));

    if (existingUser && !existingUser.emailVerified) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: parsed.data.name,
          password: hashedPassword
        }
      });
    }

    await prisma.verificationToken.deleteMany({
      where: { identifier: verificationIdentifier(email) }
    });

    await prisma.verificationToken.create({
      data: {
        identifier: verificationIdentifier(email),
        token: tokenHash,
        expires: expiresAt
      }
    });

    const verificationUrl = `${getAppBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail({
      to: email,
      name: user.name,
      verificationUrl,
      expiresAt
    });

    return NextResponse.json({ message: GENERIC_SIGNUP_MESSAGE });
  } catch (error) {
    console.error("Signup failed", error);
    return serverError();
  }
}
