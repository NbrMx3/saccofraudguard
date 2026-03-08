import express, { type Response } from "express";
import prisma from "../lib/prisma.js";
import {
  authenticate,
  authorize,
  type AuthRequest,
} from "../middleware/auth.js";
import { runFraudCheck } from "../utils/fraudCheck.js";
import multer from "multer";

const router: express.Router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

// All officer routes require OFFICER or ADMIN role
router.use(authenticate, authorize("OFFICER", "ADMIN"));

// ═══════════════════════════════════════════════════════════════════
//  FRAUD ALERTS — officer-specific (assigned to them or unresolved)
// ═══════════════════════════════════════════════════════════════════

router.get("/fraud-alerts", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const severity = req.query.severity as string | undefined;
    const resolved = req.query.resolved as string | undefined;

    const where: Record<string, unknown> = {};
    if (severity && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
      where.severity = severity;
    }
    if (resolved === "true") where.resolved = true;
    else if (resolved === "false") where.resolved = false;

    const [alerts, total] = await Promise.all([
      prisma.fraudAlert.findMany({
        where,
        select: {
          id: true,
          type: true,
          severity: true,
          description: true,
          resolved: true,
          resolvedAt: true,
          resolvedBy: { select: { firstName: true, lastName: true } },
          member: { select: { id: true, memberId: true, fullName: true } },
          transaction: { select: { txRef: true, type: true, amount: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.fraudAlert.count({ where }),
    ]);

    res.json({ alerts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Officer fraud-alerts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Resolve / escalate a fraud alert
router.patch("/fraud-alerts/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { action, notes } = req.body; // action: "resolve" | "escalate"

    const alert = await prisma.fraudAlert.findUnique({ where: { id } });
    if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }

    const updateData: Record<string, unknown> = {};
    if (action === "resolve") {
      updateData.resolved = true;
      updateData.resolvedAt = new Date();
      updateData.resolvedById = req.user!.userId;
    }

    const updated = await prisma.fraudAlert.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await prisma.auditLog.create({
      data: {
        action: action === "resolve" ? "RESOLVE_ALERT" : "ESCALATE_ALERT",
        entity: "FraudAlert",
        entityId: id,
        details: notes || `Alert ${action}d by officer`,
        userId: req.user!.userId,
        ipAddress: req.ip ?? null,
      },
    });

    res.json({ alert: updated });
  } catch (error) {
    console.error("Patch fraud-alert error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  CASE INVESTIGATION
// ═══════════════════════════════════════════════════════════════════

router.get("/cases", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;

    const where: Record<string, unknown> = {};
    if (status && ["OPEN", "IN_PROGRESS", "ESCALATED", "CLOSED", "DISMISSED"].includes(status)) {
      where.status = status;
    }
    if (priority && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority)) {
      where.priority = priority;
    }

    const [cases, total] = await Promise.all([
      prisma.caseInvestigation.findMany({
        where,
        select: {
          id: true,
          caseRef: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          findings: true,
          resolution: true,
          alert: {
            select: {
              id: true,
              type: true,
              severity: true,
              member: { select: { fullName: true, memberId: true } },
            },
          },
          assignedTo: { select: { firstName: true, lastName: true } },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.caseInvestigation.count({ where }),
    ]);

    res.json({ cases, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("List cases error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a case (optionally linked to a fraud alert)
router.post("/cases", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, priority, alertId } = req.body;
    if (!title || !description) {
      res.status(400).json({ error: "Title and description are required" });
      return;
    }

    // Generate case ref
    const count = await prisma.caseInvestigation.count();
    const caseRef = `CASE-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const caseData: Record<string, unknown> = {
      caseRef,
      title,
      description,
      priority: priority || "MEDIUM",
      assignedToId: req.user!.userId,
    };

    if (alertId) {
      // Ensure the alert exists and isn't already linked
      const alert = await prisma.fraudAlert.findUnique({ where: { id: alertId } });
      if (!alert) { res.status(404).json({ error: "Fraud alert not found" }); return; }
      const existing = await prisma.caseInvestigation.findUnique({ where: { alertId } });
      if (existing) { res.status(400).json({ error: "Alert already has a case" }); return; }
      caseData.alertId = alertId;
    }

    const investigation = await prisma.caseInvestigation.create({ data: caseData as any });

    await prisma.auditLog.create({
      data: {
        action: "CREATE_CASE",
        entity: "CaseInvestigation",
        entityId: investigation.id,
        details: `Case ${caseRef}: ${title}`,
        userId: req.user!.userId,
        ipAddress: req.ip ?? null,
      },
    });

    res.status(201).json({ case: investigation });
  } catch (error) {
    console.error("Create case error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update case status / findings / resolution
router.patch("/cases/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, findings, resolution } = req.body;

    const existing = await prisma.caseInvestigation.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: "Case not found" }); return; }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (findings !== undefined) data.findings = findings;
    if (resolution !== undefined) data.resolution = resolution;

    const updated = await prisma.caseInvestigation.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE_CASE",
        entity: "CaseInvestigation",
        entityId: id,
        details: `Case ${existing.caseRef} updated — status: ${status || existing.status}`,
        userId: req.user!.userId,
        ipAddress: req.ip ?? null,
      },
    });

    res.json({ case: updated });
  } catch (error) {
    console.error("Update case error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  REPORTS — generate officer-level reports
// ═══════════════════════════════════════════════════════════════════

router.get("/reports/summary", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const range = (req.query.range as string) || "30d";
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalTransactions,
      totalDeposits,
      totalWithdrawals,
      fraudAlerts,
      unresolvedAlerts,
      totalMembers,
      activeLoans,
      txVolume,
      alertsBySeverity,
      txByType,
      casesOpen,
    ] = await Promise.all([
      prisma.transaction.count({ where: { createdAt: { gte: since } } }),
      prisma.transaction.aggregate({ where: { type: "DEPOSIT", createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: "WITHDRAWAL", createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.fraudAlert.count({ where: { createdAt: { gte: since } } }),
      prisma.fraudAlert.count({ where: { resolved: false } }),
      prisma.member.count(),
      prisma.loan.count({ where: { status: "ACTIVE" } }),
      prisma.transaction.aggregate({ where: { createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.fraudAlert.groupBy({ by: ["severity"], _count: true, where: { createdAt: { gte: since } } }),
      prisma.transaction.groupBy({ by: ["type"], _count: true, _sum: { amount: true }, where: { createdAt: { gte: since } } }),
      prisma.caseInvestigation.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);

    // Daily transaction trend (last N days)
    const dailyTrend = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      if (i % (days <= 7 ? 1 : days <= 30 ? 3 : 7) === 0) {
        const count = await prisma.transaction.count({
          where: { createdAt: { gte: dayStart, lte: dayEnd } },
        });
        dailyTrend.push({
          date: dayStart.toISOString().slice(0, 10),
          count,
        });
      }
    }

    res.json({
      period: { days, since: since.toISOString() },
      summary: {
        totalTransactions,
        depositVolume: totalDeposits._sum.amount ?? 0,
        withdrawalVolume: totalWithdrawals._sum.amount ?? 0,
        totalVolume: txVolume._sum.amount ?? 0,
        fraudAlerts,
        unresolvedAlerts,
        totalMembers,
        activeLoans,
        openCases: casesOpen,
      },
      breakdowns: {
        alertsBySeverity: alertsBySeverity.map((a) => ({ severity: a.severity, count: a._count })),
        transactionsByType: txByType.map((t) => ({ type: t.type, count: t._count, volume: t._sum.amount ?? 0 })),
      },
      dailyTrend,
    });
  } catch (error) {
    console.error("Reports summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  DOCUMENT UPLOAD
// ═══════════════════════════════════════════════════════════════════

router.get("/documents", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const category = req.query.category as string | undefined;

    const where: Record<string, unknown> = {};
    if (category && category !== "all") where.category = category;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        select: {
          id: true,
          name: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          category: true,
          description: true,
          uploadedBy: { select: { firstName: true, lastName: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    res.json({ documents, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("List documents error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/documents", upload.single("file"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: "No file uploaded" }); return; }

    const { name, category, description } = req.body;

    const document = await prisma.document.create({
      data: {
        name: name || file.originalname,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        category: category || "general",
        description: description || null,
        data: file.buffer as any,
        uploadedById: req.user!.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPLOAD_DOCUMENT",
        entity: "Document",
        entityId: document.id,
        details: `Uploaded: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`,
        userId: req.user!.userId,
        ipAddress: req.ip ?? null,
      },
    });

    res.status(201).json({
      document: {
        id: document.id,
        name: document.name,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        category: document.category,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error("Upload document error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Download a document
router.get("/documents/:id/download", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

    res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Length", doc.fileSize.toString());
    res.send(doc.data);
  } catch (error) {
    console.error("Download document error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a document
router.delete("/documents/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

    await prisma.document.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE_DOCUMENT",
        entity: "Document",
        entityId: id,
        details: `Deleted: ${doc.fileName}`,
        userId: req.user!.userId,
        ipAddress: req.ip ?? null,
      },
    });

    res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  ACTIVITY LOG — officer's own audit trail
// ═══════════════════════════════════════════════════════════════════

router.get("/activity-log", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 30);
    const action = req.query.action as string | undefined;

    const where: Record<string, unknown> = { userId: req.user!.userId };
    if (action && action !== "all") where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          details: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Activity log error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  LOAN MANAGEMENT — comprehensive loan tracking
// ═══════════════════════════════════════════════════════════════════

router.get("/loans/manage", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (status && ["PENDING", "APPROVED", "ACTIVE", "COMPLETED", "DEFAULTED", "REJECTED"].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { loanRef: { contains: search, mode: "insensitive" } },
        { member: { fullName: { contains: search, mode: "insensitive" } } },
        { member: { memberId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [loans, total, stats] = await Promise.all([
      prisma.loan.findMany({
        where,
        select: {
          id: true,
          loanRef: true,
          amount: true,
          interestRate: true,
          termMonths: true,
          monthlyPayment: true,
          totalRepaid: true,
          outstandingBalance: true,
          status: true,
          purpose: true,
          createdAt: true,
          updatedAt: true,
          member: { select: { id: true, memberId: true, fullName: true, phoneNumber: true, status: true } },
          approvedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.loan.count({ where }),
      Promise.all([
        prisma.loan.count({ where: { status: "ACTIVE" } }),
        prisma.loan.count({ where: { status: "PENDING" } }),
        prisma.loan.count({ where: { status: "DEFAULTED" } }),
        prisma.loan.count({ where: { status: "COMPLETED" } }),
        prisma.loan.aggregate({ where: { status: "ACTIVE" }, _sum: { outstandingBalance: true } }),
        prisma.loan.aggregate({ where: { status: "ACTIVE" }, _sum: { totalRepaid: true } }),
      ]),
    ]);

    // Default risk: active loans where repayment is behind schedule
    const activeLoans = await prisma.loan.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        loanRef: true,
        amount: true,
        termMonths: true,
        monthlyPayment: true,
        totalRepaid: true,
        outstandingBalance: true,
        createdAt: true,
        member: { select: { memberId: true, fullName: true } },
      },
    });

    const defaultRisk = activeLoans
      .map((loan) => {
        const monthsElapsed = Math.max(1, Math.floor((Date.now() - new Date(loan.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)));
        const expectedRepaid = Math.min(loan.amount, loan.monthlyPayment * monthsElapsed);
        const repaymentRatio = expectedRepaid > 0 ? loan.totalRepaid / expectedRepaid : 1;
        return {
          ...loan,
          monthsElapsed,
          expectedRepaid: Math.round(expectedRepaid),
          repaymentRatio: Math.round(repaymentRatio * 100),
          riskLevel: repaymentRatio < 0.5 ? "HIGH" : repaymentRatio < 0.8 ? "MEDIUM" : "LOW",
        };
      })
      .filter((l) => l.repaymentRatio < 80)
      .sort((a, b) => a.repaymentRatio - b.repaymentRatio)
      .slice(0, 20);

    res.json({
      loans,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        activeLoans: stats[0],
        pendingLoans: stats[1],
        defaultedLoans: stats[2],
        completedLoans: stats[3],
        totalOutstanding: stats[4]._sum.outstandingBalance ?? 0,
        totalRepaid: stats[5]._sum.totalRepaid ?? 0,
      },
      defaultRisk,
    });
  } catch (error) {
    console.error("Loan management error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Approve or reject a loan
router.patch("/loans/:id/status", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { action } = req.body; // "approve" | "reject"

    const loan = await prisma.loan.findUnique({ where: { id }, include: { member: true } });
    if (!loan) { res.status(404).json({ error: "Loan not found" }); return; }

    if (action === "approve") {
      if (loan.status !== "PENDING") {
        res.status(400).json({ error: "Only pending loans can be approved" });
        return;
      }

      // Disburse into member's balance
      const member = loan.member;
      const balanceBefore = member.balance;
      const balanceAfter = balanceBefore + loan.amount;

      function generateTxRef(): string {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `LND-${date}-${rand}`;
      }

      const transaction = await prisma.transaction.create({
        data: {
          txRef: generateTxRef(),
          type: "LOAN_DISBURSEMENT",
          amount: loan.amount,
          balanceBefore,
          balanceAfter,
          description: `Loan disbursement — ${loan.loanRef}`,
          memberId: member.id,
          processedById: req.user!.userId,
          loanId: loan.id,
        },
      });

      await prisma.member.update({ where: { id: member.id }, data: { balance: balanceAfter } });
      await prisma.loan.update({ where: { id }, data: { status: "ACTIVE", approvedById: req.user!.userId } });

      await runFraudCheck(member.id, transaction.id, "LOAN_DISBURSEMENT", loan.amount);

      await prisma.auditLog.create({
        data: {
          action: "APPROVE_LOAN",
          entity: "Loan",
          entityId: id,
          details: `Approved & disbursed ${loan.loanRef} — KES ${loan.amount}`,
          userId: req.user!.userId,
          ipAddress: req.ip ?? null,
        },
      });

      res.json({ message: "Loan approved and disbursed", loan: { ...loan, status: "ACTIVE" } });
    } else if (action === "reject") {
      if (loan.status !== "PENDING") {
        res.status(400).json({ error: "Only pending loans can be rejected" });
        return;
      }

      await prisma.loan.update({ where: { id }, data: { status: "REJECTED" } });

      await prisma.auditLog.create({
        data: {
          action: "REJECT_LOAN",
          entity: "Loan",
          entityId: id,
          details: `Rejected ${loan.loanRef}`,
          userId: req.user!.userId,
          ipAddress: req.ip ?? null,
        },
      });

      res.json({ message: "Loan rejected", loan: { ...loan, status: "REJECTED" } });
    } else {
      res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
    }
  } catch (error) {
    console.error("Loan status update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  MEMBER RISK PROFILES
// ═══════════════════════════════════════════════════════════════════

router.get("/member-risk-profiles", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const riskLevel = req.query.riskLevel as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (riskLevel && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(riskLevel)) {
      where.riskLevel = riskLevel;
    }
    if (search) {
      where.member = {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { memberId: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [profiles, total] = await Promise.all([
      prisma.memberRiskScore.findMany({
        where,
        select: {
          id: true,
          totalPoints: true,
          riskLevel: true,
          frequencyPoints: true,
          amountPoints: true,
          behaviorPoints: true,
          noDepositPoints: true,
          avgTransactionAmount: true,
          transactionFrequency: true,
          lastCalculatedAt: true,
          member: {
            select: {
              id: true,
              memberId: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              status: true,
              balance: true,
            },
          },
        },
        orderBy: { totalPoints: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.memberRiskScore.count({ where }),
    ]);

    // Enrich with alert counts and loan status
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const [alertCount, unresolvedAlerts, activeLoan] = await Promise.all([
          prisma.fraudAlert.count({ where: { memberId: p.member.id } }),
          prisma.fraudAlert.count({ where: { memberId: p.member.id, resolved: false } }),
          prisma.loan.findFirst({
            where: { memberId: p.member.id, status: { in: ["ACTIVE", "PENDING"] } },
            select: { loanRef: true, status: true, outstandingBalance: true },
          }),
        ]);
        return { ...p, alertCount, unresolvedAlerts, activeLoan };
      })
    );

    // Summary stats
    const [totalHigh, totalMedium, totalLow, totalCritical] = await Promise.all([
      prisma.memberRiskScore.count({ where: { riskLevel: "HIGH" } }),
      prisma.memberRiskScore.count({ where: { riskLevel: "MEDIUM" } }),
      prisma.memberRiskScore.count({ where: { riskLevel: "LOW" } }),
      prisma.memberRiskScore.count({ where: { riskLevel: "CRITICAL" } }),
    ]);

    res.json({
      profiles: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: { high: totalHigh, medium: totalMedium, low: totalLow, critical: totalCritical },
    });
  } catch (error) {
    console.error("Member risk profiles error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Single member risk detail
router.get("/member-risk-profiles/:memberId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberId = req.params.memberId as string;

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        status: true,
        balance: true,
      },
    });
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }

    const [riskScore, alerts, recentTransactions, loans] = await Promise.all([
      prisma.memberRiskScore.findUnique({ where: { memberId } }),
      prisma.fraudAlert.findMany({
        where: { memberId },
        select: { id: true, type: true, severity: true, description: true, resolved: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.transaction.findMany({
        where: { memberId },
        select: { id: true, txRef: true, type: true, amount: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.loan.findMany({
        where: { memberId },
        select: { loanRef: true, amount: true, outstandingBalance: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({ member, riskScore, alerts, recentTransactions, loans });
  } catch (error) {
    console.error("Member risk detail error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  TRANSFERS — transfer between members
// ═══════════════════════════════════════════════════════════════════

router.post("/transfer", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fromMemberId, toMemberId, amount, description } = req.body;

    if (!fromMemberId || !toMemberId || !amount || amount <= 0) {
      res.status(400).json({ error: "Source member, destination member, and positive amount are required" });
      return;
    }
    if (fromMemberId === toMemberId) {
      res.status(400).json({ error: "Cannot transfer to the same account" });
      return;
    }

    const [sender, receiver] = await Promise.all([
      prisma.member.findUnique({ where: { id: fromMemberId } }),
      prisma.member.findUnique({ where: { id: toMemberId } }),
    ]);

    if (!sender) { res.status(404).json({ error: "Sender member not found" }); return; }
    if (!receiver) { res.status(404).json({ error: "Receiver member not found" }); return; }
    if (sender.status === "SUSPENDED") { res.status(403).json({ error: "Sender account is suspended" }); return; }
    if (receiver.status === "SUSPENDED") { res.status(403).json({ error: "Receiver account is suspended" }); return; }
    if (sender.balance < amount) {
      res.status(400).json({ error: `Insufficient balance. Available: KES ${sender.balance.toLocaleString()}` });
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand1 = Math.random().toString(36).substring(2, 8).toUpperCase();
    const rand2 = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Withdrawal from sender
    const senderBalBefore = sender.balance;
    const senderBalAfter = senderBalBefore - amount;
    const withdrawalTx = await prisma.transaction.create({
      data: {
        txRef: `TRF-${dateStr}-${rand1}`,
        type: "WITHDRAWAL",
        amount,
        balanceBefore: senderBalBefore,
        balanceAfter: senderBalAfter,
        description: description || `Transfer to ${receiver.fullName} (${receiver.memberId})`,
        memberId: fromMemberId,
        processedById: req.user!.userId,
      },
    });

    // Deposit to receiver
    const receiverBalBefore = receiver.balance;
    const receiverBalAfter = receiverBalBefore + amount;
    const depositTx = await prisma.transaction.create({
      data: {
        txRef: `TRF-${dateStr}-${rand2}`,
        type: "DEPOSIT",
        amount,
        balanceBefore: receiverBalBefore,
        balanceAfter: receiverBalAfter,
        description: description || `Transfer from ${sender.fullName} (${sender.memberId})`,
        memberId: toMemberId,
        processedById: req.user!.userId,
      },
    });

    // Update balances
    await Promise.all([
      prisma.member.update({ where: { id: fromMemberId }, data: { balance: senderBalAfter } }),
      prisma.member.update({ where: { id: toMemberId }, data: { balance: receiverBalAfter } }),
    ]);

    // Run fraud checks on both
    const fraudResult = await runFraudCheck(fromMemberId, withdrawalTx.id, "WITHDRAWAL", amount);

    await prisma.auditLog.create({
      data: {
        action: "PROCESS_TRANSFER",
        entity: "Transaction",
        entityId: withdrawalTx.id,
        details: `Transfer KES ${amount} from ${sender.memberId} to ${receiver.memberId}`,
        userId: req.user!.userId,
        ipAddress: req.ip ?? null,
      },
    });

    res.status(201).json({
      message: `Transfer of KES ${amount.toLocaleString()} completed successfully`,
      withdrawal: withdrawalTx,
      deposit: depositTx,
      senderBalance: senderBalAfter,
      receiverBalance: receiverBalAfter,
      fraudCheck: fraudResult,
    });
  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
