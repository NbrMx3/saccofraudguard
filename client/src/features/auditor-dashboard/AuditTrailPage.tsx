import { useState, useEffect, useCallback } from "react";
import { fetchAuditTrail, type AuditTrailEntry } from "@/services/auditorService";
import { History, Loader2, Search, User } from "lucide-react";
import { toast } from "sonner";

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-500",
  UPDATE: "bg-blue-500",
  DELETE: "bg-red-500",
  LOGIN: "bg-sky-500",
  LOGOUT: "bg-slate-500",
  EXPORT: "bg-violet-500",
  RESOLVE: "bg-amber-500",
  UPLOAD: "bg-indigo-500",
  DEFAULT: "bg-gray-500",
};

function getActionColor(action: string): string {
  const key = Object.keys(actionColors).find((k) => action.toUpperCase().includes(k));
  return key ? actionColors[key] : actionColors.DEFAULT;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditTrailEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState("");
  const [searchAction, setSearchAction] = useState("");
  const [entities, setEntities] = useState<{ name: string; count: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 30 };
      if (filterEntity) params.entity = filterEntity;
      if (searchAction) params.action = searchAction;
      const res = await fetchAuditTrail(params);
      setLogs(res.logs);
      setTotal(res.total);
      setEntities(res.entities);
    } catch {
      toast.error("Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  }, [page, filterEntity, searchAction]);

  useEffect(() => { load(); }, [load]);

  // Group logs by date
  const grouped = logs.reduce<Record<string, AuditTrailEntry[]>>((acc, log) => {
    const date = new Date(log.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Audit Trail</h2>
        <p className="text-sm text-muted-foreground">System-wide activity log — {total} entries</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchAction}
            onChange={(e) => { setSearchAction(e.target.value); setPage(1); }}
            placeholder="Search actions..."
            className="rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none w-64"
          />
        </div>
        <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
          <option value="">All Entities</option>
          {entities.map((e) => <option key={e.name} value={e.name}>{e.name} ({e.count})</option>)}
        </select>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <History className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p>No audit trail entries found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{date}</h3>
              <div className="relative border-l-2 border-border ml-3 space-y-4">
                {entries.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ${getActionColor(log.action)} ring-2 ring-background`} />
                    <div className="rounded-xl border border-border bg-card p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{log.action}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <span className="bg-accent px-1.5 py-0.5 rounded text-[10px] font-mono">{log.entity}</span>
                            </span>
                            {log.entityId && <span className="font-mono text-[10px]">{log.entityId.slice(0, 12)}...</span>}
                          </div>
                          {log.details && <p className="text-xs text-muted-foreground mt-1 truncate">{log.details}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</p>
                          {log.ipAddress && <p className="text-[10px] text-muted-foreground font-mono">{log.ipAddress}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{log.user.firstName} {log.user.lastName}</span>
                        <span className="bg-accent px-1.5 py-0.5 rounded text-[10px]">{log.user.role}</span>
                        <span className="font-mono text-[10px]">{log.user.nationalId}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
