import DashboardLayout, { type NavItem } from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileText,
  CreditCard,
  Search,
  Upload,
  Clock,
  TrendingUp,
  BarChart3,
  CheckCircle,
  XCircle,
} from "lucide-react";

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Member Accounts", icon: Users },
  { label: "Transactions", icon: CreditCard },
  { label: "Fraud Alerts", icon: AlertTriangle },
  { label: "Case Investigation", icon: Search },
  { label: "Reports", icon: FileText },
  { label: "Document Upload", icon: Upload },
  { label: "Activity Log", icon: Clock },
];

export default function OfficerDashboard() {
  return (
    <DashboardLayout
      navItems={navItems}
      roleLabel="Loan Officer"
      roleBadgeColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending Reviews"
          value="14"
          change="3 urgent"
          changeType="negative"
          icon={Clock}
          iconColor="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          label="Cases Resolved"
          value="42"
          change="+8 this week"
          changeType="positive"
          icon={CheckCircle}
          iconColor="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          label="Flagged Transactions"
          value="7"
          change="2 new today"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="bg-red-500/10 text-red-400"
        />
        <StatCard
          label="Approved Loans"
          value="KES 2.4M"
          change="+18% this month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-blue-500/10 text-blue-400"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart placeholder */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Transaction Monitoring</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <TrendingUp className="h-3.5 w-3.5" />
              Weekly overview
            </div>
          </div>
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <div className="text-center text-slate-500">
              <BarChart3 className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Transaction volume chart</p>
              <p className="text-xs">Monitoring flagged vs approved</p>
            </div>
          </div>
        </div>

        {/* Pending cases */}
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Pending Cases</h3>
          <div className="space-y-3">
            {[
              { member: "John K.", type: "Loan Override", priority: "High", time: "10 min" },
              { member: "Grace W.", type: "Large Withdrawal", priority: "Medium", time: "45 min" },
              { member: "Samuel O.", type: "Account Anomaly", priority: "High", time: "2 hrs" },
              { member: "Faith M.", type: "Transfer Review", priority: "Low", time: "4 hrs" },
            ].map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{c.member}</p>
                  <p className="text-[10px] text-slate-500">{c.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      c.priority === "High"
                        ? "bg-red-500/10 text-red-400"
                        : c.priority === "Medium"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {c.priority}
                  </span>
                  <span className="text-[10px] text-slate-500">{c.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Member Accounts Table */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Member Accounts</h3>
          <button className="text-xs text-sky-400 hover:text-sky-300 font-medium">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Member ID", "Name", "Account Type", "Balance", "Last Activity", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="pb-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                { id: "MBR-201", name: "Alice Njeri", type: "Savings", balance: "KES 145,000", activity: "Today", status: "Active" },
                { id: "MBR-203", name: "Brian Otieno", type: "Loan", balance: "KES -80,000", activity: "Yesterday", status: "Active" },
                { id: "MBR-207", name: "Carol Wanjiku", type: "Savings", balance: "KES 320,000", activity: "3 days ago", status: "Flagged" },
                { id: "MBR-211", name: "David Kiprotich", type: "Savings", balance: "KES 52,000", activity: "1 week ago", status: "Inactive" },
              ].map((row) => (
                <tr key={row.id} className="text-sm">
                  <td className="py-3 text-slate-300 font-mono text-xs">{row.id}</td>
                  <td className="py-3 text-white">{row.name}</td>
                  <td className="py-3 text-slate-400">{row.type}</td>
                  <td className="py-3 text-white font-medium">{row.balance}</td>
                  <td className="py-3 text-slate-400 text-xs">{row.activity}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === "Active"
                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          : row.status === "Flagged"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      {row.status === "Active" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : row.status === "Flagged" ? (
                        <XCircle className="h-3 w-3" />
                      ) : null}
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
