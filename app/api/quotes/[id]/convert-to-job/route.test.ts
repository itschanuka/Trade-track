import { describe, expect, it, vi } from "vitest";

const { tx } = vi.hoisted(() => ({
  tx: {
  job: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  quote: {
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

describe("quote to job conversion", () => {
  it("prevents duplicate conversion when a quote already has a job", async () => {
    tx.quote.findFirst.mockResolvedValue({
      clientId: "client_1",
      convertedAt: null,
      id: "quote_1",
      quoteNumber: "QT-00001",
      status: "ACCEPTED"
    });
    tx.job.findFirst.mockResolvedValue({ id: "job_1" });

    const response = await POST(
      new Request("http://app.test/api/quotes/quote_1/convert-to-job", {
        body: JSON.stringify({ title: "Kitchen refit" }),
        method: "POST"
      }) as never,
      { params: { id: "quote_1" } }
    );

    expect(response.status).toBe(409);
    expect(tx.job.create).not.toHaveBeenCalled();
  });
});
