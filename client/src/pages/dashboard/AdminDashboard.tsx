import DashboardLayout, { type NavItem } from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  ShieldCheck,
  Settings,
  BarChart3,
  FileText,
  UserCog,
  Database,
  TrendingUp,
  Activity,
} from "lucide-react";

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "User Management", icon: Users },
  { label: "Fraud Alerts", icon: AlertTriangle },
  { label: "Audit Logs", icon: FileText },
  { label: "Analytics", icon: BarChart3 },
  { label: "Risk Policies", icon: ShieldCheck },
  { label: "System Config", icon: Settings },
  { label: "Role Management", icon: UserCog },
  { label: "Data Exports", icon: Database },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout
      navItems={navItems}
      roleLabel="System Administrator"
      roleBadgeColor="bg-violet-500/10 text-violet-400 border border-violet-500/20"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value="1,247"
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          iconColor="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="Fraud Alerts"
          value="23"
          change="+5 new today"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="bg-red-500/10 text-red-400"
        />
        <StatCard
          label="Resolved Cases"
          value="187"
          change="95% resolution rate"
          changeType="positive"
          icon={ShieldCheck}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          label="System Health"
          value="99.9%"
          change="All services operational"
          changeType="positive"
          icon={Activity}
          iconColor="bg-amber-500/10 text-amber-400"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart placeholder */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Fraud Detection Trends</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <TrendingUp className="h-3.5 w-3.5" />
              Last 30 days
            </div>
          </div>
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <div className="text-center text-slate-500">
              <BarChart3 className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Chart visualization</p>
              <p className="text-xs">Fraud detection data over time</p>
            </div>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {[
              { text: "Suspicious transaction detected", time: "2 min ago", severity: "high" },
              { text: "Multiple failed login attempts", time: "15 min ago", severity: "medium" },
              { text: "Unusual withdrawal pattern", time: "1 hr ago", severity: "high" },
              { text: "New device login", time: "3 hrs ago", severity: "low" },
            ].map((alert, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3"
              >
                <div
                  className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    alert.severity === "high"
                      ? "bg-red-400"
                      : alert.severity === "medium"
                      ? "bg-amber-400"
                      : "bg-blue-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">{alert.text}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table placeholder */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
          <button className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Transaction ID", "Member", "Type", "Amount", "Risk Score", "Status"].map(
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
                { id: "TXN-001", member: "John Doe", type: "Withdrawal", amount: "KES 50,000", risk: 85, status: "Flagged" },
                { id: "TXN-002", member: "Jane Smith", type: "Transfer", amount: "KES 120,000", risk: 42, status: "Cleared" },
                { id: "TXN-003", member: "Peter Mwangi", type: "Deposit", amount: "KES 200,000", risk: 12, status: "Cleared" },
                { id: "TXN-004", member: "Mary Achieng", type: "Withdrawal", amount: "KES 75,000", risk: 91, status: "Under Review" },
              ].map((row) => (
                <tr key={row.id} className="text-sm">
                  <td className="py-3 text-slate-300 font-mono text-xs">{row.id}</td>
                  <td className="py-3 text-white">{row.member}</td>
                  <td className="py-3 text-slate-400">{row.type}</td>
                  <td className="py-3 text-white font-medium">{row.amount}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.risk >= 80
                          ? "bg-red-500/10 text-red-400"
                          : row.risk >= 40
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {row.risk}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === "Flagged"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : row.status === "Cleared"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
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
