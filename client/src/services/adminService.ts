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

// ─── Create User ────────────────────────────────────────────────────
export async function createUser(userData: {
  nationalId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
}) {
  const { data } = await api.post("/api/admin/users", userData);
  return data;
}

// ─── Reset User Password ───────────────────────────────────────────
export async function resetUserPassword(id: string, newPassword: string) {
  const { data } = await api.patch(`/api/admin/users/${id}/reset-password`, { newPassword });
  return data;
}

// ─── User Login History ─────────────────────────────────────────────
export async function fetchUserLoginHistory(id: string) {
  const { data } = await api.get(`/api/admin/users/${id}/login-history`);
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

// ─── Automation ─────────────────────────────────────────────────────
export async function fetchAutomationStatus() {
  const { data } = await api.get("/api/admin/automation/status");
  return data;
}

export async function triggerAutomationJob(jobName: string) {
  const { data } = await api.post(`/api/admin/automation/jobs/${jobName}/trigger`);
  return data;
}

export async function toggleAutomationJob(jobName: string, enabled: boolean) {
  const { data } = await api.patch(`/api/admin/automation/jobs/${jobName}/toggle`, { enabled });
  return data;
}

export async function fetchAutomationLogs(page = 1) {
  const { data } = await api.get("/api/admin/automation/logs", { params: { page } });
  return data;
}

// ─── SACCO / Chama Management ───────────────────────────────────────
export async function fetchSaccos(params?: { page?: number; search?: string }) {
  const { data } = await api.get("/api/admin/saccos", { params });
  return data;
}

export async function createSacco(saccoData: {
  name: string;
  registrationNumber: string;
  location: string;
  assignedOfficerId?: string;
}) {
  const { data } = await api.post("/api/admin/saccos", saccoData);
  return data;
}

export async function updateSacco(id: string, updates: Record<string, unknown>) {
  const { data } = await api.patch(`/api/admin/saccos/${id}`, updates);
  return data;
}

export async function toggleSaccoStatus(id: string) {
  const { data } = await api.patch(`/api/admin/saccos/${id}/toggle-status`);
  return data;
}

// ─── Blacklist Management ───────────────────────────────────────────
export async function fetchBlacklist(params?: { page?: number; active?: string }) {
  const { data } = await api.get("/api/admin/blacklist", { params });
  return data;
}

export async function addToBlacklist(memberId: string, reason: string) {
  const { data } = await api.post("/api/admin/blacklist", { memberId, reason });
  return data;
}

export async function removeFromBlacklist(id: string) {
  const { data } = await api.patch(`/api/admin/blacklist/${id}/remove`);
  return data;
}

export async function searchMembers(q: string) {
  const { data } = await api.get("/api/admin/members-search", { params: { q } });
  return data;
}

export async function fetchOfficers() {
  const { data } = await api.get("/api/admin/officers");
  return data;
}
