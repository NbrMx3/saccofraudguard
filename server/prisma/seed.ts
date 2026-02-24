import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  const password = await bcrypt.hash("Admin@2026", 12);

  const users = [
    {
      nationalId: "ADM001",
      email: "admin@saccofraudguard.co.ke",
      password,
      firstName: "James",
      lastName: "Kamau",
      role: "ADMIN" as const,
    },
    {
      nationalId: "OFC001",
      email: "officer@saccofraudguard.co.ke",
      password,
      firstName: "Grace",
      lastName: "Wanjiku",
      role: "OFFICER" as const,
    },
    {
      nationalId: "AUD001",
      email: "auditor@saccofraudguard.co.ke",
      password,
      firstName: "Peter",
      lastName: "Ochieng",
      role: "AUDITOR" as const,
    },
  ];

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { nationalId: user.nationalId },
    });

    if (existing) {
      await prisma.user.update({
        where: { nationalId: user.nationalId },
        data: user,
      });
      console.log(`  ✓ Updated ${user.role}: ${user.nationalId}`);
    } else {
      await prisma.user.create({ data: user });
      console.log(`  ✓ Created ${user.role}: ${user.nationalId}`);
    }
  }

  console.log("\n✅ Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Login Credentials (all use same password)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Password: Admin@2026\n");
  console.log("  Admin:   ID = ADM001");
  console.log("  Officer: ID = OFC001");
  console.log("  Auditor: ID = AUD001");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
