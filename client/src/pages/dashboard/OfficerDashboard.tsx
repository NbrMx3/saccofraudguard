import { useState, useCallback } from "react";
import DashboardLayout, { type NavItem } from "@/components/dashboard/DashboardLayout";
import MemberStatsCards from "@/features/officer-dashboard/MemberStatsCards";
import MemberListTable from "@/features/officer-dashboard/MemberListTable";
import MemberDetailModal from "@/features/officer-dashboard/MemberDetailModal";
import AddMemberForm from "@/features/officer-dashboard/AddMemberForm";
import SavingsHistoryModal from "@/features/officer-dashboard/SavingsHistoryModal";
import LoanHistoryModal from "@/features/officer-dashboard/LoanHistoryModal";
import type { Member } from "@/services/memberService";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileText,
  CreditCard,
  Search,
  Upload,
  Clock,
  BarChart3,
  TrendingUp,
} from "lucide-react";

type OfficerView = "dashboard" | "members";

export default function OfficerDashboard() {
  const [activeView, setActiveView] = useState<OfficerView>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [savingsMember, setSavingsMember] = useState<Member | null>(null);
  const [loansMember, setLoansMember] = useState<Member | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      active: activeView === "dashboard",
      onClick: () => setActiveView("dashboard"),
    },
    {
      label: "Member Accounts",
      icon: Users,
      active: activeView === "members",
      onClick: () => setActiveView("members"),
    },
    { label: "Transactions", icon: CreditCard },
    { label: "Fraud Alerts", icon: AlertTriangle },
    { label: "Case Investigation", icon: Search },
    { label: "Reports", icon: FileText },
    { label: "Document Upload", icon: Upload },
    { label: "Activity Log", icon: Clock },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      roleLabel="Loan Officer"
      roleBadgeColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
    >
      {activeView === "dashboard" && (
        <>
          {/* Live Member Stats */}
          <MemberStatsCards />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Chart placeholder */}
            <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Transaction Monitoring
                </h3>
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

            {/* Quick-add member */}
            <div>
              <AddMemberForm onMemberAdded={refresh} />
            </div>
          </div>

          {/* Recent members table */}
          <div className="mt-6">
            <MemberListTable
              refreshKey={refreshKey}
              onViewMember={setSelectedMember}
              onViewSavings={setSavingsMember}
              onViewLoans={setLoansMember}
            />
          </div>
        </>
      )}

      {activeView === "members" && (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Member Management</h2>
              <p className="text-sm text-slate-400">
                Create, view, and manage SACCO member accounts
              </p>
            </div>
            <AddMemberForm onMemberAdded={refresh} />
          </div>

          <MemberStatsCards />

          <div className="mt-6">
            <MemberListTable
              refreshKey={refreshKey}
              onViewMember={setSelectedMember}
              onViewSavings={setSavingsMember}
              onViewLoans={setLoansMember}
            />
          </div>
        </>
      )}

      {/* Member detail modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdated={() => {
            setSelectedMember(null);
            refresh();
          }}
          onViewSavings={(m) => {
            setSelectedMember(null);
            setSavingsMember(m);
          }}
          onViewLoans={(m) => {
            setSelectedMember(null);
            setLoansMember(m);
          }}
        />
      )}

      {/* Savings history modal */}
      {savingsMember && (
        <SavingsHistoryModal
          member={savingsMember}
          onClose={() => setSavingsMember(null)}
        />
      )}

      {/* Loan history modal */}
      {loansMember && (
        <LoanHistoryModal
          member={loansMember}
          onClose={() => setLoansMember(null)}
        />
      )}
    </DashboardLayout>
  );
}
