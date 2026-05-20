import { describe, expect, it } from "vitest";
import { getOverdueInvoiceStatus, isInvoiceOverdue } from "./overdue";

describe("overdue invoice logic", () => {
  const now = new Date("2026-05-20T10:00:00.000Z");

  it("marks open unpaid invoices overdue when the due date has passed", () => {
    const invoice = {
      balance: 250,
      dueDate: new Date("2026-05-19T09:00:00.000Z"),
      status: "SENT" as const
    };

    expect(isInvoiceOverdue(invoice, now)).toBe(true);
    expect(getOverdueInvoiceStatus(invoice, now)).toBe("OVERDUE");
  });

  it("does not mark paid, draft, or future invoices overdue", () => {
    expect(
      isInvoiceOverdue(
        { balance: 0, dueDate: new Date("2026-05-19T09:00:00.000Z"), status: "PAID" },
        now
      )
    ).toBe(false);
    expect(
      isInvoiceOverdue(
        { balance: 100, dueDate: new Date("2026-05-19T09:00:00.000Z"), status: "DRAFT" },
        now
      )
    ).toBe(false);
    expect(
      isInvoiceOverdue(
        { balance: 100, dueDate: new Date("2026-05-21T09:00:00.000Z"), status: "SENT" },
        now
      )
    ).toBe(false);
  });
});
