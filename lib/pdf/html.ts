import type { InvoicePdfData, PdfLineItem, PdfOrganization, QuotePdfData } from "./types";

const accentColor = "#0f766e";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function text(value: string | null | undefined) {
  return value?.trim() ? escapeHtml(value.trim()) : "";
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-CA").format(value);
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function detailLine(label: string, value: string | null | undefined) {
  const escaped = text(value);

  if (!escaped) {
    return "";
  }

  return `<div><span class="muted">${escapeHtml(label)}:</span> ${escaped}</div>`;
}

function organizationDetails(organization: PdfOrganization) {
  return [
    `<strong>${text(organization.name)}</strong>`,
    detailLine("Reg No", organization.registrationNo),
    text(organization.phone),
    text(organization.email),
    text(organization.address),
    text(organization.website)
  ]
    .filter(Boolean)
    .map((line) => `<div>${line}</div>`)
    .join("");
}

function logoOrName(organization: PdfOrganization) {
  if (organization.logoUrl) {
    return `<img alt="${text(organization.name)} logo" class="logo" src="${text(organization.logoUrl)}" />`;
  }

  return `<div class="logo-fallback">${text(organization.name)}</div>`;
}

function clientBlock(label: string, client: { name: string; email: string | null; phone: string | null; address: string | null }) {
  const details = [text(client.name), text(client.email), text(client.phone), text(client.address)]
    .filter(Boolean)
    .map((line) => `<div>${line}</div>`)
    .join("");

  return `
    <section class="block">
      <h2>${escapeHtml(label)}</h2>
      <div class="details">${details}</div>
    </section>
  `;
}

function lineItemsTable(lineItems: PdfLineItem[]) {
  const rows = lineItems
    .map(
      (item) => `
        <tr>
          <td>${text(item.description)}</td>
          <td class="number">${formatMoney(item.quantity)}</td>
          <td class="number">${formatMoney(item.unitPrice)}</td>
          <td class="number">${formatMoney(item.lineTotal)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="number">Qty</th>
          <th class="number">Unit Price</th>
          <th class="number">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function totalsBlock(rows: Array<{ label: string; value: number; emphasize?: boolean }>) {
  return `
    <section class="totals">
      ${rows
        .map(
          (row) => `
            <div class="${row.emphasize ? "total-row final" : "total-row"}">
              <span>${escapeHtml(row.label)}</span>
              <strong>${formatMoney(row.value)}</strong>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function baseDocument({
  body,
  documentMeta,
  documentTitle,
  organization,
  watermark
}: {
  body: string;
  documentMeta: string;
  documentTitle: string;
  organization: PdfOrganization;
  watermark: boolean;
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 20mm 18mm; }
          * { box-sizing: border-box; }
          body {
            background: #ffffff;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10.5pt;
            line-height: 1.45;
            margin: 0;
          }
          .header {
            align-items: flex-start;
            border-bottom: 2px solid ${accentColor};
            display: flex;
            justify-content: space-between;
            gap: 28px;
            padding-bottom: 18px;
          }
          .brand { max-width: 55%; }
          .logo { max-height: 60px; max-width: 120px; object-fit: contain; }
          .logo-fallback { color: ${accentColor}; font-size: 18pt; font-weight: 700; }
          .details { margin-top: 10px; }
          .muted { color: #6b7280; }
          .document-title { text-align: right; }
          .document-title h1 {
            color: ${accentColor};
            font-size: 26pt;
            letter-spacing: 0;
            margin: 0 0 4px;
          }
          .document-number { font-size: 13pt; font-weight: 700; margin-bottom: 10px; }
          .status {
            border: 1px solid #d1d5db;
            border-radius: 4px;
            display: inline-block;
            font-size: 9pt;
            font-weight: 700;
            margin-top: 6px;
            padding: 3px 8px;
          }
          .grid {
            display: grid;
            gap: 18px;
            grid-template-columns: 1fr 1fr;
            margin-top: 22px;
          }
          .block h2 {
            color: ${accentColor};
            font-size: 11pt;
            margin: 0 0 8px;
            text-transform: uppercase;
          }
          .summary {
            border-left: 3px solid ${accentColor};
            margin-top: 20px;
            padding-left: 12px;
            white-space: pre-wrap;
          }
          table {
            border-collapse: collapse;
            margin-top: 22px;
            width: 100%;
          }
          th {
            background: ${accentColor};
            color: #ffffff;
            font-size: 10pt;
            padding: 8px;
            text-align: left;
          }
          td {
            border-bottom: 1px solid #e5e7eb;
            padding: 8px;
            vertical-align: top;
          }
          tbody tr:nth-child(even) td { background: #f9fafb; }
          .number { text-align: right; white-space: nowrap; }
          .totals {
            margin-left: auto;
            margin-top: 18px;
            width: 250px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 5px 0;
          }
          .final {
            border-top: 2px solid #111827;
            color: ${accentColor};
            font-size: 12pt;
            margin-top: 4px;
            padding-top: 8px;
          }
          .note-block {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin-top: 24px;
            padding: 12px;
            white-space: pre-wrap;
          }
          .note-block h2 {
            color: ${accentColor};
            font-size: 11pt;
            margin: 0 0 8px;
          }
          .footer {
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 8.5pt;
            margin-top: 28px;
            padding-top: 10px;
          }
          .watermark {
            bottom: 16mm;
            color: #9ca3af;
            font-size: 9pt;
            position: fixed;
            right: 18mm;
          }
        </style>
      </head>
      <body>
        <header class="header">
          <div class="brand">
            ${logoOrName(organization)}
            <div class="details">${organizationDetails(organization)}</div>
          </div>
          <div class="document-title">
            <h1>${escapeHtml(documentTitle)}</h1>
            ${documentMeta}
          </div>
        </header>
        ${body}
        <footer class="footer">
          Thank you for your business.${organization.website ? ` ${text(organization.website)}` : ""}
        </footer>
        ${watermark ? '<div class="watermark">Powered by TradeTrack</div>' : ""}
      </body>
    </html>
  `;
}

export function renderInvoiceHtml(data: InvoicePdfData) {
  const { client, invoice, organization } = data;
  const instructions =
    invoice.paymentInstructions?.trim() ||
    organization.defaultPaymentInstructions?.trim() ||
    "Please contact us for payment details.";

  const body = `
    <div class="grid">
      ${clientBlock("Bill To", client)}
      <section class="block">
        <h2>Payment Summary</h2>
        <div class="details">
          <div><span class="muted">Total:</span> ${formatMoney(invoice.total)}</div>
          <div><span class="muted">Amount Paid:</span> ${formatMoney(invoice.amountPaid)}</div>
          <div><strong>Balance Due: ${formatMoney(invoice.balance)}</strong></div>
        </div>
      </section>
    </div>
    ${
      invoice.notes
        ? `<section class="summary"><h2>Work Description</h2>${text(invoice.notes)}</section>`
        : ""
    }
    ${lineItemsTable(invoice.lineItems)}
    ${totalsBlock([
      { label: "Subtotal", value: invoice.subtotal },
      { label: `Tax (${formatMoney(invoice.taxRate)}%)`, value: invoice.taxAmount },
      { label: "Total", value: invoice.total },
      { label: "Amount Paid", value: invoice.amountPaid },
      { label: "Balance Due", value: invoice.balance, emphasize: true }
    ])}
    <section class="note-block">
      <h2>Payment Instructions</h2>
      ${text(instructions)}
    </section>
  `;

  return baseDocument({
    body,
    documentMeta: `
      <div class="document-number">${text(invoice.invoiceNumber)}</div>
      <div>Issue date: ${formatDate(invoice.issueDate)}</div>
      <div><strong>Due date: ${formatDate(invoice.dueDate)}</strong></div>
      <div class="status">${formatStatus(invoice.status)}</div>
    `,
    documentTitle: "INVOICE",
    organization,
    watermark: false
  });
}

export function renderQuoteHtml(data: QuotePdfData) {
  const { client, organization, quote } = data;
  const terms = "This quote is valid until the expiry date shown above. Pricing may change after expiry.";

  const body = `
    <div class="grid">
      ${clientBlock("Prepared For", client)}
      <section class="block">
        <h2>Quote Summary</h2>
        <div class="details">
          <div><span class="muted">Subtotal:</span> ${formatMoney(quote.subtotal)}</div>
          <div><span class="muted">Tax:</span> ${formatMoney(quote.taxAmount)}</div>
          <div><strong>Total: ${formatMoney(quote.total)}</strong></div>
        </div>
      </section>
    </div>
    ${
      quote.notes
        ? `<section class="summary"><h2>Scope of Work</h2>${text(quote.notes)}</section>`
        : ""
    }
    ${lineItemsTable(quote.lineItems)}
    ${totalsBlock([
      { label: "Subtotal", value: quote.subtotal },
      { label: `Tax (${formatMoney(quote.taxRate)}%)`, value: quote.taxAmount },
      { label: "Total", value: quote.total, emphasize: true }
    ])}
    <section class="note-block">
      <h2>Terms</h2>
      ${text(terms)}
    </section>
  `;

  return baseDocument({
    body,
    documentMeta: `
      <div class="document-number">${text(quote.quoteNumber)}</div>
      <div>Issue date: ${formatDate(quote.issueDate)}</div>
      <div><strong>Valid until: ${formatDate(quote.expiryDate)}</strong></div>
      <div class="status">${formatStatus(quote.status)}</div>
    `,
    documentTitle: "QUOTE",
    organization,
    watermark: false
  });
}
