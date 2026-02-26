import { useState, useEffect } from "react";
import { fetchAnalytics } from "@/services/adminService";
import { BarChart3, TrendingUp, PieChart, Activity } from "lucide-react";
import { toast } from "sonner";

interface AnalyticsData {
  txByType: Array<{ type: string; _count: number; _sum: { amount: number | null } }>;
  alertsBySeverity: Array<{ severity: string; _count: number }>;
  membersByStatus: Array<{ status: string; _count: number }>;
  dailyTransactions: Array<{ date: string; count: number; amount: number }>;
  dailyAlerts: Array<{ date: string; count: number }>;
  totalVolume: number;
}

const typeLabels: Record<string, string> = {
  DEPOSIT: "Deposits",
  WITHDRAWAL: "Withdrawals",
  LOAN_DISBURSEMENT: "Loan Disbursements",
  LOAN_REPAYMENT: "Loan Repayments",
};

const severityColors: Record<string, string> = {
  LOW: "bg-blue-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  INACTIVE: "bg-slate-500",
  SUSPENDED: "bg-red-500",
  FLAGGED: "bg-amber-500",
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchAnalytics();
        setData(result);
      } catch {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Failed to load analytics</div>;
  }

  const maxDailyCount = Math.max(...(data.dailyTransactions.map(d => d.count)), 1);
  const maxDailyAlertCount = Math.max(...(data.dailyAlerts.map(d => d.count)), 1);
  const totalAlerts = data.alertsBySeverity.reduce((s, a) => s + a._count, 0) || 1;
  const totalMembers = data.membersByStatus.reduce((s, m) => s + m._count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10">
              <TrendingUp className="h-4.5 w-4.5 text-sky-500 dark:text-sky-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total Volume</span>
          </div>
          <p className="text-2xl font-bold text-foreground">KES {data.totalVolume.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <Activity className="h-4.5 w-4.5 text-violet-500 dark:text-violet-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Transaction Types</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{data.txByType.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <PieChart className="h-4.5 w-4.5 text-amber-500 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total Alerts (30d)</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{data.dailyAlerts.reduce((s, a) => s + a.count, 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Volume Chart (bar chart) */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-500 dark:text-sky-400" /> Daily Transactions (30d)
          </h3>
          {data.dailyTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transaction data</p>
          ) : (
            <div className="flex items-end gap-[2px] h-40">
              {data.dailyTransactions.slice(-30).map((d) => (
                <div key={d.date} className="flex-1 group relative" title={`${d.date}: ${d.count} tx`}>
                  <div
                    className="w-full rounded-t bg-sky-500/80 dark:bg-sky-400/80 transition-all hover:bg-sky-500"
                    style={{ height: `${(d.count / maxDailyCount) * 100}%`, minHeight: d.count > 0 ? "4px" : "0" }}
                  />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover border border-border text-foreground text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg z-10">
                    {d.date}: {d.count} txs<br />KES {d.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Alerts */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-red-500 dark:text-red-400" /> Daily Fraud Alerts (30d)
          </h3>
          {data.dailyAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No alert data</p>
          ) : (
            <div className="flex items-end gap-[2px] h-40">
              {data.dailyAlerts.slice(-30).map((d) => (
                <div key={d.date} className="flex-1 group relative" title={`${d.date}: ${d.count}`}>
                  <div
                    className="w-full rounded-t bg-red-500/80 dark:bg-red-400/80 transition-all hover:bg-red-500"
                    style={{ height: `${(d.count / maxDailyAlertCount) * 100}%`, minHeight: d.count > 0 ? "4px" : "0" }}
                  />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover border border-border text-foreground text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg z-10">
                    {d.date}: {d.count} alerts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tx by Type */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Transactions by Type</h3>
          <div className="space-y-3">
            {data.txByType.map((t) => {
              const total = data.txByType.reduce((s, x) => s + x._count, 0) || 1;
              const pct = Math.round((t._count / total) * 100);
              return (
                <div key={t.type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{typeLabels[t.type] || t.type}</span>
                    <span className="text-muted-foreground">{t._count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-accent overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">KES {(t._sum.amount || 0).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alerts by Severity + Members by Status */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Alerts by Severity</h3>
            <div className="space-y-2">
              {data.alertsBySeverity.map((a) => (
                <div key={a.severity} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${severityColors[a.severity]}`} />
                  <span className="text-sm text-foreground flex-1">{a.severity}</span>
                  <span className="text-sm font-medium text-foreground">{a._count}</span>
                  <div className="w-20 h-1.5 rounded-full bg-accent overflow-hidden">
                    <div className={`h-full rounded-full ${severityColors[a.severity]}`} style={{ width: `${(a._count / totalAlerts) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Members by Status</h3>
            <div className="space-y-2">
              {data.membersByStatus.map((m) => (
                <div key={m.status} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${statusColors[m.status]}`} />
                  <span className="text-sm text-foreground flex-1">{m.status}</span>
                  <span className="text-sm font-medium text-foreground">{m._count}</span>
                  <div className="w-20 h-1.5 rounded-full bg-accent overflow-hidden">
                    <div className={`h-full rounded-full ${statusColors[m.status]}`} style={{ width: `${(m._count / totalMembers) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
