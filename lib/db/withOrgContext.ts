import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export async function withOrgContext<T>(
  orgId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;

    return callback(tx);
  });
}
