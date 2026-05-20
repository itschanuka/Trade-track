import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/errors";
import { emailFromIdentifier, hashActionToken } from "@/lib/auth/tokens";
import { getAppBaseUrl } from "@/lib/auth/urls";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function redirectToLogin(search: string) {
  return NextResponse.redirect(`${getAppBaseUrl()}/login${search}`);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return redirectToLogin("?verified=invalid");
    }

    const tokenHash = hashActionToken(token);
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash }
    });

    if (!verificationToken) {
      return redirectToLogin("?verified=invalid");
    }

    const email = emailFromIdentifier(verificationToken.identifier, "verify");

    if (!email || verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token: tokenHash } });
      return redirectToLogin("?verified=expired");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() }
      }),
      prisma.verificationToken.delete({ where: { token: tokenHash } })
    ]);

    return redirectToLogin("?verified=1");
  } catch (error) {
    console.error("Email verification failed", error);
    return serverError();
  }
}
