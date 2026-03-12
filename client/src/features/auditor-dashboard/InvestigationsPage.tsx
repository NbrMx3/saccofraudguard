import { useState, useEffect, useCallback } from "react";
import { fetchInvestigations, createInvestigation, updateInvestigation, fetchMemberActivity, type Investigation } from "@/services/auditorService";
import { ClipboardCheck, Loader2, ChevronDown, ChevronUp, User, AlertTriangle, Plus, Save, Eye, X, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ESCALATED: "bg-red-500/10 text-red-400 border-red-500/20",
  CLOSED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DISMISSED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const priorityColors: Record<string, string> = {
  LOW: "text-green-400",
  MEDIUM: "text-amber-400",
  HIGH: "text-orange-400",
  CRITICAL: "text-red-400",
};

type MemberTransaction = { id: string; txRef: string; type: string; amount: number; status: string };
type MemberFraudAlert = { id: string; severity: string; type: string; resolved: boolean; resolvedAt?: string };

interface MemberActivityData {
  recentTransactions?: MemberTransaction[];
  fraudAlerts?: MemberFraudAlert[];
}

export default function InvestigationsPage() {
  const [cases, setCases] = useState<Investigation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");

  // Edit form
  const [editStatus, setEditStatus] = useState("");
  const [editFindings, setEditFindings] = useState("");
  const [editResolution, setEditResolution] = useState("");

  // Member activity modal
  const [memberActivity, setMemberActivity] = useState<MemberActivityData | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const res = await fetchInvestigations(params);
      setCases(res.cases);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load investigations");
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterPriority]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDesc.trim()) { toast.error("Title and description required"); return; }
    setSaving(true);
    try {
      await createInvestigation({ title: newTitle, description: newDesc, priority: newPriority });
      toast.success("Investigation case created");
      setShowCreate(false);
      setNewTitle(""); setNewDesc(""); setNewPriority("MEDIUM");
      load();
    } catch {
      toast.error("Failed to create case");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const body: Record<string, string | undefined> = {};
      if (editStatus) body.status = editStatus;
      if (editFindings) body.findings = editFindings;
      if (editResolution) body.resolution = editResolution;
      await updateInvestigation(id, body);
      toast.success("Case updated");
      setExpandedId(null);
      load();
    } catch {
      toast.error("Failed to update case");
    } finally {
      setSaving(false);
    }
  };

  const expandCase = (c: Investigation) => {
    if (expandedId === c.id) { setExpandedId(null); return; }
    setExpandedId(c.id);
    setEditStatus(c.status);
    setEditFindings(c.findings || "");
    setEditResolution(c.resolution || "");
  };

  const viewMemberActivity = async (memberId: string) => {
    setActivityLoading(true);
    try {
      const data = await fetchMemberActivity(memberId);
      setMemberActivity(data);
    } catch {
      toast.error("Failed to load member activity");
    } finally {
      setActivityLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Investigations</h2>
          <p className="text-sm text-muted-foreground">{total} case investigations</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors">
          <Plus className="h-4 w-4" /> Open Case
        </button>
      </div>

      {/* Create Case Form */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Open Investigation Case</h3>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Case title"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none" />
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description of the investigation"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none min-h-[80px]" />
          <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-sky-500 focus:outline-none">
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Case
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
          <option value="">All Statuses</option>
          {["OPEN", "IN_PROGRESS", "ESCALATED", "CLOSED", "DISMISSED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
          <option value="">All Priorities</option>
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
      ) : cases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardCheck className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p>No investigations found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button onClick={() => expandCase(c)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{c.caseRef}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[c.status] || statusColors.OPEN}`}>{c.status.replace("_", " ")}</span>
                    <span className={`text-[10px] font-medium ${priorityColors[c.priority] || "text-muted-foreground"}`}>{c.priority}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.assignedTo.firstName} {c.assignedTo.lastName} ({c.assignedTo.role})</span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {expandedId === c.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expandedId === c.id && (
                <div className="border-t border-border p-4 bg-accent/20 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-foreground">{c.description}</p>
                  </div>

                  {c.alert && (
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Linked Fraud Alert
                      </p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          severityColor(c.alert.severity)
                        }`}>{c.alert.severity}</span>
                        <span className="text-foreground">{c.alert.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{c.alert.description}</p>
                      {c.alert.member && (
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            Member: {c.alert.member.fullName} ({c.alert.member.memberId})
                          </p>
                          <button onClick={() => viewMemberActivity(c.alert!.member!.memberId)}
                            className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-medium">
                            <Eye className="h-3 w-3" /> View Activity
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
                        {["OPEN", "IN_PROGRESS", "ESCALATED", "CLOSED", "DISMISSED"].map((s) => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Investigation Notes / Findings</label>
                      <textarea value={editFindings} onChange={(e) => setEditFindings(e.target.value)}
                        placeholder="Add investigation findings and notes..."
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none min-h-[60px]" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Resolution</label>
                    <textarea value={editResolution} onChange={(e) => setEditResolution(e.target.value)}
                      placeholder="Resolution notes (mark as fraud or legitimate)..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none min-h-[60px]" />
                  </div>

                  <div className="flex items-center gap-3">
                    <button onClick={() => handleUpdate(c.id)} disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground">Last updated: {new Date(c.updatedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Previous</button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Member Activity Modal */}
      {(memberActivity || activityLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {activityLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
            ) : memberActivity && (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Member Activity History</h3>
                    <p className="text-xs text-muted-foreground mt-1">{memberActivity.member.fullName} ({memberActivity.member.memberId})</p>
                  </div>
                  <button onClick={() => setMemberActivity(null)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Member Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold text-foreground">{memberActivity.member.status}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-sm font-semibold text-foreground">KES {memberActivity.member.balance?.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Risk</p>
                    <p className={`text-sm font-semibold ${memberActivity.riskScore?.riskLevel === "CRITICAL" ? "text-red-400" : memberActivity.riskScore?.riskLevel === "HIGH" ? "text-orange-400" : "text-foreground"}`}>
                      {memberActivity.riskScore?.riskLevel || "N/A"} ({memberActivity.riskScore?.totalScore ?? 0})
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-sm font-semibold text-foreground">{new Date(memberActivity.member.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-sky-400" /> Recent Transactions
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {memberActivity.recentTransactions?.map((tx: MemberTransaction) => (
                      <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">{tx.txRef}</span>
                          <span className="text-foreground">{tx.type.replace("_", " ")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-medium ${tx.type === "DEPOSIT" || tx.type === "LOAN_DISBURSEMENT" ? "text-emerald-400" : "text-amber-400"}`}>
                            KES {tx.amount.toLocaleString()}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${tx.status === "FLAGGED" ? "bg-orange-500/10 text-orange-400" : "bg-emerald-500/10 text-emerald-400"}`}>{tx.status}</span>
                        </div>
                      </div>
                    ))}
                    {(!memberActivity.recentTransactions || memberActivity.recentTransactions.length === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-3">No transactions</p>
                    )}
                  </div>
                </div>

                {/* Fraud Alerts */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" /> Fraud Alerts
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {memberActivity.fraudAlerts?.map((a: MemberFraudAlert) => (
                      <div key={a.id} className="rounded-lg border border-border bg-background p-2.5 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] border ${severityColor(a.severity)}`}>{a.severity}</span>
                          <span className="font-medium text-foreground">{a.type}</span>
                          {a.resolved ? (
                            <span className="text-[10px] text-emerald-400">Resolved</span>
                          ) : (
                            <span className="text-[10px] text-red-400">Open</span>
                          )}
                        </div>
                        <p className="text-muted-foreground">{a.description}</p>
                      </div>
                    ))}
                    {(!memberActivity.fraudAlerts || memberActivity.fraudAlerts.length === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-3">No fraud alerts</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function severityColor(s: string) {
  const map: Record<string, string> = {
    LOW: "bg-green-500/10 text-green-400 border-green-500/20",
    MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return map[s] || map.MEDIUM;
}
