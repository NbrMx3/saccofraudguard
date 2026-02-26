import { Router, type Response, type Router as RouterType } from "express";
import { type AuthRequest, authenticate, authorize } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router: RouterType = Router();

// All fraud-engine routes require AUDITOR, OFFICER or ADMIN
router.use(authenticate, authorize("AUDITOR", "OFFICER", "ADMIN"));

// ─── Helper: audit log ────────────────────────────────────────────────
async function logAction(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
  ip?: string
) {
  await prisma.auditLog.create({
    data: { action, entity, entityId, details, ipAddress: ip, userId },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 1. RULE ENGINE
// ═══════════════════════════════════════════════════════════════════════

// GET /rules — list all fraud rules
router.get("/rules", async (_req: AuthRequest, res: Response) => {
  try {
    const rules = await prisma.fraudRule.findMany({
      include: {
        createdBy: { select: { firstName: true, lastName: true, role: true } },
        _count: { select: { ruleViolations: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(rules);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /rules — create a fraud rule
router.post("/rules", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, ruleType, maxCount, windowHours, minAmount, maxAmount, severity, riskPoints, enabled } = req.body;
    const rule = await prisma.fraudRule.create({
      data: {
        name,
        description,
        ruleType: ruleType || "CUSTOM",
        maxCount: maxCount ? parseInt(maxCount) : null,
        windowHours: windowHours ? parseInt(windowHours) : null,
        minAmount: minAmount ? parseFloat(minAmount) : null,
        maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        severity: severity || "MEDIUM",
        riskPoints: riskPoints ? parseInt(riskPoints) : 10,
        enabled: enabled !== undefined ? enabled : true,
        createdById: req.user!.userId,
      },
    });
    await logAction(req.user!.userId, "CREATE_FRAUD_RULE", "FraudRule", rule.id, `Created rule: ${name}`, req.ip);
    res.status(201).json(rule);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /rules/:id — update a fraud rule
router.patch("/rules/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description, ruleType, maxCount, windowHours, minAmount, maxAmount, severity, riskPoints, enabled } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (ruleType !== undefined) data.ruleType = ruleType;
    if (maxCount !== undefined) data.maxCount = maxCount === null ? null : parseInt(maxCount);
    if (windowHours !== undefined) data.windowHours = windowHours === null ? null : parseInt(windowHours);
    if (minAmount !== undefined) data.minAmount = minAmount === null ? null : parseFloat(minAmount);
    if (maxAmount !== undefined) data.maxAmount = maxAmount === null ? null : parseFloat(maxAmount);
    if (severity !== undefined) data.severity = severity;
    if (riskPoints !== undefined) data.riskPoints = parseInt(riskPoints);
    if (enabled !== undefined) data.enabled = enabled;

    const rule = await prisma.fraudRule.update({ where: { id }, data });
    await logAction(req.user!.userId, "UPDATE_FRAUD_RULE", "FraudRule", id, JSON.stringify(data), req.ip);
    res.json(rule);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /rules/:id
router.delete("/rules/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.ruleViolation.deleteMany({ where: { ruleId: id } });
    await prisma.fraudRule.delete({ where: { id } });
    await logAction(req.user!.userId, "DELETE_FRAUD_RULE", "FraudRule", id, "Rule deleted", req.ip);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /rules/violations — list all rule violations
router.get("/rules/violations", async (req: AuthRequest, res: Response) => {
  try {
    const { reviewed, ruleId, memberId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (reviewed === "true") where.reviewed = true;
    if (reviewed === "false") where.reviewed = false;
    if (ruleId) where.ruleId = ruleId;
    if (memberId) where.memberId = memberId;

    const [violations, total] = await Promise.all([
      prisma.ruleViolation.findMany({
        where,
        include: {
          rule: { select: { name: true, ruleType: true, severity: true } },
          member: { select: { memberId: true, fullName: true } },
          transaction: { select: { txRef: true, type: true, amount: true } },
          reviewedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.ruleViolation.count({ where }),
    ]);
    res.json({ violations, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /rules/violations/:id — review a violation
router.patch("/rules/violations/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reviewed, reviewNotes } = req.body;
    const violation = await prisma.ruleViolation.update({
      where: { id },
      data: {
        reviewed: reviewed !== undefined ? reviewed : true,
        reviewedById: req.user!.userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });
    await logAction(req.user!.userId, "REVIEW_VIOLATION", "RuleViolation", id, reviewNotes, req.ip);
    res.json(violation);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /rules/run — run all enabled rules against recent transactions (scan engine)
router.post("/rules/run", async (req: AuthRequest, res: Response) => {
  try {
    const rules = await prisma.fraudRule.findMany({ where: { enabled: true } });
    const thresholdRecord = await prisma.withdrawalThreshold.findFirst({ orderBy: { updatedAt: "desc" } });
    const now = new Date();
    let totalViolations = 0;

    for (const rule of rules) {
      if (rule.ruleType === "FREQUENCY" && rule.maxCount && rule.windowHours) {
        // Find members who withdrew more than maxCount times in windowHours
        const since = new Date(now.getTime() - rule.windowHours * 3600000);
        const grouped = await prisma.transaction.groupBy({
          by: ["memberId"],
          where: { type: "WITHDRAWAL", createdAt: { gte: since }, status: { not: "FAILED" } },
          _count: { id: true },
          having: { id: { _count: { gt: rule.maxCount } } },
        });

        for (const g of grouped) {
          const exists = await prisma.ruleViolation.findFirst({
            where: { ruleId: rule.id, memberId: g.memberId, createdAt: { gte: since } },
          });
          if (!exists) {
            const latestTx = await prisma.transaction.findFirst({
              where: { memberId: g.memberId, type: "WITHDRAWAL", createdAt: { gte: since } },
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

      if (rule.ruleType === "AMOUNT") {
        // Flag withdrawals exceeding max amount
        const maxAmt = rule.maxAmount ?? thresholdRecord?.largeWithdrawalAmount ?? 100000;
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

      if (rule.ruleType === "NO_DEPOSIT") {
        // Members who have WITHDRAWAL but zero DEPOSIT ever
        const membersWithWithdrawals = await prisma.transaction.groupBy({
          by: ["memberId"],
          where: { type: "WITHDRAWAL", status: { not: "FAILED" } },
        });

        for (const mw of membersWithWithdrawals) {
          const depositCount = await prisma.transaction.count({
            where: { memberId: mw.memberId, type: "DEPOSIT", status: "COMPLETED" },
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
    }

    await logAction(req.user!.userId, "RUN_FRAUD_RULES", "FraudRule", undefined, `Scan completed: ${totalViolations} new violations`, req.ip);
    res.json({ message: "Rule scan complete", newViolations: totalViolations, rulesEvaluated: rules.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Withdrawal Thresholds ─────────────────────────────────────────────

// GET /thresholds — current thresholds
router.get("/thresholds", async (_req: AuthRequest, res: Response) => {
  try {
    const threshold = await prisma.withdrawalThreshold.findFirst({
      orderBy: { updatedAt: "desc" },
      include: { updatedBy: { select: { firstName: true, lastName: true, role: true } } },
    });
    res.json(threshold);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /thresholds — create or update thresholds
router.post("/thresholds", async (req: AuthRequest, res: Response) => {
  try {
    const { largeWithdrawalAmount, dailyWithdrawalLimit, maxWithdrawalsPerDay, requireApprovalAbove } = req.body;
    const existing = await prisma.withdrawalThreshold.findFirst({ orderBy: { updatedAt: "desc" } });

    let threshold;
    if (existing) {
      threshold = await prisma.withdrawalThreshold.update({
        where: { id: existing.id },
        data: {
          largeWithdrawalAmount: parseFloat(largeWithdrawalAmount),
          dailyWithdrawalLimit: parseFloat(dailyWithdrawalLimit),
          maxWithdrawalsPerDay: parseInt(maxWithdrawalsPerDay) || 5,
          requireApprovalAbove: parseFloat(requireApprovalAbove),
          updatedById: req.user!.userId,
        },
      });
    } else {
      threshold = await prisma.withdrawalThreshold.create({
        data: {
          largeWithdrawalAmount: parseFloat(largeWithdrawalAmount),
          dailyWithdrawalLimit: parseFloat(dailyWithdrawalLimit),
          maxWithdrawalsPerDay: parseInt(maxWithdrawalsPerDay) || 5,
          requireApprovalAbove: parseFloat(requireApprovalAbove),
          updatedById: req.user!.userId,
        },
      });
    }

    await logAction(req.user!.userId, "UPDATE_THRESHOLDS", "WithdrawalThreshold", threshold.id, JSON.stringify(req.body), req.ip);
    res.json(threshold);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Withdrawal Requests (large withdrawal approval flow) ──────────────

// GET /withdrawal-requests
router.get("/withdrawal-requests", async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        include: {
          member: { select: { memberId: true, fullName: true, balance: true } },
          reviewedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.withdrawalRequest.count({ where }),
    ]);
    res.json({ requests, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /withdrawal-requests — member submits a large withdrawal request
router.post("/withdrawal-requests", async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, amount, reason, supportingDoc } = req.body;
    const count = await prisma.withdrawalRequest.count();
    const requestRef = `WR-${String(count + 1).padStart(5, "0")}`;

    const request = await prisma.withdrawalRequest.create({
      data: {
        requestRef,
        memberId,
        amount: parseFloat(amount),
        reason,
        supportingDoc: supportingDoc || null,
      },
    });
    await logAction(req.user!.userId, "CREATE_WITHDRAWAL_REQUEST", "WithdrawalRequest", request.id, `Amount: ${amount}`, req.ip);
    res.status(201).json(request);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /withdrawal-requests/:id — approve or reject
router.patch("/withdrawal-requests/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, reviewNotes } = req.body;
    const request = await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status,
        reviewedById: req.user!.userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });
    await logAction(req.user!.userId, "REVIEW_WITHDRAWAL_REQUEST", "WithdrawalRequest", id, `${status}: ${reviewNotes || ""}`, req.ip);
    res.json(request);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 2. BEHAVIOR ANALYSIS
// ═══════════════════════════════════════════════════════════════════════

// GET /behavior/analysis — per-member behavior analysis
router.get("/behavior/analysis", async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build member list
    const memberWhere: any = {};
    if (memberId) memberWhere.id = memberId;

    const members = await prisma.member.findMany({
      where: memberWhere,
      select: { id: true, memberId: true, fullName: true, status: true, balance: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.member.count({ where: memberWhere });

    const analyses = await Promise.all(
      members.map(async (m) => {
        const transactions = await prisma.transaction.findMany({
          where: { memberId: m.id },
          select: { type: true, amount: true, createdAt: true, status: true },
          orderBy: { createdAt: "desc" },
        });

        const deposits = transactions.filter((t) => t.type === "DEPOSIT");
        const withdrawals = transactions.filter((t) => t.type === "WITHDRAWAL");
        const totalTx = transactions.length;

        const avgAmount = totalTx > 0 ? transactions.reduce((s, t) => s + t.amount, 0) / totalTx : 0;
        const avgDeposit = deposits.length > 0 ? deposits.reduce((s, t) => s + t.amount, 0) / deposits.length : 0;
        const avgWithdrawal = withdrawals.length > 0 ? withdrawals.reduce((s, t) => s + t.amount, 0) / withdrawals.length : 0;

        // Frequency: transactions per week
        const firstTx = transactions.length > 0 ? transactions[transactions.length - 1].createdAt : m.createdAt;
        const weeksSinceFirst = Math.max(1, (Date.now() - new Date(firstTx).getTime()) / (7 * 86400000));
        const weeklyFrequency = totalTx / weeksSinceFirst;

        // Recent vs historical comparison (last 30 days vs older)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        const recentTx = transactions.filter((t) => new Date(t.createdAt) >= thirtyDaysAgo);
        const olderTx = transactions.filter((t) => new Date(t.createdAt) < thirtyDaysAgo);
        const recentAvg = recentTx.length > 0 ? recentTx.reduce((s, t) => s + t.amount, 0) / recentTx.length : 0;
        const olderAvg = olderTx.length > 0 ? olderTx.reduce((s, t) => s + t.amount, 0) / olderTx.length : 0;
        const amountDeviation = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

        // Flagged transactions
        const flaggedCount = transactions.filter((t) => t.status === "FLAGGED").length;

        // Activity pattern: group by day of week
        const dayPattern = [0, 0, 0, 0, 0, 0, 0]; // Sun=0..Sat=6
        transactions.forEach((t) => {
          dayPattern[new Date(t.createdAt).getDay()]++;
        });
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const peakDay = dayPattern.indexOf(Math.max(...dayPattern));

        return {
          member: { id: m.id, memberId: m.memberId, fullName: m.fullName, status: m.status, balance: m.balance },
          totalTransactions: totalTx,
          deposits: deposits.length,
          withdrawals: withdrawals.length,
          avgAmount: Math.round(avgAmount * 100) / 100,
          avgDeposit: Math.round(avgDeposit * 100) / 100,
          avgWithdrawal: Math.round(avgWithdrawal * 100) / 100,
          weeklyFrequency: Math.round(weeklyFrequency * 100) / 100,
          recentAvgAmount: Math.round(recentAvg * 100) / 100,
          historicalAvgAmount: Math.round(olderAvg * 100) / 100,
          amountDeviationPercent: Math.round(amountDeviation * 100) / 100,
          flaggedTransactions: flaggedCount,
          peakActivityDay: dayNames[peakDay],
          activityByDay: dayNames.map((name, i) => ({ day: name, count: dayPattern[i] })),
        };
      })
    );

    res.json({ analyses, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /behavior/summary — aggregate behavior stats
router.get("/behavior/summary", async (_req: AuthRequest, res: Response) => {
  try {
    const totalMembers = await prisma.member.count();
    const totalTx = await prisma.transaction.count();
    const flaggedTx = await prisma.transaction.count({ where: { status: "FLAGGED" } });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentTx = await prisma.transaction.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const avgTxAmount = await prisma.transaction.aggregate({ _avg: { amount: true } });

    // Members with unusual activity (deviation > 50%)
    const riskScores = await prisma.memberRiskScore.findMany({
      where: { riskLevel: { in: ["HIGH", "CRITICAL"] } },
    });

    res.json({
      totalMembers,
      totalTransactions: totalTx,
      flaggedTransactions: flaggedTx,
      recentTransactions: recentTx,
      avgTransactionAmount: Math.round((avgTxAmount._avg.amount ?? 0) * 100) / 100,
      highRiskMembers: riskScores.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 3. RISK SCORING ENGINE
// ═══════════════════════════════════════════════════════════════════════

// POST /risk/calculate — recalculate risk scores for all members
router.post("/risk/calculate", async (req: AuthRequest, res: Response) => {
  try {
    const members = await prisma.member.findMany({ select: { id: true } });
    const thresholdRecord = await prisma.withdrawalThreshold.findFirst({ orderBy: { updatedAt: "desc" } });
    const largeAmount = thresholdRecord?.largeWithdrawalAmount ?? 100000;
    let calculated = 0;

    for (const m of members) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600000);

      const allTx = await prisma.transaction.findMany({
        where: { memberId: m.id },
        select: { type: true, amount: true, createdAt: true, status: true },
      });

      const withdrawals24h = allTx.filter(
        (t) => t.type === "WITHDRAWAL" && new Date(t.createdAt) >= twentyFourHoursAgo
      );
      const deposits = allTx.filter((t) => t.type === "DEPOSIT" && t.status === "COMPLETED");
      const withdrawals = allTx.filter((t) => t.type === "WITHDRAWAL");
      const recentTx = allTx.filter((t) => new Date(t.createdAt) >= thirtyDaysAgo);
      const olderTx = allTx.filter((t) => new Date(t.createdAt) < thirtyDaysAgo);

      // Frequency points: withdrawals in 24h — 10 pts per withdrawal over 3
      let frequencyPoints = 0;
      if (withdrawals24h.length > 3) {
        frequencyPoints = (withdrawals24h.length - 3) * 10;
      }

      // Amount points: large withdrawals — 15 pts each
      let amountPoints = 0;
      const largeWithdrawals = withdrawals.filter((t) => t.amount >= largeAmount);
      amountPoints = largeWithdrawals.length * 15;

      // No-deposit points: 25 pts if no deposits
      let noDepositPoints = 0;
      if (withdrawals.length > 0 && deposits.length === 0) {
        noDepositPoints = 25;
      }

      // Behavior points: deviation from historical average
      let behaviorPoints = 0;
      const recentAvg = recentTx.length > 0 ? recentTx.reduce((s, t) => s + t.amount, 0) / recentTx.length : 0;
      const olderAvg = olderTx.length > 0 ? olderTx.reduce((s, t) => s + t.amount, 0) / olderTx.length : 0;
      if (olderAvg > 0) {
        const deviation = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (deviation > 100) behaviorPoints = 20;
        else if (deviation > 50) behaviorPoints = 10;
      }

      const totalPoints = frequencyPoints + amountPoints + noDepositPoints + behaviorPoints;
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
      if (totalPoints >= 60) riskLevel = "CRITICAL";
      else if (totalPoints >= 40) riskLevel = "HIGH";
      else if (totalPoints >= 20) riskLevel = "MEDIUM";

      const avgTxAmount = allTx.length > 0 ? allTx.reduce((s, t) => s + t.amount, 0) / allTx.length : 0;
      const firstTx = allTx.length > 0 ? allTx.reduce((f, t) => (new Date(t.createdAt) < new Date(f.createdAt) ? t : f)) : null;
      const weeksSinceFirst = firstTx ? Math.max(1, (Date.now() - new Date(firstTx.createdAt).getTime()) / (7 * 86400000)) : 1;
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

    await logAction(req.user!.userId, "CALCULATE_RISK_SCORES", "MemberRiskScore", undefined, `Calculated for ${calculated} members`, req.ip);
    res.json({ message: "Risk scores calculated", membersProcessed: calculated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /risk/scores — list member risk scores
router.get("/risk/scores", async (req: AuthRequest, res: Response) => {
  try {
    const { riskLevel, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (riskLevel) where.riskLevel = riskLevel;

    const [scores, total] = await Promise.all([
      prisma.memberRiskScore.findMany({
        where,
        include: { member: { select: { memberId: true, fullName: true, status: true, balance: true } } },
        orderBy: { totalPoints: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.memberRiskScore.count({ where }),
    ]);

    // Summary
    const summary = await prisma.memberRiskScore.groupBy({
      by: ["riskLevel"],
      _count: { id: true },
    });
    const breakdown: Record<string, number> = {};
    summary.forEach((s) => { breakdown[s.riskLevel] = s._count.id; });

    res.json({ scores, total, page: parseInt(page), limit: parseInt(limit), breakdown });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /risk/scores/:memberId — single member risk detail
router.get("/risk/scores/:memberId", async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.params.memberId as string;
    const score = await prisma.memberRiskScore.findUnique({
      where: { memberId },
      include: { member: { select: { memberId: true, fullName: true, status: true, balance: true } } },
    });
    if (!score) {
      res.status(404).json({ error: "Risk score not found for this member" });
      return;
    }

    // Recent violations
    const violations = await prisma.ruleViolation.findMany({
      where: { memberId },
      include: { rule: { select: { name: true, ruleType: true, severity: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Recent decisions
    const decisions = await prisma.fraudDecision.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    res.json({ score, violations, decisions });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 4. DECISION LOGIC LAYER
// ═══════════════════════════════════════════════════════════════════════

// POST /decisions/evaluate — evaluate a member/transaction and make decisions
router.post("/decisions/evaluate", async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, transactionId } = req.body;

    // Get or calculate risk score
    let riskRecord = await prisma.memberRiskScore.findUnique({ where: { memberId } });
    if (!riskRecord) {
      // Calculate on-the-fly
      const allTx = await prisma.transaction.findMany({
        where: { memberId },
        select: { type: true, amount: true, createdAt: true, status: true },
      });
      const thresholdRecord = await prisma.withdrawalThreshold.findFirst({ orderBy: { updatedAt: "desc" } });
      const largeAmount = thresholdRecord?.largeWithdrawalAmount ?? 100000;
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

      const withdrawals24h = allTx.filter((t) => t.type === "WITHDRAWAL" && new Date(t.createdAt) >= twentyFourHoursAgo);
      const deposits = allTx.filter((t) => t.type === "DEPOSIT" && t.status === "COMPLETED");
      const withdrawals = allTx.filter((t) => t.type === "WITHDRAWAL");
      const recentTx = allTx.filter((t) => new Date(t.createdAt) >= thirtyDaysAgo);
      const olderTx = allTx.filter((t) => new Date(t.createdAt) < thirtyDaysAgo);

      let frequencyPoints = withdrawals24h.length > 3 ? (withdrawals24h.length - 3) * 10 : 0;
      let amountPoints = withdrawals.filter((t) => t.amount >= largeAmount).length * 15;
      let noDepositPoints = withdrawals.length > 0 && deposits.length === 0 ? 25 : 0;

      let behaviorPoints = 0;
      const recentAvg = recentTx.length > 0 ? recentTx.reduce((s, t) => s + t.amount, 0) / recentTx.length : 0;
      const olderAvg = olderTx.length > 0 ? olderTx.reduce((s, t) => s + t.amount, 0) / olderTx.length : 0;
      if (olderAvg > 0) {
        const dev = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (dev > 100) behaviorPoints = 20;
        else if (dev > 50) behaviorPoints = 10;
      }

      const totalPoints = frequencyPoints + amountPoints + noDepositPoints + behaviorPoints;
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
      if (totalPoints >= 60) riskLevel = "CRITICAL";
      else if (totalPoints >= 40) riskLevel = "HIGH";
      else if (totalPoints >= 20) riskLevel = "MEDIUM";

      riskRecord = await prisma.memberRiskScore.upsert({
        where: { memberId },
        update: { totalPoints, riskLevel, frequencyPoints, amountPoints, behaviorPoints, noDepositPoints, lastCalculatedAt: now },
        create: { memberId, totalPoints, riskLevel, frequencyPoints, amountPoints, behaviorPoints, noDepositPoints },
      });
    }

    const decisions: any[] = [];

    // Decision logic based on risk level
    if (riskRecord.riskLevel === "CRITICAL" || riskRecord.riskLevel === "HIGH") {
      // Trigger alert
      const alertDecision = await prisma.fraudDecision.create({
        data: {
          memberId,
          transactionId: transactionId || null,
          riskScore: riskRecord.totalPoints,
          riskLevel: riskRecord.riskLevel,
          action: "ALERT_TRIGGERED",
          reason: `${riskRecord.riskLevel} risk level detected (score: ${riskRecord.totalPoints})`,
        },
      });
      decisions.push(alertDecision);

      // Create fraud alert
      await prisma.fraudAlert.create({
        data: {
          type: "RISK_ENGINE",
          severity: riskRecord.riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
          description: `Fraud detection engine flagged member — Risk score: ${riskRecord.totalPoints} (${riskRecord.riskLevel})`,
          memberId,
          transactionId: transactionId || null,
        },
      });
    }

    if (riskRecord.riskLevel === "CRITICAL") {
      // Require second approval
      const approvalDecision = await prisma.fraudDecision.create({
        data: {
          memberId,
          transactionId: transactionId || null,
          riskScore: riskRecord.totalPoints,
          riskLevel: riskRecord.riskLevel,
          action: "SECOND_APPROVAL_REQUIRED",
          reason: `CRITICAL risk — all transactions require secondary approval`,
          requiresApproval: true,
        },
      });
      decisions.push(approvalDecision);

      // Flag account
      await prisma.member.update({ where: { id: memberId }, data: { status: "FLAGGED" } });
      const flagDecision = await prisma.fraudDecision.create({
        data: {
          memberId,
          riskScore: riskRecord.totalPoints,
          riskLevel: riskRecord.riskLevel,
          action: "ACCOUNT_FLAGGED",
          reason: `Account auto-flagged due to CRITICAL risk score`,
        },
      });
      decisions.push(flagDecision);
    }

    if (riskRecord.riskLevel === "HIGH") {
      // Manual review
      const reviewDecision = await prisma.fraudDecision.create({
        data: {
          memberId,
          transactionId: transactionId || null,
          riskScore: riskRecord.totalPoints,
          riskLevel: riskRecord.riskLevel,
          action: "MANUAL_REVIEW",
          reason: `HIGH risk — manual review recommended`,
        },
      });
      decisions.push(reviewDecision);
    }

    if (riskRecord.riskLevel === "LOW" || riskRecord.riskLevel === "MEDIUM") {
      const autoDecision = await prisma.fraudDecision.create({
        data: {
          memberId,
          transactionId: transactionId || null,
          riskScore: riskRecord.totalPoints,
          riskLevel: riskRecord.riskLevel,
          action: "AUTO_APPROVED",
          reason: `Risk level ${riskRecord.riskLevel} (score: ${riskRecord.totalPoints}) — no action required`,
        },
      });
      decisions.push(autoDecision);
    }

    // Log the event
    await logAction(
      req.user!.userId,
      "FRAUD_DECISION",
      "FraudDecision",
      memberId,
      `Risk: ${riskRecord.riskLevel} (${riskRecord.totalPoints}pts) — ${decisions.map((d) => d.action).join(", ")}`,
      req.ip
    );

    res.json({ riskScore: riskRecord, decisions });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /decisions — list decisions
router.get("/decisions", async (req: AuthRequest, res: Response) => {
  try {
    const { action, riskLevel, requiresApproval, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (action) where.action = action;
    if (riskLevel) where.riskLevel = riskLevel;
    if (requiresApproval === "true") where.requiresApproval = true;
    if (requiresApproval === "false") where.requiresApproval = false;

    const [decisions, total] = await Promise.all([
      prisma.fraudDecision.findMany({
        where,
        include: {
          member: { select: { memberId: true, fullName: true, status: true } },
          transaction: { select: { txRef: true, type: true, amount: true } },
          approvedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.fraudDecision.count({ where }),
    ]);

    // Summary
    const actionSummary = await prisma.fraudDecision.groupBy({
      by: ["action"],
      _count: { id: true },
    });
    const actionBreakdown: Record<string, number> = {};
    actionSummary.forEach((s) => { actionBreakdown[s.action] = s._count.id; });

    res.json({ decisions, total, page: parseInt(page), limit: parseInt(limit), actionBreakdown });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /decisions/:id/approve — approve a pending decision
router.patch("/decisions/:id/approve", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { approved } = req.body;
    const decision = await prisma.fraudDecision.update({
      where: { id },
      data: {
        approved: approved === true,
        approvedById: req.user!.userId,
        approvedAt: new Date(),
      },
    });
    await logAction(req.user!.userId, "APPROVE_DECISION", "FraudDecision", id, `Approved: ${approved}`, req.ip);
    res.json(decision);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /decisions/stats — decision layer stats
router.get("/decisions/stats", async (_req: AuthRequest, res: Response) => {
  try {
    const total = await prisma.fraudDecision.count();
    const pendingApprovals = await prisma.fraudDecision.count({ where: { requiresApproval: true, approved: null } });
    const alertsTriggered = await prisma.fraudDecision.count({ where: { action: "ALERT_TRIGGERED" } });
    const accountsFlagged = await prisma.fraudDecision.count({ where: { action: "ACCOUNT_FLAGGED" } });
    const autoApproved = await prisma.fraudDecision.count({ where: { action: "AUTO_APPROVED" } });
    const blocked = await prisma.fraudDecision.count({ where: { action: "TRANSACTION_BLOCKED" } });

    const recentDecisions = await prisma.fraudDecision.findMany({
      include: {
        member: { select: { memberId: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    res.json({
      total,
      pendingApprovals,
      alertsTriggered,
      accountsFlagged,
      autoApproved,
      blocked,
      recentDecisions,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Engine Dashboard Stats ────────────────────────────────────────────
router.get("/stats", async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalRules,
      enabledRules,
      totalViolations,
      unreviewedViolations,
      highRiskMembers,
      criticalRiskMembers,
      totalDecisions,
      pendingApprovals,
      pendingWithdrawals,
    ] = await Promise.all([
      prisma.fraudRule.count(),
      prisma.fraudRule.count({ where: { enabled: true } }),
      prisma.ruleViolation.count(),
      prisma.ruleViolation.count({ where: { reviewed: false } }),
      prisma.memberRiskScore.count({ where: { riskLevel: "HIGH" } }),
      prisma.memberRiskScore.count({ where: { riskLevel: "CRITICAL" } }),
      prisma.fraudDecision.count(),
      prisma.fraudDecision.count({ where: { requiresApproval: true, approved: null } }),
      prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    ]);

    res.json({
      totalRules,
      enabledRules,
      totalViolations,
      unreviewedViolations,
      highRiskMembers,
      criticalRiskMembers,
      totalDecisions,
      pendingApprovals,
      pendingWithdrawals,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
