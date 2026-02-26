import { useState, useEffect, useCallback } from "react";
import {
  fetchOfficerFraudAlerts,
  resolveOfficerAlert,
  escalateOfficerAlert,
  type OfficerFraudAlert,
} from "@/services/officerService";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowUpCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const severityColors: Record<string, string> = {
  LOW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function OfficerFraudAlerts() {
  const [alerts, setAlerts] = useState<OfficerFraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [severity, setSeverity] = useState("");
  const [resolved, setResolved] = useState("false");
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOfficerFraudAlerts({
        page,
        severity: severity || undefined,
        resolved: resolved || undefined,
      });
      setAlerts(data.alerts);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load fraud alerts");
    } finally {
      setLoading(false);
    }
  }, [page, severity, resolved]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id: string) => {
    setResolving(id);
    try {
      await resolveOfficerAlert(id, "Resolved by officer review");
      toast.success("Alert resolved");
      load();
    } catch {
      toast.error("Failed to resolve alert");
    } finally {
      setResolving(null);
    }
  };

  const handleEscalate = async (id: string) => {
    setResolving(id);
    try {
      await escalateOfficerAlert(id, "Escalated for further review");
      toast.success("Alert escalated");
      load();
    } catch {
      toast.error("Failed to escalate alert");
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Fraud Alerts</h2>
          <p className="text-sm text-muted-foreground">
            {total} alert{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="">All Severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select
            value={resolved}
            onChange={(e) => { setResolved(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Shield className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No fraud alerts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-foreground text-sm">
                      {alert.type.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        severityColors[alert.severity] || severityColors.MEDIUM
                      }`}
                    >
                      {alert.severity}
                    </span>
                    {alert.resolved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Member: <strong className="text-foreground">{alert.member.fullName}</strong>{" "}
                      <span className="font-mono">({alert.member.memberId})</span>
                    </span>
                    {alert.transaction && (
                      <span>
                        Tx: <span className="font-mono">{alert.transaction.txRef}</span>{" "}
                        — KES {alert.transaction.amount.toLocaleString()}
                      </span>
                    )}
                    <span>{new Date(alert.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {alert.resolved && alert.resolvedBy && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Resolved by {alert.resolvedBy.firstName} {alert.resolvedBy.lastName}
                      {alert.resolvedAt && ` on ${new Date(alert.resolvedAt).toLocaleDateString("en-KE")}`}
                    </p>
                  )}
                </div>
                {!alert.resolved && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEscalate(alert.id)}
                      disabled={resolving === alert.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500 dark:text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                    >
                      <ArrowUpCircle className="h-3.5 w-3.5" />
                      Escalate
                    </button>
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolving === alert.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      {resolving === alert.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5" />
                      )}
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
