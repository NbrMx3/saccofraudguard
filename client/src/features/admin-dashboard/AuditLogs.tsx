import { useState, useEffect, useCallback } from "react";
import { fetchAuditLogs } from "@/services/adminService";
import { FileText, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";

interface Log {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; role: string };
}

const actionColors: Record<string, string> = {
  USER_ACTIVATED: "text-emerald-500 dark:text-emerald-400",
  USER_DEACTIVATED: "text-red-500 dark:text-red-400",
  ROLE_CHANGED: "text-violet-500 dark:text-violet-400",
  FRAUD_ALERT_RESOLVED: "text-amber-500 dark:text-amber-400",
  RISK_POLICY_CREATED: "text-sky-500 dark:text-sky-400",
  RISK_POLICY_UPDATED: "text-sky-500 dark:text-sky-400",
  RISK_POLICY_DELETED: "text-red-500 dark:text-red-400",
  SYSTEM_CONFIG_UPDATED: "text-indigo-500 dark:text-indigo-400",
  DATA_EXPORTED: "text-teal-500 dark:text-teal-400",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs({ page, action: actionFilter || undefined });
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Time", "User", "Action", "Entity", "Details", "IP"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No audit logs found
                </td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="text-sm hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {log.user.firstName} {log.user.lastName}
                      <span className="ml-1 text-xs text-muted-foreground">({log.user.role})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium font-mono ${actionColors[log.action] || "text-foreground"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{log.entity}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{log.details || "-"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.ipAddress || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
