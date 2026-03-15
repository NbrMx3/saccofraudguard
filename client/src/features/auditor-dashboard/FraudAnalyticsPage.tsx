import { useState, useEffect } from "react";
import type React from "react";
import { fetchFraudAnalytics, type FraudAnalyticsData } from "@/services/auditorService";
import {
  BarChart3,
  TrendingUp,
  Users,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Target,
  Activity,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";

const riskColors: Record<string, string> = {
  LOW: "bg-green-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const riskTextColors: Record<string, string> = {
  LOW: "text-green-400",
  MEDIUM: "text-amber-400",
  HIGH: "text-orange-400",
  CRITICAL: "text-red-400",
};

export default function FraudAnalyticsPage() {
  const [data, setData] = useState<FraudAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const analytics = await fetchFraudAnalytics();
        setData(analytics);
      } catch {
        toast.error("Failed to load fraud analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-muted-foreground">Failed to load analytics</div>;
  }

  const maxMonthlyTotal = Math.max(...data.monthlyTrends.map((m) => m.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Fraud Analytics</h2>
        <p className="text-sm text-muted-foreground">Statistical analysis of fraud patterns and detection performance</p>
      </div>

      {/* Detection Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatBox label="Total Alerts" value={data.detectionStats.totalAlerts} icon={ShieldAlert} color="text-red-400 bg-red-500/10" />
        <StatBox label="Resolved" value={data.detectionStats.resolvedAlerts} icon={Target} color="text-emerald-400 bg-emerald-500/10" />
        <StatBox label="Resolution Rate" value={`${data.detectionStats.resolutionRate}%`} icon={TrendingUp} color="text-sky-400 bg-sky-500/10" />
        <StatBox label="Confirmed Fraud" value={data.detectionStats.confirmedFraud} icon={AlertTriangle} color="text-amber-400 bg-amber-500/10" />
        <StatBox label="Unresolved" value={data.detectionStats.unresolvedAlerts} icon={Activity} color="text-orange-400 bg-orange-500/10" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Fraud Cases per Month Chart */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-400" /> Fraud Cases per Month
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months trend</p>

          {data.monthlyTrends.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <div className="space-y-3">
              {data.monthlyTrends.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{m.month}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-6 bg-accent rounded-lg overflow-hidden flex">
                      <div
                        className="h-full bg-red-500/80 transition-all"
                        style={{ width: `${(m.critical / maxMonthlyTotal) * 100}%` }}
                        title={`Critical: ${m.critical}`}
                      />
                      <div
                        className="h-full bg-orange-500/80 transition-all"
                        style={{ width: `${(m.high / maxMonthlyTotal) * 100}%` }}
                        title={`High: ${m.high}`}
                      />
                      <div
                        className="h-full bg-amber-500/80 transition-all"
                        style={{ width: `${(m.medium / maxMonthlyTotal) * 100}%` }}
                        title={`Medium: ${m.medium}`}
                      />
                      <div
                        className="h-full bg-green-500/80 transition-all"
                        style={{ width: `${(m.low / maxMonthlyTotal) * 100}%` }}
                        title={`Low: ${m.low}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-8 text-right">{m.total}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Critical</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500" /> High</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Medium</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> Low</span>
              </div>
            </div>
          )}
        </div>

        {/* Fraud by Transaction Type */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-violet-400" /> Fraud by Alert Type
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution of fraud alerts by type</p>

          {data.fraudByType.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <div className="space-y-3">
              {data.fraudByType
                .sort((a, b) => b.count - a.count)
                .map((item, i) => {
                  const maxCount = Math.max(...data.fraudByType.map((f) => f.count), 1);
                  const colors = ["bg-sky-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500", "bg-red-500", "bg-indigo-500"];
                  return (
                    <div key={item.type} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground font-medium">{item.type}</span>
                        <span className="text-xs text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="w-full h-3 bg-accent rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                          style={{ width: `${(item.count / maxCount) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Risk Score Distribution */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-400" /> Risk Score Distribution
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Members categorized by risk level</p>

          <div className="grid grid-cols-4 gap-4 text-center">
            {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((level) => {
              const count = data.riskDistribution[level] || 0;
              const total = Object.values(data.riskDistribution).reduce((s, v) => s + v, 0) || 1;
              return (
                <div key={level}>
                  <div className="h-28 flex items-end justify-center mb-2">
                    <div className={`w-12 rounded-t-xl ${riskColors[level]} transition-all`}
                      style={{ height: `${Math.max((count / total) * 100, 8)}%` }} />
                  </div>
                  <p className={`text-lg font-bold ${riskTextColors[level]}`}>{count}</p>
                  <p className="text-[10px] text-muted-foreground">{level}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Suspicious Transaction Patterns */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" /> Suspicious Transaction Patterns
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Flagged transactions by type and volume</p>

          {data.suspiciousPatterns.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No flagged transactions</p>
          ) : (
            <div className="space-y-3">
              {data.suspiciousPatterns.map((pattern) => (
                <div key={pattern.type} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{pattern.type.replace("_", " ")}</span>
                    <span className="text-xs font-semibold text-red-400">{pattern.count} flagged</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total amount: KES {pattern.totalAmount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* High-Risk Members Table */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Users className="h-4 w-4 text-orange-400" /> High-Risk Members
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Members with HIGH or CRITICAL risk scores</p>

        {data.highRiskMembers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No high-risk members detected</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Member ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Risk Level</th>
                  <th className="px-4 py-3 text-right">Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.highRiskMembers.map((m) => (
                  <tr key={m.memberId} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{m.memberId}</td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">{m.fullName}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        m.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
                        m.status === "FLAGGED" ? "bg-amber-500/10 text-amber-400" :
                        m.status === "SUSPENDED" ? "bg-red-500/10 text-red-400" :
                        "bg-gray-500/10 text-gray-400"
                      }`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-right text-foreground">KES {m.balance.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.riskLevel === "CRITICAL" ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"
                      }`}>{m.riskLevel}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-right font-bold text-foreground">{m.totalScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color} mb-3`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
