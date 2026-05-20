export type InvoiceCalculationLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceCalculationLine = InvoiceCalculationLineInput & {
  lineTotal: number;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateInvoiceTotals(
  lineItems: InvoiceCalculationLineInput[],
  taxRate = 0,
  amountPaid = 0
) {
  const normalizedLineItems: InvoiceCalculationLine[] = lineItems.map((item) => {
    const quantity = roundMoney(item.quantity);
    const unitPrice = roundMoney(item.unitPrice);

    return {
      description: item.description.trim(),
      quantity,
      unitPrice,
      lineTotal: roundMoney(quantity * unitPrice)
    };
  });
  const subtotal = roundMoney(
    normalizedLineItems.reduce((sum, item) => sum + item.lineTotal, 0)
  );
  const normalizedTaxRate = roundMoney(taxRate);
  const taxAmount = roundMoney(subtotal * (normalizedTaxRate / 100));
  const total = roundMoney(subtotal + taxAmount);
  const normalizedAmountPaid = roundMoney(amountPaid);

  return {
    lineItems: normalizedLineItems,
    subtotal,
    taxRate: normalizedTaxRate,
    taxAmount,
    total,
    amountPaid: normalizedAmountPaid,
    balance: calculateInvoiceBalance(total, normalizedAmountPaid)
  };
}

export function calculateInvoiceBalance(total: number, amountPaid: number) {
  return roundMoney(Math.max(roundMoney(total) - roundMoney(amountPaid), 0));
}
