import { useState, useEffect, useCallback } from "react";
import {
  fetchBehaviorAnalysis,
  fetchBehaviorSummary,
  type BehaviorAnalysis,
  type BehaviorSummary,
} from "@/services/fraudEngineService";
import {
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export default function BehaviorAnalysisPage() {
  const [analyses, setAnalyses] = useState<BehaviorAnalysis[]>([]);
  const [summary, setSummary] = useState<BehaviorSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchMember, setSearchMember] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisRes, summaryRes] = await Promise.all([
        fetchBehaviorAnalysis({ page, limit: 12 }),
        page === 1 ? fetchBehaviorSummary() : Promise.resolve(null),
      ]);
      setAnalyses(analysisRes.analyses);
      setTotal(analysisRes.total);
      if (summaryRes) setSummary(summaryRes);
    } catch {
      toast.error("Failed to load behavior data");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = async () => {
    if (!searchMember.trim()) { load(); return; }
    setLoading(true);
    try {
      const res = await fetchBehaviorAnalysis({ memberId: searchMember.trim() });
      setAnalyses(res.analyses);
      setTotal(res.total);
    } catch {
      toast.error("Member not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-cyan-500/10 p-2.5">
          <Activity className="h-6 w-6 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Behavior Analysis</h2>
          <p className="text-xs text-muted-foreground">Transaction patterns, frequency & deviation analysis per member</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Members", value: summary.totalMembers, icon: Users, color: "text-blue-400" },
            { label: "Total Transactions", value: summary.totalTransactions, icon: BarChart3, color: "text-violet-400" },
            { label: "Recent (30d)", value: summary.recentTransactions, icon: TrendingUp, color: "text-cyan-400" },
            { label: "Flagged Tx", value: summary.flaggedTransactions, icon: AlertTriangle, color: "text-amber-400" },
            { label: "Avg Amount", value: summary.avgTransactionAmount.toLocaleString(), icon: Activity, color: "text-emerald-400" },
            { label: "High Risk", value: summary.highRiskMembers, icon: TrendingDown, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchMember}
            onChange={(e) => setSearchMember(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by member ID..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 rounded-lg bg-cyan-600 text-xs font-medium text-white hover:bg-cyan-700">Search</button>
        {searchMember && <button onClick={() => { setSearchMember(""); load(); }} className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground">Clear</button>}
      </div>

      {/* Member Analyses */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>
      ) : analyses.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8">No behavior data available</p>
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => {
            const deviationColor = Math.abs(a.amountDeviationPercent) > 50 ? "text-red-400" : Math.abs(a.amountDeviationPercent) > 20 ? "text-amber-400" : "text-emerald-400";
            const expanded = expandedId === a.member.id;
            return (
              <div key={a.member.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : a.member.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        a.member.status === "FLAGGED" ? "bg-red-500/10 text-red-400" :
                        a.member.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-gray-500/10 text-gray-400"
                      }`}>{a.member.status}</span>
                      <span className="text-[10px] text-muted-foreground">{a.member.memberId}</span>
                      {a.flaggedTransactions > 0 && (
                        <span className="text-[10px] text-red-400 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> {a.flaggedTransactions} flagged</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground">{a.member.fullName}</p>
                    <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                      <span>{a.totalTransactions} tx</span>
                      <span>{a.deposits} deposits</span>
                      <span>{a.withdrawals} withdrawals</span>
                      <span>Avg: {a.avgAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${deviationColor}`}>
                        {a.amountDeviationPercent >= 0 ? "+" : ""}{a.amountDeviationPercent}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">deviation</p>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border p-4 bg-background/50">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div className="rounded-lg bg-card border border-border p-3 text-center">
                        <p className="text-lg font-bold text-foreground">{a.weeklyFrequency}</p>
                        <p className="text-[10px] text-muted-foreground">Tx/Week</p>
                      </div>
                      <div className="rounded-lg bg-card border border-border p-3 text-center">
                        <p className="text-lg font-bold text-foreground">{a.avgDeposit.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Avg Deposit</p>
                      </div>
                      <div className="rounded-lg bg-card border border-border p-3 text-center">
                        <p className="text-lg font-bold text-foreground">{a.avgWithdrawal.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Avg Withdrawal</p>
                      </div>
                      <div className="rounded-lg bg-card border border-border p-3 text-center">
                        <p className="text-lg font-bold text-foreground">{a.member.balance.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Balance</p>
                      </div>
                    </div>

                    {/* Historical comparison */}
                    <div className="rounded-lg bg-card border border-border p-3 mb-4">
                      <h4 className="text-xs font-semibold text-foreground mb-2">Amount Comparison (Recent vs Historical)</h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm font-bold text-cyan-400">{a.recentAvgAmount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Recent 30d Avg</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{a.historicalAvgAmount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Historical Avg</p>
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${deviationColor}`}>
                            {a.amountDeviationPercent >= 0 ? "+" : ""}{a.amountDeviationPercent}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">Deviation</p>
                        </div>
                      </div>
                    </div>

                    {/* Activity by day of week */}
                    <div className="rounded-lg bg-card border border-border p-3">
                      <h4 className="text-xs font-semibold text-foreground mb-2">
                        Activity Pattern <span className="text-muted-foreground font-normal">(Peak: {a.peakActivityDay})</span>
                      </h4>
                      <div className="flex items-end gap-1.5 h-20">
                        {a.activityByDay.map((d) => {
                          const maxDayCount = Math.max(...a.activityByDay.map((x) => x.count), 1);
                          return (
                            <div key={d.day} className="flex-1 flex flex-col items-center">
                              <div
                                className="w-full rounded-t-md bg-cyan-500/60 transition-all"
                                style={{ height: `${Math.max((d.count / maxDayCount) * 100, 4)}%` }}
                              />
                              <p className="text-[9px] text-muted-foreground mt-1">{d.day}</p>
                              <p className="text-[9px] font-medium text-foreground">{d.count}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {total > 12 && (
            <div className="flex justify-center gap-2 pt-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Prev</button>
              <span className="text-xs text-muted-foreground py-1">{page} / {Math.ceil(total / 12)}</span>
              <button disabled={page >= Math.ceil(total / 12)} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
