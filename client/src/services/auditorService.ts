import api from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────

export interface AuditReview {
  id: string;
  reviewRef: string;
  title: string;
  description: string;
  category: string;
  status: string;
  riskLevel: string;
  findings: string | null;
  recommendations: string | null;
  reviewer: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceStats {
  complianceScore: number;
  totalMembers: number;
  flaggedMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  totalTransactions: number;
  flaggedTransactions: number;
  totalAlerts: number;
  unresolvedAlerts: number;
  policies: number;
  enabledPolicies: number;
  recentLogins: number;
  kycExpired: number;
}

export interface FraudReport {
  id: string;
  type: string;
  severity: string;
  description: string;
  resolved: boolean;
  resolvedAt: string | null;
  member: { memberId: string; fullName: string } | null;
  transaction: { txRef: string; type: string; amount: number } | null;
  resolvedBy: { firstName: string; lastName: string } | null;
  case: { id: string; caseRef: string; status: string } | null;
  createdAt: string;
}

export interface Investigation {
  id: string;
  caseRef: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  findings: string | null;
  resolution: string | null;
  assignedTo: { firstName: string; lastName: string; role: string };
  alert: {
    id: string;
    type: string;
    severity: string;
    description: string;
    member: { memberId: string; fullName: string } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditTrailEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  user: { firstName: string; lastName: string; role: string; nationalId: string };
  createdAt: string;
}

export interface ComplianceReport {
  id: string;
  reportRef: string;
  title: string;
  category: string;
  period: string;
  summary: string;
  content: string;
  status: string;
  generatedBy: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface AuditorDashboardStats {
  openReviews: number;
  openReviewsChange: number;
  complianceScore: number;
  complianceReports: number;
  complianceReportsChange: number;
  criticalAlerts: number;
  recentFindings: number;
  totalLogs: number;
  recentReviews: AuditReview[];
  riskBreakdown: Record<string, number>;
}

// ─── API Functions ────────────────────────────────────────────────────────

// Dashboard stats
export async function fetchAuditorStats(): Promise<AuditorDashboardStats> {
  const { data } = await api.get("/api/auditor/stats");
  return data;
}

// Audit Reviews
export async function fetchAuditReviews(params?: { status?: string; category?: string; page?: number; limit?: number }) {
  const { data } = await api.get("/api/auditor/audit-reviews", { params });
  return data as { reviews: AuditReview[]; total: number; page: number; limit: number };
}

export async function createAuditReview(body: { title: string; description: string; category?: string; riskLevel?: string }) {
  const { data } = await api.post("/api/auditor/audit-reviews", body);
  return data as AuditReview;
}

export async function updateAuditReview(id: string, body: { status?: string; findings?: string; recommendations?: string; riskLevel?: string }) {
  const { data } = await api.patch(`/api/auditor/audit-reviews/${id}`, body);
  return data as AuditReview;
}

// Compliance overview
export async function fetchComplianceStats(): Promise<ComplianceStats> {
  const { data } = await api.get("/api/auditor/compliance");
  return data;
}

// Fraud Reports (read-only)
export async function fetchFraudReports(params?: { severity?: string; resolved?: string; page?: number; limit?: number }) {
  const { data } = await api.get("/api/auditor/fraud-reports", { params });
  return data as { alerts: FraudReport[]; total: number; page: number; limit: number; severityBreakdown: Record<string, number> };
}

// Investigations (read-only)
export async function fetchInvestigations(params?: { status?: string; priority?: string; page?: number; limit?: number }) {
  const { data } = await api.get("/api/auditor/investigations", { params });
  return data as { cases: Investigation[]; total: number; page: number; limit: number };
}

// Audit Trail
export async function fetchAuditTrail(params?: { action?: string; entity?: string; userId?: string; page?: number; limit?: number }) {
  const { data } = await api.get("/api/auditor/audit-trail", { params });
  return data as { logs: AuditTrailEntry[]; total: number; page: number; limit: number; entities: { name: string; count: number }[] };
}

// Compliance Reports
export async function fetchComplianceReports(params?: { status?: string; category?: string; page?: number; limit?: number }) {
  const { data } = await api.get("/api/auditor/compliance-reports", { params });
  return data as { reports: ComplianceReport[]; total: number; page: number; limit: number };
}

export async function createComplianceReport(body: { title: string; category?: string; period?: string; summary: string; content: string }) {
  const { data } = await api.post("/api/auditor/compliance-reports", body);
  return data as ComplianceReport;
}

export async function updateComplianceReport(id: string, body: { title?: string; summary?: string; content?: string; status?: string }) {
  const { data } = await api.patch(`/api/auditor/compliance-reports/${id}`, body);
  return data as ComplianceReport;
}

// Export Data
export async function exportData(entity: string): Promise<void> {
  const response = await api.get(`/api/auditor/export/${entity}`, { responseType: "blob" });
  const blob = new Blob([response.data], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${entity}-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
