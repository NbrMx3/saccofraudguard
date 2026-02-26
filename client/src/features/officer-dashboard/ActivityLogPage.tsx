import { useState, useEffect, useCallback } from "react";
import { fetchActivityLog, type ActivityLogEntry } from "@/services/officerService";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  FileText,
  Upload,
  CreditCard,
  Users,
  AlertTriangle,
  Trash2,
  Edit,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";

const actionConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  CREATE_CASE: { icon: FileText, color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/20" },
  UPDATE_CASE: { icon: Edit, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  RESOLVE_ALERT: { icon: Shield, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  ESCALATE_ALERT: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  UPLOAD_DOCUMENT: { icon: Upload, color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/20" },
  DELETE_DOCUMENT: { icon: Trash2, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
  DEPOSIT: { icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  WITHDRAWAL: { icon: CreditCard, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  CREATE_MEMBER: { icon: Users, color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/20" },
  LOGIN: { icon: LogIn, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
};

const defaultAction = { icon: Clock, color: "text-muted-foreground", bg: "bg-accent border-border" };

const actionFilterOptions = [
  { value: "all", label: "All Actions" },
  { value: "CREATE_CASE", label: "Create Case" },
  { value: "UPDATE_CASE", label: "Update Case" },
  { value: "RESOLVE_ALERT", label: "Resolve Alert" },
  { value: "ESCALATE_ALERT", label: "Escalate Alert" },
  { value: "UPLOAD_DOCUMENT", label: "Upload Document" },
  { value: "DELETE_DOCUMENT", label: "Delete Document" },
];

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchActivityLog({
        page,
        action: actionFilter !== "all" ? actionFilter : undefined,
      });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load activity log");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  // Group logs by date
  const grouped = logs.reduce<Record<string, ActivityLogEntry[]>>((acc, log) => {
    const date = new Date(log.createdAt).toLocaleDateString("en-KE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Activity Log</h2>
          <p className="text-sm text-muted-foreground">{total} activit{total !== 1 ? "ies" : "y"} recorded</p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          {actionFilterOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Clock className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {date}
              </h3>
              <div className="relative pl-6 border-l-2 border-border space-y-4">
                {entries.map((log) => {
                  const cfg = actionConfig[log.action] || defaultAction;
                  const Icon = cfg.icon;
                  return (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[calc(1.5rem+5px)] flex h-[10px] w-[10px] items-center justify-center rounded-full border ${cfg.bg}`}
                      />
                      <div className="rounded-xl border border-border bg-card p-3 hover:bg-accent/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${cfg.bg}`}>
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-foreground">
                                {log.action.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                on {log.entity}
                                {log.entityId && (
                                  <span className="font-mono ml-1">({log.entityId.slice(0, 8)}…)</span>
                                )}
                              </span>
                            </div>
                            {log.details && (
                              <p className="mt-0.5 text-sm text-muted-foreground">{log.details}</p>
                            )}
                            <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span>
                                {new Date(log.createdAt).toLocaleTimeString("en-KE", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
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
