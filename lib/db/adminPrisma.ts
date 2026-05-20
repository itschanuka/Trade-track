import { PrismaClient } from "@prisma/client";

const globalForAdminPrisma = globalThis as unknown as {
  adminPrisma?: PrismaClient;
};

export const adminPrisma =
  globalForAdminPrisma.adminPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForAdminPrisma.adminPrisma = adminPrisma;
}
