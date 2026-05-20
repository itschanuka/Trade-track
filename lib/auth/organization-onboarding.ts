import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OnboardingInput } from "./schemas";
import { isReservedOrgSlug, normalizeOrgSlug } from "./org-slugs";
export { RESERVED_ORG_SLUGS, isReservedOrgSlug, normalizeOrgSlug } from "./org-slugs";

export function getOrgAppUrl(slug: string) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "tradetrack.app";

  if (process.env.NODE_ENV === "production") {
    return `https://${slug}.${rootDomain}`;
  }

  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/org/${slug}`;
}

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

export async function isOrgSlugAvailable(slug: string) {
  const normalizedSlug = normalizeOrgSlug(slug);

  if (!normalizedSlug || isReservedOrgSlug(normalizedSlug)) {
    return false;
  }

  const existing = await prisma.organization.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true }
  });

  return !existing;
}

export async function createOrganizationForUser(userId: string, input: OnboardingInput) {
  const slug = normalizeOrgSlug(input.slug);

  if (!slug || isReservedOrgSlug(slug)) {
    return { status: "reserved" as const };
  }

  try {
    const organization = await prisma.$transaction(async (tx) => {
      const existing = await tx.organization.findUnique({
        where: { slug },
        select: { id: true }
      });

      if (existing) {
        return null;
      }

      return tx.organization.create({
        data: {
          name: input.name.trim(),
          slug,
          email: emptyToNull(input.email),
          phone: emptyToNull(input.phone),
          address: emptyToNull(input.address),
          website: emptyToNull(input.website),
          defaultPaymentTerms: input.defaultPaymentTerms,
          defaultTaxRate: input.defaultTaxRate,
          defaultPaymentInstructions: emptyToNull(input.defaultPaymentInstructions),
          defaultQuoteExpiry: input.defaultQuoteExpiry,
          invoicePrefix: input.invoicePrefix.trim(),
          quotePrefix: input.quotePrefix.trim(),
          members: {
            create: {
              userId,
              role: "OWNER"
            }
          }
        },
        select: {
          id: true,
          name: true,
          slug: true
        }
      });
    });

    if (!organization) {
      return { status: "duplicate" as const };
    }

    return { status: "created" as const, organization };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as Prisma.PrismaClientKnownRequestError).code === "P2002"
    ) {
      return { status: "duplicate" as const };
    }

    throw error;
  }
}
