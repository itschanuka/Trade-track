import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api/errors";
import { getOrgContext, OrgContextError } from "@/lib/api/withOrg";
import { getOrgAppUrl } from "@/lib/auth/organization-onboarding";
import { withOrgContext } from "@/lib/db/withOrgContext";
import { markOverdueInvoicesAndCreateReminders } from "@/lib/invoices/reminders";
import { sendReminderDigestEmail } from "@/lib/resend/send";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency"
  }).format(value);
}

function handleOrgContextError(error: OrgContextError) {
  if (error.status === 401) {
    return unauthorized();
  }

  if (error.status === 403) {
    return forbidden();
  }

  return notFound();
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, role } = await getOrgContext(req);

    if (role === "MEMBER") {
      return forbidden("Members cannot run reminder processing.");
    }

    const result = await withOrgContext(orgId, async (tx) => {
      const organization = await tx.organization.findFirst({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          reminderOverdue: true,
          slug: true,
          members: {
            where: { role: { in: ["OWNER", "ADMIN"] } },
            select: {
              user: {
                select: {
                  email: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!organization) {
        return null;
      }

      if (!organization.reminderOverdue) {
        return {
          emailsPrepared: 0,
          organization,
          overdueInvoices: [],
          skipped: "overdue-disabled" as const
        };
      }

      const overdueInvoices = await markOverdueInvoicesAndCreateReminders(tx, orgId);

      return {
        emailsPrepared: overdueInvoices.length > 0 ? organization.members.length : 0,
        organization,
        overdueInvoices,
        skipped: null
      };
    });

    if (!result) {
      return notFound();
    }

    if (result.skipped) {
      return NextResponse.json({
        emailsPrepared: 0,
        overdueInvoices: [],
        skipped: result.skipped
      });
    }

    const dashboardUrl = `${getOrgAppUrl(result.organization.slug)}/dashboard`;
    const overdueInvoices = result.overdueInvoices.map((invoice) => ({
      amount: formatCurrency(invoice.balance),
      clientName: invoice.clientName,
      daysOverdue: invoice.daysOverdue,
      invoiceNumber: invoice.invoiceNumber,
      invoiceUrl: `${getOrgAppUrl(result.organization.slug)}/invoices`
    }));

    if (overdueInvoices.length > 0) {
      await Promise.all(
        result.organization.members.map((member) =>
          sendReminderDigestEmail({
            dashboardUrl,
            followupInvoices: [],
            name: member.user.name,
            orgName: result.organization.name,
            organizationId: orgId,
            overdueInvoices,
            to: member.user.email
          })
        )
      );
    }

    return NextResponse.json({
      emailsPrepared: result.emailsPrepared,
      overdueInvoices: result.overdueInvoices
    });
  } catch (error) {
    if (error instanceof OrgContextError) {
      return handleOrgContextError(error);
    }

    console.error("Overdue reminder processing failed", error);
    return serverError();
  }
}
