import { useState, useEffect } from "react";
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
  Activity,
  Loader2,
} from "lucide-react";
import { fetchAdminStats, fetchFraudAlerts } from "@/services/adminService";
import UserManagement from "@/features/admin-dashboard/UserManagement";
import FraudAlerts from "@/features/admin-dashboard/FraudAlerts";
import AuditLogs from "@/features/admin-dashboard/AuditLogs";
import Analytics from "@/features/admin-dashboard/Analytics";
import RiskPolicies from "@/features/admin-dashboard/RiskPolicies";
import SystemConfig from "@/features/admin-dashboard/SystemConfig";
import RoleManagement from "@/features/admin-dashboard/RoleManagement";
import DataExports from "@/features/admin-dashboard/DataExports";

type AdminView = "dashboard" | "users" | "fraud" | "audit" | "analytics" | "risk" | "config" | "roles" | "exports";

const viewTitles: Record<AdminView, string> = {
  dashboard: "Dashboard Overview",
  users: "User Management",
  fraud: "Fraud Alerts",
  audit: "Audit Logs",
  analytics: "Analytics",
  risk: "Risk Policies",
  config: "System Configuration",
  roles: "Role Management",
  exports: "Data Exports",
};

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<AdminView>("dashboard");

  const navItems: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, active: activeView === "dashboard", onClick: () => setActiveView("dashboard") },
    { label: "User Management", icon: Users, active: activeView === "users", onClick: () => setActiveView("users") },
    { label: "Fraud Alerts", icon: AlertTriangle, active: activeView === "fraud", onClick: () => setActiveView("fraud") },
    { label: "Audit Logs", icon: FileText, active: activeView === "audit", onClick: () => setActiveView("audit") },
    { label: "Analytics", icon: BarChart3, active: activeView === "analytics", onClick: () => setActiveView("analytics") },
    { label: "Risk Policies", icon: ShieldCheck, active: activeView === "risk", onClick: () => setActiveView("risk") },
    { label: "System Config", icon: Settings, active: activeView === "config", onClick: () => setActiveView("config") },
    { label: "Role Management", icon: UserCog, active: activeView === "roles", onClick: () => setActiveView("roles") },
    { label: "Data Exports", icon: Database, active: activeView === "exports", onClick: () => setActiveView("exports") },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      roleLabel="System Administrator"
      roleBadgeColor="bg-violet-500/10 text-violet-400 dark:text-violet-400 border border-violet-500/20"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{viewTitles[activeView]}</h2>
      </div>

      {activeView === "dashboard" && <DashboardOverview onNavigate={setActiveView} />}
      {activeView === "users" && <UserManagement />}
      {activeView === "fraud" && <FraudAlerts />}
      {activeView === "audit" && <AuditLogs />}
      {activeView === "analytics" && <Analytics />}
      {activeView === "risk" && <RiskPolicies />}
      {activeView === "config" && <SystemConfig />}
      {activeView === "roles" && <RoleManagement />}
      {activeView === "exports" && <DataExports />}
    </DashboardLayout>
  );
}

// ─── Dashboard Overview (with live data) ────────────────────────────────
function DashboardOverview({ onNavigate }: { onNavigate: (v: AdminView) => void }) {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsData, alertsData] = await Promise.all([
          fetchAdminStats(),
          fetchFraudAlerts({ resolved: "false" }),
        ]);
        setStats(statsData);
        setRecentAlerts(alertsData.alerts?.slice(0, 4) || []);
      } catch {
        // Use fallback
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats?.totalUsers?.toLocaleString() || "0"}
          change={`${stats?.totalMembers || 0} members`}
          changeType="positive"
          icon={Users}
          iconColor="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="Fraud Alerts"
          value={stats?.unresolvedAlerts?.toString() || "0"}
          change={`${stats?.totalFraudAlerts || 0} total`}
          changeType={stats?.unresolvedAlerts ? "negative" : "positive"}
          icon={AlertTriangle}
          iconColor="bg-red-500/10 text-red-400"
        />
        <StatCard
          label="Transactions"
          value={stats?.totalTransactions?.toLocaleString() || "0"}
          change={`${stats?.flaggedTransactions || 0} flagged`}
          changeType={stats?.flaggedTransactions ? "negative" : "positive"}
          icon={ShieldCheck}
          iconColor="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          label="Active Loans"
          value={stats?.activeLoans?.toString() || "0"}
          change={`${stats?.totalLoans || 0} total loans`}
          changeType="positive"
          icon={Activity}
          iconColor="bg-amber-500/10 text-amber-400"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Manage Users", icon: Users, view: "users" as AdminView, color: "text-blue-500 dark:text-blue-400 bg-blue-500/10" },
              { label: "View Alerts", icon: AlertTriangle, view: "fraud" as AdminView, color: "text-red-500 dark:text-red-400 bg-red-500/10" },
              { label: "Analytics", icon: BarChart3, view: "analytics" as AdminView, color: "text-violet-500 dark:text-violet-400 bg-violet-500/10" },
              { label: "Export Data", icon: Database, view: "exports" as AdminView, color: "text-teal-500 dark:text-teal-400 bg-teal-500/10" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => onNavigate(action.view)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-4 hover:bg-accent transition-colors"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Unresolved Alerts</h3>
            <button
              onClick={() => onNavigate("fraud")}
              className="text-xs text-sky-500 dark:text-sky-400 hover:underline font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No unresolved alerts</p>
            ) : (
              recentAlerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                      alert.severity === "CRITICAL" || alert.severity === "HIGH"
                        ? "bg-red-400"
                        : alert.severity === "MEDIUM"
                        ? "bg-amber-400"
                        : "bg-blue-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{alert.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {alert.member?.fullName} — {new Date(alert.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* System overview */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Members", value: stats?.activeMembers || 0, color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Total Members", value: stats?.totalMembers || 0, color: "text-sky-500 dark:text-sky-400" },
          { label: "Total Alerts", value: stats?.totalFraudAlerts || 0, color: "text-amber-500 dark:text-amber-400" },
          { label: "System Users", value: stats?.totalUsers || 0, color: "text-violet-500 dark:text-violet-400" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </>
  );
}
