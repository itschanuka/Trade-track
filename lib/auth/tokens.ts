import { createHash, randomBytes } from "crypto";

export const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;
export const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;

export function createActionToken() {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashActionToken(token)
  };
}

export function hashActionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hoursFromNow(hours: number) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt;
}

export function verificationIdentifier(email: string) {
  return `verify:${email.toLowerCase()}`;
}

export function passwordResetIdentifier(email: string) {
  return `reset:${email.toLowerCase()}`;
}

export function emailFromIdentifier(identifier: string, prefix: "verify" | "reset") {
  const expectedPrefix = `${prefix}:`;

  if (!identifier.startsWith(expectedPrefix)) {
    return null;
  }

  return identifier.slice(expectedPrefix.length);
}
