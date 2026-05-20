import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/errors";
import { ResetPasswordSchema } from "@/lib/auth/schemas";
import { emailFromIdentifier, hashActionToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const parsed = ResetPasswordSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid reset request.");
    }

    const tokenHash = hashActionToken(parsed.data.token);
    const resetToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash }
    });

    if (!resetToken) {
      return badRequest("Invalid or expired reset link.");
    }

    const email = emailFromIdentifier(resetToken.identifier, "reset");

    if (!email || resetToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token: tokenHash } });
      return badRequest("Invalid or expired reset link.");
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
      }),
      prisma.verificationToken.delete({ where: { token: tokenHash } })
    ]);

    return NextResponse.json({ message: "Your password has been reset." });
  } catch (error) {
    console.error("Password reset failed", error);
    return serverError();
  }
}
