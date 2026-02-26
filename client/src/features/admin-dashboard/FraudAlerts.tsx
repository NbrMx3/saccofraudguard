import { useState, useEffect, useCallback } from "react";
import { fetchFraudAlerts, resolveFraudAlert } from "@/services/adminService";
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { toast } from "sonner";

interface Alert {
  id: string;
  type: string;
  severity: string;
  description: string;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  member: { memberId: string; fullName: string };
  transaction: { txRef: string; amount: number; type: string } | null;
  resolvedBy: { firstName: string; lastName: string } | null;
}

const severityColors: Record<string, string> = {
  LOW: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20",
};

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [severityFilter, setSeverityFilter] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFraudAlerts({
        page,
        severity: severityFilter || undefined,
        resolved: resolvedFilter || undefined,
      });
      setAlerts(data.alerts);
      setTotalPages(data.pagination.totalPages);
    } catch {
      toast.error("Failed to load fraud alerts");
    } finally {
      setLoading(false);
    }
  }, [page, severityFilter, resolvedFilter]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id: string) => {
    try {
      await resolveFraudAlert(id);
      toast.success("Alert resolved");
      load();
    } catch {
      toast.error("Failed to resolve alert");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select
          value={resolvedFilter}
          onChange={(e) => { setResolvedFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        >
          <option value="">All Status</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            <Shield className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No fraud alerts found</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  alert.severity === "CRITICAL" ? "bg-red-500/10" : alert.severity === "HIGH" ? "bg-orange-500/10" : alert.severity === "MEDIUM" ? "bg-amber-500/10" : "bg-blue-500/10"
                }`}>
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.severity === "CRITICAL" ? "text-red-500 dark:text-red-400" : alert.severity === "HIGH" ? "text-orange-500 dark:text-orange-400" : alert.severity === "MEDIUM" ? "text-amber-500 dark:text-amber-400" : "text-blue-500 dark:text-blue-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${severityColors[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{alert.type}</span>
                    {alert.resolved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mb-2">{alert.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Member: <strong className="text-foreground">{alert.member.fullName}</strong> ({alert.member.memberId})</span>
                    {alert.transaction && (
                      <span>Tx: <strong className="text-foreground">{alert.transaction.txRef}</strong> — KES {alert.transaction.amount.toLocaleString()}</span>
                    )}
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                    {alert.resolvedBy && (
                      <span>Resolved by: {alert.resolvedBy.firstName} {alert.resolvedBy.lastName}</span>
                    )}
                  </div>
                </div>
                {!alert.resolved && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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
  );
}
