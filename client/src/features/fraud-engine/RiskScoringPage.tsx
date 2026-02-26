import { useState, useEffect, useCallback } from "react";
import {
  calculateRiskScores,
  fetchRiskScores,
  fetchMemberRiskDetail,
  type MemberRiskScore,
  type RuleViolation,
  type FraudDecision,
} from "@/services/fraudEngineService";
import {
  Gauge,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Shield,
  X,
} from "lucide-react";
import { toast } from "sonner";

const riskColors: Record<string, string> = {
  LOW: "bg-green-500/10 text-green-400 border-green-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

const riskBarColors: Record<string, string> = {
  LOW: "bg-green-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

export default function RiskScoringPage() {
  const [scores, setScores] = useState<MemberRiskScore[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [filterRisk, setFilterRisk] = useState("");

  // Detail modal
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);
  const [detailScore, setDetailScore] = useState<MemberRiskScore | null>(null);
  const [detailViolations, setDetailViolations] = useState<RuleViolation[]>([]);
  const [detailDecisions, setDetailDecisions] = useState<FraudDecision[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filterRisk) params.riskLevel = filterRisk;
      const res = await fetchRiskScores(params);
      setScores(res.scores);
      setTotal(res.total);
      setBreakdown(res.breakdown);
    } catch {
      toast.error("Failed to load risk scores");
    } finally {
      setLoading(false);
    }
  }, [page, filterRisk]);

  useEffect(() => { load(); }, [load]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const result = await calculateRiskScores();
      toast.success(`Risk scores recalculated for ${result.membersProcessed} members`);
      load();
    } catch {
      toast.error("Failed to calculate risk scores");
    } finally {
      setCalculating(false);
    }
  };

  const openDetail = async (memberId: string) => {
    setDetailMemberId(memberId);
    setDetailLoading(true);
    try {
      const res = await fetchMemberRiskDetail(memberId);
      setDetailScore(res.score);
      setDetailViolations(res.violations);
      setDetailDecisions(res.decisions);
    } catch {
      toast.error("Failed to load member detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const totalScored = Object.values(breakdown).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-500/10 p-2.5">
          <Gauge className="h-6 w-6 text-orange-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Risk Scoring Engine</h2>
          <p className="text-xs text-muted-foreground">Calculate & view member risk scores — LOW, MEDIUM, HIGH, CRITICAL</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((level) => (
          <button
            key={level}
            onClick={() => { setFilterRisk(filterRisk === level ? "" : level); setPage(1); }}
            className={`rounded-xl border p-4 text-center transition-all ${
              filterRisk === level ? riskColors[level] + " ring-1 ring-current" : "border-border bg-card hover:border-current"
            }`}
          >
            <p className="text-2xl font-bold text-foreground">{breakdown[level] ?? 0}</p>
            <p className="text-xs text-muted-foreground">{level} Risk</p>
            {totalScored > 0 && (
              <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden">
                <div
                  className={`h-full rounded-full ${riskBarColors[level]}`}
                  style={{ width: `${((breakdown[level] ?? 0) / totalScored) * 100}%` }}
                />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={handleCalculate} disabled={calculating} className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50 transition-colors">
          {calculating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Recalculate All
        </button>
        {filterRisk && (
          <button onClick={() => setFilterRisk("")} className="text-xs text-muted-foreground hover:text-foreground">
            Clear filter
          </button>
        )}
      </div>

      {/* Scores Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-orange-400" /></div>
      ) : scores.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8">
          No risk scores yet. Click "Recalculate All" to compute risk scores for all members.
        </p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Member</th>
                  <th className="text-center px-3 py-3 text-muted-foreground font-medium">Risk Level</th>
                  <th className="text-center px-3 py-3 text-muted-foreground font-medium">Total Pts</th>
                  <th className="text-center px-3 py-3 text-muted-foreground font-medium">Frequency</th>
                  <th className="text-center px-3 py-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-center px-3 py-3 text-muted-foreground font-medium">Behavior</th>
                  <th className="text-center px-3 py-3 text-muted-foreground font-medium">No Deposit</th>
                  <th className="text-center px-3 py-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-background/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{s.member.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{s.member.memberId}</p>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${riskColors[s.riskLevel]}`}>{s.riskLevel}</span>
                    </td>
                    <td className="text-center px-3 py-3 font-bold text-foreground">{s.totalPoints}</td>
                    <td className="text-center px-3 py-3">{s.frequencyPoints > 0 ? <span className="text-orange-400">+{s.frequencyPoints}</span> : <span className="text-muted-foreground">0</span>}</td>
                    <td className="text-center px-3 py-3">{s.amountPoints > 0 ? <span className="text-orange-400">+{s.amountPoints}</span> : <span className="text-muted-foreground">0</span>}</td>
                    <td className="text-center px-3 py-3">{s.behaviorPoints > 0 ? <span className="text-orange-400">+{s.behaviorPoints}</span> : <span className="text-muted-foreground">0</span>}</td>
                    <td className="text-center px-3 py-3">{s.noDepositPoints > 0 ? <span className="text-red-400">+{s.noDepositPoints}</span> : <span className="text-muted-foreground">0</span>}</td>
                    <td className="text-center px-3 py-3">
                      <button onClick={() => openDetail(s.memberId)} className="text-violet-400 hover:text-violet-300 text-[10px] font-medium">Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 15 && (
            <div className="flex justify-center gap-2 p-3 border-t border-border">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Prev</button>
              <span className="text-xs text-muted-foreground py-1">{page} / {Math.ceil(total / 15)}</span>
              <button disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailMemberId(null)}>
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Risk Detail</h3>
              <button onClick={() => setDetailMemberId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-400" /></div>
            ) : detailScore ? (
              <>
                <div className="rounded-xl border border-border p-4 text-center">
                  <p className="text-sm font-medium text-foreground">{detailScore.member.fullName}</p>
                  <p className="text-[10px] text-muted-foreground mb-2">{detailScore.member.memberId}</p>
                  <div className={`inline-block text-sm font-bold px-4 py-1.5 rounded-full ${riskColors[detailScore.riskLevel]}`}>
                    {detailScore.riskLevel} — {detailScore.totalPoints} pts
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <div>
                      <p className="text-xs font-bold text-foreground">{detailScore.frequencyPoints}</p>
                      <p className="text-[9px] text-muted-foreground">Frequency</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{detailScore.amountPoints}</p>
                      <p className="text-[9px] text-muted-foreground">Amount</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{detailScore.behaviorPoints}</p>
                      <p className="text-[9px] text-muted-foreground">Behavior</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{detailScore.noDepositPoints}</p>
                      <p className="text-[9px] text-muted-foreground">No Deposit</p>
                    </div>
                  </div>
                </div>

                {detailViolations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Recent Violations</h4>
                    <div className="space-y-2">
                      {detailViolations.map((v) => (
                        <div key={v.id} className="rounded-lg border border-border bg-background p-2.5 text-[11px]">
                          <p className="font-medium text-foreground">{v.rule.name} <span className="text-muted-foreground">(+{v.riskPoints} pts)</span></p>
                          <p className="text-muted-foreground">{v.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailDecisions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-violet-400" /> Recent Decisions</h4>
                    <div className="space-y-2">
                      {detailDecisions.map((d) => (
                        <div key={d.id} className="rounded-lg border border-border bg-background p-2.5 text-[11px]">
                          <p className="font-medium text-foreground">{d.action.replace(/_/g, " ")}</p>
                          <p className="text-muted-foreground">{d.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No risk data found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
