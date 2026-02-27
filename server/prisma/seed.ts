import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function hoursAgo(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  const password = await bcrypt.hash("Admin@2026", 12);

  // ── 1. Users ──────────────────────────────────────────────────────────
  const users = [
    { nationalId: "ADM001", email: "admin@saccofraudguard.co.ke", password, firstName: "James", lastName: "Kamau", role: "ADMIN" as const },
    { nationalId: "OFC001", email: "officer@saccofraudguard.co.ke", password, firstName: "Grace", lastName: "Wanjiku", role: "OFFICER" as const },
    { nationalId: "AUD001", email: "auditor@saccofraudguard.co.ke", password, firstName: "Peter", lastName: "Ochieng", role: "AUDITOR" as const },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { nationalId: user.nationalId },
      update: user,
      create: user,
    });
    console.log(`  ✓ Upserted ${user.role}: ${user.nationalId}`);
  }

  const officer = await prisma.user.findUniqueOrThrow({ where: { nationalId: "OFC001" } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { nationalId: "ADM001" } });

  // ── 2. Members ────────────────────────────────────────────────────────
  const memberData = [
    { memberId: "MBR001", fullName: "Alice Muthoni", email: "alice.muthoni@email.co.ke", phoneNumber: "0712345001", status: "ACTIVE" as const, balance: 85000 },
    { memberId: "MBR002", fullName: "Brian Kipchoge", email: "brian.kipchoge@email.co.ke", phoneNumber: "0712345002", status: "ACTIVE" as const, balance: 120000 },
    { memberId: "MBR003", fullName: "Christine Akinyi", email: "christine.akinyi@email.co.ke", phoneNumber: "0712345003", status: "ACTIVE" as const, balance: 45000 },
    { memberId: "MBR004", fullName: "David Mutua", email: "david.mutua@email.co.ke", phoneNumber: "0712345004", status: "FLAGGED" as const, balance: 200000 },
    { memberId: "MBR005", fullName: "Esther Nyambura", email: "esther.nyambura@email.co.ke", phoneNumber: "0712345005", status: "ACTIVE" as const, balance: 15000 },
    { memberId: "MBR006", fullName: "Felix Otieno", email: "felix.otieno@email.co.ke", phoneNumber: "0712345006", status: "SUSPENDED" as const, balance: 320000 },
    { memberId: "MBR007", fullName: "Grace Wambui", email: "grace.wambui@email.co.ke", phoneNumber: "0712345007", status: "ACTIVE" as const, balance: 67000 },
    { memberId: "MBR008", fullName: "Hassan Mohamed", email: "hassan.mohamed@email.co.ke", phoneNumber: "0712345008", status: "FLAGGED" as const, balance: 5000 },
    { memberId: "MBR009", fullName: "Irene Chebet", email: "irene.chebet@email.co.ke", phoneNumber: "0712345009", status: "ACTIVE" as const, balance: 92000 },
    { memberId: "MBR010", fullName: "Joseph Kariuki", email: "joseph.kariuki@email.co.ke", phoneNumber: "0712345010", status: "ACTIVE" as const, balance: 150000 },
  ];

  const members: Record<string, { id: string }> = {};
  for (const m of memberData) {
    const member = await prisma.member.upsert({
      where: { memberId: m.memberId },
      update: { fullName: m.fullName, phoneNumber: m.phoneNumber, status: m.status, balance: m.balance },
      create: { ...m, createdById: officer.id },
    });
    members[m.memberId] = member;
    console.log(`  ✓ Upserted member: ${m.memberId} (${m.fullName})`);
  }

  // ── 3. Transactions ──────────────────────────────────────────────────
  // Delete existing seeded transactions to avoid duplicates
  await prisma.transaction.deleteMany({ where: { txRef: { startsWith: "TXS-" } } });

  const txns: Array<{
    txRef: string; type: "DEPOSIT" | "WITHDRAWAL"; amount: number;
    balanceBefore: number; balanceAfter: number; description: string;
    status: "COMPLETED" | "FLAGGED" | "PENDING"; memberId: string; createdAt: Date;
  }> = [];

  let txCounter = 1;
  const txRef = () => `TXS-${String(txCounter++).padStart(4, "0")}`;

  // MBR001 - Alice: normal activity
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 30000, balanceBefore: 55000, balanceAfter: 85000, description: "Monthly savings", status: "COMPLETED", memberId: members["MBR001"].id, createdAt: daysAgo(45) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 20000, balanceBefore: 35000, balanceAfter: 55000, description: "Salary deposit", status: "COMPLETED", memberId: members["MBR001"].id, createdAt: daysAgo(60) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 5000, balanceBefore: 90000, balanceAfter: 85000, description: "ATM withdrawal", status: "COMPLETED", memberId: members["MBR001"].id, createdAt: daysAgo(10) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 8000, balanceBefore: 93000, balanceAfter: 85000, description: "Cash withdrawal", status: "COMPLETED", memberId: members["MBR001"].id, createdAt: daysAgo(5) });

  // MBR002 - Brian: high value deposits, one large withdrawal
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 50000, balanceBefore: 70000, balanceAfter: 120000, description: "Business proceeds", status: "COMPLETED", memberId: members["MBR002"].id, createdAt: daysAgo(30) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 40000, balanceBefore: 30000, balanceAfter: 70000, description: "Contract payment", status: "COMPLETED", memberId: members["MBR002"].id, createdAt: daysAgo(50) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 110000, balanceBefore: 230000, balanceAfter: 120000, description: "Land purchase", status: "FLAGGED", memberId: members["MBR002"].id, createdAt: daysAgo(3) });

  // MBR003 - Christine: small steady deposits
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 10000, balanceBefore: 35000, balanceAfter: 45000, description: "Weekly savings", status: "COMPLETED", memberId: members["MBR003"].id, createdAt: daysAgo(7) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 8000, balanceBefore: 27000, balanceAfter: 35000, description: "Weekly savings", status: "COMPLETED", memberId: members["MBR003"].id, createdAt: daysAgo(14) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 3000, balanceBefore: 48000, balanceAfter: 45000, description: "Shopping", status: "COMPLETED", memberId: members["MBR003"].id, createdAt: daysAgo(2) });

  // MBR004 - David (FLAGGED): suspiciously many rapid withdrawals
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 250000, balanceBefore: 0, balanceAfter: 250000, description: "Initial deposit", status: "COMPLETED", memberId: members["MBR004"].id, createdAt: daysAgo(20) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 25000, balanceBefore: 250000, balanceAfter: 225000, description: "Cash withdrawal", status: "FLAGGED", memberId: members["MBR004"].id, createdAt: hoursAgo(22) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 20000, balanceBefore: 225000, balanceAfter: 205000, description: "Transfer out", status: "FLAGGED", memberId: members["MBR004"].id, createdAt: hoursAgo(20) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 5000, balanceBefore: 205000, balanceAfter: 200000, description: "ATM withdrawal", status: "FLAGGED", memberId: members["MBR004"].id, createdAt: hoursAgo(18) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 15000, balanceBefore: 215000, balanceAfter: 200000, description: "Mobile transfer", status: "FLAGGED", memberId: members["MBR004"].id, createdAt: hoursAgo(16) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 30000, balanceBefore: 230000, balanceAfter: 200000, description: "Cheque cash-out", status: "FLAGGED", memberId: members["MBR004"].id, createdAt: hoursAgo(14) });

  // MBR005 - Esther: mostly withdrawals, low balance, no recent deposits
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 50000, balanceBefore: 0, balanceAfter: 50000, description: "Opening deposit", status: "COMPLETED", memberId: members["MBR005"].id, createdAt: daysAgo(90) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 10000, balanceBefore: 50000, balanceAfter: 40000, description: "Personal", status: "COMPLETED", memberId: members["MBR005"].id, createdAt: daysAgo(60) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 15000, balanceBefore: 40000, balanceAfter: 25000, description: "Rent payment", status: "COMPLETED", memberId: members["MBR005"].id, createdAt: daysAgo(30) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 10000, balanceBefore: 25000, balanceAfter: 15000, description: "School fees", status: "COMPLETED", memberId: members["MBR005"].id, createdAt: daysAgo(10) });

  // MBR006 - Felix (SUSPENDED): large suspicious transactions
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 500000, balanceBefore: 0, balanceAfter: 500000, description: "Wire transfer in", status: "COMPLETED", memberId: members["MBR006"].id, createdAt: daysAgo(15) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 150000, balanceBefore: 500000, balanceAfter: 350000, description: "Wire transfer out", status: "FLAGGED", memberId: members["MBR006"].id, createdAt: daysAgo(12) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 30000, balanceBefore: 350000, balanceAfter: 320000, description: "Cash withdrawal", status: "FLAGGED", memberId: members["MBR006"].id, createdAt: daysAgo(10) });

  // MBR007 - Grace: normal savings behavior
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 15000, balanceBefore: 52000, balanceAfter: 67000, description: "Salary", status: "COMPLETED", memberId: members["MBR007"].id, createdAt: daysAgo(5) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 12000, balanceBefore: 40000, balanceAfter: 52000, description: "Salary", status: "COMPLETED", memberId: members["MBR007"].id, createdAt: daysAgo(35) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 5000, balanceBefore: 72000, balanceAfter: 67000, description: "Groceries", status: "COMPLETED", memberId: members["MBR007"].id, createdAt: daysAgo(3) });

  // MBR008 - Hassan (FLAGGED): draining account rapidly, no deposits in 60+ days
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 100000, balanceBefore: 0, balanceAfter: 100000, description: "Initial deposit", status: "COMPLETED", memberId: members["MBR008"].id, createdAt: daysAgo(75) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 30000, balanceBefore: 100000, balanceAfter: 70000, description: "Cash withdrawal", status: "COMPLETED", memberId: members["MBR008"].id, createdAt: daysAgo(40) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 25000, balanceBefore: 70000, balanceAfter: 45000, description: "Transfer", status: "COMPLETED", memberId: members["MBR008"].id, createdAt: daysAgo(25) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 20000, balanceBefore: 45000, balanceAfter: 25000, description: "Cash out", status: "FLAGGED", memberId: members["MBR008"].id, createdAt: daysAgo(10) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 20000, balanceBefore: 25000, balanceAfter: 5000, description: "Cash withdrawal", status: "FLAGGED", memberId: members["MBR008"].id, createdAt: daysAgo(3) });

  // MBR009 - Irene: regular saver
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 25000, balanceBefore: 67000, balanceAfter: 92000, description: "Salary", status: "COMPLETED", memberId: members["MBR009"].id, createdAt: daysAgo(8) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 20000, balanceBefore: 47000, balanceAfter: 67000, description: "Bonus", status: "COMPLETED", memberId: members["MBR009"].id, createdAt: daysAgo(40) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 7000, balanceBefore: 99000, balanceAfter: 92000, description: "Shopping", status: "COMPLETED", memberId: members["MBR009"].id, createdAt: daysAgo(4) });

  // MBR010 - Joseph: large account, occasional large withdrawals
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 80000, balanceBefore: 70000, balanceAfter: 150000, description: "Business deposit", status: "COMPLETED", memberId: members["MBR010"].id, createdAt: daysAgo(20) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 70000, balanceBefore: 0, balanceAfter: 70000, description: "Opening deposit", status: "COMPLETED", memberId: members["MBR010"].id, createdAt: daysAgo(55) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 60000, balanceBefore: 210000, balanceAfter: 150000, description: "Business expense", status: "COMPLETED", memberId: members["MBR010"].id, createdAt: daysAgo(7) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 120000, balanceBefore: 270000, balanceAfter: 150000, description: "Vehicle purchase", status: "FLAGGED", memberId: members["MBR010"].id, createdAt: daysAgo(2) });

  // Additional scattered transactions for volume
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 5000, balanceBefore: 80000, balanceAfter: 85000, description: "Mpesa deposit", status: "COMPLETED", memberId: members["MBR001"].id, createdAt: daysAgo(25) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 35000, balanceBefore: 85000, balanceAfter: 120000, description: "Cheque deposit", status: "COMPLETED", memberId: members["MBR002"].id, createdAt: daysAgo(15) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 2000, balanceBefore: 47000, balanceAfter: 45000, description: "Airtime", status: "COMPLETED", memberId: members["MBR003"].id, createdAt: daysAgo(20) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 15000, balanceBefore: 185000, balanceAfter: 200000, description: "Side business", status: "COMPLETED", memberId: members["MBR004"].id, createdAt: daysAgo(10) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 8000, balanceBefore: 75000, balanceAfter: 67000, description: "Utilities", status: "COMPLETED", memberId: members["MBR007"].id, createdAt: daysAgo(15) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 10000, balanceBefore: 82000, balanceAfter: 92000, description: "Freelance", status: "COMPLETED", memberId: members["MBR009"].id, createdAt: daysAgo(20) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 4000, balanceBefore: 154000, balanceAfter: 150000, description: "Fuel", status: "COMPLETED", memberId: members["MBR010"].id, createdAt: daysAgo(12) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 12000, balanceBefore: 97000, balanceAfter: 85000, description: "Insurance", status: "COMPLETED", memberId: members["MBR001"].id, createdAt: daysAgo(30) });
  txns.push({ txRef: txRef(), type: "DEPOSIT", amount: 6000, balanceBefore: 39000, balanceAfter: 45000, description: "Refund", status: "COMPLETED", memberId: members["MBR003"].id, createdAt: daysAgo(28) });
  txns.push({ txRef: txRef(), type: "WITHDRAWAL", amount: 3500, balanceBefore: 70500, balanceAfter: 67000, description: "Medical", status: "COMPLETED", memberId: members["MBR007"].id, createdAt: daysAgo(22) });

  for (const tx of txns) {
    await prisma.transaction.create({
      data: {
        txRef: tx.txRef,
        type: tx.type,
        amount: tx.amount,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        status: tx.status,
        memberId: tx.memberId,
        processedById: officer.id,
        createdAt: tx.createdAt,
      },
    });
  }
  console.log(`  ✓ Created ${txns.length} transactions`);

  // ── 4. Fraud Rules ────────────────────────────────────────────────────
  const ruleData = [
    {
      name: "High Frequency Withdrawals",
      description: "Flags members making more than 3 withdrawals within a 24-hour window",
      ruleType: "FREQUENCY" as const,
      maxCount: 3,
      windowHours: 24,
      severity: "HIGH" as const,
      riskPoints: 25,
    },
    {
      name: "Large Withdrawal Amount",
      description: "Flags any single withdrawal exceeding KES 100,000",
      ruleType: "AMOUNT" as const,
      minAmount: 100000,
      severity: "HIGH" as const,
      riskPoints: 30,
    },
    {
      name: "No Recent Deposits",
      description: "Flags members who have made withdrawals but no deposits in the last 30 days",
      ruleType: "NO_DEPOSIT" as const,
      windowHours: 720,
      severity: "MEDIUM" as const,
      riskPoints: 15,
    },
    {
      name: "Suspicious Small Amounts",
      description: "Flags multiple small withdrawals under KES 5,000 that could indicate structuring",
      ruleType: "AMOUNT" as const,
      maxAmount: 5000,
      severity: "LOW" as const,
      riskPoints: 10,
    },
  ];

  for (const rule of ruleData) {
    await prisma.fraudRule.upsert({
      where: { name: rule.name },
      update: { ...rule, createdById: admin.id },
      create: { ...rule, createdById: admin.id },
    });
    console.log(`  ✓ Upserted fraud rule: ${rule.name}`);
  }

  // ── 5. Withdrawal Thresholds ──────────────────────────────────────────
  const existingThreshold = await prisma.withdrawalThreshold.findFirst();
  if (!existingThreshold) {
    await prisma.withdrawalThreshold.create({
      data: {
        largeWithdrawalAmount: 100000,
        dailyWithdrawalLimit: 500000,
        maxWithdrawalsPerDay: 5,
        requireApprovalAbove: 50000,
        updatedById: admin.id,
      },
    });
    console.log("  ✓ Created withdrawal thresholds");
  } else {
    console.log("  ✓ Withdrawal thresholds already exist");
  }

  console.log("\n✅ Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Login Credentials (all use same password)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Password: Admin@2026\n");
  console.log("  Admin:   ID = ADM001");
  console.log("  Officer: ID = OFC001");
  console.log("  Auditor: ID = AUD001");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\n  Members: ${memberData.length}`);
  console.log(`  Transactions: ${txns.length}`);
  console.log(`  Fraud Rules: ${ruleData.length}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
