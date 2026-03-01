/**
 * Automated Decision Evaluation Job
 * Evaluates all high/critical-risk members and creates fraud decisions automatically.
 */
import prisma from "../../lib/prisma.js";

export async function runDecisionEvaluation(): Promise<string> {
  // Get all members with HIGH or CRITICAL risk scores
  const atRiskScores = await prisma.memberRiskScore.findMany({
    where: { riskLevel: { in: ["HIGH", "CRITICAL"] } },
    select: { memberId: true, totalPoints: true, riskLevel: true },
  });

  let decisionsCreated = 0;
  let accountsFlagged = 0;
  let alertsCreated = 0;

  for (const risk of atRiskScores) {
    // Check if we already created a decision for this member today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existingDecision = await prisma.fraudDecision.findFirst({
      where: {
        memberId: risk.memberId,
        createdAt: { gte: todayStart },
        action: { in: ["ALERT_TRIGGERED", "ACCOUNT_FLAGGED"] },
      },
    });

    if (existingDecision) continue; // Already processed today

    // Create alert decision
    await prisma.fraudDecision.create({
      data: {
        memberId: risk.memberId,
        riskScore: risk.totalPoints,
        riskLevel: risk.riskLevel as "HIGH" | "CRITICAL",
        action: "ALERT_TRIGGERED",
        reason: `Automated: ${risk.riskLevel} risk level detected (score: ${risk.totalPoints})`,
      },
    });
    decisionsCreated++;

    // Create fraud alert
    await prisma.fraudAlert.create({
      data: {
        type: "AUTO_RISK_ENGINE",
        severity: risk.riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
        description: `Automated detection: member risk score ${risk.totalPoints} (${risk.riskLevel})`,
        memberId: risk.memberId,
      },
    });
    alertsCreated++;

    // CRITICAL: flag account + require second approval
    if (risk.riskLevel === "CRITICAL") {
      await prisma.member.update({
        where: { id: risk.memberId },
        data: { status: "FLAGGED" },
      });
      accountsFlagged++;

      await prisma.fraudDecision.create({
        data: {
          memberId: risk.memberId,
          riskScore: risk.totalPoints,
          riskLevel: "CRITICAL",
          action: "ACCOUNT_FLAGGED",
          reason: `Automated: account flagged — CRITICAL risk score ${risk.totalPoints}`,
        },
      });
      decisionsCreated++;

      await prisma.fraudDecision.create({
        data: {
          memberId: risk.memberId,
          riskScore: risk.totalPoints,
          riskLevel: "CRITICAL",
          action: "SECOND_APPROVAL_REQUIRED",
          reason: `Automated: all transactions require secondary approval`,
          requiresApproval: true,
        },
      });
      decisionsCreated++;
    }

    // HIGH: require manual review
    if (risk.riskLevel === "HIGH") {
      await prisma.fraudDecision.create({
        data: {
          memberId: risk.memberId,
          riskScore: risk.totalPoints,
          riskLevel: "HIGH",
          action: "MANUAL_REVIEW",
          reason: `Automated: HIGH risk — manual review recommended`,
        },
      });
      decisionsCreated++;
    }
  }

  // Notify all admins & auditors about new high-risk findings
  if (alertsCreated > 0) {
    const recipients = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "AUDITOR"] }, isActive: true },
      select: { id: true },
    });

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((u) => ({
          title: "Automated Fraud Detection",
          message: `${alertsCreated} new fraud alert(s) detected. ${accountsFlagged} account(s) flagged. Review required.`,
          type: "warning",
          userId: u.id,
        })),
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "AUTO_DECISION_EVAL",
      entity: "FraudDecision",
      details: `Automated: ${decisionsCreated} decisions, ${alertsCreated} alerts, ${accountsFlagged} accounts flagged`,
      userId: null,
    },
  });

  return `${atRiskScores.length} at-risk members evaluated — ${decisionsCreated} decisions, ${alertsCreated} alerts, ${accountsFlagged} flagged`;
}
