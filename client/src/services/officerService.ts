import api from "@/lib/api";

// ── Fraud Alerts ──────────────────────────────────────────────────────
export interface OfficerFraudAlert {
  id: string;
  type: string;
  severity: string;
  description: string;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: { firstName: string; lastName: string } | null;
  member: { id: string; memberId: string; fullName: string };
  transaction: { txRef: string; type: string; amount: number } | null;
  createdAt: string;
}

export async function fetchOfficerFraudAlerts(params?: {
  page?: number;
  severity?: string;
  resolved?: string;
}) {
  const { data } = await api.get("/api/officer/fraud-alerts", { params });
  return data as {
    alerts: OfficerFraudAlert[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export async function resolveOfficerAlert(id: string, notes?: string) {
  const { data } = await api.patch(`/api/officer/fraud-alerts/${id}`, {
    action: "resolve",
    notes,
  });
  return data;
}

export async function escalateOfficerAlert(id: string, notes?: string) {
  const { data } = await api.patch(`/api/officer/fraud-alerts/${id}`, {
    action: "escalate",
    notes,
  });
  return data;
}

// ── Case Investigation ────────────────────────────────────────────────
export interface CaseInvestigation {
  id: string;
  caseRef: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  findings: string | null;
  resolution: string | null;
  alert: {
    id: string;
    type: string;
    severity: string;
    member: { fullName: string; memberId: string };
  } | null;
  assignedTo: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export async function fetchCases(params?: {
  page?: number;
  status?: string;
  priority?: string;
}) {
  const { data } = await api.get("/api/officer/cases", { params });
  return data as {
    cases: CaseInvestigation[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export async function createCase(payload: {
  title: string;
  description: string;
  priority?: string;
  alertId?: string;
}) {
  const { data } = await api.post("/api/officer/cases", payload);
  return data;
}

export async function updateCase(
  id: string,
  payload: { status?: string; findings?: string; resolution?: string }
) {
  const { data } = await api.patch(`/api/officer/cases/${id}`, payload);
  return data;
}

// ── Reports ───────────────────────────────────────────────────────────
export interface ReportSummary {
  period: { days: number; since: string };
  summary: {
    totalTransactions: number;
    depositVolume: number;
    withdrawalVolume: number;
    totalVolume: number;
    fraudAlerts: number;
    unresolvedAlerts: number;
    totalMembers: number;
    activeLoans: number;
    openCases: number;
  };
  breakdowns: {
    alertsBySeverity: { severity: string; count: number }[];
    transactionsByType: { type: string; count: number; volume: number }[];
  };
  dailyTrend: { date: string; count: number }[];
}

export async function fetchReportSummary(range?: string) {
  const { data } = await api.get("/api/officer/reports/summary", {
    params: { range },
  });
  return data as ReportSummary;
}

// ── Documents ─────────────────────────────────────────────────────────
export interface DocumentMeta {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description: string | null;
  uploadedBy: { firstName: string; lastName: string };
  createdAt: string;
}

export async function fetchDocuments(params?: {
  page?: number;
  category?: string;
}) {
  const { data } = await api.get("/api/officer/documents", { params });
  return data as {
    documents: DocumentMeta[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export async function uploadDocument(formData: FormData) {
  const { data } = await api.post("/api/officer/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function downloadDocument(id: string, fileName: string) {
  const { data } = await api.get(`/api/officer/documents/${id}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function deleteDocument(id: string) {
  const { data } = await api.delete(`/api/officer/documents/${id}`);
  return data;
}

// ── Activity Log ──────────────────────────────────────────────────────
export interface ActivityLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export async function fetchActivityLog(params?: {
  page?: number;
  action?: string;
}) {
  const { data } = await api.get("/api/officer/activity-log", { params });
  return data as {
    logs: ActivityLogEntry[];
    total: number;
    page: number;
    totalPages: number;
  };
}

// ── Loan Management ───────────────────────────────────────────────────
export interface ManagedLoan {
  id: string;
  loanRef: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalRepaid: number;
  outstandingBalance: number;
  status: string;
  purpose: string | null;
  createdAt: string;
  updatedAt: string;
  member: { id: string; memberId: string; fullName: string; phoneNumber: string; status: string };
  approvedBy: { firstName: string; lastName: string } | null;
}

export interface DefaultRiskLoan {
  id: string;
  loanRef: string;
  amount: number;
  termMonths: number;
  monthlyPayment: number;
  totalRepaid: number;
  outstandingBalance: number;
  createdAt: string;
  member: { memberId: string; fullName: string };
  monthsElapsed: number;
  expectedRepaid: number;
  repaymentRatio: number;
  riskLevel: string;
}

export interface LoanManagementData {
  loans: ManagedLoan[];
  total: number;
  page: number;
  totalPages: number;
  stats: {
    activeLoans: number;
    pendingLoans: number;
    defaultedLoans: number;
    completedLoans: number;
    totalOutstanding: number;
    totalRepaid: number;
  };
  defaultRisk: DefaultRiskLoan[];
}

export async function fetchLoanManagement(params?: {
  page?: number;
  status?: string;
  search?: string;
}) {
  const { data } = await api.get("/api/officer/loans/manage", { params });
  return data as LoanManagementData;
}

export async function approveLoan(id: string) {
  const { data } = await api.patch(`/api/officer/loans/${id}/status`, { action: "approve" });
  return data;
}

export async function rejectLoan(id: string) {
  const { data } = await api.patch(`/api/officer/loans/${id}/status`, { action: "reject" });
  return data;
}

// ── Member Risk Profiles ──────────────────────────────────────────────
export interface RiskProfile {
  id: string;
  totalPoints: number;
  riskLevel: string;
  frequencyPoints: number;
  amountPoints: number;
  behaviorPoints: number;
  noDepositPoints: number;
  avgTransactionAmount: number | null;
  transactionFrequency: number | null;
  lastCalculatedAt: string;
  member: {
    id: string;
    memberId: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    status: string;
    balance: number;
  };
  alertCount: number;
  unresolvedAlerts: number;
  activeLoan: { loanRef: string; status: string; outstandingBalance: number } | null;
}

export interface RiskProfileData {
  profiles: RiskProfile[];
  total: number;
  page: number;
  totalPages: number;
  summary: { high: number; medium: number; low: number; critical: number };
}

export async function fetchMemberRiskProfiles(params?: {
  page?: number;
  riskLevel?: string;
  search?: string;
}) {
  const { data } = await api.get("/api/officer/member-risk-profiles", { params });
  return data as RiskProfileData;
}

export interface RiskDetailData {
  member: {
    id: string;
    memberId: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    status: string;
    balance: number;
  };
  riskScore: {
    totalPoints: number;
    riskLevel: string;
    frequencyPoints: number;
    amountPoints: number;
    behaviorPoints: number;
    noDepositPoints: number;
    avgTransactionAmount: number | null;
    transactionFrequency: number | null;
    lastCalculatedAt: string;
  } | null;
  alerts: {
    id: string;
    type: string;
    severity: string;
    description: string;
    resolved: boolean;
    createdAt: string;
  }[];
  recentTransactions: {
    id: string;
    txRef: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  loans: {
    loanRef: string;
    amount: number;
    outstandingBalance: number;
    status: string;
    createdAt: string;
  }[];
}

export async function fetchMemberRiskDetail(memberId: string) {
  const { data } = await api.get(`/api/officer/member-risk-profiles/${memberId}`);
  return data as RiskDetailData;
}

// ── Transfers ─────────────────────────────────────────────────────────
export async function processTransfer(payload: {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  description?: string;
}) {
  const { data } = await api.post("/api/officer/transfer", payload);
  return data as {
    message: string;
    senderBalance: number;
    receiverBalance: number;
    fraudCheck: { flagged: boolean; alerts: { type: string; severity: string; description: string }[] };
  };
}
