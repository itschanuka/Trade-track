export const DEMO_ADMIN_EMAIL = "admin@tradetrack.local";

export function getConfiguredAdminEmail() {
  return process.env.ADMIN_EMAIL ?? (process.env.NODE_ENV === "production" ? undefined : DEMO_ADMIN_EMAIL);
}

export function isAdminEmail(email: string | null | undefined) {
  const adminEmail = getConfiguredAdminEmail();

  return Boolean(email && adminEmail && email.toLowerCase() === adminEmail.toLowerCase());
}
