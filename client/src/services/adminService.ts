import api from "@/lib/api";

// ─── Dashboard Stats ────────────────────────────────────────────────
export async function fetchAdminStats() {
  const { data } = await api.get("/api/admin/stats");
  return data;
}

// ─── Users ──────────────────────────────────────────────────────────
export async function fetchUsers(params?: { page?: number; search?: string; role?: string }) {
  const { data } = await api.get("/api/admin/users", { params });
  return data;
}

export async function toggleUserActive(id: string) {
  const { data } = await api.patch(`/api/admin/users/${id}/toggle-active`);
  return data;
}

export async function changeUserRole(id: string, role: string) {
  const { data } = await api.patch(`/api/admin/users/${id}/role`, { role });
  return data;
}

// ─── Fraud Alerts ───────────────────────────────────────────────────
export async function fetchFraudAlerts(params?: { page?: number; severity?: string; resolved?: string }) {
  const { data } = await api.get("/api/admin/fraud-alerts", { params });
  return data;
}

export async function resolveFraudAlert(id: string) {
  const { data } = await api.patch(`/api/admin/fraud-alerts/${id}/resolve`);
  return data;
}

// ─── Audit Logs ─────────────────────────────────────────────────────
export async function fetchAuditLogs(params?: { page?: number; action?: string }) {
  const { data } = await api.get("/api/admin/audit-logs", { params });
  return data;
}

// ─── Analytics ──────────────────────────────────────────────────────
export async function fetchAnalytics() {
  const { data } = await api.get("/api/admin/analytics");
  return data;
}

// ─── Risk Policies ──────────────────────────────────────────────────
export async function fetchRiskPolicies() {
  const { data } = await api.get("/api/admin/risk-policies");
  return data;
}

export async function createRiskPolicy(policy: {
  name: string;
  description: string;
  enabled?: boolean;
  threshold?: number;
  severity?: string;
}) {
  const { data } = await api.post("/api/admin/risk-policies", policy);
  return data;
}

export async function updateRiskPolicy(id: string, updates: Record<string, unknown>) {
  const { data } = await api.patch(`/api/admin/risk-policies/${id}`, updates);
  return data;
}

export async function deleteRiskPolicy(id: string) {
  const { data } = await api.delete(`/api/admin/risk-policies/${id}`);
  return data;
}

// ─── System Config ──────────────────────────────────────────────────
export async function fetchSystemConfig() {
  const { data } = await api.get("/api/admin/system-config");
  return data;
}

export async function updateSystemConfig(configs: { key: string; value: string }[]) {
  const { data } = await api.put("/api/admin/system-config", { configs });
  return data;
}

// ─── Notifications ──────────────────────────────────────────────────
export async function fetchNotifications() {
  const { data } = await api.get("/api/notifications");
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch("/api/notifications/read-all");
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.patch(`/api/notifications/${id}/read`);
  return data;
}

// ─── Data Exports ───────────────────────────────────────────────────
export async function exportData(entity: string, format: "json" | "csv" = "json") {
  if (format === "csv") {
    const response = await api.get(`/api/admin/export/${entity}`, {
      params: { format: "csv" },
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return { message: "Download started" };
  }
  const { data } = await api.get(`/api/admin/export/${entity}`, { params: { format } });
  return data;
}
