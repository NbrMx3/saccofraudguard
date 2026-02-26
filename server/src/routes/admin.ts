import express, { type Response } from "express";
import prisma from "../lib/prisma.js";
import {
  authenticate,
  authorize,
  type AuthRequest,
} from "../middleware/auth.js";

const router: express.Router = express.Router();

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

      const where: Record<string, unknown> = {};
      if (severity && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
        where.severity = severity;
      }
      if (resolved === "true") where.resolved = true;
      if (resolved === "false") where.resolved = false;

      const [alerts, total] = await Promise.all([
        prisma.fraudAlert.findMany({
          where,
          include: {
            member: { select: { memberId: true, fullName: true } },
            transaction: { select: { txRef: true, amount: true, type: true } },
            resolvedBy: { select: { firstName: true, lastName: true } },
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
      const format = (req.query.format as string) || "json";

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

      if (format === "csv") {
        if (data.length === 0) {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename=${filename}.csv`);
          res.send("");
          return;
        }
        // Flatten nested objects for CSV
        const flattenRow = (row: Record<string, unknown>): Record<string, unknown> => {
          const flat: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(row)) {
            if (val && typeof val === "object" && !(val instanceof Date)) {
              for (const [nk, nv] of Object.entries(val as Record<string, unknown>)) {
                flat[`${key}_${nk}`] = nv;
              }
            } else {
              flat[key] = val;
            }
          }
          return flat;
        };
        const flatData = (data as Record<string, unknown>[]).map(flattenRow);
        const headers = Object.keys(flatData[0]);
        const csvRows = [
          headers.join(","),
          ...flatData.map((row) =>
            headers
              .map((h) => {
                const v = row[h];
                const str = v === null || v === undefined ? "" : String(v);
                return str.includes(",") || str.includes('"')
                  ? `"${str.replace(/"/g, '""')}"`
                  : str;
              })
              .join(",")
          ),
        ];
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}.csv`);
        res.send(csvRows.join("\n"));
      } else {
        res.json({ data, count: data.length });
      }
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
