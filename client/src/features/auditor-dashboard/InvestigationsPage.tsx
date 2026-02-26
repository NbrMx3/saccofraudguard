import { useState, useEffect, useCallback } from "react";
import { fetchInvestigations, type Investigation } from "@/services/auditorService";
import { ClipboardCheck, Loader2, ChevronDown, ChevronUp, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ESCALATED: "bg-red-500/10 text-red-400 border-red-500/20",
  CLOSED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DISMISSED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const priorityColors: Record<string, string> = {
  LOW: "text-green-400",
  MEDIUM: "text-amber-400",
  HIGH: "text-orange-400",
  CRITICAL: "text-red-400",
};

export default function InvestigationsPage() {
  const [cases, setCases] = useState<Investigation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const res = await fetchInvestigations(params);
      setCases(res.cases);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load investigations");
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterPriority]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Investigations</h2>
        <p className="text-sm text-muted-foreground">{total} case investigations (read-only audit view)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
          <option value="">All Statuses</option>
          {["OPEN", "IN_PROGRESS", "ESCALATED", "CLOSED", "DISMISSED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
          <option value="">All Priorities</option>
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
      ) : cases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardCheck className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p>No investigations found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{c.caseRef}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[c.status] || statusColors.OPEN}`}>{c.status.replace("_", " ")}</span>
                    <span className={`text-[10px] font-medium ${priorityColors[c.priority] || "text-muted-foreground"}`}>{c.priority}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.assignedTo.firstName} {c.assignedTo.lastName} ({c.assignedTo.role})</span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {expandedId === c.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expandedId === c.id && (
                <div className="border-t border-border p-4 bg-accent/20 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-foreground">{c.description}</p>
                  </div>

                  {c.alert && (
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Linked Fraud Alert
                      </p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          severityColor(c.alert.severity)
                        }`}>{c.alert.severity}</span>
                        <span className="text-foreground">{c.alert.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{c.alert.description}</p>
                      {c.alert.member && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Member: {c.alert.member.fullName} ({c.alert.member.memberId})
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {c.findings && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Findings</p>
                        <p className="text-sm text-foreground bg-background rounded-xl border border-border p-3">{c.findings}</p>
                      </div>
                    )}
                    {c.resolution && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Resolution</p>
                        <p className="text-sm text-foreground bg-background rounded-xl border border-border p-3">{c.resolution}</p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">Last updated: {new Date(c.updatedAt).toLocaleString()}</p>
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

function severityColor(s: string) {
  const map: Record<string, string> = {
    LOW: "bg-green-500/10 text-green-400 border-green-500/20",
    MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return map[s] || map.MEDIUM;
}
