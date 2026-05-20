import { describe, expect, it, vi } from "vitest";

const { tx } = vi.hoisted(() => ({
  tx: {
  invoice: {
    create: vi.fn(),
    findFirst: vi.fn()
  },
  job: {
    findFirst: vi.fn(),
    update: vi.fn()
  },
  organization: {
    findFirst: vi.fn(),
    update: vi.fn()
  }
  }
}));

vi.mock("@/lib/api/withOrg", () => {
  class OrgContextError extends Error {
    status: number;

    constructor(status: number) {
      super("Org context error");
      this.status = status;
    }
  }

  return {
    getOrgContext: vi.fn(async () => ({ orgId: "org_1", role: "OWNER" })),
    OrgContextError
  };
});

vi.mock("@/lib/db/withOrgContext", () => ({
  withOrgContext: vi.fn(async (_orgId: string, callback: (txArg: typeof tx) => Promise<unknown>) =>
    callback(tx)
  )
}));

import { POST } from "./route";

describe("job to invoice conversion", () => {
  it("returns the created invoice with its linked job", async () => {
    tx.job.findFirst.mockResolvedValue({
      clientId: "client_1",
      id: "job_1",
      invoiceId: null,
      title: "Boiler service"
    });
    tx.organization.findFirst.mockResolvedValue({
      defaultPaymentInstructions: null,
      defaultPaymentTerms: 14,
      defaultTaxRate: 0,
      invoiceNextNumber: 7,
      invoicePrefix: "INV-"
    });
    tx.organization.update.mockResolvedValue({ invoiceNextNumber: 8 });
    tx.invoice.create.mockResolvedValue({ id: "invoice_1" });
    tx.job.update.mockResolvedValue({ id: "job_1" });
    tx.invoice.findFirst.mockResolvedValue({
      client: { email: null, id: "client_1", name: "Acme", phone: null },
      id: "invoice_1",
      invoiceNumber: "INV-00007",
      job: { id: "job_1", status: "INVOICED", title: "Boiler service" }
    });

    const response = await POST(
      new Request("http://app.test/api/jobs/job_1/convert-to-invoice", {
        body: JSON.stringify({
          lineItems: [{ description: "Labour", quantity: 1, unitPrice: 100 }],
          status: "DRAFT"
        }),
        method: "POST"
      }) as never,
      { params: { id: "job_1" } }
    );
    const payload = (await response.json()) as {
      invoice: { job: { id: string; title: string } | null };
    };

    expect(response.status).toBe(201);
    expect(payload.invoice.job).toEqual({ id: "job_1", title: "Boiler service", status: "INVOICED" });
    expect(tx.job.update).toHaveBeenCalledWith({
      data: { invoiceId: "invoice_1", status: "INVOICED" },
      where: { id: "job_1" }
    });
  });
});
