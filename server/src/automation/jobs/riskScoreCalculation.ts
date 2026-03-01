/**
 * Automated Risk Score Recalculation Job
 * Recalculates risk scores for all members based on their transaction patterns.
 */
import prisma from "../../lib/prisma.js";

export async function runRiskScoreCalculation(): Promise<string> {
  const members = await prisma.member.findMany({ select: { id: true } });
  const thresholdRecord = await prisma.withdrawalThreshold.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const largeAmount = thresholdRecord?.largeWithdrawalAmount ?? 100000;
  let calculated = 0;
  let highRisk = 0;
  let critical = 0;

  for (const m of members) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600000);

    const allTx = await prisma.transaction.findMany({
      where: { memberId: m.id },
      select: { type: true, amount: true, createdAt: true, status: true },
    });

    const withdrawals24h = allTx.filter(
      (t) =>
        t.type === "WITHDRAWAL" && new Date(t.createdAt) >= twentyFourHoursAgo
    );
    const deposits = allTx.filter(
      (t) => t.type === "DEPOSIT" && t.status === "COMPLETED"
    );
    const withdrawals = allTx.filter((t) => t.type === "WITHDRAWAL");
    const recentTx = allTx.filter(
      (t) => new Date(t.createdAt) >= thirtyDaysAgo
    );
    const olderTx = allTx.filter(
      (t) => new Date(t.createdAt) < thirtyDaysAgo
    );

    // Frequency points: withdrawals in 24h — 10 pts per withdrawal over 3
    let frequencyPoints = 0;
    if (withdrawals24h.length > 3) {
      frequencyPoints = (withdrawals24h.length - 3) * 10;
    }

    // Amount points: large withdrawals — 15 pts each
    const amountPoints = withdrawals.filter(
      (t) => t.amount >= largeAmount
    ).length * 15;

    // No-deposit points: 25 pts if no deposits
    const noDepositPoints =
      withdrawals.length > 0 && deposits.length === 0 ? 25 : 0;

    // Behavior points: deviation from historical average
    let behaviorPoints = 0;
    const recentAvg =
      recentTx.length > 0
        ? recentTx.reduce((s, t) => s + t.amount, 0) / recentTx.length
        : 0;
    const olderAvg =
      olderTx.length > 0
        ? olderTx.reduce((s, t) => s + t.amount, 0) / olderTx.length
        : 0;
    if (olderAvg > 0) {
      const deviation = ((recentAvg - olderAvg) / olderAvg) * 100;
      if (deviation > 100) behaviorPoints = 20;
      else if (deviation > 50) behaviorPoints = 10;
    }

    const totalPoints =
      frequencyPoints + amountPoints + noDepositPoints + behaviorPoints;
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (totalPoints >= 60) {
      riskLevel = "CRITICAL";
      critical++;
    } else if (totalPoints >= 40) {
      riskLevel = "HIGH";
      highRisk++;
    } else if (totalPoints >= 20) {
      riskLevel = "MEDIUM";
    }

    const avgTxAmount =
      allTx.length > 0
        ? allTx.reduce((s, t) => s + t.amount, 0) / allTx.length
        : 0;
    const firstTx =
      allTx.length > 0
        ? allTx.reduce((f, t) =>
            new Date(t.createdAt) < new Date(f.createdAt) ? t : f
          )
        : null;
    const weeksSinceFirst = firstTx
      ? Math.max(
          1,
          (Date.now() - new Date(firstTx.createdAt).getTime()) / (7 * 86400000)
        )
      : 1;
    const txFrequency = allTx.length / weeksSinceFirst;

    await prisma.memberRiskScore.upsert({
      where: { memberId: m.id },
      update: {
        totalPoints,
        riskLevel,
        frequencyPoints,
        amountPoints,
        behaviorPoints,
        noDepositPoints,
        avgTransactionAmount: Math.round(avgTxAmount * 100) / 100,
        transactionFrequency: Math.round(txFrequency * 100) / 100,
        lastCalculatedAt: now,
      },
      create: {
        memberId: m.id,
        totalPoints,
        riskLevel,
        frequencyPoints,
        amountPoints,
        behaviorPoints,
        noDepositPoints,
        avgTransactionAmount: Math.round(avgTxAmount * 100) / 100,
        transactionFrequency: Math.round(txFrequency * 100) / 100,
      },
    });
    calculated++;
  }

  await prisma.auditLog.create({
    data: {
      action: "AUTO_RISK_SCORE_CALC",
      entity: "MemberRiskScore",
      details: `Automated recalculation: ${calculated} members (${critical} critical, ${highRisk} high risk)`,
      userId: null,
    },
  });

  return `Calculated ${calculated} members — ${critical} critical, ${highRisk} high risk`;
}
