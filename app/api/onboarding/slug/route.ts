import { z } from "zod";
import { badRequest, serverError } from "@/lib/api/errors";
import { isOrgSlugAvailable, isReservedOrgSlug, normalizeOrgSlug } from "@/lib/auth/organization-onboarding";

export const dynamic = "force-dynamic";

const SlugQuerySchema = z
  .object({
    slug: z.string().trim().min(1).max(80)
  })
  .strict();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = SlugQuerySchema.safeParse({
      slug: url.searchParams.get("slug")
    });

    if (!parsed.success) {
      return badRequest("Invalid slug.");
    }

    const slug = normalizeOrgSlug(parsed.data.slug);
    const available = await isOrgSlugAvailable(slug);

    return Response.json({
      slug,
      available,
      reserved: isReservedOrgSlug(slug)
    });
  } catch (error) {
    console.error("Slug availability check failed", error);
    return serverError();
  }
}
