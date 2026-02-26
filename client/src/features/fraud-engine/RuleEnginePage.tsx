import { useState, useEffect, useCallback } from "react";
import {
  fetchFraudRules,
  createFraudRule,
  updateFraudRule,
  deleteFraudRule,
  runFraudRules,
  fetchRuleViolations,
  reviewViolation,
  fetchThresholds,
  saveThresholds,
  fetchWithdrawalRequests,
  createWithdrawalRequest,
  reviewWithdrawalRequest,
  type FraudRule,
  type RuleViolation,
  type WithdrawalThreshold,
  type WithdrawalRequest,
} from "@/services/fraudEngineService";
import {
  Shield,
  Plus,
  Play,
  Settings,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const RULE_TYPES = ["FREQUENCY", "AMOUNT", "NO_DEPOSIT", "CUSTOM"] as const;
const SEVERITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const sevColors: Record<string, string> = {
  LOW: "bg-green-500/10 text-green-400",
  MEDIUM: "bg-amber-500/10 text-amber-400",
  HIGH: "bg-orange-500/10 text-orange-400",
  CRITICAL: "bg-red-500/10 text-red-400",
};

type Tab = "rules" | "violations" | "thresholds" | "withdrawal-requests";

export default function RuleEnginePage() {
  const [tab, setTab] = useState<Tab>("rules");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/10 p-2.5">
          <Shield className="h-6 w-6 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Rule Engine</h2>
          <p className="text-xs text-muted-foreground">Define fraud rules, review violations & manage withdrawal thresholds</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {([
          { key: "rules", label: "Fraud Rules" },
          { key: "violations", label: "Violations" },
          { key: "thresholds", label: "Thresholds" },
          { key: "withdrawal-requests", label: "Withdrawal Requests" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              tab === t.key ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rules" && <RulesTab />}
      {tab === "violations" && <ViolationsTab />}
      {tab === "thresholds" && <ThresholdsTab />}
      {tab === "withdrawal-requests" && <WithdrawalRequestsTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Rules Tab
// ═══════════════════════════════════════════════════════════════════════
function RulesTab() {
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [ruleType, setRuleType] = useState<string>("FREQUENCY");
  const [maxCount, setMaxCount] = useState("3");
  const [windowHours, setWindowHours] = useState("24");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [riskPoints, setRiskPoints] = useState("10");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFraudRules();
      setRules(data);
    } catch {
      toast.error("Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!name.trim() || !desc.trim()) return toast.error("Name and description required");
    setSaving(true);
    try {
      await createFraudRule({
        name: name.trim(),
        description: desc.trim(),
        ruleType,
        maxCount: ruleType === "FREQUENCY" ? parseInt(maxCount) : null,
        windowHours: ruleType === "FREQUENCY" ? parseInt(windowHours) : null,
        minAmount: ruleType === "AMOUNT" && minAmount ? parseFloat(minAmount) : null,
        maxAmount: ruleType === "AMOUNT" && maxAmount ? parseFloat(maxAmount) : null,
        severity,
        riskPoints: parseInt(riskPoints) || 10,
      });
      toast.success("Rule created");
      setShowCreate(false);
      setName(""); setDesc(""); setRuleType("FREQUENCY");
      load();
    } catch {
      toast.error("Failed to create rule");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: FraudRule) => {
    try {
      await updateFraudRule(rule.id, { enabled: !rule.enabled } as any);
      toast.success(rule.enabled ? "Rule disabled" : "Rule enabled");
      load();
    } catch {
      toast.error("Failed to toggle rule");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule and all its violations?")) return;
    try {
      await deleteFraudRule(id);
      toast.success("Rule deleted");
      load();
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await runFraudRules();
      toast.success(`Scan complete: ${result.newViolations} new violations found from ${result.rulesEvaluated} rules`);
      load();
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 transition-colors">
          <Plus className="h-3.5 w-3.5" /> New Rule
        </button>
        <button onClick={handleScan} disabled={scanning} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run All Rules
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-violet-500/30 bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Create Fraud Rule</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
            <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500">
              {RULE_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />

          {ruleType === "FREQUENCY" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground">Max Withdrawals</label>
                <input type="number" value={maxCount} onChange={(e) => setMaxCount(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Window (hours)</label>
                <input type="number" value={windowHours} onChange={(e) => setWindowHours(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
          )}

          {ruleType === "AMOUNT" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground">Min Amount</label>
                <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Max Amount (flag above)</label>
                <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500">
              {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div>
              <input type="number" value={riskPoints} onChange={(e) => setRiskPoints(e.target.value)} placeholder="Risk points" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
            </div>
          </div>
          <button disabled={saving} onClick={handleCreate} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Create Rule
          </button>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
      ) : rules.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8">No fraud rules defined yet. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={`rounded-xl border bg-card overflow-hidden transition-all ${rule.enabled ? "border-border" : "border-border/50 opacity-60"}`}>
              <div className="flex items-start justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${sevColors[rule.severity] || sevColors.MEDIUM}`}>{rule.severity}</span>
                    <span className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded-full">{rule.ruleType.replace("_", " ")}</span>
                    <span className="text-[10px] text-muted-foreground">{rule._count.ruleViolations} violations</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{rule.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{rule.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(rule); }} className="text-muted-foreground hover:text-foreground">
                    {rule.enabled ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(rule.id); }} className="text-muted-foreground hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {expandedId === rule.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
              {expandedId === rule.id && (
                <div className="border-t border-border p-4 bg-background/50 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Risk Points:</span> <span className="font-medium text-foreground">{rule.riskPoints}</span></div>
                    {rule.maxCount && <div><span className="text-muted-foreground">Max Count:</span> <span className="font-medium text-foreground">{rule.maxCount}</span></div>}
                    {rule.windowHours && <div><span className="text-muted-foreground">Window:</span> <span className="font-medium text-foreground">{rule.windowHours}h</span></div>}
                    {rule.minAmount !== null && <div><span className="text-muted-foreground">Min Amt:</span> <span className="font-medium text-foreground">{rule.minAmount?.toLocaleString()}</span></div>}
                    {rule.maxAmount !== null && <div><span className="text-muted-foreground">Max Amt:</span> <span className="font-medium text-foreground">{rule.maxAmount?.toLocaleString()}</span></div>}
                    <div><span className="text-muted-foreground">Created by:</span> <span className="font-medium text-foreground">{rule.createdBy.firstName} {rule.createdBy.lastName}</span></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Violations Tab
// ═══════════════════════════════════════════════════════════════════════
function ViolationsTab() {
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unreviewed" | "reviewed">("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filter === "unreviewed") params.reviewed = "false";
      if (filter === "reviewed") params.reviewed = "true";
      const res = await fetchRuleViolations(params);
      setViolations(res.violations);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load violations");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (id: string) => {
    try {
      await reviewViolation(id, { reviewed: true, reviewNotes: reviewNotes || undefined });
      toast.success("Violation marked as reviewed");
      setReviewingId(null);
      setReviewNotes("");
      load();
    } catch {
      toast.error("Failed to review violation");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "unreviewed", "reviewed"] as const).map((f) => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
      ) : violations.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8">No violations found</p>
      ) : (
        <div className="space-y-3">
          {violations.map((v) => (
            <div key={v.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sevColors[v.rule.severity]}`}>{v.rule.severity}</span>
                    <span className="text-[10px] text-muted-foreground">{v.rule.ruleType.replace("_", " ")}</span>
                    {v.reviewed ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Reviewed</span>
                    ) : (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Pending</span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground">{v.rule.name}</p>
                  <p className="text-[11px] text-muted-foreground">{v.details}</p>
                </div>
                <span className="text-xs font-bold text-foreground bg-background px-2 py-1 rounded-lg">+{v.riskPoints} pts</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                <span>Member: {v.member.fullName} ({v.member.memberId})</span>
                {v.transaction && <span>Tx: {v.transaction.txRef} — {v.transaction.amount.toLocaleString()}</span>}
                <span>{new Date(v.createdAt).toLocaleDateString()}</span>
              </div>
              {!v.reviewed && (
                <>
                  {reviewingId === v.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Review notes (optional)" className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
                      <button onClick={() => handleReview(v.id)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Confirm
                      </button>
                      <button onClick={() => setReviewingId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setReviewingId(v.id)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-1">
                      <Eye className="h-3 w-3" /> Review
                    </button>
                  )}
                </>
              )}
              {v.reviewed && v.reviewNotes && (
                <p className="text-[10px] text-muted-foreground mt-1 italic">Note: {v.reviewNotes}</p>
              )}
            </div>
          ))}
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

// ═══════════════════════════════════════════════════════════════════════
// Thresholds Tab
// ═══════════════════════════════════════════════════════════════════════
function ThresholdsTab() {
  const [threshold, setThreshold] = useState<WithdrawalThreshold | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [largeAmount, setLargeAmount] = useState("100000");
  const [dailyLimit, setDailyLimit] = useState("500000");
  const [maxPerDay, setMaxPerDay] = useState("5");
  const [approvalAbove, setApprovalAbove] = useState("50000");

  useEffect(() => {
    (async () => {
      try {
        const t = await fetchThresholds();
        if (t) {
          setThreshold(t);
          setLargeAmount(String(t.largeWithdrawalAmount));
          setDailyLimit(String(t.dailyWithdrawalLimit));
          setMaxPerDay(String(t.maxWithdrawalsPerDay));
          setApprovalAbove(String(t.requireApprovalAbove));
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveThresholds({
        largeWithdrawalAmount: parseFloat(largeAmount),
        dailyWithdrawalLimit: parseFloat(dailyLimit),
        maxWithdrawalsPerDay: parseInt(maxPerDay),
        requireApprovalAbove: parseFloat(approvalAbove),
      });
      setThreshold(result as any);
      toast.success("Thresholds updated");
    } catch {
      toast.error("Failed to save thresholds");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-violet-400" />
          <h3 className="text-sm font-semibold text-foreground">Withdrawal Thresholds</h3>
        </div>
        <p className="text-xs text-muted-foreground">Officers can adjust these thresholds to control withdrawal limits for all members.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Large Withdrawal Amount</label>
            <p className="text-[10px] text-muted-foreground mb-1">Withdrawals above this amount will be flagged as large</p>
            <input type="number" value={largeAmount} onChange={(e) => setLargeAmount(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Daily Withdrawal Limit</label>
            <p className="text-[10px] text-muted-foreground mb-1">Max total daily withdrawal for a single member</p>
            <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Max Withdrawals Per Day</label>
            <p className="text-[10px] text-muted-foreground mb-1">Max number of withdrawals a member can make per day</p>
            <input type="number" value={maxPerDay} onChange={(e) => setMaxPerDay(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Require Approval Above</label>
            <p className="text-[10px] text-muted-foreground mb-1">Withdrawals above this amount need officer approval</p>
            <input type="number" value={approvalAbove} onChange={(e) => setApprovalAbove(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
          </div>
        </div>

        <button disabled={saving} onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Thresholds
        </button>

        {threshold?.updatedBy && (
          <p className="text-[10px] text-muted-foreground">Last updated by {threshold.updatedBy.firstName} {threshold.updatedBy.lastName} ({threshold.updatedBy.role}) on {new Date(threshold.updatedAt).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Withdrawal Requests Tab
// ═══════════════════════════════════════════════════════════════════════
function WithdrawalRequestsTab() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Create form
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filter) params.status = filter;
      const res = await fetchWithdrawalRequests(params);
      setRequests(res.requests);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!memberId.trim() || !amount || !reason.trim()) return toast.error("All fields required");
    setSaving(true);
    try {
      await createWithdrawalRequest({ memberId: memberId.trim(), amount: parseFloat(amount), reason: reason.trim() });
      toast.success("Withdrawal request created");
      setShowCreate(false);
      setMemberId(""); setAmount(""); setReason("");
      load();
    } catch {
      toast.error("Failed to create request");
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await reviewWithdrawalRequest(id, { status, reviewNotes: reviewNotes || undefined });
      toast.success(`Request ${status.toLowerCase()}`);
      setReviewingId(null);
      setReviewNotes("");
      load();
    } catch {
      toast.error("Failed to process request");
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-400",
    APPROVED: "bg-emerald-500/10 text-emerald-400",
    REJECTED: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700">
          <Plus className="h-3.5 w-3.5" /> New Request
        </button>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-violet-500/30 bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Large Withdrawal Request</h4>
          <p className="text-xs text-muted-foreground">Members requesting to withdraw large amounts must fill this form</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="Member ID (e.g. cuid)" className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
          </div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for large withdrawal" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
          <button disabled={saving} onClick={handleCreate} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Submit Request
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
      ) : requests.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8">No withdrawal requests</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>{r.status}</span>
                    <span className="text-[10px] text-muted-foreground">{r.requestRef}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground">{r.member.fullName} ({r.member.memberId})</p>
                  <p className="text-[11px] text-muted-foreground">Reason: {r.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{r.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Balance: {r.member.balance.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mb-2">{new Date(r.createdAt).toLocaleDateString()}</div>

              {r.status === "PENDING" && (
                <>
                  {reviewingId === r.id ? (
                    <div className="space-y-2 mt-2">
                      <input value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Review notes (optional)" className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500" />
                      <div className="flex gap-2">
                        <button onClick={() => handleReview(r.id, "APPROVED")} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </button>
                        <button onClick={() => handleReview(r.id, "REJECTED")} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                        <button onClick={() => setReviewingId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReviewingId(r.id)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
                      <Eye className="h-3 w-3" /> Review
                    </button>
                  )}
                </>
              )}
              {r.reviewedBy && (
                <p className="text-[10px] text-muted-foreground mt-1">Reviewed by {r.reviewedBy.firstName} {r.reviewedBy.lastName}{r.reviewNotes ? ` — ${r.reviewNotes}` : ""}</p>
              )}
            </div>
          ))}
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
