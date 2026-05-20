import { describe, expect, it } from "vitest";
import { requireOrgScopedWhere } from "./tenant-safety";

describe("tenant query safety", () => {
  it("accepts where clauses scoped to the current organization", () => {
    expect(requireOrgScopedWhere("org_1", { id: "client_1", organizationId: "org_1" })).toEqual({
      id: "client_1",
      organizationId: "org_1"
    });
  });

  it("rejects missing or mismatched organization scopes", () => {
    expect(() => requireOrgScopedWhere("org_1", { id: "client_1" })).toThrow(
      "Tenant query must include the current organizationId."
    );
    expect(() =>
      requireOrgScopedWhere("org_1", { id: "client_1", organizationId: "org_2" })
    ).toThrow("Tenant query must include the current organizationId.");
  });
});
