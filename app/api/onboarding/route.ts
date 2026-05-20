import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { badRequest, conflict, serverError, unauthorized } from "@/lib/api/errors";
import { authOptions } from "@/lib/auth/authOptions";
import { createOrganizationForUser, getOrgAppUrl } from "@/lib/auth/organization-onboarding";
import { OnboardingSchema } from "@/lib/auth/schemas";
import { sendWelcomeEmail } from "@/lib/resend/welcome-email";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
      return unauthorized();
    }

    const parsed = OnboardingSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest("Invalid organization details.");
    }

    const result = await createOrganizationForUser(session.user.id, parsed.data);

    if (result.status === "reserved") {
      return badRequest("That organization slug is reserved.");
    }

    if (result.status === "duplicate") {
      return conflict("That organization slug is already taken.");
    }

    const orgUrl = getOrgAppUrl(result.organization.slug);
    const dashboardUrl = `${orgUrl}/dashboard`;

    try {
      await sendWelcomeEmail({
        organizationId: result.organization.id,
        to: session.user.email,
        name: session.user.name ?? "there",
        orgName: result.organization.name,
        orgUrl,
        dashboardUrl
      });
    } catch (error) {
      console.error("Welcome email failed", error);
    }

    return NextResponse.json({
      organization: result.organization,
      redirectUrl: `/onboarding/complete?slug=${encodeURIComponent(result.organization.slug)}`
    });
  } catch (error) {
    console.error("Organization onboarding failed", error);
    return serverError();
  }
}
