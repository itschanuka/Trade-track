export type OrgScopedWhere = {
  organizationId?: string;
};

export function requireOrgScopedWhere<TWhere extends Record<string, unknown>>(
  orgId: string,
  where: TWhere & OrgScopedWhere
) {
  if (!where.organizationId || where.organizationId !== orgId) {
    throw new Error("Tenant query must include the current organizationId.");
  }

  return where;
}
