import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Shield,
  BrainCircuit,
  Bell,
  Landmark,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Server,
  Activity,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAutomationStatus,
  triggerAutomationJob,
  toggleAutomationJob,
  fetchAutomationLogs,
} from "@/services/adminService";

// ── Types ────────────────────────────────────────────────────────
interface JobState {
  jobName: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastDuration: number | null;
  lastResult: string | null;
  runCount: number;
  errorCount: number;
  lastError: string | null;
  enabled: boolean;
  schedule: string;
}

interface AutomationStatus {
  serverStartedAt: string;
  uptimeMs: number;
  uptimeFormatted: string;
  jobs: JobState[];
}

interface AutomationLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  userId: string;
  createdAt: string;
}

// ── Job metadata ─────────────────────────────────────────────────
const JOB_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; description: string }
> = {
  "fraud-rule-scan": {
    label: "Fraud Rule Scan",
    icon: Shield,
    color: "text-red-400 bg-red-500/10",
    description: "Scans all transactions against enabled fraud rules to detect violations",
  },
  "risk-score-calculation": {
    label: "Risk Score Calculation",
    icon: BrainCircuit,
    color: "text-violet-400 bg-violet-500/10",
    description: "Recalculates risk scores for all members based on transaction patterns",
  },
  "decision-evaluation": {
    label: "Decision Evaluation",
    icon: Zap,
    color: "text-amber-400 bg-amber-500/10",
    description: "Evaluates high-risk members and creates automated fraud decisions",
  },
  "alert-digest": {
    label: "Alert Digest",
    icon: Bell,
    color: "text-sky-400 bg-sky-500/10",
    description: "Sends daily digest notifications and cleans up old notifications",
  },
  "loan-monitoring": {
    label: "Loan Monitoring",
    icon: Landmark,
    color: "text-emerald-400 bg-emerald-500/10",
    description: "Monitors overdue loans, auto-defaults expired loans, checks multiple loans",
  },
};

// ── Helpers ──────────────────────────────────────────────────────
function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AutomationPanel() {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [logsPagination, setLogsPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [togglingJob, setTogglingJob] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchAutomationStatus();
      setStatus(data);
    } catch {
      toast.error("Failed to load automation status");
    }
  }, []);

  const loadLogs = useCallback(async (page = 1) => {
    try {
      const data = await fetchAutomationLogs(page);
      setLogs(data.logs);
      setLogsPagination(data.pagination);
    } catch {
      // Silent fail for logs
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadLogs()]);
      setLoading(false);
    })();
  }, [loadStatus, loadLogs]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      loadStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleTrigger = async (jobName: string) => {
    setTriggeringJob(jobName);
    try {
      const result = await triggerAutomationJob(jobName);
      toast.success(`${JOB_META[jobName]?.label || jobName} completed`, {
        description: result.result,
      });
      await Promise.all([loadStatus(), loadLogs()]);
    } catch (err: any) {
      toast.error(`Failed to trigger ${jobName}`, {
        description: err?.response?.data?.error || err.message,
      });
    } finally {
      setTriggeringJob(null);
    }
  };

  const handleToggle = async (jobName: string, currentEnabled: boolean) => {
    setTogglingJob(jobName);
    try {
      await toggleAutomationJob(jobName, !currentEnabled);
      toast.success(
        `${JOB_META[jobName]?.label || jobName} ${!currentEnabled ? "enabled" : "disabled"}`
      );
      await loadStatus();
    } catch (err: any) {
      toast.error("Failed to toggle job", {
        description: err?.response?.data?.error || err.message,
      });
    } finally {
      setTogglingJob(null);
    }
  };

  const refresh = async () => {
    await Promise.all([loadStatus(), loadLogs()]);
    toast.success("Automation status refreshed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
            <Bot className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Automation Engine</h3>
            <p className="text-xs text-muted-foreground">
              Automated fraud detection, risk scoring & monitoring
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card text-muted-foreground text-xs font-medium hover:bg-accent transition-colors border border-border"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Server Status Bar */}
      {status && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Server Uptime:</span>
            <span className="text-xs font-semibold text-foreground">
              {status.uptimeFormatted}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" />
            <span className="text-xs text-muted-foreground">Active Jobs:</span>
            <span className="text-xs font-semibold text-foreground">
              {status.jobs.filter((j) => j.enabled).length}/{status.jobs.length}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-muted-foreground">Total Runs:</span>
            <span className="text-xs font-semibold text-foreground">
              {status.jobs.reduce((s, j) => s + j.runCount, 0)}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <span className="text-xs text-muted-foreground">Errors:</span>
            <span className="text-xs font-semibold text-foreground">
              {status.jobs.reduce((s, j) => s + j.errorCount, 0)}
            </span>
          </div>
        </div>
      )}

      {/* Job Cards */}
      <div className="space-y-3">
        {status?.jobs.map((job) => {
          const meta = JOB_META[job.jobName] || {
            label: job.jobName,
            icon: Bot,
            color: "text-slate-400 bg-slate-500/10",
            description: "",
          };
          const Icon = meta.icon;
          const isTriggering = triggeringJob === job.jobName;
          const isToggling = togglingJob === job.jobName;

          return (
            <div
              key={job.jobName}
              className={`rounded-xl border bg-card p-5 transition-colors ${
                job.enabled ? "border-border" : "border-border opacity-60"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Job info */}
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.color.split(" ")[1]}`}
                  >
                    <Icon className={`h-5 w-5 ${meta.color.split(" ")[0]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">{meta.label}</h4>
                      {job.enabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-400">
                          <Pause className="h-2.5 w-2.5" /> Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{meta.description}</p>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          Schedule: <span className="text-foreground font-medium">{job.schedule}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          Runs:{" "}
                          <span className="text-foreground font-medium">{job.runCount}</span>
                          {job.errorCount > 0 && (
                            <span className="text-red-400 ml-1">
                              ({job.errorCount} errors)
                            </span>
                          )}
                        </span>
                      </div>
                      {job.lastRunAt && (
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">
                            Last run:{" "}
                            <span className="text-foreground font-medium">
                              {timeAgo(job.lastRunAt)}
                            </span>
                          </span>
                        </div>
                      )}
                      {job.lastDuration !== null && (
                        <span className="text-[11px] text-muted-foreground">
                          Duration:{" "}
                          <span className="text-foreground font-medium">
                            {formatDuration(job.lastDuration)}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Last result / error */}
                    {job.lastResult && (
                      <div className="mt-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
                        <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                          {job.lastResult}
                        </p>
                      </div>
                    )}
                    {job.lastError && (
                      <div className="mt-2 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2">
                        <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                          <XCircle className="h-3 w-3 flex-shrink-0" />
                          {job.lastError}
                        </p>
                      </div>
                    )}

                    {/* Next run */}
                    {job.nextRunAt && job.enabled && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Next run: {formatDate(job.nextRunAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:flex-col">
                  <button
                    onClick={() => handleTrigger(job.jobName)}
                    disabled={isTriggering || !job.enabled}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-sky-500/20"
                  >
                    {isTriggering ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Run Now
                  </button>
                  <button
                    onClick={() => handleToggle(job.jobName, job.enabled)}
                    disabled={isToggling}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      job.enabled
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                    } disabled:opacity-40`}
                  >
                    {isToggling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : job.enabled ? (
                      <ToggleRight className="h-3.5 w-3.5" />
                    ) : (
                      <ToggleLeft className="h-3.5 w-3.5" />
                    )}
                    {job.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Automation Logs */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Automation Logs</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Recent automated job runs and manual triggers
          </p>
        </div>

        <div className="divide-y divide-border">
          {logs.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-muted-foreground">No automation logs yet</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <div
                  className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    log.action.startsWith("AUTO_")
                      ? "bg-sky-400"
                      : log.action === "MANUAL_TRIGGER_JOB"
                      ? "bg-amber-400"
                      : log.action === "ENABLE_JOB"
                      ? "bg-emerald-400"
                      : log.action === "DISABLE_JOB"
                      ? "bg-red-400"
                      : "bg-slate-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    {log.entityId && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {log.entityId}
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <p className="text-[11px] text-muted-foreground truncate">{log.details}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {formatDate(log.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {logsPagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              Page {logsPagination.page} of {logsPagination.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadLogs(logsPagination.page - 1)}
                disabled={logsPagination.page <= 1}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => loadLogs(logsPagination.page + 1)}
                disabled={logsPagination.page >= logsPagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
