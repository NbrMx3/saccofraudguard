import { useState, useEffect, useCallback } from "react";
import { fetchFraudReports, type FraudReport } from "@/services/auditorService";
import { AlertTriangle, Loader2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const severityColors: Record<string, string> = {
  LOW: "bg-green-500/10 text-green-400 border-green-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function FraudReportsPage() {
  const [alerts, setAlerts] = useState<FraudReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterResolved, setFilterResolved] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filterSeverity) params.severity = filterSeverity;
      if (filterResolved) params.resolved = filterResolved;
      const res = await fetchFraudReports(params);
      setAlerts(res.alerts);
      setTotal(res.total);
      setBreakdown(res.severityBreakdown);
    } catch {
      toast.error("Failed to load fraud reports");
    } finally {
      setLoading(false);
    }
  }, [page, filterSeverity, filterResolved]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Fraud Reports</h2>
        <p className="text-sm text-muted-foreground">Review all fraud alerts across the system (read-only)</p>
      </div>

      {/* Severity Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
          <div key={s} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${s === "CRITICAL" ? "text-red-400" : s === "HIGH" ? "text-orange-400" : s === "MEDIUM" ? "text-amber-400" : "text-green-400"}`}>
              {breakdown[s] || 0}
            </p>
            <p className="text-xs text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
          <option value="">All Severities</option>
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterResolved} onChange={(e) => { setFilterResolved(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
          <option value="">All Statuses</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p>No fraud reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${severityColors[a.severity]}`}>{a.severity}</span>
                    <span className="text-xs font-medium text-foreground">{a.type}</span>
                    {a.resolved ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Open</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{a.description}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    {a.member && <span>Member: {a.member.fullName} ({a.member.memberId})</span>}
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {expandedId === a.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expandedId === a.id && (
                <div className="border-t border-border p-4 bg-accent/20 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Full Description</p>
                      <p className="text-foreground">{a.description}</p>
                    </div>
                    {a.transaction && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Related Transaction</p>
                        <p className="text-foreground">
                          {a.transaction.txRef} — {a.transaction.type} — KES {a.transaction.amount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {a.resolvedBy && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Resolved By</p>
                        <p className="text-foreground">{a.resolvedBy.firstName} {a.resolvedBy.lastName}</p>
                        {a.resolvedAt && <p className="text-xs text-muted-foreground">{new Date(a.resolvedAt).toLocaleString()}</p>}
                      </div>
                    )}
                    {a.case && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Linked Case</p>
                        <div className="flex items-center gap-2">
                          <Eye className="h-3.5 w-3.5 text-sky-500" />
                          <span className="text-foreground">{a.case.caseRef} — {a.case.status}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Previous</button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
