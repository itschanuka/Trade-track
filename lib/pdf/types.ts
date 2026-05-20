import type { InvoiceStatus, QuoteStatus } from "@prisma/client";

export type PdfOrganization = {
  name: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  registrationNo: string | null;
  website: string | null;
  defaultPaymentInstructions?: string | null;
};

export type PdfClient = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type PdfLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoicePdfData = {
  organization: PdfOrganization;
  client: PdfClient;
  invoice: {
    invoiceNumber: string;
    status: InvoiceStatus;
    issueDate: Date;
    dueDate: Date | null;
    lineItems: PdfLineItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    amountPaid: number;
    balance: number;
    notes: string | null;
    paymentInstructions: string | null;
  };
};

export type QuotePdfData = {
  organization: PdfOrganization;
  client: PdfClient;
  quote: {
    quoteNumber: string;
    status: QuoteStatus;
    issueDate: Date;
    expiryDate: Date | null;
    lineItems: PdfLineItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    notes: string | null;
  };
};
