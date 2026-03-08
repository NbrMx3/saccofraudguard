import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  User,
  Phone,
  Eye,
  X,
  TrendingUp,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Landmark,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMemberRiskProfiles,
  fetchMemberRiskDetail,
  type RiskProfileData,
  type RiskProfile,
  type RiskDetailData,
} from "@/services/officerService";

const riskColors: Record<string, string> = {
  LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

const riskIcons: Record<string, React.ElementType> = {
  LOW: ShieldCheck,
  MEDIUM: Shield,
  HIGH: ShieldAlert,
  CRITICAL: AlertTriangle,
};

export default function MemberRiskProfilePage() {
  const [data, setData] = useState<RiskProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMemberRiskProfiles({
        page,
        riskLevel: riskFilter || undefined,
        search: searchDebounced || undefined,
      });
      setData(res);
    } catch {
      toast.error("Failed to load risk profiles");
    } finally {
      setLoading(false);
    }
  }, [page, riskFilter, searchDebounced]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Member Risk Profiles</h2>
        <p className="text-sm text-muted-foreground">
          View risk scores, monitor suspicious patterns, and identify high-risk members
        </p>
      </div>

      {/* Risk Summary */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Critical Risk" value={data.summary.critical} icon={AlertTriangle} color="bg-red-500/10 text-red-400" />
          <SummaryCard label="High Risk" value={data.summary.high} icon={ShieldAlert} color="bg-orange-500/10 text-orange-400" />
          <SummaryCard label="Medium Risk" value={data.summary.medium} icon={Shield} color="bg-amber-500/10 text-amber-400" />
          <SummaryCard label="Low Risk" value={data.summary.low} icon={ShieldCheck} color="bg-emerald-500/10 text-emerald-400" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <button onClick={load} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, ID, or phone…"
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-sky-500/50 sm:w-64"
          />
        </div>
      </div>

      {/* Profiles Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      ) : !data || data.profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Shield className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No risk profiles found</p>
          <p className="text-xs mt-1">Risk scores are calculated when members transact</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.profiles.map((profile) => (
            <RiskProfileCard
              key={profile.id}
              profile={profile}
              onViewDetail={() => setSelectedMemberId(profile.member.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page} of {data.totalPages} ({data.total} total)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-lg border border-border p-1.5 hover:bg-accent disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
              className="rounded-lg border border-border p-1.5 hover:bg-accent disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Member Risk Detail Modal */}
      {selectedMemberId && (
        <MemberRiskDetailModal
          memberId={selectedMemberId}
          onClose={() => setSelectedMemberId(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`rounded-lg p-2 ${color}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function RiskProfileCard({ profile, onViewDetail }: { profile: RiskProfile; onViewDetail: () => void }) {
  const RiskIcon = riskIcons[profile.riskLevel] || Shield;

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`rounded-lg p-2 ${riskColors[profile.riskLevel]}`}>
            <RiskIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground text-sm">{profile.member.fullName}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskColors[profile.riskLevel]}`}>
                {profile.riskLevel}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                profile.member.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
                profile.member.status === "SUSPENDED" ? "bg-red-500/10 text-red-400" :
                profile.member.status === "FLAGGED" ? "bg-amber-500/10 text-amber-400" :
                "bg-slate-500/10 text-slate-400"
              }`}>
                {profile.member.status}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{profile.member.memberId}</span>
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{profile.member.phoneNumber}</span>
              <span>Balance: <span className="text-foreground font-medium">KES {profile.member.balance.toLocaleString()}</span></span>
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
              <span className="text-muted-foreground">
                Risk Score: <span className="font-bold text-foreground">{profile.totalPoints}</span>
              </span>
              <span className="text-muted-foreground">
                Alerts: <span className={`font-bold ${profile.unresolvedAlerts > 0 ? "text-red-400" : "text-foreground"}`}>
                  {profile.alertCount} ({profile.unresolvedAlerts} unresolved)
                </span>
              </span>
              {profile.activeLoan && (
                <span className="text-muted-foreground">
                  Loan: <span className="font-mono text-foreground">{profile.activeLoan.loanRef}</span>
                  <span className={`ml-1 ${profile.activeLoan.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400"}`}>
                    ({profile.activeLoan.status})
                  </span>
                </span>
              )}
            </div>

            {/* Risk breakdown bar */}
            <div className="mt-2 flex items-center gap-1">
              {[
                { label: "Freq", value: profile.frequencyPoints, color: "bg-sky-500" },
                { label: "Amt", value: profile.amountPoints, color: "bg-amber-500" },
                { label: "Bhv", value: profile.behaviorPoints, color: "bg-violet-500" },
                { label: "NoDep", value: profile.noDepositPoints, color: "bg-red-500" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1" title={`${s.label}: ${s.value} points`}>
                  <div className={`h-1.5 rounded-full ${s.color}`} style={{ width: `${Math.max(4, s.value * 2)}px` }} />
                  <span className="text-[9px] text-muted-foreground">{s.label}:{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={onViewDetail} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-accent shrink-0">
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MemberRiskDetailModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const [data, setData] = useState<RiskDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailTab, setDetailTab] = useState<"alerts" | "transactions" | "loans">("alerts");

  useEffect(() => {
    setLoading(true);
    fetchMemberRiskDetail(memberId)
      .then(setData)
      .catch(() => toast.error("Failed to load member details"))
      .finally(() => setLoading(false));
  }, [memberId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Member Risk Detail</h3>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !data ? (
          <p className="py-8 text-center text-muted-foreground">No data available</p>
        ) : (
          <div className="space-y-5">
            {/* Member Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-accent/30 p-3">
                <p className="text-xs text-muted-foreground">Member</p>
                <p className="text-sm font-medium text-foreground">{data.member.fullName}</p>
                <p className="text-xs text-muted-foreground">{data.member.memberId} • {data.member.phoneNumber}</p>
              </div>
              <div className="rounded-lg bg-accent/30 p-3">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-lg font-bold text-foreground">KES {data.member.balance.toLocaleString()}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  data.member.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>{data.member.status}</span>
              </div>
            </div>

            {/* Risk Score */}
            {data.riskScore && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-foreground">Risk Assessment</span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${riskColors[data.riskScore.riskLevel]}`}>
                    {data.riskScore.riskLevel} — {data.riskScore.totalPoints} points
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <ScoreBar label="Frequency" value={data.riskScore.frequencyPoints} color="bg-sky-500" />
                  <ScoreBar label="Amount" value={data.riskScore.amountPoints} color="bg-amber-500" />
                  <ScoreBar label="Behavior" value={data.riskScore.behaviorPoints} color="bg-violet-500" />
                  <ScoreBar label="No Deposit" value={data.riskScore.noDepositPoints} color="bg-red-500" />
                </div>
                {data.riskScore.avgTransactionAmount && (
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Avg. Transaction: <span className="text-foreground">KES {Math.round(data.riskScore.avgTransactionAmount).toLocaleString()}</span></span>
                    {data.riskScore.transactionFrequency && (
                      <span>Tx Frequency: <span className="text-foreground">{data.riskScore.transactionFrequency.toFixed(1)}/month</span></span>
                    )}
                    <span>Last Updated: <span className="text-foreground">{new Date(data.riskScore.lastCalculatedAt).toLocaleDateString()}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* Detail Tabs */}
            <div className="flex gap-2">
              {[
                { key: "alerts" as const, label: "Fraud Alerts", icon: AlertTriangle, count: data.alerts.length },
                { key: "transactions" as const, label: "Recent Transactions", icon: Activity, count: data.recentTransactions.length },
                { key: "loans" as const, label: "Loans", icon: Landmark, count: data.loans.length },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setDetailTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    detailTab === t.key
                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                      : "bg-accent/30 text-muted-foreground border border-border hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {detailTab === "alerts" && (
              <div className="space-y-2 max-h-60 overflow-auto">
                {data.alerts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No fraud alerts</p>
                ) : data.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <span className="text-sm text-foreground">{alert.type.replace(/_/g, " ")}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskColors[alert.severity]}`}>{alert.severity}</span>
                      {alert.resolved ? (
                        <span className="text-[10px] text-emerald-400">Resolved</span>
                      ) : (
                        <span className="text-[10px] text-red-400">Open</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{new Date(alert.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === "transactions" && (
              <div className="space-y-2 max-h-60 overflow-auto">
                {data.recentTransactions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No transactions</p>
                ) : data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        tx.type === "DEPOSIT" ? "bg-emerald-500/10 text-emerald-400" :
                        tx.type === "WITHDRAWAL" ? "bg-amber-500/10 text-amber-400" :
                        tx.type === "LOAN_DISBURSEMENT" ? "bg-sky-500/10 text-sky-400" :
                        "bg-violet-500/10 text-violet-400"
                      }`}>{tx.type.replace("_", " ")}</span>
                      <span className="font-mono text-xs text-muted-foreground">{tx.txRef}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${
                        tx.type === "DEPOSIT" || tx.type === "LOAN_DISBURSEMENT" ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {tx.type === "DEPOSIT" || tx.type === "LOAN_DISBURSEMENT" ? "+" : "-"}KES {tx.amount.toLocaleString()}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                        tx.status === "FLAGGED" ? "bg-red-500/10 text-red-400" : "text-muted-foreground"
                      }`}>{tx.status}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === "loans" && (
              <div className="space-y-2 max-h-60 overflow-auto">
                {data.loans.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No loans</p>
                ) : data.loans.map((loan) => (
                  <div key={loan.loanRef} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <span className="font-mono text-xs text-foreground">{loan.loanRef}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Amount: KES {loan.amount.toLocaleString()} • Outstanding: KES {loan.outstandingBalance.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        loan.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        loan.status === "DEFAULTED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        loan.status === "COMPLETED" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}>{loan.status}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(loan.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="text-foreground font-medium">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, value * 2)}%` }} />
      </div>
    </div>
  );
}
