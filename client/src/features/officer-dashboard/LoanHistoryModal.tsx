import { X, Landmark, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import type { Member } from "@/services/memberService";

interface LoanHistoryModalProps {
  member: Member;
  onClose: () => void;
}

type LoanStatus = "Active" | "Completed" | "Pending" | "Defaulted";

interface LoanRecord {
  id: number;
  loanId: string;
  type: string;
  amount: number;
  balance: number;
  interestRate: number;
  startDate: string;
  dueDate: string;
  status: LoanStatus;
  monthlyPayment: number;
}

// Sample loan data — will be replaced with real API data when loans module is built
const sampleLoans: LoanRecord[] = [
  {
    id: 1, loanId: "LN-2026-0042", type: "Personal Loan", amount: 150000,
    balance: 80000, interestRate: 12, startDate: "2025-08-15",
    dueDate: "2026-08-15", status: "Active", monthlyPayment: 14250,
  },
  {
    id: 2, loanId: "LN-2025-0198", type: "Emergency Loan", amount: 50000,
    balance: 0, interestRate: 10, startDate: "2025-03-01",
    dueDate: "2025-09-01", status: "Completed", monthlyPayment: 8750,
  },
  {
    id: 3, loanId: "LN-2026-0087", type: "Development Loan", amount: 300000,
    balance: 300000, interestRate: 14, startDate: "2026-02-20",
    dueDate: "2028-02-20", status: "Pending", monthlyPayment: 14500,
  },
  {
    id: 4, loanId: "LN-2024-0301", type: "Business Loan", amount: 200000,
    balance: 45000, interestRate: 15, startDate: "2024-06-10",
    dueDate: "2025-06-10", status: "Defaulted", monthlyPayment: 18500,
  },
];

const statusConfig: Record<LoanStatus, { icon: typeof CheckCircle; colors: string }> = {
  Active: { icon: Clock, colors: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  Completed: { icon: CheckCircle, colors: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  Pending: { icon: AlertTriangle, colors: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  Defaulted: { icon: XCircle, colors: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function LoanHistoryModal({ member, onClose }: LoanHistoryModalProps) {
  const totalBorrowed = sampleLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalOutstanding = sampleLoans
    .filter((l) => l.status === "Active" || l.status === "Defaulted")
    .reduce((sum, l) => sum + l.balance, 0);
  const activeLoans = sampleLoans.filter((l) => l.status === "Active").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.06] bg-[#0d1a30] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.06] p-6">
          <div>
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Loan History</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {member.fullName} — <span className="font-mono">{member.memberId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 border-b border-white/[0.06] p-6">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-violet-400/70">Total Borrowed</p>
            <p className="mt-1 text-lg font-bold text-violet-400">
              KES {totalBorrowed.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-red-400/70">Outstanding Balance</p>
            <p className="mt-1 text-lg font-bold text-red-400">
              KES {totalOutstanding.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-sky-400/70">Active Loans</p>
            <p className="mt-1 text-lg font-bold text-sky-400">{activeLoans}</p>
          </div>
        </div>

        {/* Loan cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {sampleLoans.map((loan) => {
            const cfg = statusConfig[loan.status];
            const StatusIcon = cfg.icon;
            const paid = loan.amount - loan.balance;
            const progress = loan.amount > 0 ? (paid / loan.amount) * 100 : 0;

            return (
              <div
                key={loan.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{loan.type}</p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.colors}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {loan.status}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">{loan.loanId}</p>
                  </div>
                  <p className="text-sm font-bold text-white">
                    KES {loan.amount.toLocaleString()}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Repaid: KES {paid.toLocaleString()}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        loan.status === "Defaulted"
                          ? "bg-red-500"
                          : loan.status === "Completed"
                          ? "bg-emerald-500"
                          : "bg-violet-500"
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Interest Rate</p>
                    <p className="font-medium text-white">{loan.interestRate}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Monthly Payment</p>
                    <p className="font-medium text-white">KES {loan.monthlyPayment.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Start Date</p>
                    <p className="font-medium text-white">
                      {new Date(loan.startDate).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Due Date</p>
                    <p className="font-medium text-white">
                      {new Date(loan.dueDate).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
