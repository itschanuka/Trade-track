"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { isAdminEmail } from "@/lib/admin/access";
import { authOptions } from "@/lib/auth/authOptions";
import { adminPrisma } from "@/lib/db/adminPrisma";

export async function setOrganizationSuspension(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    notFound();
  }

  const organizationId = String(formData.get("organizationId") ?? "");
  const isSuspended = String(formData.get("isSuspended") ?? "") === "true";

  if (!organizationId) {
    return;
  }

  await adminPrisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: { isSuspended }
    });

    await tx.adminAction.create({
      data: {
        action: isSuspended ? "organization.suspend" : "organization.unsuspend",
        adminId: session.user.id,
        targetId: organizationId,
        targetType: "Organization",
        metadata: { isSuspended }
      }
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${organizationId}`);
}
