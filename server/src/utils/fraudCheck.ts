import prisma from "../lib/prisma.js";

interface FraudCheckResult {
  flagged: boolean;
  alerts: Array<{
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
  }>;
}

/**
 * Automatically checks a transaction for fraudulent patterns.
 * Called after every transaction is recorded.
 */
export async function runFraudCheck(
  memberId: string,
  transactionId: string,
  type: string,
  amount: number
): Promise<FraudCheckResult> {
  const alerts: FraudCheckResult["alerts"] = [];

  // ── Rule 1: Large transaction threshold ──────────────────────────
  const LARGE_DEPOSIT = 500000;
  const LARGE_WITHDRAWAL = 200000;

  if (type === "DEPOSIT" && amount >= LARGE_DEPOSIT) {
    alerts.push({
      type: "LARGE_DEPOSIT",
      severity: "HIGH",
      description: `Unusually large deposit of KES ${amount.toLocaleString()} exceeds threshold of KES ${LARGE_DEPOSIT.toLocaleString()}`,
    });
  }

  if (type === "WITHDRAWAL" && amount >= LARGE_WITHDRAWAL) {
    alerts.push({
      type: "LARGE_WITHDRAWAL",
      severity: "HIGH",
      description: `Large withdrawal of KES ${amount.toLocaleString()} exceeds threshold of KES ${LARGE_WITHDRAWAL.toLocaleString()}`,
    });
  }

  // ── Rule 2: Rapid transactions (more than 5 in last hour) ────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.transaction.count({
    where: {
      memberId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentCount >= 5) {
    alerts.push({
      type: "RAPID_TRANSACTIONS",
      severity: "MEDIUM",
      description: `${recentCount} transactions in the last hour — possible structuring or automated activity`,
    });
  }

  // ── Rule 3: Unusual withdrawal-to-balance ratio ──────────────────
  if (type === "WITHDRAWAL") {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { balance: true },
    });

    if (member && member.balance > 0) {
      const ratio = amount / (member.balance + amount); // ratio before withdrawal
      if (ratio >= 0.9) {
        alerts.push({
          type: "NEAR_TOTAL_WITHDRAWAL",
          severity: "CRITICAL",
          description: `Withdrawal of ${Math.round(ratio * 100)}% of total balance — near-total account drainage`,
        });
      }
    }
  }

  // ── Rule 4: Large loan application ───────────────────────────────
  if (type === "LOAN_DISBURSEMENT" && amount >= 1000000) {
    alerts.push({
      type: "LARGE_LOAN",
      severity: "HIGH",
      description: `High-value loan disbursement of KES ${amount.toLocaleString()}`,
    });
  }

  // ── Rule 5: Daily cumulative threshold ───────────────────────────
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const dailySum = await prisma.transaction.aggregate({
    where: {
      memberId,
      createdAt: { gte: startOfDay },
    },
    _sum: { amount: true },
  });

  const DAILY_LIMIT = 1000000;
  const totalToday = (dailySum._sum.amount ?? 0) + amount;
  if (totalToday >= DAILY_LIMIT) {
    alerts.push({
      type: "DAILY_LIMIT_EXCEEDED",
      severity: "HIGH",
      description: `Daily transaction volume of KES ${totalToday.toLocaleString()} exceeds limit of KES ${DAILY_LIMIT.toLocaleString()}`,
    });
  }

  // ── Persist alerts to database ───────────────────────────────────
  if (alerts.length > 0) {
    await prisma.fraudAlert.createMany({
      data: alerts.map((a) => ({
        type: a.type,
        severity: a.severity,
        description: a.description,
        memberId,
        transactionId,
      })),
    });

    // Flag the transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "FLAGGED" },
    });
  }

  return { flagged: alerts.length > 0, alerts };
}
