import { describe, expect, it } from "vitest";
import { calculateInvoiceBalance, calculateInvoiceTotals } from "./calculations";

describe("invoice calculations", () => {
  it("calculates invoice totals with tax", () => {
    const totals = calculateInvoiceTotals(
      [
        { description: "Labour", quantity: 2, unitPrice: 125 },
        { description: "Materials", quantity: 1, unitPrice: 50 }
      ],
      10
    );

    expect(totals.subtotal).toBe(300);
    expect(totals.taxAmount).toBe(30);
    expect(totals.total).toBe(330);
    expect(totals.balance).toBe(330);
  });

  it("calculates balance without going negative", () => {
    expect(calculateInvoiceBalance(120, 45.5)).toBe(74.5);
    expect(calculateInvoiceBalance(120, 500)).toBe(0);
  });

  it("keeps paid amount and balance in sync after payments", () => {
    const totals = calculateInvoiceTotals(
      [{ description: "Repair", quantity: 1, unitPrice: 200 }],
      5,
      75
    );

    expect(totals.total).toBe(210);
    expect(totals.amountPaid).toBe(75);
    expect(totals.balance).toBe(135);
  });
});
