import prisma from "../lib/prisma.js";
import { getFraudThresholds } from "./configHelper.js";

interface FraudCheckResult {
  flagged: boolean;
  alerts: Array<{
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
  }>;
}

interface PreScreenResult {
  allowed: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  warnings: string[];
  requiresApproval: boolean;
}

/**
 * PRE-TRANSACTION SCREENING (REAL-TIME)
 * Evaluates a member BEFORE a transaction is committed.
 * Returns whether the transaction should proceed or be blocked.
 */
export async function preScreenTransaction(
  memberId: string,
  type: string,
  amount: number
): Promise<PreScreenResult> {
  const warnings: string[] = [];
  const thresholds = await getFraudThresholds();

  // 1. Check member status — block SUSPENDED, warn FLAGGED
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { status: true, balance: true, fullName: true },
  });

  if (!member) {
    return { allowed: false, riskLevel: "CRITICAL", riskScore: 100, warnings: ["Member not found"], requiresApproval: false };
  }

  if (member.status === "SUSPENDED") {
    return { allowed: false, riskLevel: "CRITICAL", riskScore: 100, warnings: ["Account is suspended — all transactions blocked"], requiresApproval: false };
  }

  let requiresApproval = false;

  if (member.status === "FLAGGED") {
    warnings.push("Account is flagged for suspicious activity — transaction requires manual review");
    requiresApproval = true;
  }

  // 2. Check existing risk score
  const riskRecord = await prisma.memberRiskScore.findUnique({
    where: { memberId },
    select: { totalPoints: true, riskLevel: true },
  });

  if (riskRecord?.riskLevel === "CRITICAL") {
    warnings.push(`Member risk level is CRITICAL (score: ${riskRecord.totalPoints}) — secondary approval required`);
    requiresApproval = true;
  }

  // 3. Check amount thresholds from config
  if (type === "WITHDRAWAL" && amount >= thresholds.requireApprovalAbove) {
    warnings.push(`Withdrawal of KES ${amount.toLocaleString()} requires approval (threshold: KES ${thresholds.requireApprovalAbove.toLocaleString()})`);
    requiresApproval = true;
  }

  if (type === "WITHDRAWAL" && amount >= thresholds.largeWithdrawalAmount) {
    warnings.push(`Large withdrawal detected — exceeds KES ${thresholds.largeWithdrawalAmount.toLocaleString()} threshold`);
  }

  if (type === "DEPOSIT" && amount >= thresholds.largeDepositAmount) {
    warnings.push(`Large deposit detected — exceeds KES ${thresholds.largeDepositAmount.toLocaleString()} threshold`);
  }

  // 4. Check daily limits
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const dailySum = await prisma.transaction.aggregate({
    where: { memberId, createdAt: { gte: startOfDay } },
    _sum: { amount: true },
  });
  const projectedDaily = (dailySum._sum.amount ?? 0) + amount;
  if (projectedDaily >= thresholds.dailyTransactionLimit) {
    warnings.push(`Daily transaction volume will reach KES ${projectedDaily.toLocaleString()} (limit: KES ${thresholds.dailyTransactionLimit.toLocaleString()})`);
    requiresApproval = true;
  }

  // 5. Check rapid transaction count
  const windowMs = thresholds.rapidTransactionWindowMinutes * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);
  const recentCount = await prisma.transaction.count({
    where: { memberId, createdAt: { gte: windowStart } },
  });
  if (recentCount >= thresholds.rapidTransactionCount) {
    warnings.push(`${recentCount} transactions in the last ${thresholds.rapidTransactionWindowMinutes} minutes — possible structuring`);
  }

  // 6. Near-total withdrawal check
  if (type === "WITHDRAWAL" && member.balance > 0) {
    const ratio = (amount / member.balance) * 100;
    if (ratio >= thresholds.nearTotalWithdrawalPercent) {
      warnings.push(`Withdrawal of ${Math.round(ratio)}% of total balance — near-total account drainage`);
      requiresApproval = true;
    }
  }

  // 7. Check unresolved fraud alerts
  const unresolvedAlerts = await prisma.fraudAlert.count({
    where: { memberId, resolved: false },
  });
  if (unresolvedAlerts >= 3) {
    warnings.push(`Member has ${unresolvedAlerts} unresolved fraud alerts`);
  }

  // Determine risk level
  const score = riskRecord?.totalPoints ?? 0;
  const level = riskRecord?.riskLevel ?? (warnings.length > 2 ? "MEDIUM" : "LOW");

  // Advisory only — never block transactions.
  // Actual fraud detection and flagging happens post-transaction via runFraudCheck().
  return {
    allowed: true,
    riskLevel: level as PreScreenResult["riskLevel"],
    riskScore: score,
    warnings,
    requiresApproval,
  };
}

/**
 * POST-TRANSACTION FRAUD CHECK (REAL-TIME)
 * Runs all enabled fraud rules against a completed transaction.
 * Reads thresholds from database config — fully configurable.
 */
export async function runFraudCheck(
  memberId: string,
  transactionId: string,
  type: string,
  amount: number
): Promise<FraudCheckResult> {
  const alerts: FraudCheckResult["alerts"] = [];
  const thresholds = await getFraudThresholds();

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { sourceInstitutionId: true, destinationInstitutionId: true },
  });

  // Institution-pair monitoring: detect rapid movement between the same
  // SACCO/chama accounts, regardless of the member initiating the transfer.
  if (transaction?.sourceInstitutionId && transaction.destinationInstitutionId &&
      transaction.sourceInstitutionId !== transaction.destinationInstitutionId) {
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = {
      createdAt: { gte: windowStart },
      sourceInstitutionId: transaction.sourceInstitutionId,
      destinationInstitutionId: transaction.destinationInstitutionId,
      status: { not: "FAILED" as const },
    };
    const [transferCount, transferTotals] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({ where, _sum: { amount: true } }),
    ]);
    const transferVolume = transferTotals._sum.amount ?? 0;
    if (transferCount >= 3 || transferVolume >= thresholds.dailyTransactionLimit) {
      alerts.push({
        type: "CROSS_INSTITUTION_VELOCITY",
        severity: transferCount >= 3 && transferVolume >= thresholds.dailyTransactionLimit ? "CRITICAL" : "HIGH",
        description: `${transferCount} transfers totaling KES ${transferVolume.toLocaleString()} between institution IDs ${transaction.sourceInstitutionId} and ${transaction.destinationInstitutionId} in 24 hours`,
      });
    }
  }

  // ── Rule 1: Large transaction threshold (CONFIGURABLE) ───────────
  if (type === "DEPOSIT" && amount >= thresholds.largeDepositAmount) {
    alerts.push({
      type: "LARGE_DEPOSIT",
      severity: "HIGH",
      description: `Unusually large deposit of KES ${amount.toLocaleString()} exceeds threshold of KES ${thresholds.largeDepositAmount.toLocaleString()}`,
    });
  }

  if (type === "WITHDRAWAL" && amount >= thresholds.largeWithdrawalAmount) {
    alerts.push({
      type: "LARGE_WITHDRAWAL",
      severity: "HIGH",
      description: `Large withdrawal of KES ${amount.toLocaleString()} exceeds threshold of KES ${thresholds.largeWithdrawalAmount.toLocaleString()}`,
    });
  }

  // ── Rule 2: Rapid transactions (CONFIGURABLE count + window) ─────
  const windowMs = thresholds.rapidTransactionWindowMinutes * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);
  const recentCount = await prisma.transaction.count({
    where: { memberId, createdAt: { gte: windowStart } },
  });

  if (recentCount >= thresholds.rapidTransactionCount) {
    alerts.push({
      type: "RAPID_TRANSACTIONS",
      severity: "MEDIUM",
      description: `${recentCount} transactions in the last ${thresholds.rapidTransactionWindowMinutes} minutes — possible structuring or automated activity`,
    });
  }

  // ── Rule 3: Near-total withdrawal (CONFIGURABLE percent) ─────────
  if (type === "WITHDRAWAL") {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { balance: true },
    });

    if (member && member.balance > 0) {
      const ratio = amount / (member.balance + amount);
      if (ratio * 100 >= thresholds.nearTotalWithdrawalPercent) {
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

  // ── Rule 5: Daily cumulative threshold (CONFIGURABLE) ────────────
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const dailySum = await prisma.transaction.aggregate({
    where: { memberId, createdAt: { gte: startOfDay } },
    _sum: { amount: true },
  });

  const totalToday = (dailySum._sum.amount ?? 0) + amount;
  if (totalToday >= thresholds.dailyTransactionLimit) {
    alerts.push({
      type: "DAILY_LIMIT_EXCEEDED",
      severity: "HIGH",
      description: `Daily transaction volume of KES ${totalToday.toLocaleString()} exceeds limit of KES ${thresholds.dailyTransactionLimit.toLocaleString()}`,
    });
  }

  // ── Rule 6: Velocity detection (escalating amounts) ──────────────
  if (type === "WITHDRAWAL") {
    const last3Withdrawals = await prisma.transaction.findMany({
      where: { memberId, type: "WITHDRAWAL", status: { not: "FAILED" } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { amount: true },
    });

    if (last3Withdrawals.length === 3) {
      const [latest, mid, oldest] = last3Withdrawals;
      if (latest.amount > mid.amount && mid.amount > oldest.amount) {
        const escalation = ((latest.amount - oldest.amount) / oldest.amount) * 100;
        if (escalation > 100) {
          alerts.push({
            type: "VELOCITY_ESCALATION",
            severity: "HIGH",
            description: `Withdrawal amounts escalating rapidly — ${Math.round(escalation)}% increase over last 3 withdrawals`,
          });
        }
      }
    }
  }

  // ── Rule 7: Temporal anomaly (unusual hours) ─────────────────────
  const hour = new Date().getHours();
  if (hour < 6 || hour >= 22) {
    alerts.push({
      type: "OFF_HOURS_TRANSACTION",
      severity: "MEDIUM",
      description: `Transaction processed at ${hour}:00 — outside normal business hours (06:00–22:00)`,
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
