import { X, Wallet, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import type { Member } from "@/services/memberService";

interface SavingsHistoryModalProps {
  member: Member;
  onClose: () => void;
}

// Sample savings data — will be replaced with real API data when savings module is built
const sampleSavings = [
  { id: 1, date: "2026-02-20", type: "Deposit" as const, amount: 15000, balance: 145000, ref: "SAV-20260220-001" },
  { id: 2, date: "2026-02-15", type: "Withdrawal" as const, amount: 5000, balance: 130000, ref: "SAV-20260215-002" },
  { id: 3, date: "2026-02-10", type: "Deposit" as const, amount: 20000, balance: 135000, ref: "SAV-20260210-003" },
  { id: 4, date: "2026-02-01", type: "Deposit" as const, amount: 10000, balance: 115000, ref: "SAV-20260201-004" },
  { id: 5, date: "2026-01-25", type: "Interest" as const, amount: 1250, balance: 105000, ref: "SAV-20260125-INT" },
  { id: 6, date: "2026-01-20", type: "Deposit" as const, amount: 25000, balance: 103750, ref: "SAV-20260120-005" },
  { id: 7, date: "2026-01-15", type: "Withdrawal" as const, amount: 8000, balance: 78750, ref: "SAV-20260115-006" },
  { id: 8, date: "2026-01-05", type: "Deposit" as const, amount: 30000, balance: 86750, ref: "SAV-20260105-007" },
];

export default function SavingsHistoryModal({ member, onClose }: SavingsHistoryModalProps) {
  const totalDeposits = sampleSavings
    .filter((t) => t.type === "Deposit")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = sampleSavings
    .filter((t) => t.type === "Withdrawal")
    .reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = sampleSavings[0]?.balance ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.06] bg-[#0d1a30] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.06] p-6">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Savings History</h2>
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
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400/70">Current Balance</p>
            <p className="mt-1 text-lg font-bold text-emerald-400">
              KES {currentBalance.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-sky-400/70">Total Deposits</p>
            <p className="mt-1 text-lg font-bold text-sky-400">
              KES {totalDeposits.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-amber-400/70">Total Withdrawals</p>
            <p className="mt-1 text-lg font-bold text-amber-400">
              KES {totalWithdrawals.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Transaction table */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Date", "Reference", "Type", "Amount", "Balance"].map((h) => (
                  <th
                    key={h}
                    className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sampleSavings.map((tx) => (
                <tr key={tx.id} className="text-sm">
                  <td className="py-3 text-xs text-slate-400">
                    {new Date(tx.date).toLocaleDateString("en-KE", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 font-mono text-xs text-slate-300">{tx.ref}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        tx.type === "Deposit"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : tx.type === "Withdrawal"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-sky-500/10 text-sky-400"
                      }`}
                    >
                      {tx.type === "Deposit" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : tx.type === "Withdrawal" ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <ArrowRightLeft className="h-3 w-3" />
                      )}
                      {tx.type}
                    </span>
                  </td>
                  <td
                    className={`py-3 text-sm font-medium ${
                      tx.type === "Withdrawal" ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {tx.type === "Withdrawal" ? "−" : "+"} KES {tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm text-white">KES {tx.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
