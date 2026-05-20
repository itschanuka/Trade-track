import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

const demoUser = {
  email: "testuser1@gmail.com",
  name: "Test User One",
  password: "user1"
};

const demoAdmin = {
  email: "admin@tradetrack.local",
  name: "TradeTrack Admin",
  password: "admin1"
};

const demoOrganization = {
  name: "Test Contractor Co",
  slug: "test-contractor-co"
};

async function upsertVerifiedUser(input) {
  const email = input.email.toLowerCase();
  const password = await bcrypt.hash(input.password, 12);

  return prisma.user.upsert({
    where: { email },
    update: {
      emailVerified: new Date(),
      name: input.name,
      password
    },
    create: {
      email,
      emailVerified: new Date(),
      name: input.name,
      password
    },
    select: {
      id: true,
      email: true
    }
  });
}

async function main() {
  const user = await upsertVerifiedUser(demoUser);
  const admin = await upsertVerifiedUser(demoAdmin);

  const organization = await prisma.organization.upsert({
    where: { slug: demoOrganization.slug },
    update: {
      isSuspended: false,
      name: demoOrganization.name
    },
    create: {
      isSuspended: false,
      name: demoOrganization.name,
      slug: demoOrganization.slug
    },
    select: {
      id: true,
      name: true,
      slug: true
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id
      }
    },
    update: {
      role: "OWNER"
    },
    create: {
      organizationId: organization.id,
      role: "OWNER",
      userId: user.id
    }
  });

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: {
        in: [`verify:${user.email}`, `reset:${user.email}`]
      }
    }
  });
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: {
        in: [`verify:${admin.email}`, `reset:${admin.email}`]
      }
    }
  });

  console.info("Demo seed ready:");
  console.info(`- User email: ${user.email}`);
  console.info("- User password: user1");
  console.info(`- User organization: ${organization.name}`);
  console.info(`- User local app path: /org/${organization.slug}/dashboard`);
  console.info(`- Admin email: ${admin.email}`);
  console.info("- Admin password: admin1");
  console.info("- Admin path: /admin");
}

main()
  .catch((error) => {
    console.error("Demo seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
