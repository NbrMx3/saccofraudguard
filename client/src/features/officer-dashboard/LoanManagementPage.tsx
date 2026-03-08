import { useState, useEffect, useCallback } from "react";
import {
  Landmark,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchLoanManagement,
  approveLoan,
  rejectLoan,
  type LoanManagementData,
  type ManagedLoan,
  type DefaultRiskLoan,
} from "@/services/officerService";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVED: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DEFAULTED: "bg-red-500/10 text-red-400 border-red-500/20",
  REJECTED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const riskBadge: Record<string, string> = {
  HIGH: "bg-red-500/10 text-red-400",
  MEDIUM: "bg-amber-500/10 text-amber-400",
  LOW: "bg-emerald-500/10 text-emerald-400",
};

type Tab = "all" | "pending" | "active" | "default-risk";

export default function LoanManagementPage() {
  const [data, setData] = useState<LoanManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<ManagedLoan | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = tab === "pending" ? "PENDING" : tab === "active" ? "ACTIVE" : undefined;
      const res = await fetchLoanManagement({ page, status: statusFilter, search: searchDebounced || undefined });
      setData(res);
    } catch {
      toast.error("Failed to load loans");
    } finally {
      setLoading(false);
    }
  }, [page, tab, searchDebounced]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      await approveLoan(id);
      toast.success("Loan approved and disbursed");
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Failed to approve";
      toast.error(msg);
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioning(id);
    try {
      await rejectLoan(id);
      toast.success("Loan rejected");
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Failed to reject";
      toast.error(msg);
    } finally {
      setActioning(null);
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "All Loans", count: data?.total },
    { key: "pending", label: "Pending Approval", count: data?.stats.pendingLoans },
    { key: "active", label: "Active Loans", count: data?.stats.activeLoans },
    { key: "default-risk", label: "Default Risk", count: data?.defaultRisk.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Loan Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage loan applications, approvals, repayment tracking, and default risk
        </p>
      </div>

      {/* Stats cards */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatBox label="Active Loans" value={data.stats.activeLoans} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-400" />
          <StatBox label="Pending" value={data.stats.pendingLoans} icon={Clock} color="bg-amber-500/10 text-amber-400" />
          <StatBox label="Defaulted" value={data.stats.defaultedLoans} icon={AlertTriangle} color="bg-red-500/10 text-red-400" />
          <StatBox label="Completed" value={data.stats.completedLoans} icon={TrendingUp} color="bg-blue-500/10 text-blue-400" />
          <StatBox label="Outstanding" value={`KES ${Math.round(data.stats.totalOutstanding).toLocaleString()}`} icon={TrendingDown} color="bg-orange-500/10 text-orange-400" />
          <StatBox label="Total Repaid" value={`KES ${Math.round(data.stats.totalRepaid).toLocaleString()}`} icon={Landmark} color="bg-violet-500/10 text-violet-400" />
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                tab === t.key
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1.5 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px]">{t.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by loan ref or member…"
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-sky-500/50 sm:w-64"
          />
        </div>
      </div>

      {/* Default Risk Tab */}
      {tab === "default-risk" ? (
        <DefaultRiskTable risks={data?.defaultRisk || []} loading={loading} />
      ) : (
        /* Loans Table */
        <div className="rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-3">Loan Ref</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3">Repayment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center text-muted-foreground"><RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2" />Loading…</td></tr>
                ) : !data || data.loans.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">No loans found</td></tr>
                ) : (
                  data.loans.map((loan) => {
                    const pct = loan.amount > 0 ? Math.min(100, (loan.totalRepaid / loan.amount) * 100) : 0;
                    return (
                      <tr key={loan.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-foreground">{loan.loanRef}</td>
                        <td className="px-4 py-3">
                          <span className="text-foreground">{loan.member.fullName}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">{loan.member.memberId}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">KES {loan.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-amber-400">KES {loan.outstandingBalance.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="w-20">
                            <div className="h-1.5 w-full rounded-full bg-muted">
                              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColors[loan.status]}`}>
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(loan.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setSelectedLoan(loan)} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent">
                              <Eye className="h-4 w-4" />
                            </button>
                            {loan.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => handleApprove(loan.id)}
                                  disabled={actioning === loan.id}
                                  className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                                >
                                  {actioning === loan.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => handleReject(loan.id)}
                                  disabled={actioning === loan.id}
                                  className="rounded p-1 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>Page {page} of {data.totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="rounded-lg border border-border p-1.5 hover:bg-accent disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  className="rounded-lg border border-border p-1.5 hover:bg-accent disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <LoanDetailModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          actioning={actioning}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`rounded-lg p-2 ${color}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function DefaultRiskTable({ risks, loading }: { risks: DefaultRiskLoan[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-400" />
          <h3 className="text-sm font-semibold text-foreground">Loan Default Risk Monitor</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Active loans where repayment is behind schedule
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
      ) : risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">No loans at default risk</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {risks.map((loan) => (
            <div key={loan.id} className="p-4 hover:bg-accent/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${riskBadge[loan.riskLevel]}`}>
                    {loan.riskLevel}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-foreground">{loan.member.fullName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{loan.member.memberId}</span>
                  </div>
                </div>
                <button onClick={() => setExpanded(expanded === loan.id ? null : loan.id)} className="text-muted-foreground hover:text-foreground">
                  {expanded === loan.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Ref: <span className="font-mono text-foreground">{loan.loanRef}</span></span>
                <span>Amount: <span className="text-foreground">KES {loan.amount.toLocaleString()}</span></span>
                <span>Repaid: <span className="text-emerald-400">{loan.repaymentRatio}%</span> of expected</span>
              </div>
              {expanded === loan.id && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg bg-accent/30 p-3">
                  <div><p className="text-[10px] text-muted-foreground">Months Elapsed</p><p className="text-sm font-medium text-foreground">{loan.monthsElapsed}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Expected Repaid</p><p className="text-sm font-medium text-foreground">KES {loan.expectedRepaid.toLocaleString()}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Actually Repaid</p><p className="text-sm font-medium text-emerald-400">KES {loan.totalRepaid.toLocaleString()}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Outstanding</p><p className="text-sm font-medium text-amber-400">KES {loan.outstandingBalance.toLocaleString()}</p></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoanDetailModal({
  loan,
  onClose,
  onApprove,
  onReject,
  actioning,
}: {
  loan: ManagedLoan;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actioning: string | null;
}) {
  const pct = loan.amount > 0 ? Math.min(100, (loan.totalRepaid / loan.amount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Loan Details</h3>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-foreground">{loan.loanRef}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusColors[loan.status]}`}>{loan.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-accent/30 p-3">
              <p className="text-xs text-muted-foreground">Member</p>
              <p className="text-sm font-medium text-foreground">{loan.member.fullName}</p>
              <p className="text-xs text-muted-foreground">{loan.member.memberId} • {loan.member.phoneNumber}</p>
            </div>
            <div className="rounded-lg bg-accent/30 p-3">
              <p className="text-xs text-muted-foreground">Loan Amount</p>
              <p className="text-lg font-bold text-foreground">KES {loan.amount.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-accent/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Interest Rate</p>
              <p className="text-sm font-bold text-foreground">{loan.interestRate}%</p>
            </div>
            <div className="rounded-lg bg-accent/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Term</p>
              <p className="text-sm font-bold text-foreground">{loan.termMonths} months</p>
            </div>
            <div className="rounded-lg bg-accent/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Monthly Payment</p>
              <p className="text-sm font-bold text-foreground">KES {loan.monthlyPayment.toLocaleString()}</p>
            </div>
          </div>

          {/* Repayment progress */}
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Repayment Progress</span>
              <span>{pct.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-emerald-400">Repaid: KES {loan.totalRepaid.toLocaleString()}</span>
              <span className="text-amber-400">Outstanding: KES {loan.outstandingBalance.toLocaleString()}</span>
            </div>
          </div>

          {loan.purpose && (
            <div>
              <p className="text-xs text-muted-foreground">Purpose</p>
              <p className="text-sm text-foreground">{loan.purpose}</p>
            </div>
          )}

          {loan.approvedBy && (
            <p className="text-xs text-muted-foreground">
              Approved by: {loan.approvedBy.firstName} {loan.approvedBy.lastName}
            </p>
          )}

          {loan.status === "PENDING" && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => onApprove(loan.id)}
                disabled={actioning === loan.id}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve & Disburse
              </button>
              <button
                onClick={() => onReject(loan.id)}
                disabled={actioning === loan.id}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
