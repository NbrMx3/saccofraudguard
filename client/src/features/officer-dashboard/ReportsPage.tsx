import { useState, useEffect } from "react";
import { fetchReportSummary, type ReportSummary } from "@/services/officerService";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  CreditCard,
  Landmark,
  Loader2,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  DEPOSIT: "Deposits",
  WITHDRAWAL: "Withdrawals",
  LOAN_DISBURSEMENT: "Loan Disbursements",
  LOAN_REPAYMENT: "Loan Repayments",
};

export default function ReportsPage() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchReportSummary(range);
        setReport(data);
      } catch {
        toast.error("Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FileText className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">Failed to load report data</p>
      </div>
    );
  }

  const s = report.summary;
  const maxTrend = Math.max(...report.dailyTrend.map((d) => d.count), 1);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Officer activity and transaction reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">SaccoFraudGuard — Officer Report</h1>
        <p className="text-sm text-muted-foreground">
          Period: {new Date(report.period.since).toLocaleDateString("en-KE")} — {new Date().toLocaleDateString("en-KE")} ({report.period.days} days)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard icon={CreditCard} label="Transactions" value={s.totalTransactions} color="text-sky-500" />
        <SummaryCard icon={TrendingUp} label="Total Volume" value={`KES ${(s.totalVolume / 1000000).toFixed(1)}M`} color="text-emerald-500" />
        <SummaryCard icon={AlertTriangle} label="Fraud Alerts" value={s.fraudAlerts} sub={`${s.unresolvedAlerts} unresolved`} color="text-amber-500" />
        <SummaryCard icon={Users} label="Members" value={s.totalMembers} color="text-violet-500" />
        <SummaryCard icon={Landmark} label="Active Loans" value={s.activeLoans} sub={`${s.openCases} open cases`} color="text-blue-500" />
      </div>

      {/* Breakdowns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions by Type */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-500" />
            Transactions by Type
          </h3>
          <div className="space-y-3">
            {report.breakdowns.transactionsByType.map((t) => {
              const maxVol = Math.max(...report.breakdowns.transactionsByType.map((x) => x.volume), 1);
              const pct = (t.volume / maxVol) * 100;
              return (
                <div key={t.type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{typeLabels[t.type] || t.type}</span>
                    <span className="text-muted-foreground">
                      {t.count} tx · KES {t.volume.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-accent">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {report.breakdowns.transactionsByType.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No transactions in this period</p>
            )}
          </div>
        </div>

        {/* Alerts by Severity */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alerts by Severity
          </h3>
          <div className="space-y-3">
            {report.breakdowns.alertsBySeverity.map((a) => {
              const maxC = Math.max(...report.breakdowns.alertsBySeverity.map((x) => x.count), 1);
              const pct = (a.count / maxC) * 100;
              const barColor =
                a.severity === "CRITICAL" ? "bg-red-500" :
                a.severity === "HIGH" ? "bg-orange-500" :
                a.severity === "MEDIUM" ? "bg-amber-500" : "bg-blue-500";
              return (
                <div key={a.severity}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{a.severity}</span>
                    <span className="text-muted-foreground">{a.count} alert{a.count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-2 rounded-full bg-accent">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {report.breakdowns.alertsBySeverity.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No alerts in this period</p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Trend */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          Transaction Trend
        </h3>
        {report.dailyTrend.length > 0 ? (
          <div className="flex items-end gap-1 h-40">
            {report.dailyTrend.map((d) => {
              const h = (d.count / maxTrend) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                  <div
                    className="w-full rounded-t bg-sky-500/70 hover:bg-sky-500 transition-colors min-h-[2px]"
                    style={{ height: `${Math.max(h, 2)}%` }}
                  />
                  <span className="text-[8px] text-muted-foreground rotate-[-45deg] origin-top-left whitespace-nowrap">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
        )}
      </div>

      {/* Volume Summary Table */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Volume Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs text-muted-foreground font-medium">Metric</th>
                <th className="text-right py-2 text-xs text-muted-foreground font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr><td className="py-2 text-foreground">Total Deposits</td><td className="py-2 text-right font-mono text-foreground">KES {s.depositVolume.toLocaleString()}</td></tr>
              <tr><td className="py-2 text-foreground">Total Withdrawals</td><td className="py-2 text-right font-mono text-foreground">KES {s.withdrawalVolume.toLocaleString()}</td></tr>
              <tr><td className="py-2 text-foreground">Total Volume</td><td className="py-2 text-right font-mono font-bold text-foreground">KES {s.totalVolume.toLocaleString()}</td></tr>
              <tr><td className="py-2 text-foreground">Fraud Alerts Raised</td><td className="py-2 text-right font-mono text-amber-500">{s.fraudAlerts}</td></tr>
              <tr><td className="py-2 text-foreground">Unresolved Alerts</td><td className="py-2 text-right font-mono text-red-500">{s.unresolvedAlerts}</td></tr>
              <tr><td className="py-2 text-foreground">Open Investigation Cases</td><td className="py-2 text-right font-mono text-sky-500">{s.openCases}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
