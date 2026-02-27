import { Router, type Response, type Router as RouterType } from "express";
import { type AuthRequest, authenticate, authorize } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router: RouterType = Router();

// All auditor routes require AUDITOR or ADMIN role
router.use(authenticate, authorize("AUDITOR", "ADMIN"));

// ─── Helper: log auditor action ───────────────────────────────────────────
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

// ─── 1. AUDIT REVIEWS ─────────────────────────────────────────────────────

// GET /audit-reviews — list with filters
router.get("/audit-reviews", async (req: AuthRequest, res: Response) => {
  try {
    const { status, category, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [reviews, total] = await Promise.all([
      prisma.auditReview.findMany({
        where,
        include: { reviewer: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditReview.count({ where }),
    ]);
    res.json({ reviews, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /audit-reviews — create new review
router.post("/audit-reviews", async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, riskLevel } = req.body;
    const count = await prisma.auditReview.count();
    const reviewRef = `AUD-${String(count + 1).padStart(4, "0")}`;

    const review = await prisma.auditReview.create({
      data: {
        reviewRef,
        title,
        description,
        category: category || "FINANCIAL",
        riskLevel: riskLevel || "MEDIUM",
        reviewerId: req.user!.userId,
      },
    });

    await logAction(req.user!.userId, "CREATE_AUDIT_REVIEW", "AuditReview", review.id, `Created review ${reviewRef}`, req.ip);
    res.status(201).json(review);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /audit-reviews/:id — update review (status, findings, recommendations)
router.patch("/audit-reviews/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, findings, recommendations, riskLevel } = req.body;
    const data: any = {};
    if (status) data.status = status;
    if (findings !== undefined) data.findings = findings;
    if (recommendations !== undefined) data.recommendations = recommendations;
    if (riskLevel) data.riskLevel = riskLevel;

    const review = await prisma.auditReview.update({ where: { id }, data });
    await logAction(req.user!.userId, "UPDATE_AUDIT_REVIEW", "AuditReview", id, `Updated: ${JSON.stringify(data)}`, req.ip);
    res.json(review);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 2. COMPLIANCE CHECKS ─────────────────────────────────────────────────
// GET /compliance — overview stats
router.get("/compliance", async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const [totalMembers, flaggedMembers, activeMembers, suspendedMembers,
           totalTransactions, flaggedTransactions, totalAlerts, unresolvedAlerts,
           policies, enabledPolicies, recentLogins, kycExpired] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { status: "FLAGGED" } }),
      prisma.member.count({ where: { status: "ACTIVE" } }),
      prisma.member.count({ where: { status: "SUSPENDED" } }),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: "FLAGGED" } }),
      prisma.fraudAlert.count(),
      prisma.fraudAlert.count({ where: { resolved: false } }),
      prisma.riskPolicy.count(),
      prisma.riskPolicy.count({ where: { enabled: true } }),
      prisma.user.count({ where: { lastLogin: { gte: thirtyDaysAgo } } }),
      prisma.member.count({ where: { status: "INACTIVE" } }),
    ]);

    const complianceScore = totalMembers > 0
      ? Math.round(((activeMembers / totalMembers) * 40) +
                    ((flaggedTransactions === 0 ? 1 : 1 - flaggedTransactions / Math.max(totalTransactions, 1)) * 30) +
                    ((enabledPolicies / Math.max(policies, 1)) * 30))
      : 100;

    res.json({
      complianceScore,
      totalMembers,
      flaggedMembers,
      activeMembers,
      suspendedMembers,
      totalTransactions,
      flaggedTransactions,
      totalAlerts,
      unresolvedAlerts,
      policies,
      enabledPolicies,
      recentLogins,
      kycExpired,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 3. FRAUD REPORTS (read-only for auditors) ────────────────────────────
// GET /fraud-reports — paginated list of fraud alerts with details
router.get("/fraud-reports", async (req: AuthRequest, res: Response) => {
  try {
    const { severity, resolved, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (severity) where.severity = severity;
    if (resolved !== undefined) where.resolved = resolved === "true";

    const [alerts, total] = await Promise.all([
      prisma.fraudAlert.findMany({
        where,
        include: {
          member: { select: { memberId: true, fullName: true } },
          transaction: { select: { txRef: true, type: true, amount: true } },
          resolvedBy: { select: { firstName: true, lastName: true } },
          case: { select: { id: true, caseRef: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.fraudAlert.count({ where }),
    ]);

    // Severity breakdown
    const severityBreakdown = await prisma.fraudAlert.groupBy({
      by: ["severity"],
      _count: { id: true },
    });

    res.json({
      alerts,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      severityBreakdown: severityBreakdown.reduce((acc: any, s) => {
        acc[s.severity] = s._count.id;
        return acc;
      }, {}),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 4. INVESTIGATIONS (read-only for auditors) ──────────────────────────
// GET /investigations — list case investigations
router.get("/investigations", async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [cases, total] = await Promise.all([
      prisma.caseInvestigation.findMany({
        where,
        include: {
          assignedTo: { select: { firstName: true, lastName: true, role: true } },
          alert: { select: { id: true, type: true, severity: true, description: true, member: { select: { memberId: true, fullName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.caseInvestigation.count({ where }),
    ]);

    res.json({ cases, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 5. AUDIT TRAIL ──────────────────────────────────────────────────────
// GET /audit-trail — browse all audit logs (system-wide for auditors)
router.get("/audit-trail", async (req: AuthRequest, res: Response) => {
  try {
    const { action, entity, userId, page = "1", limit = "50" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (action) where.action = { contains: action, mode: "insensitive" };
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, role: true, nationalId: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Entity breakdown for filtering
    const entities = await prisma.auditLog.groupBy({
      by: ["entity"],
      _count: { id: true },
    });

    res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      entities: entities.map((e) => ({ name: e.entity, count: e._count.id })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 6. COMPLIANCE REPORTS ───────────────────────────────────────────────
// GET /compliance-reports — list compliance reports
router.get("/compliance-reports", async (req: AuthRequest, res: Response) => {
  try {
    const { status, category, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [reports, total] = await Promise.all([
      prisma.complianceReport.findMany({
        where,
        include: { generatedBy: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.complianceReport.count({ where }),
    ]);
    res.json({ reports, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /compliance-reports — create a new report
router.post("/compliance-reports", async (req: AuthRequest, res: Response) => {
  try {
    const { title, category, period, summary, content } = req.body;
    const count = await prisma.complianceReport.count();
    const reportRef = `CR-${String(count + 1).padStart(4, "0")}`;

    const report = await prisma.complianceReport.create({
      data: {
        reportRef,
        title,
        category: category || "General",
        period: period || new Date().toISOString().slice(0, 7),
        summary,
        content,
        generatedById: req.user!.userId,
      },
    });

    await logAction(req.user!.userId, "CREATE_COMPLIANCE_REPORT", "ComplianceReport", report.id, `Created report ${reportRef}`, req.ip);
    res.status(201).json(report);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /compliance-reports/:id — update (publish, etc.)
router.patch("/compliance-reports/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, summary, content, status } = req.body;
    const data: any = {};
    if (title) data.title = title;
    if (summary !== undefined) data.summary = summary;
    if (content !== undefined) data.content = content;
    if (status) data.status = status;

    const report = await prisma.complianceReport.update({ where: { id }, data });
    await logAction(req.user!.userId, "UPDATE_COMPLIANCE_REPORT", "ComplianceReport", id, `Updated compliance report`, req.ip);
    res.json(report);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 7. EXPORT DATA ─────────────────────────────────────────────────────
// GET /export/:entity — export CSV data
router.get("/export/:entity", async (req: AuthRequest, res: Response) => {
  try {
    const entity = req.params.entity as string;
    let data: any[] = [];
    let headers: string[] = [];

    switch (entity) {
      case "audit-reviews": {
        const reviews = await prisma.auditReview.findMany({
          include: { reviewer: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        });
        headers = ["Review Ref", "Title", "Category", "Status", "Risk Level", "Reviewer", "Findings", "Created At"];
        data = reviews.map((r) => [
          r.reviewRef, r.title, r.category, r.status, r.riskLevel,
          `${r.reviewer.firstName} ${r.reviewer.lastName}`,
          (r.findings || "").replace(/,/g, ";"),
          r.createdAt.toISOString(),
        ]);
        break;
      }
      case "fraud-alerts": {
        const alerts = await prisma.fraudAlert.findMany({
          include: {
            member: { select: { memberId: true, fullName: true } },
            transaction: { select: { txRef: true, amount: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        headers = ["Type", "Severity", "Description", "Member ID", "Member Name", "Transaction", "Amount", "Resolved", "Created At"];
        data = alerts.map((a) => [
          a.type, a.severity, a.description.replace(/,/g, ";"),
          a.member?.memberId || "", a.member?.fullName || "",
          a.transaction?.txRef || "", a.transaction?.amount?.toString() || "",
          a.resolved ? "Yes" : "No", a.createdAt.toISOString(),
        ]);
        break;
      }
      case "transactions": {
        const txns = await prisma.transaction.findMany({
          include: { member: { select: { memberId: true, fullName: true } } },
          orderBy: { createdAt: "desc" },
          take: 5000,
        });
        headers = ["TX Ref", "Type", "Amount", "Status", "Member ID", "Member Name", "Balance Before", "Balance After", "Created At"];
        data = txns.map((t) => [
          t.txRef, t.type, t.amount.toString(), t.status,
          t.member.memberId, t.member.fullName,
          t.balanceBefore.toString(), t.balanceAfter.toString(),
          t.createdAt.toISOString(),
        ]);
        break;
      }
      case "investigations": {
        const cases = await prisma.caseInvestigation.findMany({
          include: { assignedTo: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        });
        headers = ["Case Ref", "Title", "Status", "Priority", "Assigned To", "Findings", "Resolution", "Created At"];
        data = cases.map((c) => [
          c.caseRef, c.title, c.status, c.priority,
          `${c.assignedTo.firstName} ${c.assignedTo.lastName}`,
          (c.findings || "").replace(/,/g, ";"),
          (c.resolution || "").replace(/,/g, ";"),
          c.createdAt.toISOString(),
        ]);
        break;
      }
      case "audit-trail": {
        const logs = await prisma.auditLog.findMany({
          include: { user: { select: { firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 5000,
        });
        headers = ["Action", "Entity", "Entity ID", "Details", "User", "Role", "IP Address", "Created At"];
        data = logs.map((l) => [
          l.action, l.entity, l.entityId || "",
          (l.details || "").replace(/,/g, ";"),
          `${l.user.firstName} ${l.user.lastName}`, l.user.role,
          l.ipAddress || "", l.createdAt.toISOString(),
        ]);
        break;
      }
      case "compliance-reports": {
        const reports = await prisma.complianceReport.findMany({
          include: { generatedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        });
        headers = ["Report Ref", "Title", "Category", "Period", "Status", "Generated By", "Summary", "Created At"];
        data = reports.map((r) => [
          r.reportRef, r.title, r.category, r.period, r.status,
          `${r.generatedBy.firstName} ${r.generatedBy.lastName}`,
          r.summary.replace(/,/g, ";"),
          r.createdAt.toISOString(),
        ]);
        break;
      }
      case "members": {
        const members = await prisma.member.findMany({ orderBy: { createdAt: "desc" } });
        headers = ["Member ID", "Full Name", "Email", "Phone", "Status", "Balance", "Created At"];
        data = members.map((m) => [
          m.memberId, m.fullName, m.email, m.phoneNumber,
          m.status, m.balance.toString(), m.createdAt.toISOString(),
        ]);
        break;
      }
      default:
        res.status(400).json({ error: `Unknown entity: ${entity}` });
        return;
    }

    const csv = [headers.join(","), ...data.map((row) => row.map((c: string) => `"${c}"`).join(","))].join("\n");

    await logAction(req.user!.userId, "EXPORT_DATA", entity, undefined, `Exported ${data.length} rows`, req.ip);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${entity}-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 8. DASHBOARD STATS ─────────────────────────────────────────────────
// GET /stats — summary for auditor dashboard home
router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const prevThirtyDays = new Date(now.getTime() - 60 * 86400000);

    const [openReviews, openReviewsPrev, complianceReports, complianceReportsPrev,
           criticalAlerts, recentFindings, totalLogs] = await Promise.all([
      prisma.auditReview.count({ where: { status: { notIn: ["COMPLETED", "ARCHIVED"] } } }),
      prisma.auditReview.count({ where: { status: { notIn: ["COMPLETED", "ARCHIVED"] }, createdAt: { lt: thirtyDaysAgo, gte: prevThirtyDays } } }),
      prisma.complianceReport.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.complianceReport.count({ where: { createdAt: { gte: prevThirtyDays, lt: thirtyDaysAgo } } }),
      prisma.fraudAlert.count({ where: { severity: "CRITICAL", resolved: false } }),
      prisma.auditReview.count({ where: { findings: { not: null }, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.auditLog.count(),
    ]);

    // Compliance score (inline calculation)
    const [cTotalMembers, cActiveMembers, cTotalTx, cFlaggedTx, cPolicies, cEnabledPolicies] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { status: "ACTIVE" } }),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: "FLAGGED" } }),
      prisma.riskPolicy.count(),
      prisma.riskPolicy.count({ where: { enabled: true } }),
    ]);
    const complianceScore = cTotalMembers > 0
      ? Math.round(((cActiveMembers / cTotalMembers) * 40) +
                    ((cFlaggedTx === 0 ? 1 : 1 - cFlaggedTx / Math.max(cTotalTx, 1)) * 30) +
                    ((cEnabledPolicies / Math.max(cPolicies, 1)) * 30))
      : 100;

    // Recent reviews for dashboard
    const recentReviews = await prisma.auditReview.findMany({
      include: { reviewer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Risk findings breakdown
    const riskBreakdown = await prisma.fraudAlert.groupBy({
      by: ["severity"],
      where: { resolved: false },
      _count: { id: true },
    });

    res.json({
      openReviews,
      openReviewsChange: openReviews - openReviewsPrev,
      complianceScore,
      complianceReports,
      complianceReportsChange: complianceReports - complianceReportsPrev,
      criticalAlerts,
      recentFindings,
      totalLogs,
      recentReviews,
      riskBreakdown: riskBreakdown.reduce((acc: any, r) => {
        acc[r.severity] = r._count.id;
        return acc;
      }, {}),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── TRANSACTION MONITORING (read-only for auditors) ───────────────────────

// GET /transactions — list all transactions with filters (auditor read-only)
router.get("/transactions", async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const memberId = req.query.memberId as string | undefined;
    const search = req.query.search as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const minAmount = req.query.minAmount ? Number(req.query.minAmount) : undefined;
    const maxAmount = req.query.maxAmount ? Number(req.query.maxAmount) : undefined;

    const where: any = {};

    if (type && ["DEPOSIT", "WITHDRAWAL", "LOAN_DISBURSEMENT", "LOAN_REPAYMENT"].includes(type)) {
      where.type = type;
    }
    if (status && ["COMPLETED", "PENDING", "FAILED", "FLAGGED"].includes(status)) {
      where.status = status;
    }
    if (memberId) where.memberId = memberId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = minAmount;
      if (maxAmount !== undefined) where.amount.lte = maxAmount;
    }

    if (search) {
      where.OR = [
        { txRef: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { member: { fullName: { contains: search, mode: "insensitive" } } },
        { member: { memberId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: {
          id: true,
          txRef: true,
          type: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          description: true,
          status: true,
          createdAt: true,
          member: { select: { id: true, memberId: true, fullName: true, status: true } },
          processedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /transactions/stats — aggregate stats for auditor transaction monitoring
router.get("/transactions/stats", async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalTransactions,
      todayTransactions,
      flaggedTransactions,
      totalVolume,
      todayDeposits,
      todayWithdrawals,
      byType,
      byStatus,
      last30Days,
    ] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.count({ where: { createdAt: { gte: today } } }),
      prisma.transaction.count({ where: { status: "FLAGGED" } }),
      prisma.transaction.aggregate({ _sum: { amount: true } }),
      prisma.transaction.aggregate({
        where: { type: "DEPOSIT", createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: "WITHDRAWAL", createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.transaction.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    res.json({
      totalTransactions,
      todayTransactions,
      flaggedTransactions,
      totalVolume: totalVolume._sum.amount ?? 0,
      todayDeposits: todayDeposits._sum.amount ?? 0,
      todayWithdrawals: todayWithdrawals._sum.amount ?? 0,
      last30DaysCount: last30Days,
      byType: byType.reduce((acc: any, t) => {
        acc[t.type] = { count: t._count.id, volume: t._sum.amount ?? 0 };
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc: any, s) => {
        acc[s.status] = s._count.id;
        return acc;
      }, {}),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /transactions/:id — single transaction detail
router.get("/transactions/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            status: true,
            balance: true,
          },
        },
        processedBy: { select: { firstName: true, lastName: true, email: true } },
        loan: {
          select: {
            loanRef: true,
            amount: true,
            outstandingBalance: true,
            status: true,
          },
        },
        fraudAlerts: {
          select: {
            id: true,
            type: true,
            severity: true,
            description: true,
            resolved: true,
            createdAt: true,
          },
        },
      },
    });

    if (!transaction) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    await logAction(
      req.user!.userId,
      "VIEW_TRANSACTION",
      "Transaction",
      transaction.id,
      `Auditor viewed transaction ${transaction.txRef}`,
      req.ip
    );

    res.json(transaction);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
