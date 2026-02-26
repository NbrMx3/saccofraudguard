import api from "@/lib/api";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface FraudRule {
  id: string;
  name: string;
  description: string;
  ruleType: "FREQUENCY" | "AMOUNT" | "NO_DEPOSIT" | "CUSTOM";
  enabled: boolean;
  maxCount: number | null;
  windowHours: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  severity: string;
  riskPoints: number;
  createdBy: { firstName: string; lastName: string; role: string };
  _count: { ruleViolations: number };
  createdAt: string;
  updatedAt: string;
}

export interface RuleViolation {
  id: string;
  ruleId: string;
  rule: { name: string; ruleType: string; severity: string };
  member: { memberId: string; fullName: string };
  transaction: { txRef: string; type: string; amount: number } | null;
  details: string;
  riskPoints: number;
  reviewed: boolean;
  reviewedBy: { firstName: string; lastName: string } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface WithdrawalThreshold {
  id: string;
  largeWithdrawalAmount: number;
  dailyWithdrawalLimit: number;
  maxWithdrawalsPerDay: number;
  requireApprovalAbove: number;
  updatedBy: { firstName: string; lastName: string; role: string };
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequest {
  id: string;
  requestRef: string;
  member: { memberId: string; fullName: string; balance: number };
  amount: number;
  reason: string;
  supportingDoc: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy: { firstName: string; lastName: string } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorAnalysis {
  member: { id: string; memberId: string; fullName: string; status: string; balance: number };
  totalTransactions: number;
  deposits: number;
  withdrawals: number;
  avgAmount: number;
  avgDeposit: number;
  avgWithdrawal: number;
  weeklyFrequency: number;
  recentAvgAmount: number;
  historicalAvgAmount: number;
  amountDeviationPercent: number;
  flaggedTransactions: number;
  peakActivityDay: string;
  activityByDay: { day: string; count: number }[];
}

export interface BehaviorSummary {
  totalMembers: number;
  totalTransactions: number;
  flaggedTransactions: number;
  recentTransactions: number;
  avgTransactionAmount: number;
  highRiskMembers: number;
}

export interface MemberRiskScore {
  id: string;
  memberId: string;
  member: { memberId: string; fullName: string; status: string; balance: number };
  totalPoints: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  frequencyPoints: number;
  amountPoints: number;
  behaviorPoints: number;
  noDepositPoints: number;
  avgTransactionAmount: number | null;
  transactionFrequency: number | null;
  lastCalculatedAt: string;
}

export interface FraudDecision {
  id: string;
  memberId: string;
  member: { memberId: string; fullName: string; status: string };
  transaction: { txRef: string; type: string; amount: number } | null;
  riskScore: number;
  riskLevel: string;
  action: string;
  reason: string;
  requiresApproval: boolean;
  approved: boolean | null;
  approvedBy: { firstName: string; lastName: string } | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface DecisionStats {
  total: number;
  pendingApprovals: number;
  alertsTriggered: number;
  accountsFlagged: number;
  autoApproved: number;
  blocked: number;
  recentDecisions: FraudDecision[];
}

export interface EngineStats {
  totalRules: number;
  enabledRules: number;
  totalViolations: number;
  unreviewedViolations: number;
  highRiskMembers: number;
  criticalRiskMembers: number;
  totalDecisions: number;
  pendingApprovals: number;
  pendingWithdrawals: number;
}

// ═══════════════════════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════════════════════

const BASE = "/api/fraud-engine";

// ─── Engine Stats ─────────────────────────────────────────────────────
export async function fetchEngineStats(): Promise<EngineStats> {
  const { data } = await api.get(`${BASE}/stats`);
  return data;
}

// ─── Rule Engine ──────────────────────────────────────────────────────
export async function fetchFraudRules(): Promise<FraudRule[]> {
  const { data } = await api.get(`${BASE}/rules`);
  return data;
}

export async function createFraudRule(body: {
  name: string;
  description: string;
  ruleType: string;
  maxCount?: number | null;
  windowHours?: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  severity?: string;
  riskPoints?: number;
  enabled?: boolean;
}): Promise<FraudRule> {
  const { data } = await api.post(`${BASE}/rules`, body);
  return data;
}

export async function updateFraudRule(id: string, body: Partial<FraudRule>): Promise<FraudRule> {
  const { data } = await api.patch(`${BASE}/rules/${id}`, body);
  return data;
}

export async function deleteFraudRule(id: string): Promise<void> {
  await api.delete(`${BASE}/rules/${id}`);
}

export async function runFraudRules(): Promise<{ message: string; newViolations: number; rulesEvaluated: number }> {
  const { data } = await api.post(`${BASE}/rules/run`);
  return data;
}

export async function fetchRuleViolations(params?: { reviewed?: string; ruleId?: string; memberId?: string; page?: number; limit?: number }) {
  const { data } = await api.get(`${BASE}/rules/violations`, { params });
  return data as { violations: RuleViolation[]; total: number; page: number; limit: number };
}

export async function reviewViolation(id: string, body: { reviewed?: boolean; reviewNotes?: string }): Promise<RuleViolation> {
  const { data } = await api.patch(`${BASE}/rules/violations/${id}`, body);
  return data;
}

// ─── Thresholds ───────────────────────────────────────────────────────
export async function fetchThresholds(): Promise<WithdrawalThreshold | null> {
  const { data } = await api.get(`${BASE}/thresholds`);
  return data;
}

export async function saveThresholds(body: {
  largeWithdrawalAmount: number;
  dailyWithdrawalLimit: number;
  maxWithdrawalsPerDay: number;
  requireApprovalAbove: number;
}): Promise<WithdrawalThreshold> {
  const { data } = await api.post(`${BASE}/thresholds`, body);
  return data;
}

// ─── Withdrawal Requests ──────────────────────────────────────────────
export async function fetchWithdrawalRequests(params?: { status?: string; page?: number; limit?: number }) {
  const { data } = await api.get(`${BASE}/withdrawal-requests`, { params });
  return data as { requests: WithdrawalRequest[]; total: number; page: number; limit: number };
}

export async function createWithdrawalRequest(body: { memberId: string; amount: number; reason: string; supportingDoc?: string }): Promise<WithdrawalRequest> {
  const { data } = await api.post(`${BASE}/withdrawal-requests`, body);
  return data;
}

export async function reviewWithdrawalRequest(id: string, body: { status: "APPROVED" | "REJECTED"; reviewNotes?: string }): Promise<WithdrawalRequest> {
  const { data } = await api.patch(`${BASE}/withdrawal-requests/${id}`, body);
  return data;
}

// ─── Behavior Analysis ────────────────────────────────────────────────
export async function fetchBehaviorAnalysis(params?: { memberId?: string; page?: number; limit?: number }) {
  const { data } = await api.get(`${BASE}/behavior/analysis`, { params });
  return data as { analyses: BehaviorAnalysis[]; total: number; page: number; limit: number };
}

export async function fetchBehaviorSummary(): Promise<BehaviorSummary> {
  const { data } = await api.get(`${BASE}/behavior/summary`);
  return data;
}

// ─── Risk Scoring ─────────────────────────────────────────────────────
export async function calculateRiskScores(): Promise<{ message: string; membersProcessed: number }> {
  const { data } = await api.post(`${BASE}/risk/calculate`);
  return data;
}

export async function fetchRiskScores(params?: { riskLevel?: string; page?: number; limit?: number }) {
  const { data } = await api.get(`${BASE}/risk/scores`, { params });
  return data as { scores: MemberRiskScore[]; total: number; page: number; limit: number; breakdown: Record<string, number> };
}

export async function fetchMemberRiskDetail(memberId: string) {
  const { data } = await api.get(`${BASE}/risk/scores/${memberId}`);
  return data as { score: MemberRiskScore; violations: RuleViolation[]; decisions: FraudDecision[] };
}

// ─── Decision Logic ───────────────────────────────────────────────────
export async function evaluateMember(body: { memberId: string; transactionId?: string }) {
  const { data } = await api.post(`${BASE}/decisions/evaluate`, body);
  return data as { riskScore: MemberRiskScore; decisions: FraudDecision[] };
}

export async function fetchDecisions(params?: { action?: string; riskLevel?: string; requiresApproval?: string; page?: number; limit?: number }) {
  const { data } = await api.get(`${BASE}/decisions`, { params });
  return data as { decisions: FraudDecision[]; total: number; page: number; limit: number; actionBreakdown: Record<string, number> };
}

export async function approveDecision(id: string, approved: boolean): Promise<FraudDecision> {
  const { data } = await api.patch(`${BASE}/decisions/${id}/approve`, { approved });
  return data;
}

export async function fetchDecisionStats(): Promise<DecisionStats> {
  const { data } = await api.get(`${BASE}/decisions/stats`);
  return data;
}
