import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  HandCoins,
  History,
  AlertTriangle,
  ShieldAlert,
  Eye,
  X,
  Filter,
  DollarSign,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────
type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "LOAN_DISBURSEMENT" | "LOAN_REPAYMENT";
type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED" | "FLAGGED";

interface AuditorTransaction {
  id: string;
  txRef: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  status: TransactionStatus;
  createdAt: string;
  member: { id: string; memberId: string; fullName: string; status: string };
  processedBy: { firstName: string; lastName: string };
}

interface TransactionDetail extends AuditorTransaction {
  member: {
    id: string;
    memberId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    status: string;
    balance: number;
  };
  processedBy: { firstName: string; lastName: string; email: string };
  loan: { loanRef: string; amount: number; outstandingBalance: number; status: string } | null;
  fraudAlerts: {
    id: string;
    type: string;
    severity: string;
    description: string;
    resolved: boolean;
    createdAt: string;
  }[];
}

interface TransactionMonitoringStats {
  totalTransactions: number;
  todayTransactions: number;
  flaggedTransactions: number;
  totalVolume: number;
  todayDeposits: number;
  todayWithdrawals: number;
  last30DaysCount: number;
  byType: Record<string, { count: number; volume: number }>;
  byStatus: Record<string, number>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filters {
  search: string;
  type: TransactionType | "";
  status: TransactionStatus | "";
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
}

// ── Helper functions ─────────────────────────────────────────────
function typeIcon(type: TransactionType) {
  switch (type) {
    case "DEPOSIT": return <ArrowDownToLine className="h-4 w-4 text-emerald-400" />;
    case "WITHDRAWAL": return <ArrowUpFromLine className="h-4 w-4 text-amber-400" />;
    case "LOAN_DISBURSEMENT": return <Landmark className="h-4 w-4 text-blue-400" />;
    case "LOAN_REPAYMENT": return <HandCoins className="h-4 w-4 text-violet-400" />;
  }
}

function typeLabel(type: TransactionType) {
  return type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadge(status: TransactionStatus) {
  const map: Record<TransactionStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    COMPLETED: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
    PENDING: { bg: "bg-amber-500/10", text: "text-amber-400", icon: <Clock className="h-3 w-3" /> },
    FAILED: { bg: "bg-red-500/10", text: "text-red-400", icon: <XCircle className="h-3 w-3" /> },
    FLAGGED: { bg: "bg-orange-500/10", text: "text-orange-400", icon: <ShieldAlert className="h-3 w-3" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
      {s.icon} {status}
    </span>
  );
}

function formatCurrency(amount: number) {
  return `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function TransactionMonitoringPage() {
  const [transactions, setTransactions] = useState<AuditorTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<TransactionMonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<TransactionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
  });

  // Fetch stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get("/api/auditor/transactions/stats");
      setStats(data);
    } catch {
      toast.error("Failed to load transaction stats");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch transactions
  const loadTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (filters.search) params.set("search", filters.search);
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.minAmount) params.set("minAmount", filters.minAmount);
      if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);

      const { data } = await api.get(`/api/auditor/transactions?${params}`);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // View transaction detail
  const viewDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/api/auditor/transactions/${id}`);
      setSelectedTx(data);
    } catch {
      toast.error("Failed to load transaction details");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTransactions(1);
  }, [loadTransactions]);

  const refresh = () => {
    loadStats();
    loadTransactions(pagination.page);
    toast.success("Data refreshed");
  };

  const clearFilters = () => {
    setFilters({ search: "", type: "", status: "", dateFrom: "", dateTo: "", minAmount: "", maxAmount: "" });
  };

  const hasActiveFilters = filters.type || filters.status || filters.dateFrom || filters.dateTo || filters.minAmount || filters.maxAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Transaction Monitoring</h2>
          <p className="text-sm text-slate-400">Monitor and track all member transaction activities</p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-sky-500" /></div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatsCard label="Total Transactions" value={stats.totalTransactions.toLocaleString()} icon={History} colors="bg-sky-500/10 text-sky-400" />
            <StatsCard label="Total Volume" value={formatCurrency(stats.totalVolume)} icon={DollarSign} colors="bg-emerald-500/10 text-emerald-400" />
            <StatsCard label="Flagged" value={stats.flaggedTransactions.toLocaleString()} icon={ShieldAlert} colors="bg-red-500/10 text-red-400" />
            <StatsCard label="Last 30 Days" value={stats.last30DaysCount.toLocaleString()} icon={Activity} colors="bg-violet-500/10 text-violet-400" />
          </div>

          {/* Type Breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {(["DEPOSIT", "WITHDRAWAL", "LOAN_DISBURSEMENT", "LOAN_REPAYMENT"] as TransactionType[]).map((t) => {
              const d = stats.byType[t] || { count: 0, volume: 0 };
              const icons: Record<TransactionType, React.ReactNode> = {
                DEPOSIT: <ArrowDownToLine className="h-4 w-4 text-emerald-400" />,
                WITHDRAWAL: <ArrowUpFromLine className="h-4 w-4 text-amber-400" />,
                LOAN_DISBURSEMENT: <Landmark className="h-4 w-4 text-blue-400" />,
                LOAN_REPAYMENT: <HandCoins className="h-4 w-4 text-violet-400" />,
              };
              return (
                <div key={t} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {icons[t]}
                    <span className="text-[11px] text-slate-400 font-medium">{typeLabel(t)}</span>
                  </div>
                  <p className="text-base font-bold text-white">{d.count}</p>
                  <p className="text-[11px] text-slate-500">{formatCurrency(d.volume)}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ref, member name, or description..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              showFilters || hasActiveFilters
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as TransactionType | "" }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="">All Types</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAWAL">Withdrawal</option>
                  <option value="LOAN_DISBURSEMENT">Loan Disbursement</option>
                  <option value="LOAN_REPAYMENT">Loan Repayment</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as TransactionStatus | "" }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="FLAGGED">Flagged</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Min Amount</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minAmount}
                  onChange={(e) => setFilters((f) => ({ ...f, minAmount: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Max Amount</label>
                <input
                  type="number"
                  placeholder="No limit"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters((f) => ({ ...f, maxAmount: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-[11px] text-sky-400 hover:text-sky-300 font-medium">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Balance After</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Processed By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-500 mx-auto" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500 text-xs">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{tx.txRef}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {typeIcon(tx.type)}
                        <span className="text-xs text-slate-300">{typeLabel(tx.type)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-medium text-white">{tx.member.fullName}</p>
                        <p className="text-[10px] text-slate-500">{tx.member.memberId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium ${
                        tx.type === "DEPOSIT" || tx.type === "LOAN_DISBURSEMENT" ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {tx.type === "WITHDRAWAL" || tx.type === "LOAN_REPAYMENT" ? "-" : "+"}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {formatCurrency(tx.balanceAfter)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(tx.status)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {tx.processedBy.firstName} {tx.processedBy.lastName}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => viewDetail(tx.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-sky-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-[11px] text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadTransactions(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
                const pg = start + i;
                if (pg > pagination.totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => loadTransactions(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      pg === pagination.page ? "bg-sky-500 text-white" : "text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => loadTransactions(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {(selectedTx || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              </div>
            ) : selectedTx && (
              <>
                {/* Modal Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-base font-semibold text-white">Transaction Details</h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">{selectedTx.txRef}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTx(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Transaction Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <InfoRow label="Type">
                    <div className="flex items-center gap-2">
                      {typeIcon(selectedTx.type)}
                      <span>{typeLabel(selectedTx.type)}</span>
                    </div>
                  </InfoRow>
                  <InfoRow label="Status">{statusBadge(selectedTx.status)}</InfoRow>
                  <InfoRow label="Amount">
                    <span className={`font-semibold ${
                      selectedTx.type === "DEPOSIT" || selectedTx.type === "LOAN_DISBURSEMENT" ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {formatCurrency(selectedTx.amount)}
                    </span>
                  </InfoRow>
                  <InfoRow label="Date">{formatDate(selectedTx.createdAt)}</InfoRow>
                  <InfoRow label="Balance Before">{formatCurrency(selectedTx.balanceBefore)}</InfoRow>
                  <InfoRow label="Balance After">{formatCurrency(selectedTx.balanceAfter)}</InfoRow>
                  {selectedTx.description && (
                    <InfoRow label="Description" full>{selectedTx.description}</InfoRow>
                  )}
                </div>

                {/* Member Info */}
                <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 mb-4">
                  <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Member Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow label="Name">{selectedTx.member.fullName}</InfoRow>
                    <InfoRow label="Member ID">{selectedTx.member.memberId}</InfoRow>
                    <InfoRow label="Email">{selectedTx.member.email}</InfoRow>
                    <InfoRow label="Phone">{selectedTx.member.phoneNumber}</InfoRow>
                    <InfoRow label="Account Status">
                      <span className={`text-xs font-medium ${
                        selectedTx.member.status === "ACTIVE" ? "text-emerald-400"
                          : selectedTx.member.status === "FLAGGED" ? "text-orange-400"
                          : selectedTx.member.status === "SUSPENDED" ? "text-red-400"
                          : "text-slate-400"
                      }`}>{selectedTx.member.status}</span>
                    </InfoRow>
                    <InfoRow label="Current Balance">{formatCurrency(selectedTx.member.balance)}</InfoRow>
                  </div>
                </div>

                {/* Processed By */}
                <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 mb-4">
                  <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Processed By</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow label="Officer">{selectedTx.processedBy.firstName} {selectedTx.processedBy.lastName}</InfoRow>
                    <InfoRow label="Email">{selectedTx.processedBy.email}</InfoRow>
                  </div>
                </div>

                {/* Loan Info */}
                {selectedTx.loan && (
                  <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 mb-4">
                    <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Linked Loan</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow label="Loan Ref">{selectedTx.loan.loanRef}</InfoRow>
                      <InfoRow label="Loan Amount">{formatCurrency(selectedTx.loan.amount)}</InfoRow>
                      <InfoRow label="Outstanding">{formatCurrency(selectedTx.loan.outstandingBalance)}</InfoRow>
                      <InfoRow label="Loan Status">{selectedTx.loan.status}</InfoRow>
                    </div>
                  </div>
                )}

                {/* Fraud Alerts */}
                {selectedTx.fraudAlerts.length > 0 && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <h4 className="text-xs font-semibold text-red-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" /> Fraud Alerts ({selectedTx.fraudAlerts.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedTx.fraudAlerts.map((alert) => (
                        <div key={alert.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-white">{alert.type}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              alert.severity === "CRITICAL" ? "bg-red-500/10 text-red-400"
                                : alert.severity === "HIGH" ? "bg-orange-500/10 text-orange-400"
                                : alert.severity === "MEDIUM" ? "bg-amber-500/10 text-amber-400"
                                : "bg-green-500/10 text-green-400"
                            }`}>{alert.severity}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{alert.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
                            <span>{formatDate(alert.createdAt)}</span>
                            <span className={alert.resolved ? "text-emerald-500" : "text-amber-500"}>
                              {alert.resolved ? "Resolved" : "Unresolved"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────
function StatsCard({ label, value, icon: Icon, colors }: { label: string; value: string | number; icon: React.ElementType; colors: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-500 font-medium">{label}</span>
        <div className={`p-1.5 rounded-lg ${colors.split(" ")[0]}`}>
          <Icon className={`h-4 w-4 ${colors.split(" ")[1]}`} />
        </div>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

// ── Info row ─────────────────────────────────────────────────────
function InfoRow({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[10px] text-slate-600 mb-0.5">{label}</p>
      <div className="text-xs text-slate-300">{children}</div>
    </div>
  );
}
