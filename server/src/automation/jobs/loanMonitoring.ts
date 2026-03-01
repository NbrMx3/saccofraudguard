/**
 * Automated Loan Monitoring Job
 * - Checks for overdue loan repayments
 * - Auto-defaults loans past their term
 * - Notifies officers about overdue loans
 */
import prisma from "../../lib/prisma.js";

export async function runLoanMonitoring(): Promise<string> {
  const results: string[] = [];

  // ── 1. Find active loans that have exceeded their term ──────────────
  const activeLoans = await prisma.loan.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      loanRef: true,
      amount: true,
      termMonths: true,
      totalRepaid: true,
      outstandingBalance: true,
      memberId: true,
      createdAt: true,
      member: { select: { fullName: true, memberId: true } },
    },
  });

  let overdueCount = 0;
  let defaultedCount = 0;

  for (const loan of activeLoans) {
    const loanEndDate = new Date(loan.createdAt);
    loanEndDate.setMonth(loanEndDate.getMonth() + loan.termMonths);

    // If loan term has expired and still has outstanding balance
    if (new Date() > loanEndDate && loan.outstandingBalance > 0) {
      // Grace period: 30 days after term ends before defaulting
      const graceEnd = new Date(loanEndDate);
      graceEnd.setDate(graceEnd.getDate() + 30);

      if (new Date() > graceEnd) {
        // Default the loan
        await prisma.loan.update({
          where: { id: loan.id },
          data: { status: "DEFAULTED" },
        });
        defaultedCount++;

        // Create fraud alert for defaulted loan
        await prisma.fraudAlert.create({
          data: {
            type: "LOAN_DEFAULTED",
            severity: "HIGH",
            description: `Loan ${loan.loanRef} (KES ${loan.amount.toLocaleString()}) auto-defaulted. Outstanding: KES ${loan.outstandingBalance.toLocaleString()}`,
            memberId: loan.memberId,
          },
        });
      } else {
        overdueCount++;
      }
    }
  }

  if (overdueCount > 0 || defaultedCount > 0) {
    results.push(
      `${overdueCount} overdue loans, ${defaultedCount} auto-defaulted`
    );

    // Notify officers
    const officers = await prisma.user.findMany({
      where: { role: { in: ["OFFICER", "ADMIN"] }, isActive: true },
      select: { id: true },
    });

    if (officers.length > 0) {
      await prisma.notification.createMany({
        data: officers.map((u) => ({
          title: "Loan Monitoring Alert",
          message: `${overdueCount} overdue loan(s), ${defaultedCount} auto-defaulted. Immediate review required.`,
          type: defaultedCount > 0 ? "error" : "warning",
          userId: u.id,
        })),
      });
    }
  } else {
    results.push("No overdue or defaulted loans");
  }

  // ── 2. Check for members with multiple active loans ─────────────────
  const multiLoanMembers = await prisma.loan.groupBy({
    by: ["memberId"],
    where: { status: "ACTIVE" },
    _count: { id: true },
    having: { id: { _count: { gt: 2 } } },
  });

  if (multiLoanMembers.length > 0) {
    for (const mlm of multiLoanMembers) {
      // Check if alert already exists today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const existing = await prisma.fraudAlert.findFirst({
        where: {
          memberId: mlm.memberId,
          type: "MULTIPLE_ACTIVE_LOANS",
          createdAt: { gte: todayStart },
        },
      });

      if (!existing) {
        await prisma.fraudAlert.create({
          data: {
            type: "MULTIPLE_ACTIVE_LOANS",
            severity: "MEDIUM",
            description: `Member has ${mlm._count.id} active loans simultaneously`,
            memberId: mlm.memberId,
          },
        });
      }
    }
    results.push(`${multiLoanMembers.length} members with multiple active loans`);
  }

  await prisma.auditLog.create({
    data: {
      action: "AUTO_LOAN_MONITORING",
      entity: "Loan",
      details: `Automated: ${results.join("; ")}`,
      userId: null,
    },
  });

  return results.join("; ");
}
