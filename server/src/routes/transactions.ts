import express, { type Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize, type AuthRequest } from "../middleware/auth.js";
import { runFraudCheck } from "../utils/fraudCheck.js";

const router: express.Router = express.Router();

/** Generate a unique transaction reference */
function generateTxRef(type: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const prefix = type === "DEPOSIT" ? "DEP" : type === "WITHDRAWAL" ? "WTH" : type === "LOAN_DISBURSEMENT" ? "LND" : "LNR";
  return `${prefix}-${date}-${rand}`;
}

/** Generate a unique loan reference */
function generateLoanRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LN-${year}-${rand}`;
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/transactions/deposit — Record a deposit
// ═══════════════════════════════════════════════════════════════════
router.post(
  "/deposit",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { memberId, amount, description } = req.body;

      if (!memberId || !amount || amount <= 0) {
        res.status(400).json({ error: "Valid member ID and positive amount are required" });
        return;
      }

      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member) { res.status(404).json({ error: "Member not found" }); return; }
      if (member.status === "SUSPENDED") { res.status(403).json({ error: "Cannot transact on a suspended account" }); return; }

      const balanceBefore = member.balance;
      const balanceAfter = balanceBefore + amount;

      const transaction = await prisma.transaction.create({
        data: {
          txRef: generateTxRef("DEPOSIT"),
          type: "DEPOSIT",
          amount,
          balanceBefore,
          balanceAfter,
          description: description || "Cash deposit",
          memberId,
          processedById: req.user!.userId,
        },
      });

      await prisma.member.update({ where: { id: memberId }, data: { balance: balanceAfter } });

      // Auto fraud check
      const fraudResult = await runFraudCheck(memberId, transaction.id, "DEPOSIT", amount);

      res.status(201).json({
        message: "Deposit recorded successfully",
        transaction: { ...transaction, balanceAfter },
        fraudCheck: fraudResult,
      });
    } catch (error) {
      console.error("Deposit error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// POST /api/transactions/withdraw — Process a withdrawal
// ═══════════════════════════════════════════════════════════════════
router.post(
  "/withdraw",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { memberId, amount, description } = req.body;

      if (!memberId || !amount || amount <= 0) {
        res.status(400).json({ error: "Valid member ID and positive amount are required" });
        return;
      }

      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member) { res.status(404).json({ error: "Member not found" }); return; }
      if (member.status === "SUSPENDED") { res.status(403).json({ error: "Cannot transact on a suspended account" }); return; }
      if (member.balance < amount) { res.status(400).json({ error: `Insufficient balance. Available: KES ${member.balance.toLocaleString()}` }); return; }

      const balanceBefore = member.balance;
      const balanceAfter = balanceBefore - amount;

      const transaction = await prisma.transaction.create({
        data: {
          txRef: generateTxRef("WITHDRAWAL"),
          type: "WITHDRAWAL",
          amount,
          balanceBefore,
          balanceAfter,
          description: description || "Cash withdrawal",
          memberId,
          processedById: req.user!.userId,
        },
      });

      await prisma.member.update({ where: { id: memberId }, data: { balance: balanceAfter } });

      const fraudResult = await runFraudCheck(memberId, transaction.id, "WITHDRAWAL", amount);

      res.status(201).json({
        message: "Withdrawal processed successfully",
        transaction: { ...transaction, balanceAfter },
        fraudCheck: fraudResult,
      });
    } catch (error) {
      console.error("Withdrawal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// POST /api/transactions/loan-apply — Apply for a loan
// ═══════════════════════════════════════════════════════════════════
router.post(
  "/loan-apply",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { memberId, amount, interestRate, termMonths, purpose } = req.body;

      if (!memberId || !amount || amount <= 0 || !interestRate || !termMonths) {
        res.status(400).json({ error: "Member ID, amount, interest rate and term are required" });
        return;
      }

      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member) { res.status(404).json({ error: "Member not found" }); return; }
      if (member.status !== "ACTIVE") { res.status(403).json({ error: "Only active members can apply for loans" }); return; }

      // Check for existing active/pending loans
      const existingLoan = await prisma.loan.findFirst({
        where: { memberId, status: { in: ["ACTIVE", "PENDING"] } },
      });
      if (existingLoan) {
        res.status(400).json({ error: "Member already has an active or pending loan" });
        return;
      }

      const monthlyRate = interestRate / 100 / 12;
      const monthlyPayment = Math.round(
        (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1)
      );

      const loan = await prisma.loan.create({
        data: {
          loanRef: generateLoanRef(),
          amount,
          interestRate,
          termMonths,
          monthlyPayment,
          outstandingBalance: amount,
          purpose: purpose || null,
          memberId,
          approvedById: req.user!.userId,
          status: "APPROVED",
        },
      });

      // Disburse loan to member balance
      const balanceBefore = member.balance;
      const balanceAfter = balanceBefore + amount;

      const transaction = await prisma.transaction.create({
        data: {
          txRef: generateTxRef("LOAN_DISBURSEMENT"),
          type: "LOAN_DISBURSEMENT",
          amount,
          balanceBefore,
          balanceAfter,
          description: `Loan disbursement — ${loan.loanRef}`,
          memberId,
          processedById: req.user!.userId,
          loanId: loan.id,
        },
      });

      await prisma.member.update({ where: { id: memberId }, data: { balance: balanceAfter } });

      // Update loan status to active
      await prisma.loan.update({ where: { id: loan.id }, data: { status: "ACTIVE" } });

      const fraudResult = await runFraudCheck(memberId, transaction.id, "LOAN_DISBURSEMENT", amount);

      res.status(201).json({
        message: "Loan approved and disbursed successfully",
        loan,
        transaction: { ...transaction, balanceAfter },
        fraudCheck: fraudResult,
      });
    } catch (error) {
      console.error("Loan application error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// POST /api/transactions/loan-repay — Repay a loan
// ═══════════════════════════════════════════════════════════════════
router.post(
  "/loan-repay",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { loanId, amount } = req.body;

      if (!loanId || !amount || amount <= 0) {
        res.status(400).json({ error: "Loan ID and positive amount are required" });
        return;
      }

      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { member: true },
      });

      if (!loan) { res.status(404).json({ error: "Loan not found" }); return; }
      if (loan.status !== "ACTIVE") { res.status(400).json({ error: "Can only repay active loans" }); return; }

      const member = loan.member;
      if (member.balance < amount) {
        res.status(400).json({ error: `Insufficient balance. Available: KES ${member.balance.toLocaleString()}` });
        return;
      }

      const repayAmount = Math.min(amount, loan.outstandingBalance);
      const balanceBefore = member.balance;
      const balanceAfter = balanceBefore - repayAmount;
      const newOutstanding = loan.outstandingBalance - repayAmount;
      const newTotalRepaid = loan.totalRepaid + repayAmount;

      const transaction = await prisma.transaction.create({
        data: {
          txRef: generateTxRef("LOAN_REPAYMENT"),
          type: "LOAN_REPAYMENT",
          amount: repayAmount,
          balanceBefore,
          balanceAfter,
          description: `Loan repayment — ${loan.loanRef}`,
          memberId: member.id,
          processedById: req.user!.userId,
          loanId: loan.id,
        },
      });

      await prisma.member.update({ where: { id: member.id }, data: { balance: balanceAfter } });

      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          outstandingBalance: newOutstanding,
          totalRepaid: newTotalRepaid,
          status: newOutstanding <= 0 ? "COMPLETED" : "ACTIVE",
        },
      });

      const fraudResult = await runFraudCheck(member.id, transaction.id, "LOAN_REPAYMENT", repayAmount);

      res.status(201).json({
        message: newOutstanding <= 0 ? "Loan fully repaid!" : "Repayment recorded successfully",
        transaction: { ...transaction, balanceAfter },
        loan: { outstandingBalance: newOutstanding, totalRepaid: newTotalRepaid, status: newOutstanding <= 0 ? "COMPLETED" : "ACTIVE" },
        fraudCheck: fraudResult,
      });
    } catch (error) {
      console.error("Loan repayment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// GET /api/transactions/history — Transaction history with filters
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/history",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 20;
      const skip = (page - 1) * limit;
      const memberId = req.query.memberId as string | undefined;
      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = {};
      if (memberId) where.memberId = memberId;
      if (type && ["DEPOSIT", "WITHDRAWAL", "LOAN_DISBURSEMENT", "LOAN_REPAYMENT"].includes(type)) {
        where.type = type;
      }
      if (status && ["COMPLETED", "PENDING", "FAILED", "FLAGGED"].includes(status)) {
        where.status = status;
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
            member: { select: { memberId: true, fullName: true } },
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
    } catch (error) {
      console.error("Transaction history error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// GET /api/transactions/balance/:memberId — Get member balance
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/balance/:memberId",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const memberId = req.params.memberId as string;
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, memberId: true, fullName: true, balance: true },
      });

      if (!member) { res.status(404).json({ error: "Member not found" }); return; }

      // Also get aggregate info
      const [depositSum, withdrawalSum, loanInfo] = await Promise.all([
        prisma.transaction.aggregate({
          where: { memberId, type: "DEPOSIT" },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { memberId, type: "WITHDRAWAL" },
          _sum: { amount: true },
        }),
        prisma.loan.findMany({
          where: { memberId, status: { in: ["ACTIVE", "PENDING"] } },
          select: { loanRef: true, outstandingBalance: true, status: true },
        }),
      ]);

      res.json({
        member: {
          id: member.id,
          memberId: member.memberId,
          fullName: member.fullName,
          balance: member.balance,
        },
        summary: {
          totalDeposits: depositSum._sum.amount ?? 0,
          totalWithdrawals: withdrawalSum._sum.amount ?? 0,
          activeLoans: loanInfo,
        },
      });
    } catch (error) {
      console.error("Balance check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// GET /api/transactions/stats — Overview stats
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/stats",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalTransactions,
        todayTransactions,
        flaggedTransactions,
        todayDeposits,
        todayWithdrawals,
      ] = await Promise.all([
        prisma.transaction.count(),
        prisma.transaction.count({ where: { createdAt: { gte: today } } }),
        prisma.transaction.count({ where: { status: "FLAGGED" } }),
        prisma.transaction.aggregate({
          where: { type: "DEPOSIT", createdAt: { gte: today } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { type: "WITHDRAWAL", createdAt: { gte: today } },
          _sum: { amount: true },
        }),
      ]);

      res.json({
        totalTransactions,
        todayTransactions,
        flaggedTransactions,
        todayDeposits: todayDeposits._sum.amount ?? 0,
        todayWithdrawals: todayWithdrawals._sum.amount ?? 0,
      });
    } catch (error) {
      console.error("Transaction stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// GET /api/transactions/loans — List loans with filters
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/loans",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const memberId = req.query.memberId as string | undefined;
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = {};
      if (memberId) where.memberId = memberId;
      if (status && ["PENDING", "APPROVED", "ACTIVE", "COMPLETED", "DEFAULTED", "REJECTED"].includes(status)) {
        where.status = status;
      }

      const loans = await prisma.loan.findMany({
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
          member: { select: { memberId: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ loans });
    } catch (error) {
      console.error("List loans error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// GET /api/transactions/fraud-alerts — List fraud alerts
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/fraud-alerts",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const resolved = req.query.resolved === "true";

      const alerts = await prisma.fraudAlert.findMany({
        where: { resolved },
        select: {
          id: true,
          type: true,
          severity: true,
          description: true,
          resolved: true,
          createdAt: true,
          member: { select: { memberId: true, fullName: true } },
          transaction: { select: { txRef: true, type: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json({ alerts });
    } catch (error) {
      console.error("Fraud alerts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
