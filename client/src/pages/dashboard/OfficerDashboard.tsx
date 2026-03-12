import { useState, useCallback } from "react";
import DashboardLayout, { type NavItem } from "@/components/dashboard/DashboardLayout";
import MemberStatsCards from "@/features/officer-dashboard/MemberStatsCards";
import MemberListTable from "@/features/officer-dashboard/MemberListTable";
import MemberDetailModal from "@/features/officer-dashboard/MemberDetailModal";
import AddMemberForm from "@/features/officer-dashboard/AddMemberForm";
import SavingsHistoryModal from "@/features/officer-dashboard/SavingsHistoryModal";
import LoanHistoryModal from "@/features/officer-dashboard/LoanHistoryModal";
import TransactionsPage from "@/features/officer-dashboard/TransactionsPage";
import OfficerFraudAlerts from "@/features/officer-dashboard/OfficerFraudAlerts";
import CaseInvestigationPage from "@/features/officer-dashboard/CaseInvestigation";
import ReportsPage from "@/features/officer-dashboard/ReportsPage";
import DocumentUploadPage from "@/features/officer-dashboard/DocumentUploadPage";
import ActivityLogPage from "@/features/officer-dashboard/ActivityLogPage";
import LoanManagementPage from "@/features/officer-dashboard/LoanManagementPage";
import MemberRiskProfilePage from "@/features/officer-dashboard/MemberRiskProfilePage";
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
  Landmark,
  ShieldAlert,
} from "lucide-react";

type OfficerView =
  | "dashboard"
  | "members"
  | "transactions"
  | "loan-management"
  | "fraud-alerts"
  | "risk-profiles"
  | "cases"
  | "reports"
  | "documents"
  | "activity";

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
      iconColor: "text-sky-500 dark:text-sky-400",
      active: activeView === "dashboard",
      onClick: () => setActiveView("dashboard"),
    },
    {
      label: "Member Accounts",
      icon: Users,
      iconColor: "text-blue-500 dark:text-blue-400",
      active: activeView === "members",
      onClick: () => setActiveView("members"),
    },
    {
      label: "Transactions",
      icon: CreditCard,
      iconColor: "text-emerald-500 dark:text-emerald-400",
      active: activeView === "transactions",
      onClick: () => setActiveView("transactions"),
    },
    {
      label: "Loan Management",
      icon: Landmark,
      iconColor: "text-teal-500 dark:text-teal-400",
      active: activeView === "loan-management",
      onClick: () => setActiveView("loan-management"),
    },
    {
      label: "Fraud Alerts",
      icon: AlertTriangle,
      iconColor: "text-red-500 dark:text-red-400",
      active: activeView === "fraud-alerts",
      onClick: () => setActiveView("fraud-alerts"),
    },
    {
      label: "Risk Profiles",
      icon: ShieldAlert,
      iconColor: "text-orange-500 dark:text-orange-400",
      active: activeView === "risk-profiles",
      onClick: () => setActiveView("risk-profiles"),
    },
    {
      label: "Case Investigation",
      icon: Search,
      iconColor: "text-violet-500 dark:text-violet-400",
      active: activeView === "cases",
      onClick: () => setActiveView("cases"),
    },
    {
      label: "Reports",
      icon: FileText,
      iconColor: "text-amber-500 dark:text-amber-400",
      active: activeView === "reports",
      onClick: () => setActiveView("reports"),
    },
    {
      label: "Document Upload",
      icon: Upload,
      iconColor: "text-indigo-500 dark:text-indigo-400",
      active: activeView === "documents",
      onClick: () => setActiveView("documents"),
    },
    {
      label: "Activity Log",
      icon: Clock,
      iconColor: "text-cyan-500 dark:text-cyan-400",
      active: activeView === "activity",
      onClick: () => setActiveView("activity"),
    },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      roleLabel="Loan Officer"
      roleBadgeColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
    >
      {activeView === "dashboard" && (
        <>
          <MemberStatsCards />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Transaction Monitoring
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Weekly overview
                </div>
              </div>
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-accent/30">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="mx-auto h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">Transaction volume chart</p>
                  <p className="text-xs">Monitoring flagged vs approved</p>
                </div>
              </div>
            </div>

            <div>
              <AddMemberForm onMemberAdded={refresh} />
            </div>
          </div>

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
              <h2 className="text-lg font-semibold text-foreground">Member Management</h2>
              <p className="text-sm text-muted-foreground">
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

      {activeView === "transactions" && <TransactionsPage />}
      {activeView === "loan-management" && <LoanManagementPage />}
      {activeView === "fraud-alerts" && <OfficerFraudAlerts />}
      {activeView === "risk-profiles" && <MemberRiskProfilePage />}
      {activeView === "cases" && <CaseInvestigationPage />}
      {activeView === "reports" && <ReportsPage />}
      {activeView === "documents" && <DocumentUploadPage />}
      {activeView === "activity" && <ActivityLogPage />}

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

      {savingsMember && (
        <SavingsHistoryModal
          member={savingsMember}
          onClose={() => setSavingsMember(null)}
        />
      )}

      {loansMember && (
        <LoanHistoryModal
          member={loansMember}
          onClose={() => setLoansMember(null)}
        />
      )}
    </DashboardLayout>
  );
}
