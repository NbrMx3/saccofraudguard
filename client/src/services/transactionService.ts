import api from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "LOAN_DISBURSEMENT" | "LOAN_REPAYMENT";
export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED" | "FLAGGED";
export type LoanStatus = "PENDING" | "APPROVED" | "ACTIVE" | "COMPLETED" | "DEFAULTED" | "REJECTED";
export type FraudSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Transaction {
  id: string;
  txRef: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  status: TransactionStatus;
  createdAt: string;
  member: { memberId: string; fullName: string };
  processedBy: { firstName: string; lastName: string };
}

export interface Loan {
  id: string;
  loanRef: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalRepaid: number;
  outstandingBalance: number;
  status: LoanStatus;
  purpose: string | null;
  createdAt: string;
  member: { memberId: string; fullName: string };
}

export interface FraudAlert {
  id: string;
  type: string;
  severity: FraudSeverity;
  description: string;
  resolved: boolean;
  createdAt: string;
  member: { memberId: string; fullName: string };
  transaction: { txRef: string; type: TransactionType; amount: number } | null;
}

export interface TransactionStats {
  totalTransactions: number;
  todayTransactions: number;
  flaggedTransactions: number;
  todayDeposits: number;
  todayWithdrawals: number;
}

export interface BalanceInfo {
  member: { id: string; memberId: string; fullName: string; balance: number };
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    activeLoans: { loanRef: string; outstandingBalance: number; status: string }[];
  };
}

export interface FraudCheckResult {
  flagged: boolean;
  alerts: string[];
}

interface TransactionResponse {
  message: string;
  transaction: Transaction & { balanceAfter: number };
  fraudCheck: FraudCheckResult;
}

interface LoanApplyResponse {
  message: string;
  loan: Loan;
  transaction: Transaction & { balanceAfter: number };
  fraudCheck: FraudCheckResult;
}

interface LoanRepayResponse {
  message: string;
  transaction: Transaction & { balanceAfter: number };
  loan: { outstandingBalance: number; totalRepaid: number; status: string };
  fraudCheck: FraudCheckResult;
}

// ── API Functions ────────────────────────────────────────────────

/** Record a deposit */
export async function recordDeposit(
  memberId: string,
  amount: number,
  description?: string
): Promise<TransactionResponse> {
  const { data } = await api.post("/api/transactions/deposit", { memberId, amount, description });
  return data;
}

/** Process a withdrawal */
export async function processWithdrawal(
  memberId: string,
  amount: number,
  description?: string
): Promise<TransactionResponse> {
  const { data } = await api.post("/api/transactions/withdraw", { memberId, amount, description });
  return data;
}

/** Apply for a loan */
export async function applyForLoan(payload: {
  memberId: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  purpose?: string;
}): Promise<LoanApplyResponse> {
  const { data } = await api.post("/api/transactions/loan-apply", payload);
  return data;
}

/** Repay a loan */
export async function repayLoan(loanId: string, amount: number): Promise<LoanRepayResponse> {
  const { data } = await api.post("/api/transactions/loan-repay", { loanId, amount });
  return data;
}

/** Fetch transaction history (paginated) */
export async function fetchTransactionHistory(filters?: {
  page?: number;
  memberId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
}): Promise<{ transactions: Transaction[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.memberId) params.set("memberId", filters.memberId);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  const { data } = await api.get(`/api/transactions/history?${params}`);
  return data;
}

/** Get member balance & summary */
export async function fetchBalance(memberId: string): Promise<BalanceInfo> {
  const { data } = await api.get(`/api/transactions/balance/${memberId}`);
  return data;
}

/** Get transaction stats */
export async function fetchTransactionStats(): Promise<TransactionStats> {
  const { data } = await api.get("/api/transactions/stats");
  return data;
}

/** List loans */
export async function fetchLoans(filters?: {
  memberId?: string;
  status?: LoanStatus;
}): Promise<{ loans: Loan[] }> {
  const params = new URLSearchParams();
  if (filters?.memberId) params.set("memberId", filters.memberId);
  if (filters?.status) params.set("status", filters.status);
  const { data } = await api.get(`/api/transactions/loans?${params}`);
  return data;
}

/** List fraud alerts */
export async function fetchFraudAlerts(resolved = false): Promise<{ alerts: FraudAlert[] }> {
  const { data } = await api.get(`/api/transactions/fraud-alerts?resolved=${resolved}`);
  return data;
}
