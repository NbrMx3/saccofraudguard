import { useState, useEffect, useCallback } from "react";
import {
  fetchDecisions,
  fetchDecisionStats,
  approveDecision,
  evaluateMember,
  type FraudDecision,
  type DecisionStats,
} from "@/services/fraudEngineService";
import {
  Brain,
  ShieldCheck,
  AlertTriangle,
  UserX,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const actionIcons: Record<string, typeof AlertTriangle> = {
  ALERT_TRIGGERED: AlertTriangle,
  SECOND_APPROVAL_REQUIRED: Lock,
  TRANSACTION_BLOCKED: XCircle,
  ACCOUNT_FLAGGED: UserX,
  MANUAL_REVIEW: Eye,
  AUTO_APPROVED: CheckCircle2,
};

const actionColors: Record<string, string> = {
  ALERT_TRIGGERED: "bg-red-500/10 text-red-400",
  SECOND_APPROVAL_REQUIRED: "bg-amber-500/10 text-amber-400",
  TRANSACTION_BLOCKED: "bg-red-500/10 text-red-400",
  ACCOUNT_FLAGGED: "bg-orange-500/10 text-orange-400",
  MANUAL_REVIEW: "bg-blue-500/10 text-blue-400",
  AUTO_APPROVED: "bg-emerald-500/10 text-emerald-400",
};

const riskColors: Record<string, string> = {
  LOW: "bg-green-500/10 text-green-400",
  MEDIUM: "bg-amber-500/10 text-amber-400",
  HIGH: "bg-orange-500/10 text-orange-400",
  CRITICAL: "bg-red-500/10 text-red-400",
};

export default function DecisionLogicPage() {
  const [decisions, setDecisions] = useState<FraudDecision[]>([]);
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterApproval, setFilterApproval] = useState("");

  // Evaluate form
  const [showEvaluate, setShowEvaluate] = useState(false);
  const [evalMemberId, setEvalMemberId] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{ riskScore: any; decisions: FraudDecision[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filterAction) params.action = filterAction;
      if (filterApproval) params.requiresApproval = filterApproval;
      const [decRes, statsRes] = await Promise.all([
        fetchDecisions(params),
        page === 1 ? fetchDecisionStats() : Promise.resolve(null),
      ]);
      setDecisions(decRes.decisions);
      setTotal(decRes.total);
      if (statsRes) setStats(statsRes);
    } catch {
      toast.error("Failed to load decisions");
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterApproval]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      await approveDecision(id, approved);
      toast.success(approved ? "Decision approved" : "Decision rejected");
      load();
    } catch {
      toast.error("Failed to process approval");
    }
  };

  const handleEvaluate = async () => {
    if (!evalMemberId.trim()) return toast.error("Enter a member ID");
    setEvaluating(true);
    setEvalResult(null);
    try {
      const result = await evaluateMember({ memberId: evalMemberId.trim() });
      setEvalResult(result);
      toast.success(`Evaluation complete: ${result.riskScore.riskLevel} risk`);
      load();
    } catch {
      toast.error("Evaluation failed — check member ID");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-500/10 p-2.5">
          <Brain className="h-6 w-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Decision Logic Layer</h2>
          <p className="text-xs text-muted-foreground">Automated fraud decisions — alerts, approvals, blocks & flagging</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Decisions", value: stats.total, icon: Brain, color: "text-indigo-400" },
            { label: "Pending Approvals", value: stats.pendingApprovals, icon: Lock, color: "text-amber-400" },
            { label: "Alerts Triggered", value: stats.alertsTriggered, icon: AlertTriangle, color: "text-red-400" },
            { label: "Accounts Flagged", value: stats.accountsFlagged, icon: UserX, color: "text-orange-400" },
            { label: "Auto-Approved", value: stats.autoApproved, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Blocked", value: stats.blocked, icon: XCircle, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Evaluate Member */}
      <div className="rounded-xl border border-indigo-500/30 bg-card p-4">
        <button onClick={() => setShowEvaluate(!showEvaluate)} className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Zap className="h-4 w-4 text-indigo-400" /> Evaluate Member Risk
        </button>
        {showEvaluate && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">Run the decision engine on a specific member to calculate risk and auto-generate decisions</p>
            <div className="flex gap-2">
              <input
                value={evalMemberId}
                onChange={(e) => setEvalMemberId(e.target.value)}
                placeholder="Member ID (database cuid)"
                className="flex-1 max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button onClick={handleEvaluate} disabled={evaluating} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {evaluating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Evaluate
              </button>
            </div>

            {evalResult && (
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${riskColors[evalResult.riskScore.riskLevel]}`}>
                    {evalResult.riskScore.riskLevel} — {evalResult.riskScore.totalPoints} pts
                  </span>
                  <span className="text-xs text-muted-foreground">{evalResult.decisions.length} decision(s) generated</span>
                </div>
                <div className="space-y-2">
                  {evalResult.decisions.map((d: any, i: number) => {
                    const Icon = actionIcons[d.action] || ShieldCheck;
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Icon className={`h-3.5 w-3.5 ${actionColors[d.action]?.split(" ")[1] || "text-muted-foreground"}`} />
                        <span className="font-medium text-foreground">{d.action.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">— {d.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="">All Actions</option>
          <option value="ALERT_TRIGGERED">Alert Triggered</option>
          <option value="SECOND_APPROVAL_REQUIRED">Second Approval</option>
          <option value="TRANSACTION_BLOCKED">Transaction Blocked</option>
          <option value="ACCOUNT_FLAGGED">Account Flagged</option>
          <option value="MANUAL_REVIEW">Manual Review</option>
          <option value="AUTO_APPROVED">Auto-Approved</option>
        </select>
        <select value={filterApproval} onChange={(e) => { setFilterApproval(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="">All Approvals</option>
          <option value="true">Needs Approval</option>
          <option value="false">No Approval Needed</option>
        </select>
      </div>

      {/* Decisions List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : decisions.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8">No decisions yet. Evaluate a member or run the rule engine to generate decisions.</p>
      ) : (
        <div className="space-y-3">
          {decisions.map((d) => {
            const Icon = actionIcons[d.action] || ShieldCheck;
            return (
              <div key={d.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${actionColors[d.action]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{d.action.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground">{d.member.fullName} ({d.member.memberId})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${riskColors[d.riskLevel]}`}>{d.riskLevel}</span>
                    <span className="text-xs font-bold text-foreground">{d.riskScore} pts</span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground mb-2">{d.reason}</p>

                {d.transaction && (
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Tx: {d.transaction.txRef} — {d.transaction.type} {d.transaction.amount.toLocaleString()}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(d.createdAt).toLocaleString()}</span>

                  {d.requiresApproval && d.approved === null && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(d.id, true)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </button>
                      <button onClick={() => handleApprove(d.id, false)} className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-red-700">
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  )}

                  {d.approved === true && (
                    <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Approved{d.approvedBy ? ` by ${d.approvedBy.firstName}` : ""}</span>
                  )}
                  {d.approved === false && (
                    <span className="text-red-400 flex items-center gap-0.5"><XCircle className="h-3 w-3" /> Rejected{d.approvedBy ? ` by ${d.approvedBy.firstName}` : ""}</span>
                  )}
                </div>
              </div>
            );
          })}

          {total > 15 && (
            <div className="flex justify-center gap-2 pt-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Prev</button>
              <span className="text-xs text-muted-foreground py-1">{page} / {Math.ceil(total / 15)}</span>
              <button disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
