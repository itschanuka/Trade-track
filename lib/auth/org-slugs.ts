export const RESERVED_ORG_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "support",
  "help",
  "status",
  "dev",
  "staging"
]);

export function normalizeOrgSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isReservedOrgSlug(slug: string) {
  return RESERVED_ORG_SLUGS.has(slug);
}
