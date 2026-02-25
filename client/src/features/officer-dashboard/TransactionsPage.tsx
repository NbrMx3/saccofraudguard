import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  HandCoins,
  History,
  Wallet,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Transaction,
  type TransactionType,
  type TransactionStatus,
  type TransactionStats,
  type Loan,
  type BalanceInfo,
  recordDeposit,
  processWithdrawal,
  applyForLoan,
  repayLoan,
  fetchTransactionHistory,
  fetchBalance,
  fetchTransactionStats,
  fetchLoans,
} from "@/services/transactionService";
import { fetchMembers, type Member } from "@/services/memberService";

type TransactionTab = "deposit" | "withdraw" | "loan-apply" | "loan-repay" | "history" | "balance";

// ═══════════════════════════════════════════════════════════════════
// MAIN TRANSACTIONS PAGE
// ═══════════════════════════════════════════════════════════════════
export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<TransactionTab>("deposit");
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    fetchTransactionStats().then(setStats).catch(console.error);
  }, [refreshKey]);

  const tabs: { key: TransactionTab; label: string; icon: React.ElementType }[] = [
    { key: "deposit", label: "Deposit", icon: ArrowDownToLine },
    { key: "withdraw", label: "Withdraw", icon: ArrowUpFromLine },
    { key: "loan-apply", label: "Loan Application", icon: Landmark },
    { key: "loan-repay", label: "Loan Repayment", icon: HandCoins },
    { key: "history", label: "History", icon: History },
    { key: "balance", label: "Balance", icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Transactions</h2>
        <p className="text-sm text-slate-400">Record deposits, withdrawals, manage loans, and view transaction history</p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
          <StatsCard label="Total Transactions" value={stats.totalTransactions} icon={History} colors="bg-sky-500/10 text-sky-400" />
          <StatsCard label="Today's Transactions" value={stats.todayTransactions} icon={Clock} colors="bg-indigo-500/10 text-indigo-400" />
          <StatsCard label="Today Deposits" value={`KES ${stats.todayDeposits.toLocaleString()}`} icon={TrendingUp} colors="bg-emerald-500/10 text-emerald-400" />
          <StatsCard label="Today Withdrawals" value={`KES ${stats.todayWithdrawals.toLocaleString()}`} icon={TrendingDown} colors="bg-amber-500/10 text-amber-400" />
          <StatsCard label="Flagged" value={stats.flaggedTransactions} icon={AlertTriangle} colors="bg-red-500/10 text-red-400" />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                : "bg-slate-800/50 text-slate-400 border border-white/[0.06] hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "deposit" && <DepositForm onSuccess={refresh} />}
      {activeTab === "withdraw" && <WithdrawForm onSuccess={refresh} />}
      {activeTab === "loan-apply" && <LoanApplyForm onSuccess={refresh} />}
      {activeTab === "loan-repay" && <LoanRepayForm onSuccess={refresh} />}
      {activeTab === "history" && <TransactionHistoryTable refreshKey={refreshKey} />}
      {activeTab === "balance" && <BalanceChecker />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATS CARD
// ═══════════════════════════════════════════════════════════════════
function StatsCard({ label, value, icon: Icon, colors }: { label: string; value: string | number; icon: React.ElementType; colors: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className={`rounded-lg p-2 ${colors}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MEMBER SEARCH SELECTOR (shared by forms)
// ═══════════════════════════════════════════════════════════════════
function MemberSearch({ selectedId, onSelect }: { selectedId: string; onSelect: (m: Member) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { members } = await fetchMembers(1, query);
        setResults(members);
        setOpen(true);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm font-medium text-slate-300">Member</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (selectedId) onSelect({ id: "" } as Member); }}
          placeholder="Search by name or member ID..."
          className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-white/[0.08] bg-slate-800 shadow-xl">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onSelect(m); setQuery(`${m.fullName} (${m.memberId})`); setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50"
            >
              <span className="font-medium text-white">{m.fullName}</span>
              <span className="text-xs text-slate-500">{m.memberId}</span>
              <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                m.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
              }`}>{m.status}</span>
            </button>
          ))}
        </div>
      )}
      {selectedId && <p className="mt-1 text-xs text-emerald-400">Member selected ✓</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FRAUD RESULT BANNER
// ═══════════════════════════════════════════════════════════════════
function FraudBanner({ flagged, alerts }: { flagged: boolean; alerts: string[] }) {
  if (!flagged) return null;
  return (
    <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <div className="flex items-center gap-2 text-red-400">
        <ShieldAlert className="h-5 w-5" />
        <span className="font-semibold text-sm">Fraud Alert Triggered</span>
      </div>
      <ul className="mt-2 space-y-1">
        {alerts.map((a, i) => (
          <li key={i} className="text-xs text-red-300">• {a}</li>
        ))}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DEPOSIT FORM
// ═══════════════════════════════════════════════════════════════════
function DepositForm({ onSuccess }: { onSuccess: () => void }) {
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fraudResult, setFraudResult] = useState<{ flagged: boolean; alerts: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) { toast.error("Select a member first"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    setFraudResult(null);
    try {
      const res = await recordDeposit(memberId, Number(amount), description || undefined);
      toast.success(res.message);
      setFraudResult(res.fraudCheck);
      setAmount("");
      setDescription("");
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Deposit failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><ArrowDownToLine className="h-5 w-5" /></span>
        <div>
          <h3 className="text-sm font-semibold text-white">Record Deposit</h3>
          <p className="text-xs text-slate-400">Credit funds to a member's account</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <MemberSearch selectedId={memberId} onSelect={(m) => setMemberId(m.id)} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Amount (KES)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" step="any"
            placeholder="0.00" className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Monthly savings deposit" className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30" />
        </div>
        <button disabled={loading} type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
          {loading ? "Processing…" : "Record Deposit"}
        </button>
      </form>
      {fraudResult && <FraudBanner flagged={fraudResult.flagged} alerts={fraudResult.alerts} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WITHDRAWAL FORM
// ═══════════════════════════════════════════════════════════════════
function WithdrawForm({ onSuccess }: { onSuccess: () => void }) {
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fraudResult, setFraudResult] = useState<{ flagged: boolean; alerts: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) { toast.error("Select a member first"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    setFraudResult(null);
    try {
      const res = await processWithdrawal(memberId, Number(amount), description || undefined);
      toast.success(res.message);
      setFraudResult(res.fraudCheck);
      setAmount("");
      setDescription("");
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Withdrawal failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-lg bg-amber-500/10 p-2 text-amber-400"><ArrowUpFromLine className="h-5 w-5" /></span>
        <div>
          <h3 className="text-sm font-semibold text-white">Process Withdrawal</h3>
          <p className="text-xs text-slate-400">Debit funds from a member's account</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <MemberSearch selectedId={memberId} onSelect={(m) => setMemberId(m.id)} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Amount (KES)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" step="any"
            placeholder="0.00" className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Emergency withdrawal" className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30" />
        </div>
        <button disabled={loading} type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
          {loading ? "Processing…" : "Process Withdrawal"}
        </button>
      </form>
      {fraudResult && <FraudBanner flagged={fraudResult.flagged} alerts={fraudResult.alerts} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOAN APPLICATION FORM
// ═══════════════════════════════════════════════════════════════════
function LoanApplyForm({ onSuccess }: { onSuccess: () => void }) {
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState("12");
  const [termMonths, setTermMonths] = useState("12");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [fraudResult, setFraudResult] = useState<{ flagged: boolean; alerts: string[] } | null>(null);

  const monthlyPayment = (() => {
    const p = Number(amount), r = Number(interestRate) / 100 / 12, n = Number(termMonths);
    if (!p || !r || !n) return 0;
    return Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) { toast.error("Select a member first"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid loan amount"); return; }
    setLoading(true);
    setFraudResult(null);
    try {
      const res = await applyForLoan({
        memberId,
        amount: Number(amount),
        interestRate: Number(interestRate),
        termMonths: Number(termMonths),
        purpose: purpose || undefined,
      });
      toast.success(res.message);
      setFraudResult(res.fraudCheck);
      setAmount("");
      setPurpose("");
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Loan application failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-lg bg-sky-500/10 p-2 text-sky-400"><Landmark className="h-5 w-5" /></span>
        <div>
          <h3 className="text-sm font-semibold text-white">Loan Application</h3>
          <p className="text-xs text-slate-400">Apply and disburse a loan for a member</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <MemberSearch selectedId={memberId} onSelect={(m) => setMemberId(m.id)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Loan Amount (KES)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" step="any"
              placeholder="0.00" className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Interest Rate (%)</label>
            <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} min="0.1" step="0.1"
              className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Term (months)</label>
            <input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} min="1" max="60"
              className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30" />
          </div>
        </div>
        {monthlyPayment > 0 && (
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
            <p className="text-xs text-slate-400">Estimated Monthly Payment</p>
            <p className="text-lg font-bold text-sky-400">KES {monthlyPayment.toLocaleString()}</p>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Purpose (optional)</label>
          <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Business expansion" className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30" />
        </div>
        <button disabled={loading} type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-50">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
          {loading ? "Processing…" : "Approve & Disburse Loan"}
        </button>
      </form>
      {fraudResult && <FraudBanner flagged={fraudResult.flagged} alerts={fraudResult.alerts} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOAN REPAYMENT FORM
// ═══════════════════════════════════════════════════════════════════
function LoanRepayForm({ onSuccess }: { onSuccess: () => void }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [fraudResult, setFraudResult] = useState<{ flagged: boolean; alerts: string[] } | null>(null);

  useEffect(() => {
    fetchLoans({ status: "ACTIVE" })
      .then(({ loans: l }) => setLoans(l))
      .catch(console.error)
      .finally(() => setLoadingLoans(false));
  }, []);

  const selectedLoan = loans.find((l) => l.id === selectedLoanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) { toast.error("Select a loan"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    setFraudResult(null);
    try {
      const res = await repayLoan(selectedLoanId, Number(amount));
      toast.success(res.message);
      setFraudResult(res.fraudCheck);
      setAmount("");
      // Refresh loans list
      const { loans: updated } = await fetchLoans({ status: "ACTIVE" });
      setLoans(updated);
      setSelectedLoanId("");
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Repayment failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-lg bg-violet-500/10 p-2 text-violet-400"><HandCoins className="h-5 w-5" /></span>
        <div>
          <h3 className="text-sm font-semibold text-white">Loan Repayment</h3>
          <p className="text-xs text-slate-400">Process a repayment on an active loan</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Select Active Loan</label>
          {loadingLoans ? (
            <div className="flex items-center gap-2 text-sm text-slate-400"><RefreshCw className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : loans.length === 0 ? (
            <p className="rounded-lg border border-white/[0.06] bg-slate-800/30 p-4 text-center text-sm text-slate-500">No active loans found</p>
          ) : (
            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
            >
              <option value="">-- Choose a loan --</option>
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.loanRef} — {l.member.fullName} — Outstanding: KES {l.outstandingBalance.toLocaleString()}
                </option>
              ))}
            </select>
          )}
        </div>
        {selectedLoan && (
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Loan Amount</span><span className="text-white font-medium">KES {selectedLoan.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Total Repaid</span><span className="text-emerald-400 font-medium">KES {selectedLoan.totalRepaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Outstanding</span><span className="text-amber-400 font-medium">KES {selectedLoan.outstandingBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Monthly Payment</span><span className="text-white font-medium">KES {selectedLoan.monthlyPayment.toLocaleString()}</span>
            </div>
            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${Math.min(100, (selectedLoan.totalRepaid / selectedLoan.amount) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{((selectedLoan.totalRepaid / selectedLoan.amount) * 100).toFixed(1)}% repaid</p>
            </div>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Repayment Amount (KES)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" step="any"
            placeholder="0.00" className="w-full rounded-lg border border-white/[0.08] bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30" />
        </div>
        <button disabled={loading || loans.length === 0} type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
          {loading ? "Processing…" : "Process Repayment"}
        </button>
      </form>
      {fraudResult && <FraudBanner flagged={fraudResult.flagged} alerts={fraudResult.alerts} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION HISTORY TABLE
// ═══════════════════════════════════════════════════════════════════
function TransactionHistoryTable({ refreshKey }: { refreshKey: number }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "">("");
  const [searchMemberId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTransactionHistory({
        page,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        memberId: searchMemberId || undefined,
      });
      setTransactions(res.transactions);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, searchMemberId, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const typeColors: Record<TransactionType, string> = {
    DEPOSIT: "bg-emerald-500/10 text-emerald-400",
    WITHDRAWAL: "bg-amber-500/10 text-amber-400",
    LOAN_DISBURSEMENT: "bg-sky-500/10 text-sky-400",
    LOAN_REPAYMENT: "bg-violet-500/10 text-violet-400",
  };

  const statusIcons: Record<TransactionStatus, React.ReactNode> = {
    COMPLETED: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    PENDING: <Clock className="h-3.5 w-3.5 text-amber-400" />,
    FAILED: <XCircle className="h-3.5 w-3.5 text-red-400" />,
    FLAGGED: <AlertTriangle className="h-3.5 w-3.5 text-red-400" />,
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400"><History className="h-5 w-5" /></span>
          <div>
            <h3 className="text-sm font-semibold text-white">Transaction History</h3>
            <p className="text-xs text-slate-400">All processed transactions</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ""); setPage(1); }}
            className="rounded-lg border border-white/[0.08] bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-sky-500/50">
            <option value="">All Types</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="LOAN_DISBURSEMENT">Loan Disbursement</option>
            <option value="LOAN_REPAYMENT">Loan Repayment</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as TransactionStatus | ""); setPage(1); }}
            className="rounded-lg border border-white/[0.08] bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-sky-500/50">
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FLAGGED">Flagged</option>
            <option value="FAILED">Failed</option>
          </select>
          <button onClick={load} className="rounded-lg border border-white/[0.08] bg-slate-800/50 p-1.5 text-slate-400 hover:text-white">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-xs text-slate-500">
              <th className="pb-3 pr-4">Ref</th>
              <th className="pb-3 pr-4">Type</th>
              <th className="pb-3 pr-4">Member</th>
              <th className="pb-3 pr-4 text-right">Amount</th>
              <th className="pb-3 pr-4 text-right">Balance After</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-500"><RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2" />Loading…</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-500">No transactions found</td></tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-4 font-mono text-xs text-slate-300">{tx.txRef}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColors[tx.type]}`}>
                      {tx.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-white">{tx.member.fullName}</span>
                    <span className="ml-2 text-xs text-slate-500">{tx.member.memberId}</span>
                  </td>
                  <td className={`py-3 pr-4 text-right font-medium ${
                    tx.type === "DEPOSIT" || tx.type === "LOAN_DISBURSEMENT" ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {tx.type === "DEPOSIT" || tx.type === "LOAN_DISBURSEMENT" ? "+" : "-"}KES {tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-300">KES {tx.balanceAfter.toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-1">
                      {statusIcons[tx.status]}
                      <span className="text-xs text-slate-400">{tx.status}</span>
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-lg border border-white/[0.08] p-1.5 hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded-lg border border-white/[0.08] p-1.5 hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BALANCE CHECKER
// ═══════════════════════════════════════════════════════════════════
function BalanceChecker() {
  const [memberId, setMemberId] = useState("");
  const [info, setInfo] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (!memberId) { toast.error("Select a member first"); return; }
    setLoading(true);
    try {
      const data = await fetchBalance(memberId);
      setInfo(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Failed to fetch balance";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400"><Wallet className="h-5 w-5" /></span>
        <div>
          <h3 className="text-sm font-semibold text-white">Balance Inquiry</h3>
          <p className="text-xs text-slate-400">Check a member's account balance and summary</p>
        </div>
      </div>

      <div className="space-y-4">
        <MemberSearch selectedId={memberId} onSelect={(m) => setMemberId(m.id)} />
        <button onClick={handleCheck} disabled={loading || !memberId}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {loading ? "Loading…" : "Check Balance"}
        </button>
      </div>

      {info && (
        <div className="mt-6 space-y-4">
          {/* Balance card */}
          <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-sky-500/5 p-6 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Current Balance</p>
            <p className="mt-1 text-3xl font-bold text-white">KES {info.member.balance.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-400">{info.member.fullName} ({info.member.memberId})</p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-slate-800/30 p-4">
              <p className="text-xs text-slate-400">Total Deposits</p>
              <p className="mt-1 text-lg font-bold text-emerald-400">KES {info.summary.totalDeposits.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-slate-800/30 p-4">
              <p className="text-xs text-slate-400">Total Withdrawals</p>
              <p className="mt-1 text-lg font-bold text-amber-400">KES {info.summary.totalWithdrawals.toLocaleString()}</p>
            </div>
          </div>

          {/* Active loans */}
          {info.summary.activeLoans.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-slate-800/30 p-4">
              <p className="text-xs font-medium text-slate-400 mb-3">Active Loans</p>
              <div className="space-y-2">
                {info.summary.activeLoans.map((loan) => (
                  <div key={loan.loanRef} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                    <span className="font-mono text-xs text-slate-300">{loan.loanRef}</span>
                    <span className="text-sm font-medium text-amber-400">KES {loan.outstandingBalance.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
