import { useState, useEffect, useMemo } from "react";
import DashboardLayout, { type NavItem } from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import AuditReviewsPage from "@/features/auditor-dashboard/AuditReviewsPage";
import CompliancePage from "@/features/auditor-dashboard/CompliancePage";
import FraudReportsPage from "@/features/auditor-dashboard/FraudReportsPage";
import InvestigationsPage from "@/features/auditor-dashboard/InvestigationsPage";
import AuditTrailPage from "@/features/auditor-dashboard/AuditTrailPage";
import ComplianceReportsPage from "@/features/auditor-dashboard/ComplianceReportsPage";
import ExportDataPage from "@/features/auditor-dashboard/ExportDataPage";
import TransactionMonitoringPage from "@/features/auditor-dashboard/TransactionMonitoringPage";
import FraudAnalyticsPage from "@/features/auditor-dashboard/FraudAnalyticsPage";
import { fetchAuditorStats, type AuditorDashboardStats } from "@/services/auditorService";
import {
  LayoutDashboard,
  FileSearch,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  Scale,
  History,
  Download,
  ShieldAlert,
  Loader2,
  ArrowRightLeft,
  BarChart3,
} from "lucide-react";

type AuditorView = "dashboard" | "audit-reviews" | "compliance" | "fraud-reports" | "investigations" | "audit-trail" | "compliance-reports" | "export-data" | "transaction-monitoring" | "fraud-analytics";

export default function AuditorDashboard() {
  const [currentView, setCurrentView] = useState<AuditorView>("dashboard");
  const [stats, setStats] = useState<AuditorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const auditorData = await fetchAuditorStats();
        setStats(auditorData);
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const navItems: NavItem[] = useMemo(() => [
    { label: "Dashboard", icon: LayoutDashboard, iconColor: "text-sky-500 dark:text-sky-400", active: currentView === "dashboard", onClick: () => setCurrentView("dashboard") },
    { label: "Transactions", icon: ArrowRightLeft, iconColor: "text-emerald-500 dark:text-emerald-400", active: currentView === "transaction-monitoring", onClick: () => setCurrentView("transaction-monitoring") },
    { label: "Fraud Reports", icon: AlertTriangle, iconColor: "text-red-500 dark:text-red-400", active: currentView === "fraud-reports", onClick: () => setCurrentView("fraud-reports") },
    { label: "Investigations", icon: ClipboardCheck, iconColor: "text-violet-500 dark:text-violet-400", active: currentView === "investigations", onClick: () => setCurrentView("investigations") },
    { label: "Fraud Analytics", icon: BarChart3, iconColor: "text-fuchsia-500 dark:text-fuchsia-400", active: currentView === "fraud-analytics", onClick: () => setCurrentView("fraud-analytics") },
    {
      label: "Audit Trail",
      icon: History,
      iconColor: "text-amber-500 dark:text-amber-400",
      children: [
        { label: "Audit Trail", icon: History, iconColor: "text-amber-500 dark:text-amber-400", active: currentView === "audit-trail", onClick: () => setCurrentView("audit-trail") },
        { label: "Audit Reviews", icon: FileSearch, iconColor: "text-orange-500 dark:text-orange-400", active: currentView === "audit-reviews", onClick: () => setCurrentView("audit-reviews") },
      ],
    },
    {
      label: "Compliances",
      icon: Scale,
      iconColor: "text-teal-500 dark:text-teal-400",
      children: [
        { label: "Compliance", icon: Scale, iconColor: "text-teal-500 dark:text-teal-400", active: currentView === "compliance", onClick: () => setCurrentView("compliance") },
        { label: "Compliance Reports", icon: FileText, iconColor: "text-indigo-500 dark:text-indigo-400", active: currentView === "compliance-reports", onClick: () => setCurrentView("compliance-reports") },
        { label: "Export Data", icon: Download, iconColor: "text-cyan-500 dark:text-cyan-400", active: currentView === "export-data", onClick: () => setCurrentView("export-data") },
      ],
    },
  ], [currentView]);

  return (
    <DashboardLayout
      navItems={navItems}
      roleLabel="Auditor"
      roleBadgeColor="bg-amber-500/10 text-amber-400 border border-amber-500/20"
    >
      {currentView === "transaction-monitoring" && <TransactionMonitoringPage />}
      {currentView === "audit-reviews" && <AuditReviewsPage />}
      {currentView === "compliance" && <CompliancePage />}
      {currentView === "fraud-reports" && <FraudReportsPage />}
      {currentView === "investigations" && <InvestigationsPage />}
      {currentView === "audit-trail" && <AuditTrailPage />}
      {currentView === "compliance-reports" && <ComplianceReportsPage />}
      {currentView === "export-data" && <ExportDataPage />}
      {currentView === "fraud-analytics" && <FraudAnalyticsPage />}

      {currentView === "dashboard" && (
        <>
          {/* Stats Grid */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard
                  label="Open Audits"
                  value={String(stats?.openReviews ?? 0)}
                  change={`${(stats?.openReviewsChange ?? 0) >= 0 ? "+" : ""}${stats?.openReviewsChange ?? 0} this month`}
                  changeType={(stats?.openReviewsChange ?? 0) > 0 ? "negative" : "positive"}
                  icon={FileSearch}
                  iconColor="bg-blue-500/10 text-blue-400"
                />
                <StatCard
                  label="Compliance Score"
                  value={`${stats?.complianceScore ?? 0}%`}
                  change="Based on system health"
                  changeType={(stats?.complianceScore ?? 0) >= 80 ? "positive" : "negative"}
                  icon={Scale}
                  iconColor="bg-sky-500/10 text-sky-400"
                />
                <StatCard
                  label="Critical Alerts"
                  value={String(stats?.criticalAlerts ?? 0)}
                  change={`${stats?.recentFindings ?? 0} findings this month`}
                  changeType={(stats?.criticalAlerts ?? 0) > 0 ? "negative" : "positive"}
                  icon={ShieldAlert}
                  iconColor="bg-red-500/10 text-red-400"
                />
                <StatCard
                  label="Reports Generated"
                  value={String(stats?.complianceReports ?? 0)}
                  change={`${(stats?.complianceReportsChange ?? 0) >= 0 ? "+" : ""}${stats?.complianceReportsChange ?? 0} vs prev. period`}
                  changeType={(stats?.complianceReportsChange ?? 0) >= 0 ? "positive" : "negative"}
                  icon={FileText}
                  iconColor="bg-violet-500/10 text-violet-400"
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Risk Breakdown */}
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Unresolved Alerts by Severity</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => {
                      const count = stats?.riskBreakdown?.[sev] ?? 0;
                      const colors: Record<string, string> = {
                        CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-amber-500", LOW: "bg-green-500",
                      };
                      const maxVal = Math.max(...Object.values(stats?.riskBreakdown ?? { x: 1 }), 1);
                      return (
                        <div key={sev} className="text-center">
                          <div className="h-32 flex items-end justify-center mb-2">
                            <div className={`w-10 rounded-t-lg ${colors[sev]} transition-all`}
                              style={{ height: `${Math.max((count / maxVal) * 100, 8)}%` }} />
                          </div>
                          <p className="text-lg font-bold text-foreground">{count}</p>
                          <p className="text-[10px] text-muted-foreground">{sev}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Reviews */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Recent Reviews</h3>
                  <div className="space-y-3">
                    {(stats?.recentReviews ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No reviews yet</p>
                    ) : (
                      stats!.recentReviews.map((r) => (
                        <div key={r.id} className="rounded-xl border border-border bg-background p-3">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-xs font-medium text-foreground truncate">{r.title}</p>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                              r.riskLevel === "CRITICAL" ? "bg-red-500/10 text-red-400"
                                : r.riskLevel === "HIGH" ? "bg-orange-500/10 text-orange-400"
                                : r.riskLevel === "MEDIUM" ? "bg-amber-500/10 text-amber-400"
                                : "bg-green-500/10 text-green-400"
                            }`}>{r.riskLevel}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{r.reviewRef}</span>
                            <span>{r.status.replace("_", " ")}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button onClick={() => setCurrentView("audit-reviews")}
                    className="w-full mt-3 text-xs text-sky-500 hover:text-sky-400 font-medium">
                    View All Reviews
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 rounded-2xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">System Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalLogs ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Audit Log Entries</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.recentFindings ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Findings This Month</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.openReviews ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Active Reviews</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.complianceReports ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Reports This Month</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
