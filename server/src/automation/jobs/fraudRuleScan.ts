/**
 * Automated Fraud Rule Scan Job
 * Runs all enabled fraud rules against transactions to find new violations.
 */
import prisma from "../../lib/prisma.js";

export async function runFraudRuleScan(): Promise<string> {
  const rules = await prisma.fraudRule.findMany({ where: { enabled: true } });
  const thresholdRecord = await prisma.withdrawalThreshold.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const now = new Date();
  let totalViolations = 0;

  for (const rule of rules) {
    // ── FREQUENCY rules ──────────────────────────────────────────
    if (rule.ruleType === "FREQUENCY" && rule.maxCount && rule.windowHours) {
      const since = new Date(now.getTime() - rule.windowHours * 3600000);
      const grouped = await prisma.transaction.groupBy({
        by: ["memberId"],
        where: {
          type: "WITHDRAWAL",
          createdAt: { gte: since },
          status: { not: "FAILED" },
        },
        _count: { id: true },
        having: { id: { _count: { gt: rule.maxCount } } },
      });

      for (const g of grouped) {
        const exists = await prisma.ruleViolation.findFirst({
          where: { ruleId: rule.id, memberId: g.memberId, createdAt: { gte: since } },
        });
        if (!exists) {
          const latestTx = await prisma.transaction.findFirst({
            where: {
              memberId: g.memberId,
              type: "WITHDRAWAL",
              createdAt: { gte: since },
            },
            orderBy: { createdAt: "desc" },
          });
          await prisma.ruleViolation.create({
            data: {
              ruleId: rule.id,
              memberId: g.memberId,
              transactionId: latestTx?.id,
              details: `Member made ${g._count.id} withdrawals in ${rule.windowHours}h (limit: ${rule.maxCount})`,
              riskPoints: rule.riskPoints,
            },
          });
          totalViolations++;
        }
      }
    }

    // ── AMOUNT rules ─────────────────────────────────────────────
    if (rule.ruleType === "AMOUNT") {
      const maxAmt =
        rule.maxAmount ?? thresholdRecord?.largeWithdrawalAmount ?? 100000;
      const flagged = await prisma.transaction.findMany({
        where: {
          type: "WITHDRAWAL",
          amount: { gte: maxAmt },
          status: { not: "FAILED" },
        },
        select: { id: true, memberId: true, amount: true },
      });

      for (const tx of flagged) {
        const exists = await prisma.ruleViolation.findFirst({
          where: { ruleId: rule.id, transactionId: tx.id },
        });
        if (!exists) {
          await prisma.ruleViolation.create({
            data: {
              ruleId: rule.id,
              memberId: tx.memberId,
              transactionId: tx.id,
              details: `Withdrawal of ${tx.amount} exceeds threshold of ${maxAmt}`,
              riskPoints: rule.riskPoints,
            },
          });
          totalViolations++;
        }
      }
    }

    // ── NO_DEPOSIT rules ─────────────────────────────────────────
    if (rule.ruleType === "NO_DEPOSIT") {
      const membersWithWithdrawals = await prisma.transaction.groupBy({
        by: ["memberId"],
        where: { type: "WITHDRAWAL", status: { not: "FAILED" } },
      });

      for (const mw of membersWithWithdrawals) {
        const depositCount = await prisma.transaction.count({
          where: {
            memberId: mw.memberId,
            type: "DEPOSIT",
            status: "COMPLETED",
          },
        });
        if (depositCount === 0) {
          const exists = await prisma.ruleViolation.findFirst({
            where: { ruleId: rule.id, memberId: mw.memberId },
          });
          if (!exists) {
            const latestTx = await prisma.transaction.findFirst({
              where: { memberId: mw.memberId, type: "WITHDRAWAL" },
              orderBy: { createdAt: "desc" },
            });
            await prisma.ruleViolation.create({
              data: {
                ruleId: rule.id,
                memberId: mw.memberId,
                transactionId: latestTx?.id,
                details: `Member has withdrawal(s) but zero deposits on record`,
                riskPoints: rule.riskPoints,
              },
            });
            totalViolations++;
          }
        }
      }
    }

    // ── VELOCITY rules (escalating withdrawal amounts) ───────────
    if (rule.ruleType === "VELOCITY" && rule.windowHours) {
      const since = new Date(now.getTime() - rule.windowHours * 3600000);
      const members = await prisma.transaction.groupBy({
        by: ["memberId"],
        where: {
          type: "WITHDRAWAL",
          status: { not: "FAILED" },
          createdAt: { gte: since },
        },
        _count: { id: true },
        having: { id: { _count: { gte: 3 } } },
      });

      for (const m of members) {
        const recentTxs = await prisma.transaction.findMany({
          where: {
            memberId: m.memberId,
            type: "WITHDRAWAL",
            status: { not: "FAILED" },
            createdAt: { gte: since },
          },
          orderBy: { createdAt: "asc" },
          select: { id: true, amount: true },
        });

        let escalating = true;
        for (let i = 1; i < recentTxs.length; i++) {
          if (recentTxs[i].amount <= recentTxs[i - 1].amount) {
            escalating = false;
            break;
          }
        }

        if (escalating && recentTxs.length >= 3) {
          const exists = await prisma.ruleViolation.findFirst({
            where: { ruleId: rule.id, memberId: m.memberId, createdAt: { gte: since } },
          });
          if (!exists) {
            const lastTx = recentTxs[recentTxs.length - 1];
            await prisma.ruleViolation.create({
              data: {
                ruleId: rule.id,
                memberId: m.memberId,
                transactionId: lastTx.id,
                details: `${recentTxs.length} withdrawals with escalating amounts in ${rule.windowHours}h window`,
                riskPoints: rule.riskPoints,
              },
            });
            totalViolations++;
          }
        }
      }
    }

    // ── TEMPORAL rules (off-hours transactions) ──────────────────
    if (rule.ruleType === "TEMPORAL" && rule.windowHours) {
      const since = new Date(now.getTime() - rule.windowHours * 3600000);
      const offHourTxs = await prisma.transaction.findMany({
        where: {
          createdAt: { gte: since },
          status: { not: "FAILED" },
        },
        select: { id: true, memberId: true, amount: true, createdAt: true },
      });

      for (const tx of offHourTxs) {
        const hour = tx.createdAt.getUTCHours();
        if (hour < 6 || hour >= 22) {
          const exists = await prisma.ruleViolation.findFirst({
            where: { ruleId: rule.id, transactionId: tx.id },
          });
          if (!exists) {
            await prisma.ruleViolation.create({
              data: {
                ruleId: rule.id,
                memberId: tx.memberId,
                transactionId: tx.id,
                details: `Transaction at ${tx.createdAt.toISOString()} outside business hours (06:00-22:00)`,
                riskPoints: rule.riskPoints,
              },
            });
            totalViolations++;
          }
        }
      }
    }
  }

  // Log audit entry for automated scan
  await prisma.auditLog.create({
    data: {
      action: "AUTO_FRAUD_RULE_SCAN",
      entity: "FraudRule",
      details: `Automated scan: ${totalViolations} new violations from ${rules.length} rules`,
      userId: null,
    },
  });

  return `Scanned ${rules.length} rules — ${totalViolations} new violations`;
}
