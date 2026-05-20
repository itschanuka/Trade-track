import type { Prisma } from "@prisma/client";
import { getDaysOverdue, isInvoiceOverdue } from "./overdue";

export type OverdueReminderCandidate = {
  balance: number;
  dueDate: Date | null;
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
};

export function getOverdueReminderCandidateIds(
  invoices: OverdueReminderCandidate[],
  now = new Date()
) {
  return invoices.filter((invoice) => isInvoiceOverdue(invoice, now)).map((invoice) => invoice.id);
}

export async function markOverdueInvoicesAndCreateReminders(
  tx: Prisma.TransactionClient,
  orgId: string,
  now = new Date()
) {
  const candidates = await tx.invoice.findMany({
    where: {
      organizationId: orgId,
      balance: { gt: 0 },
      dueDate: { lt: now },
      status: { in: ["SENT", "PARTIAL", "OVERDUE"] }
    },
    include: {
      client: {
        select: {
          email: true,
          name: true
        }
      },
      reminders: {
        where: {
          organizationId: orgId,
          type: "INVOICE_OVERDUE"
        },
        select: { id: true }
      }
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }]
  });
  const overdueIds = getOverdueReminderCandidateIds(candidates, now);

  if (overdueIds.length > 0) {
    await tx.invoice.updateMany({
      where: {
        organizationId: orgId,
        id: { in: overdueIds },
        status: { in: ["SENT", "PARTIAL"] }
      },
      data: { status: "OVERDUE" }
    });
  }

  const remindersToCreate = candidates.filter(
    (invoice) => overdueIds.includes(invoice.id) && invoice.reminders.length === 0
  );

  if (remindersToCreate.length > 0) {
    await tx.reminder.createMany({
      data: remindersToCreate.map((invoice) => ({
        organizationId: orgId,
        invoiceId: invoice.id,
        scheduledAt: now,
        type: "INVOICE_OVERDUE" as const
      }))
    });
  }

  return candidates
    .filter((invoice) => overdueIds.includes(invoice.id))
    .map((invoice) => ({
      balance: invoice.balance,
      clientEmail: invoice.client.email,
      clientName: invoice.client.name,
      daysOverdue: invoice.dueDate ? getDaysOverdue(invoice.dueDate, now) : 0,
      dueDate: invoice.dueDate,
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      reminderCreated: invoice.reminders.length === 0
    }));
}
