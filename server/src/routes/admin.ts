import express, { type Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import {
  authenticate,
  authorize,
  type AuthRequest,
} from "../middleware/auth.js";
import {
  getAllJobStates,
  getJobState,
  serverStartedAt,
} from "../automation/automationState.js";
import { toggleJob, triggerJob, getJobNames } from "../automation/scheduler.js";
import { invalidateThresholdCache } from "../utils/configHelper.js";
import { runFraudCheck } from "../utils/fraudCheck.js";

const router: express.Router = express.Router();

/** Build a compact, dependency-free PDF for administrative data exports. */
function createExportPdf(title: string, data: Record<string, unknown>[]): Buffer {
  // Built-in PDF fonts use a single-byte encoding, so retain a valid document
  // when record values contain characters outside that encoding.
  const escapePdfText = (value: string) => value.replace(/[^\x20-\x7E]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stringify = (value: unknown) => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") return Object.values(value as Record<string, unknown>).join(" / ");
    return String(value);
  };
  const wrap = (line: string, maxLength = 104) =>
    line.match(new RegExp(`.{1,${maxLength}}(?:\\s|$)|\\S+?(?:\\s|$)`, "g"))?.map((part) => part.trim()) ?? [line];

  const headers = data.length ? Object.keys(data[0]) : [];
  const lines = [title, `Generated: ${new Date().toISOString()}`, `${data.length} record${data.length === 1 ? "" : "s"}`, "", headers.join(" | ")];
  for (const row of data) {
    lines.push(...wrap(headers.map((header) => stringify(row[header])).join(" | ")));
  }

  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 48) pages.push(lines.slice(index, index + 48));
  if (!pages.length) pages.push([title, "Generated: " + new Date().toISOString(), "0 records"]);

  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const pageIds = pages.map((_, index) => 3 + index * 2);
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const content = `BT\n/F1 9 Tf\n40 800 Td\n${page.map((line, lineIndex) => `${lineIndex ? "0 -15 Td\\n" : ""}(${escapePdfText(line)}) Tj`).join("\n")}\nET`;
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId - 1] = `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

// All admin routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/stats",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const [
        totalUsers,
        totalMembers,
        activeMembers,
        totalTransactions,
        totalFraudAlerts,
        unresolvedAlerts,
        totalLoans,
        activeLoans,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.member.count(),
        prisma.member.count({ where: { status: "ACTIVE" } }),
        prisma.transaction.count(),
        prisma.fraudAlert.count(),
        prisma.fraudAlert.count({ where: { resolved: false } }),
        prisma.loan.count(),
        prisma.loan.count({ where: { status: "ACTIVE" } }),
      ]);

      const flaggedTransactions = await prisma.transaction.count({
        where: { status: "FLAGGED" },
      });

      res.json({
        totalUsers,
        totalMembers,
        activeMembers,
        totalTransactions,
        flaggedTransactions,
        totalFraudAlerts,
        unresolvedAlerts,
        totalLoans,
        activeLoans,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/users",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 20;
      const skip = (page - 1) * limit;
      const search = (req.query.search as string)?.trim() || "";
      const role = req.query.role as string | undefined;

      const where: Record<string, unknown> = {};
      if (search) {
        where.OR = [
          { nationalId: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      if (role && ["ADMIN", "OFFICER", "AUDITOR"].includes(role)) {
        where.role = role;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            nationalId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("Admin list users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Toggle user active status
router.patch(
  "/users/:id/toggle-active",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (id === req.user!.userId) {
        res.status(400).json({ error: "Cannot deactivate your own account" });
        return;
      }
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive },
        select: { id: true, isActive: true, firstName: true, lastName: true },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: updated.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
          entity: "User",
          entityId: id,
          details: `${updated.firstName} ${updated.lastName} was ${updated.isActive ? "activated" : "deactivated"}`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: `User ${updated.isActive ? "activated" : "deactivated"}`, user: updated });
    } catch (error) {
      console.error("Toggle user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Change user role
router.patch(
  "/users/:id/role",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { role } = req.body;
      if (!["ADMIN", "OFFICER", "AUDITOR"].includes(role)) {
        res.status(400).json({ error: "Invalid role" });
        return;
      }
      if (id === req.user!.userId) {
        res.status(400).json({ error: "Cannot change your own role" });
        return;
      }
      const updated = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, role: true, firstName: true, lastName: true },
      });

      await prisma.auditLog.create({
        data: {
          action: "ROLE_CHANGED",
          entity: "User",
          entityId: id,
          details: `${updated.firstName} ${updated.lastName} role changed to ${role}`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: "Role updated", user: updated });
    } catch (error) {
      console.error("Change role error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  FRAUD ALERTS
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/fraud-alerts",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 20;
      const skip = (page - 1) * limit;
      const severity = req.query.severity as string | undefined;
      const resolved = req.query.resolved as string | undefined;
      const institutionId = req.query.institutionId as string | undefined;

      const where: Record<string, unknown> = {};
      if (severity && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
        where.severity = severity;
      }
      if (resolved === "true") where.resolved = true;
      if (resolved === "false") where.resolved = false;
      if (institutionId) {
        where.transaction = { OR: [{ sourceInstitutionId: institutionId }, { destinationInstitutionId: institutionId }] };
      }

      const [alerts, total] = await Promise.all([
        prisma.fraudAlert.findMany({
          where,
          include: {
            member: { select: { memberId: true, fullName: true } },
            transaction: { select: { txRef: true, amount: true, type: true } },
            resolvedBy: { select: { firstName: true, lastName: true } },
            case: { include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.fraudAlert.count({ where }),
      ]);

      res.json({
        alerts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("Fraud alerts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Resolve a fraud alert
router.patch(
  "/fraud-alerts/:id/resolve",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const alert = await prisma.fraudAlert.findUnique({ where: { id } });
      if (!alert) {
        res.status(404).json({ error: "Alert not found" });
        return;
      }
      if (alert.resolved) {
        res.status(400).json({ error: "Alert already resolved" });
        return;
      }
      const updated = await prisma.fraudAlert.update({
        where: { id },
        data: {
          resolved: true,
          resolvedById: req.user!.userId,
          resolvedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "FRAUD_ALERT_RESOLVED",
          entity: "FraudAlert",
          entityId: id,
          details: `Alert "${alert.type}" resolved`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: "Alert resolved", alert: updated });
    } catch (error) {
      console.error("Resolve alert error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/audit-logs",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 30;
      const skip = (page - 1) * limit;
      const action = req.query.action as string | undefined;

      const where: Record<string, unknown> = {};
      if (action) where.action = { contains: action, mode: "insensitive" };

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("Audit logs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/analytics",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Transactions by type
      const txByType = await prisma.transaction.groupBy({
        by: ["type"],
        _count: true,
        _sum: { amount: true },
      });

      // Fraud alerts by severity
      const alertsBySeverity = await prisma.fraudAlert.groupBy({
        by: ["severity"],
        _count: true,
      });

      // Members by status
      const membersByStatus = await prisma.member.groupBy({
        by: ["status"],
        _count: true,
      });

      // Recent 30-day daily transaction count
      const recentTx = await prisma.transaction.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, amount: true, type: true },
        orderBy: { createdAt: "asc" },
      });

      // Build daily aggregation
      const dailyMap: Record<string, { count: number; amount: number }> = {};
      for (const tx of recentTx) {
        const day = tx.createdAt.toISOString().slice(0, 10);
        if (!dailyMap[day]) dailyMap[day] = { count: 0, amount: 0 };
        dailyMap[day].count++;
        dailyMap[day].amount += tx.amount;
      }
      const dailyTransactions = Object.entries(dailyMap).map(([date, data]) => ({
        date,
        ...data,
      }));

      // Fraud alerts over last 30 days
      const recentAlerts = await prisma.fraudAlert.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, severity: true },
        orderBy: { createdAt: "asc" },
      });

      const dailyAlertMap: Record<string, number> = {};
      for (const a of recentAlerts) {
        const day = a.createdAt.toISOString().slice(0, 10);
        dailyAlertMap[day] = (dailyAlertMap[day] || 0) + 1;
      }
      const dailyAlerts = Object.entries(dailyAlertMap).map(([date, count]) => ({
        date,
        count,
      }));

      // Total volume
      const totalVolume = await prisma.transaction.aggregate({
        _sum: { amount: true },
      });

      res.json({
        txByType,
        alertsBySeverity,
        membersByStatus,
        dailyTransactions,
        dailyAlerts,
        totalVolume: totalVolume._sum.amount || 0,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  RISK POLICIES
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/risk-policies",
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const policies = await prisma.riskPolicy.findMany({
        orderBy: { createdAt: "asc" },
      });
      res.json({ policies });
    } catch (error) {
      console.error("Risk policies error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/risk-policies",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, description, enabled, threshold, severity } = req.body;
      if (!name || !description) {
        res.status(400).json({ error: "Name and description are required" });
        return;
      }
      const policy = await prisma.riskPolicy.create({
        data: { name, description, enabled: enabled ?? true, threshold, severity: severity || "MEDIUM" },
      });

      await prisma.auditLog.create({
        data: {
          action: "RISK_POLICY_CREATED",
          entity: "RiskPolicy",
          entityId: policy.id,
          details: `Policy "${name}" created`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.status(201).json({ message: "Policy created", policy });
    } catch (error) {
      console.error("Create policy error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/risk-policies/:id",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { name, description, enabled, threshold, severity } = req.body;

      const policy = await prisma.riskPolicy.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(enabled !== undefined && { enabled }),
          ...(threshold !== undefined && { threshold }),
          ...(severity !== undefined && { severity }),
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "RISK_POLICY_UPDATED",
          entity: "RiskPolicy",
          entityId: id,
          details: `Policy "${policy.name}" updated`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: "Policy updated", policy });
    } catch (error) {
      console.error("Update policy error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/risk-policies/:id",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const policy = await prisma.riskPolicy.findUnique({ where: { id } });
      if (!policy) { res.status(404).json({ error: "Policy not found" }); return; }

      await prisma.riskPolicy.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          action: "RISK_POLICY_DELETED",
          entity: "RiskPolicy",
          entityId: id,
          details: `Policy "${policy.name}" deleted`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: "Policy deleted" });
    } catch (error) {
      console.error("Delete policy error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  SYSTEM CONFIG
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/system-config",
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const configs = await prisma.systemConfig.findMany({
        orderBy: { group: "asc" },
      });
      res.json({ configs });
    } catch (error) {
      console.error("System config error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.put(
  "/system-config",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { configs } = req.body as { configs: { key: string; value: string }[] };
      if (!configs || !Array.isArray(configs)) {
        res.status(400).json({ error: "configs array required" });
        return;
      }

      for (const cfg of configs) {
        await prisma.systemConfig.upsert({
          where: { key: cfg.key },
          update: { value: cfg.value },
          create: { key: cfg.key, value: cfg.value, label: cfg.key, group: "general" },
        });
      }

      await prisma.auditLog.create({
        data: {
          action: "SYSTEM_CONFIG_UPDATED",
          entity: "SystemConfig",
          details: `Updated ${configs.length} config(s)`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      invalidateThresholdCache();
      res.json({ message: "Configuration updated" });
    } catch (error) {
      console.error("Update config error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  NOTIFICATIONS — moved to /api/notifications (accessible by all roles)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
//  DATA EXPORTS
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/export/:entity",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { entity } = req.params;
      const format = (req.query.format as string) || "pdf";

      let data: unknown[] = [];
      let filename = "";

      switch (entity) {
        case "users":
          data = await prisma.user.findMany({
            select: {
              nationalId: true, email: true, firstName: true, lastName: true,
              role: true, isActive: true, lastLogin: true, createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          });
          filename = "users";
          break;
        case "members":
          data = await prisma.member.findMany({
            select: {
              memberId: true, fullName: true, email: true, phoneNumber: true,
              status: true, balance: true, createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          });
          filename = "members";
          break;
        case "transactions":
          data = await prisma.transaction.findMany({
            select: {
              txRef: true, type: true, amount: true, balanceBefore: true,
              balanceAfter: true, status: true, description: true, createdAt: true,
              member: { select: { memberId: true, fullName: true } },
            },
            orderBy: { createdAt: "desc" },
          });
          filename = "transactions";
          break;
        case "fraud-alerts":
          data = await prisma.fraudAlert.findMany({
            select: {
              type: true, severity: true, description: true, resolved: true,
              createdAt: true, member: { select: { memberId: true, fullName: true } },
            },
            orderBy: { createdAt: "desc" },
          });
          filename = "fraud-alerts";
          break;
        case "audit-logs":
          data = await prisma.auditLog.findMany({
            select: {
              action: true, entity: true, entityId: true, details: true,
              ipAddress: true, createdAt: true,
              user: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
          });
          filename = "audit-logs";
          break;
        case "loans":
          data = await prisma.loan.findMany({
            select: {
              loanRef: true, amount: true, interestRate: true, termMonths: true,
              monthlyPayment: true, totalRepaid: true, outstandingBalance: true,
              status: true, purpose: true, createdAt: true,
              member: { select: { memberId: true, fullName: true } },
            },
            orderBy: { createdAt: "desc" },
          });
          filename = "loans";
          break;
        default:
          res.status(400).json({ error: "Invalid entity" });
          return;
      }

      await prisma.auditLog.create({
        data: {
          action: "DATA_EXPORTED",
          entity: entity,
          details: `Exported ${data.length} ${entity} records as ${format}`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      if (format === "json") {
        res.json({ data, count: data.length });
        return;
      }

      if (format !== "pdf") {
        res.status(400).json({ error: "Only PDF exports are supported" });
        return;
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}-export-${new Date().toISOString().slice(0, 10)}.pdf`);
      res.send(createExportPdf(`${filename.replace(/-/g, " ").toUpperCase()} EXPORT`, data as Record<string, unknown>[]));
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  AUTOMATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

// GET /automation/status — get all job states + server uptime
router.get(
  "/automation/status",
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const jobs = getAllJobStates();
      const uptimeMs = Date.now() - serverStartedAt.getTime();
      res.json({
        serverStartedAt: serverStartedAt.toISOString(),
        uptimeMs,
        uptimeFormatted: formatUptime(uptimeMs),
        jobs,
      });
    } catch (error) {
      console.error("Automation status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /automation/jobs/:name/trigger — manually trigger a job
router.post(
  "/automation/jobs/:name/trigger",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const jobName = req.params.name as string;
      const validJobs = getJobNames();
      if (!validJobs.includes(jobName)) {
        res.status(404).json({ error: `Unknown job: ${jobName}` });
        return;
      }

      const result = await triggerJob(jobName);

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: "MANUAL_TRIGGER_JOB",
          entity: "AutomationJob",
          entityId: jobName,
          details: `Manually triggered by admin — Result: ${result}`,
          userId: req.user!.userId,
          ipAddress: req.ip,
        },
      });

      const state = getJobState(jobName);
      res.json({ message: `Job ${jobName} triggered successfully`, result, state });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to trigger job" });
    }
  }
);

// PATCH /automation/jobs/:name/toggle — enable or disable a job
router.patch(
  "/automation/jobs/:name/toggle",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const jobName = req.params.name as string;
      const { enabled } = req.body;
      const validJobs = getJobNames();

      if (!validJobs.includes(jobName)) {
        res.status(404).json({ error: `Unknown job: ${jobName}` });
        return;
      }

      if (typeof enabled !== "boolean") {
        res.status(400).json({ error: "enabled (boolean) is required" });
        return;
      }

      toggleJob(jobName, enabled);

      await prisma.auditLog.create({
        data: {
          action: enabled ? "ENABLE_JOB" : "DISABLE_JOB",
          entity: "AutomationJob",
          entityId: jobName,
          details: `Job ${enabled ? "enabled" : "disabled"} by admin`,
          userId: req.user!.userId,
          ipAddress: req.ip,
        },
      });

      const state = getJobState(jobName);
      res.json({ message: `Job ${jobName} ${enabled ? "enabled" : "disabled"}`, state });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to toggle job" });
    }
  }
);

// GET /automation/logs — recent automation audit logs
router.get(
  "/automation/logs",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 20;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            action: {
              in: [
                "AUTO_FRAUD_RULE_SCAN",
                "AUTO_RISK_SCORE_CALC",
                "AUTO_DECISION_EVAL",
                "AUTO_ALERT_DIGEST",
                "AUTO_LOAN_MONITORING",
                "MANUAL_TRIGGER_JOB",
                "ENABLE_JOB",
                "DISABLE_JOB",
              ],
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({
          where: {
            action: {
              in: [
                "AUTO_FRAUD_RULE_SCAN",
                "AUTO_RISK_SCORE_CALC",
                "AUTO_DECISION_EVAL",
                "AUTO_ALERT_DIGEST",
                "AUTO_LOAN_MONITORING",
                "MANUAL_TRIGGER_JOB",
                "ENABLE_JOB",
                "DISABLE_JOB",
              ],
            },
          },
        }),
      ]);

      res.json({
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("Automation logs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  CREATE USER (Admin creates new users)
// ═══════════════════════════════════════════════════════════════════
router.post(
  "/users",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { nationalId, email, firstName, lastName, role, password } = req.body;
      if (!nationalId || !email || !firstName || !lastName || !password) {
        res.status(400).json({ error: "nationalId, email, firstName, lastName, and password are required" });
        return;
      }
      if (role && !["ADMIN", "OFFICER", "AUDITOR"].includes(role)) {
        res.status(400).json({ error: "Invalid role" });
        return;
      }
      const existing = await prisma.user.findFirst({
        where: { OR: [{ nationalId }, { email }] },
      });
      if (existing) {
        res.status(409).json({ error: "A user with that national ID or email already exists" });
        return;
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          nationalId,
          email,
          firstName,
          lastName,
          role: role || "OFFICER",
          password: hashedPassword,
          createdById: req.user!.userId,
        },
        select: { id: true, nationalId: true, email: true, firstName: true, lastName: true, role: true },
      });

      await prisma.auditLog.create({
        data: {
          action: "USER_CREATED",
          entity: "User",
          entityId: user.id,
          details: `Created user ${firstName} ${lastName} (${role || "OFFICER"})`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.status(201).json({ message: "User created", user });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  RESET USER PASSWORD (Admin resets a user's password)
// ═══════════════════════════════════════════════════════════════════
router.patch(
  "/users/:id/reset-password",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) { res.status(404).json({ error: "User not found" }); return; }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id }, data: { password: hashedPassword } });

      await prisma.auditLog.create({
        data: {
          action: "PASSWORD_RESET_BY_ADMIN",
          entity: "User",
          entityId: id,
          details: `Password reset for ${user.firstName} ${user.lastName}`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  USER LOGIN HISTORY
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/users/:id/login-history",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true, lastLogin: true, createdAt: true },
      });
      if (!user) { res.status(404).json({ error: "User not found" }); return; }

      const loginLogs = await prisma.auditLog.findMany({
        where: {
          userId: id,
          action: { in: ["LOGIN", "LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT"] },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { action: true, ipAddress: true, createdAt: true, details: true },
      });

      res.json({ user, loginHistory: loginLogs });
    } catch (error) {
      console.error("Login history error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  SACCO / CHAMA MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/saccos",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 20;
      const skip = (page - 1) * limit;
      const search = (req.query.search as string)?.trim() || "";

      const where: Record<string, unknown> = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { registrationNumber: { contains: search, mode: "insensitive" } },
          { institutionId: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ];
      }

      const [saccos, total] = await Promise.all([
        prisma.sacco.findMany({
          where,
          include: {
            assignedOfficer: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.sacco.count({ where }),
      ]);

      res.json({
        saccos,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("List SACCOs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/saccos",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, registrationNumber, location, assignedOfficerId } = req.body;
      if (!name || !registrationNumber || !location) {
        res.status(400).json({ error: "name, registrationNumber, and location are required" });
        return;
      }

      const existing = await prisma.sacco.findFirst({
        where: { OR: [{ name }, { registrationNumber }] },
      });
      if (existing) {
        res.status(409).json({ error: "A SACCO with that name or registration number already exists" });
        return;
      }

      const sacco = await prisma.sacco.create({
        data: { name, registrationNumber, location, assignedOfficerId: assignedOfficerId || null },
        include: { assignedOfficer: { select: { id: true, firstName: true, lastName: true } } },
      });

      await prisma.auditLog.create({
        data: {
          action: "SACCO_CREATED",
          entity: "Sacco",
          entityId: sacco.id,
          details: `SACCO "${name}" registered with institution ID ${sacco.institutionId}`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.status(201).json({ message: "SACCO registered", sacco });
    } catch (error) {
      console.error("Create SACCO error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/saccos/:id",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { name, registrationNumber, location, totalMembers, status, assignedOfficerId } = req.body;

      const sacco = await prisma.sacco.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(registrationNumber !== undefined && { registrationNumber }),
          ...(location !== undefined && { location }),
          ...(totalMembers !== undefined && { totalMembers }),
          ...(status !== undefined && { status }),
          ...(assignedOfficerId !== undefined && { assignedOfficerId: assignedOfficerId || null }),
        },
        include: { assignedOfficer: { select: { id: true, firstName: true, lastName: true } } },
      });

      await prisma.auditLog.create({
        data: {
          action: "SACCO_UPDATED",
          entity: "Sacco",
          entityId: id,
          details: `SACCO "${sacco.name}" updated`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: "SACCO updated", sacco });
    } catch (error) {
      console.error("Update SACCO error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/saccos/:id/toggle-status",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const sacco = await prisma.sacco.findUnique({ where: { id } });
      if (!sacco) { res.status(404).json({ error: "SACCO not found" }); return; }

      const newStatus = sacco.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const updated = await prisma.sacco.update({ where: { id }, data: { status: newStatus } });

      await prisma.auditLog.create({
        data: {
          action: newStatus === "ACTIVE" ? "SACCO_ACTIVATED" : "SACCO_SUSPENDED",
          entity: "Sacco",
          entityId: id,
          details: `SACCO "${sacco.name}" ${newStatus.toLowerCase()}`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: `SACCO ${newStatus.toLowerCase()}`, sacco: updated });
    } catch (error) {
      console.error("Toggle SACCO status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Permanently delete an unused user account. Operational records are retained;
// users with linked records must be deactivated instead.
router.delete(
  "/users/:id",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;

      if (id === req.user!.userId) {
        res.status(400).json({ error: "You cannot delete your own account" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (user.role === "ADMIN") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
        if (adminCount <= 1) {
          res.status(400).json({ error: "The last active administrator cannot be deleted" });
          return;
        }
      }

      try {
        await prisma.user.delete({ where: { id } });
      } catch (error: unknown) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
          res.status(409).json({ error: "This user has associated operational records and must be deactivated instead" });
          return;
        }
        throw error;
      }

      await prisma.auditLog.create({
        data: {
          action: "USER_DELETED",
          entity: "User",
          entityId: id,
          details: `Deleted user ${user.firstName} ${user.lastName} (${user.email})`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Run a safe, repeatable presentation scenario: three rapid Stima → Kirobon transfers.
router.post("/demo-scenario", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [source, destination] = await Promise.all([
      prisma.member.findUnique({ where: { memberId: "STIMA-DEMO-001" } }),
      prisma.member.findUnique({ where: { memberId: "KIROBON-DEMO-001" } }),
    ]);
    if (!source || !destination || !source.institutionId || !destination.institutionId) {
      res.status(400).json({ error: "Demo accounts have not been seeded" }); return;
    }
    const amount = 5000;
    if (source.balance < amount * 3) { res.status(400).json({ error: "Reset the demo data before running this scenario again" }); return; }
    const results = [];
    for (let i = 1; i <= 3; i++) {
      const suffix = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const [debit] = await prisma.$transaction([
        prisma.transaction.create({ data: {
          txRef: `DEMO-WTH-${suffix}`, type: "WITHDRAWAL", amount,
          balanceBefore: source.balance - amount * (i - 1), balanceAfter: source.balance - amount * i,
          description: `Presentation demo transfer ${i}/3: Stima Sacco → Kirobon Chamaa Group`,
          memberId: source.id, processedById: req.user!.userId,
          sourceInstitutionId: source.institutionId, destinationInstitutionId: destination.institutionId,
        } }),
        prisma.transaction.create({ data: {
          txRef: `DEMO-DEP-${suffix}`, type: "DEPOSIT", amount,
          balanceBefore: destination.balance + amount * (i - 1), balanceAfter: destination.balance + amount * i,
          description: `Presentation demo transfer ${i}/3: Stima Sacco → Kirobon Chamaa Group`,
          memberId: destination.id, processedById: req.user!.userId,
          sourceInstitutionId: source.institutionId, destinationInstitutionId: destination.institutionId,
        } }),
        prisma.member.update({ where: { id: source.id }, data: { balance: source.balance - amount * i } }),
        prisma.member.update({ where: { id: destination.id }, data: { balance: destination.balance + amount * i } }),
      ]);
      results.push(await runFraudCheck(source.id, debit.id, "WITHDRAWAL", amount));
    }
    const triggered = results.flatMap((result) => result.alerts).filter((alert) => alert.type === "CROSS_INSTITUTION_VELOCITY");
    await prisma.auditLog.create({ data: { action: "DEMO_SCENARIO_RUN", entity: "Transaction", details: "Three rapid Stima Sacco → Kirobon Chamaa Group transfers executed", userId: req.user!.userId, ipAddress: req.ip || req.socket.remoteAddress } });
    res.json({ message: "Demo scenario complete", transfers: 3, totalAmount: amount * 3, alerts: triggered });
  } catch (error) { console.error("Demo scenario error:", error); res.status(500).json({ error: "Unable to run demo scenario" }); }
});

router.post("/fraud-alerts/:id/investigate", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { action, notes, evidence, assignedToId } = req.body;
    const alert = await prisma.fraudAlert.findUnique({ where: { id } });
    if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }
    const investigatorId = assignedToId || req.user!.userId;
    const investigator = await prisma.user.findUnique({ where: { id: investigatorId }, select: { id: true } });
    if (!investigator) { res.status(400).json({ error: "Assigned investigator not found" }); return; }
    const status = action === "ESCALATED" ? "ESCALATED" : action === "RESOLVED" ? "CLOSED" : "IN_PROGRESS";
    const existingCase = await prisma.caseInvestigation.findUnique({ where: { alertId: id } });
    const investigation = existingCase
      ? await prisma.caseInvestigation.update({ where: { id: existingCase.id }, data: { status, assignedToId: investigatorId, findings: notes || existingCase.findings, resolution: action === "RESOLVED" ? (notes || "Resolved after investigation") : existingCase.resolution } })
      : await prisma.caseInvestigation.create({ data: { caseRef: `CASE-${Date.now()}`, title: `Fraud alert: ${alert.type}`, description: alert.description, priority: alert.severity, alertId: id, assignedToId: investigatorId, status, findings: notes || null, resolution: action === "RESOLVED" ? (notes || "Resolved after investigation") : null } });
    if (action === "RESOLVED" && !alert.resolved) await prisma.fraudAlert.update({ where: { id }, data: { resolved: true, resolvedById: req.user!.userId, resolvedAt: new Date() } });
    const investigationAction = action === "ESCALATED" ? "FRAUD_ALERT_ESCALATED" : action === "RESOLVED" ? "FRAUD_ALERT_RESOLVED" : "FRAUD_ALERT_REVIEWED";
    await prisma.auditLog.create({ data: { action: investigationAction, entity: "FraudAlert", entityId: id, details: `Investigation ${action || "REVIEWED"}. Notes: ${notes || "None"}. Evidence: ${evidence || "None"}`, userId: req.user!.userId, ipAddress: req.ip || req.socket.remoteAddress } });
    res.json({ message: `Investigation ${status.toLowerCase()} and audit logged`, investigation });
  } catch (error) { console.error("Investigate alert error:", error); res.status(500).json({ error: "Unable to save investigation" }); }
});

router.get(
  "/chamas",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 20;
      const skip = (page - 1) * limit;
      const search = (req.query.search as string)?.trim() || "";
      const where = search
        ? { OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { registrationNumber: { contains: search, mode: "insensitive" as const } },
            { institutionId: { contains: search, mode: "insensitive" as const } },
          ] }
        : {};
      const [chamas, total] = await Promise.all([
        prisma.chama.findMany({
          where,
          include: { assignedOfficer: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" }, skip, take: limit,
        }),
        prisma.chama.count({ where }),
      ]);
      res.json({ chamas, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
      console.error("List chamas error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/chamas",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, registrationNumber, location, assignedOfficerId } = req.body;
      if (!name || !registrationNumber || !location) {
        res.status(400).json({ error: "name, registrationNumber, and location are required" });
        return;
      }
      const existing = await prisma.chama.findFirst({ where: { OR: [{ name }, { registrationNumber }] } });
      if (existing) {
        res.status(409).json({ error: "A chama with that name or registration number already exists" });
        return;
      }
      const chama = await prisma.chama.create({
        data: { name, registrationNumber, location, assignedOfficerId: assignedOfficerId || null },
        include: { assignedOfficer: { select: { id: true, firstName: true, lastName: true } } },
      });
      await prisma.auditLog.create({ data: {
        action: "CHAMA_CREATED", entity: "Chama", entityId: chama.id,
        details: `Chama "${name}" registered with institution ID ${chama.institutionId}`,
        userId: req.user!.userId, ipAddress: req.ip || req.socket.remoteAddress,
      } });
      res.status(201).json({ message: "Chama registered", chama });
    } catch (error) {
      console.error("Create chama error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  BLACKLIST MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/blacklist",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 20;
      const skip = (page - 1) * limit;
      const activeOnly = req.query.active !== "false";

      const where: Record<string, unknown> = {};
      if (activeOnly) where.isActive = true;

      const [entries, total] = await Promise.all([
        prisma.blacklistEntry.findMany({
          where,
          include: {
            member: { select: { memberId: true, fullName: true, email: true, status: true } },
            addedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.blacklistEntry.count({ where }),
      ]);

      res.json({
        entries,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("Blacklist list error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/blacklist",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { memberId, reason } = req.body;
      if (!memberId || !reason) {
        res.status(400).json({ error: "memberId and reason are required" });
        return;
      }

      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member) { res.status(404).json({ error: "Member not found" }); return; }

      const existing = await prisma.blacklistEntry.findFirst({
        where: { memberId, isActive: true },
      });
      if (existing) {
        res.status(409).json({ error: "Member is already blacklisted" });
        return;
      }

      const entry = await prisma.blacklistEntry.create({
        data: { memberId, reason, addedById: req.user!.userId },
        include: {
          member: { select: { memberId: true, fullName: true } },
          addedBy: { select: { firstName: true, lastName: true } },
        },
      });

      await prisma.member.update({ where: { id: memberId }, data: { status: "FLAGGED" } });

      await prisma.auditLog.create({
        data: {
          action: "MEMBER_BLACKLISTED",
          entity: "BlacklistEntry",
          entityId: entry.id,
          details: `Member "${member.fullName}" blacklisted: ${reason}`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.status(201).json({ message: "Member blacklisted", entry });
    } catch (error) {
      console.error("Blacklist add error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/blacklist/:id/remove",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const entry = await prisma.blacklistEntry.findUnique({
        where: { id },
        include: { member: { select: { fullName: true, id: true } } },
      });
      if (!entry) { res.status(404).json({ error: "Blacklist entry not found" }); return; }

      await prisma.blacklistEntry.update({ where: { id }, data: { isActive: false } });
      await prisma.member.update({ where: { id: entry.memberId }, data: { status: "ACTIVE" } });

      await prisma.auditLog.create({
        data: {
          action: "MEMBER_UNBLACKLISTED",
          entity: "BlacklistEntry",
          entityId: id,
          details: `Member "${entry.member.fullName}" removed from blacklist`,
          userId: req.user!.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({ message: "Member removed from blacklist" });
    } catch (error) {
      console.error("Blacklist remove error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Search members (for blacklist member picker)
router.get(
  "/members-search",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const search = (req.query.q as string)?.trim() || "";
      if (search.length < 2) { res.json({ members: [] }); return; }

      const members = await prisma.member.findMany({
        where: {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { memberId: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
        select: { id: true, memberId: true, fullName: true, email: true, status: true },
        take: 10,
      });

      res.json({ members });
    } catch (error) {
      console.error("Members search error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get officers (for SACCO officer assignment)
router.get(
  "/officers",
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const officers = await prisma.user.findMany({
        where: { role: "OFFICER", isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: { firstName: "asc" },
      });
      res.json({ officers });
    } catch (error) {
      console.error("Officers list error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

export default router;
