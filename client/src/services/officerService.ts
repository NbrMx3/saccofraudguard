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
  member: { memberId: string; fullName: string };
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
