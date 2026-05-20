import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/access";
import { authOptions } from "@/lib/auth/authOptions";
import { getOrgAppUrl } from "@/lib/auth/organization-onboarding";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  if (isAdminEmail(session.user.email)) {
    return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: {
        isSuspended: false
      }
    },
    orderBy: { joinedAt: "asc" },
    select: {
      organization: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!membership) {
    return NextResponse.redirect(
      new URL("/onboarding", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  return NextResponse.redirect(new URL(`${getOrgAppUrl(membership.organization.slug)}/dashboard`));
}
