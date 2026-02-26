import { useState, useEffect } from "react";
import { fetchComplianceStats, type ComplianceStats } from "@/services/auditorService";
import { Scale, Users, AlertTriangle, ShieldCheck, Activity, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function CompliancePage() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchComplianceStats();
        setStats(data);
      } catch {
        toast.error("Failed to load compliance data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>;
  }

  if (!stats) {
    return <div className="text-center py-20 text-muted-foreground">Failed to load compliance data</div>;
  }

  const scoreColor = stats.complianceScore >= 80 ? "text-emerald-500" : stats.complianceScore >= 60 ? "text-amber-500" : "text-red-500";
  const scoreRing = stats.complianceScore >= 80 ? "border-emerald-500" : stats.complianceScore >= 60 ? "border-amber-500" : "border-red-500";

  const checks = [
    {
      label: "Member KYC Compliance",
      description: "Active members with valid status",
      value: stats.totalMembers > 0 ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 100,
      pass: stats.flaggedMembers === 0 && stats.suspendedMembers === 0,
      detail: `${stats.activeMembers}/${stats.totalMembers} active, ${stats.flaggedMembers} flagged, ${stats.suspendedMembers} suspended`,
    },
    {
      label: "Transaction Integrity",
      description: "Transactions without fraud flags",
      value: stats.totalTransactions > 0 ? Math.round(((stats.totalTransactions - stats.flaggedTransactions) / stats.totalTransactions) * 100) : 100,
      pass: stats.flaggedTransactions === 0,
      detail: `${stats.flaggedTransactions} flagged out of ${stats.totalTransactions} total`,
    },
    {
      label: "Fraud Alert Resolution",
      description: "All fraud alerts addressed",
      value: stats.totalAlerts > 0 ? Math.round(((stats.totalAlerts - stats.unresolvedAlerts) / stats.totalAlerts) * 100) : 100,
      pass: stats.unresolvedAlerts === 0,
      detail: `${stats.unresolvedAlerts} unresolved out of ${stats.totalAlerts} total`,
    },
    {
      label: "Risk Policy Coverage",
      description: "All risk policies enabled",
      value: stats.policies > 0 ? Math.round((stats.enabledPolicies / stats.policies) * 100) : 100,
      pass: stats.enabledPolicies === stats.policies,
      detail: `${stats.enabledPolicies}/${stats.policies} policies active`,
    },
    {
      label: "User Activity Monitoring",
      description: "Staff active in last 30 days",
      value: stats.recentLogins > 0 ? 100 : 0,
      pass: stats.recentLogins > 0,
      detail: `${stats.recentLogins} users active recently`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Compliance Overview</h2>
        <p className="text-sm text-muted-foreground">System-wide compliance health assessment</p>
      </div>

      {/* Score Card */}
      <div className="rounded-2xl border border-border bg-card p-8 flex flex-col md:flex-row items-center gap-8">
        <div className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${scoreRing} bg-background`}>
          <div className="text-center">
            <p className={`text-3xl font-bold ${scoreColor}`}>{stats.complianceScore}%</p>
            <p className="text-xs text-muted-foreground">Score</p>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Overall Compliance Score</h3>
          <p className="text-sm text-muted-foreground">
            Calculated from member KYC status, transaction integrity, fraud alert resolution, and risk policy coverage.
          </p>
          <div className="w-full bg-accent rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${stats.complianceScore >= 80 ? "bg-emerald-500" : stats.complianceScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${stats.complianceScore}%` }} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Members", value: stats.totalMembers, icon: Users, color: "text-blue-400 bg-blue-500/10" },
          { label: "Flagged Members", value: stats.flaggedMembers, icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10" },
          { label: "Unresolved Alerts", value: stats.unresolvedAlerts, icon: ShieldCheck, color: "text-red-400 bg-red-500/10" },
          { label: "Active Policies", value: `${stats.enabledPolicies}/${stats.policies}`, icon: Activity, color: "text-emerald-400 bg-emerald-500/10" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.color} mb-3`}>
              <card.icon className="h-4.5 w-4.5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Compliance Checks */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Scale className="h-4 w-4 text-sky-500" /> Compliance Checks
        </h3>
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.label} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {check.pass ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{check.label}</p>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${check.value >= 80 ? "text-emerald-500" : check.value >= 60 ? "text-amber-500" : "text-red-500"}`}>
                  {check.value}%
                </span>
              </div>
              <div className="ml-8">
                <div className="w-full bg-accent rounded-full h-2 mb-1">
                  <div className={`h-2 rounded-full ${check.value >= 80 ? "bg-emerald-500" : check.value >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${check.value}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
