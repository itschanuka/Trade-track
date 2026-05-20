import type { InvoiceStatus } from "@prisma/client";

const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ["SENT", "PARTIAL", "OVERDUE"];

export type OverdueInvoiceInput = {
  balance: number;
  dueDate: Date | string | null;
  status: InvoiceStatus;
};

export function isInvoiceOverdue(invoice: OverdueInvoiceInput, now = new Date()) {
  if (invoice.balance <= 0 || !OPEN_INVOICE_STATUSES.includes(invoice.status)) {
    return false;
  }

  if (!invoice.dueDate) {
    return false;
  }

  return new Date(invoice.dueDate).getTime() < now.getTime();
}

export function getOverdueInvoiceStatus(invoice: OverdueInvoiceInput, now = new Date()) {
  return isInvoiceOverdue(invoice, now) ? "OVERDUE" : invoice.status;
}

export function getDaysOverdue(dueDate: Date | string, now = new Date()) {
  const elapsed = now.getTime() - new Date(dueDate).getTime();

  return Math.max(Math.floor(elapsed / 86_400_000), 0);
}
