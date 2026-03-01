/**
 * Automated Alert Cleanup & Notification Job
 * - Sends summary notifications for unresolved alerts
 * - Cleans up old read notifications
 * - Flags stale pending transactions
 */
import prisma from "../../lib/prisma.js";

export async function runAlertDigest(): Promise<string> {
  const results: string[] = [];

  // ── 1. Send daily digest to admins/auditors about unresolved alerts ───
  const unresolvedAlerts = await prisma.fraudAlert.count({
    where: { resolved: false },
  });

  const criticalAlerts = await prisma.fraudAlert.count({
    where: { resolved: false, severity: "CRITICAL" },
  });

  const highAlerts = await prisma.fraudAlert.count({
    where: { resolved: false, severity: "HIGH" },
  });

  const pendingApprovals = await prisma.fraudDecision.count({
    where: { requiresApproval: true, approved: null },
  });

  const pendingWithdrawals = await prisma.withdrawalRequest.count({
    where: { status: "PENDING" },
  });

  if (unresolvedAlerts > 0 || pendingApprovals > 0 || pendingWithdrawals > 0) {
    const recipients = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "AUDITOR"] }, isActive: true },
      select: { id: true },
    });

    if (recipients.length > 0) {
      const parts: string[] = [];
      if (unresolvedAlerts > 0)
        parts.push(
          `${unresolvedAlerts} unresolved alerts (${criticalAlerts} critical, ${highAlerts} high)`
        );
      if (pendingApprovals > 0)
        parts.push(`${pendingApprovals} pending decision approvals`);
      if (pendingWithdrawals > 0)
        parts.push(`${pendingWithdrawals} pending withdrawal requests`);

      await prisma.notification.createMany({
        data: recipients.map((u) => ({
          title: "Daily Security Digest",
          message: parts.join(". ") + ". Please review.",
          type: unresolvedAlerts > 0 ? "warning" : "info",
          userId: u.id,
        })),
      });
      results.push(`Sent digest to ${recipients.length} users`);
    }
  } else {
    results.push("No pending items for digest");
  }

  // ── 2. Cleanup old read notifications (older than 30 days) ──────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const deleted = await prisma.notification.deleteMany({
    where: { read: true, createdAt: { lt: thirtyDaysAgo } },
  });
  results.push(`Cleaned ${deleted.count} old notifications`);

  // ── 3. Flag stale pending transactions (older than 24h) ─────────────
  const oneDayAgo = new Date(Date.now() - 24 * 3600000);
  const stalePending = await prisma.transaction.findMany({
    where: { status: "PENDING", createdAt: { lt: oneDayAgo } },
    select: { id: true, memberId: true, txRef: true },
  });

  for (const tx of stalePending) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: "FLAGGED" },
    });

    await prisma.fraudAlert.create({
      data: {
        type: "STALE_PENDING",
        severity: "MEDIUM",
        description: `Transaction ${tx.txRef} has been pending for over 24 hours — auto-flagged for review`,
        memberId: tx.memberId,
        transactionId: tx.id,
      },
    });
  }
  if (stalePending.length > 0)
    results.push(`Flagged ${stalePending.length} stale pending transactions`);

  // ── 4. Notify officers about flagged members in their portfolio ─────
  const flaggedMembers = await prisma.member.count({
    where: { status: "FLAGGED" },
  });
  if (flaggedMembers > 0) {
    const officers = await prisma.user.findMany({
      where: { role: "OFFICER", isActive: true },
      select: { id: true },
    });
    if (officers.length > 0) {
      await prisma.notification.createMany({
        data: officers.map((u) => ({
          title: "Flagged Members Alert",
          message: `${flaggedMembers} member(s) are currently flagged. Please review before processing transactions.`,
          type: "warning",
          userId: u.id,
        })),
      });
      results.push(`Notified ${officers.length} officers about flagged members`);
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "AUTO_ALERT_DIGEST",
      entity: "Notification",
      details: `Automated digest: ${results.join("; ")}`,
      userId: null,
    },
  });

  return results.join("; ");
}
