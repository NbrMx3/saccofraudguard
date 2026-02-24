import DashboardLayout, { type NavItem } from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import {
  LayoutDashboard,
  FileSearch,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  Scale,
  History,
  Download,
  TrendingUp,
  BarChart3,
  ShieldAlert,
  FileWarning,
} from "lucide-react";

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Audit Reviews", icon: FileSearch },
  { label: "Compliance", icon: Scale },
  { label: "Fraud Reports", icon: AlertTriangle },
  { label: "Investigations", icon: ClipboardCheck },
  { label: "Audit Trail", icon: History },
  { label: "Compliance Reports", icon: FileText },
  { label: "Export Data", icon: Download },
];

export default function AuditorDashboard() {
  return (
    <DashboardLayout
      navItems={navItems}
      roleLabel="Auditor"
      roleBadgeColor="bg-amber-500/10 text-amber-400 border border-amber-500/20"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Open Audits"
          value="8"
          change="2 due this week"
          changeType="negative"
          icon={FileSearch}
          iconColor="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="Compliance Score"
          value="94%"
          change="+2% from last audit"
          changeType="positive"
          icon={Scale}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          label="Risk Findings"
          value="12"
          change="3 critical"
          changeType="negative"
          icon={ShieldAlert}
          iconColor="bg-red-500/10 text-red-400"
        />
        <StatCard
          label="Reports Generated"
          value="34"
          change="+6 this month"
          changeType="positive"
          icon={FileText}
          iconColor="bg-violet-500/10 text-violet-400"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart placeholder */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Compliance Trends</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <TrendingUp className="h-3.5 w-3.5" />
              Quarterly view
            </div>
          </div>
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <div className="text-center text-slate-500">
              <BarChart3 className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Compliance score chart</p>
              <p className="text-xs">Trend analysis over quarters</p>
            </div>
          </div>
        </div>

        {/* Risk findings */}
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Top Risk Findings</h3>
          <div className="space-y-3">
            {[
              { finding: "Unauthorized access patterns", category: "Security", risk: "Critical" },
              { finding: "Missing transaction approvals", category: "Process", risk: "High" },
              { finding: "Outdated KYC documents", category: "Compliance", risk: "Medium" },
              { finding: "Incomplete audit trails", category: "Documentation", risk: "High" },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs font-medium text-white">{f.finding}</p>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      f.risk === "Critical"
                        ? "bg-red-500/10 text-red-400"
                        : f.risk === "High"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {f.risk}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">{f.category}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Reports Table */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Recent Audit Reports</h3>
          <button className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Report ID", "Title", "Category", "Date", "Findings", "Status"].map((h) => (
                  <th
                    key={h}
                    className="pb-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                { id: "AUD-041", title: "Q2 Financial Review", category: "Financial", date: "2025-06-15", findings: 3, status: "In Progress" },
                { id: "AUD-040", title: "KYC Compliance Check", category: "Compliance", date: "2025-06-10", findings: 5, status: "Completed" },
                { id: "AUD-039", title: "Transaction Fraud Scan", category: "Security", date: "2025-06-05", findings: 2, status: "Completed" },
                { id: "AUD-038", title: "Loan Portfolio Risk", category: "Risk", date: "2025-05-28", findings: 7, status: "Under Review" },
              ].map((row) => (
                <tr key={row.id} className="text-sm">
                  <td className="py-3 text-slate-300 font-mono text-xs">{row.id}</td>
                  <td className="py-3 text-white">{row.title}</td>
                  <td className="py-3 text-slate-400">{row.category}</td>
                  <td className="py-3 text-slate-400 text-xs">{row.date}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                      <FileWarning className="h-3 w-3" />
                      {row.findings}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === "Completed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : row.status === "In Progress"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
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
