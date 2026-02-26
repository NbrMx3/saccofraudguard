import { useState, useEffect, useCallback } from "react";
import {
  fetchCases,
  createCase,
  updateCase,
  fetchOfficerFraudAlerts,
  type CaseInvestigation as CaseType,
  type OfficerFraudAlert,
} from "@/services/officerService";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IN_PROGRESS: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  ESCALATED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CLOSED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DISMISSED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function CaseInvestigationPage() {
  const [cases, setCases] = useState<CaseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newAlertId, setNewAlertId] = useState("");
  const [creating, setCreating] = useState(false);

  // Unresolved alerts for linking
  const [unresolvedAlerts, setUnresolvedAlerts] = useState<OfficerFraudAlert[]>([]);

  // Update form
  const [editStatus, setEditStatus] = useState("");
  const [editFindings, setEditFindings] = useState("");
  const [editResolution, setEditResolution] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCases({
        page,
        status: statusFilter || undefined,
      });
      setCases(data.cases);
      setTotalPages(data.totalPages);
    } catch {
      toast.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const loadAlerts = async () => {
    try {
      const data = await fetchOfficerFraudAlerts({ resolved: "false" });
      setUnresolvedAlerts(data.alerts);
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDesc.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setCreating(true);
    try {
      await createCase({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        alertId: newAlertId || undefined,
      });
      toast.success("Case created");
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewPriority("MEDIUM");
      setNewAlertId("");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create case");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (caseId: string) => {
    setUpdating(true);
    try {
      await updateCase(caseId, {
        status: editStatus || undefined,
        findings: editFindings || undefined,
        resolution: editResolution || undefined,
      });
      toast.success("Case updated");
      setExpandedCase(null);
      load();
    } catch {
      toast.error("Failed to update case");
    } finally {
      setUpdating(false);
    }
  };

  const expandCase = (c: CaseType) => {
    if (expandedCase === c.id) {
      setExpandedCase(null);
    } else {
      setExpandedCase(c.id);
      setEditStatus(c.status);
      setEditFindings(c.findings || "");
      setEditResolution(c.resolution || "");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Case Investigation</h2>
          <p className="text-sm text-muted-foreground">Manage and track fraud investigation cases</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ESCALATED">Escalated</option>
            <option value="CLOSED">Closed</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
          <button
            onClick={() => { setShowCreate(true); loadAlerts(); }}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Case
          </button>
        </div>
      </div>

      {/* Create case modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Create New Case</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Suspicious withdrawal pattern investigation"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe the case details..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Link to Alert (optional)</label>
                  <select
                    value={newAlertId}
                    onChange={(e) => setNewAlertId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                  >
                    <option value="">None</option>
                    {unresolvedAlerts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.type.replace(/_/g, " ")} — {a.member.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? "Creating..." : "Create Case"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Search className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No investigation cases found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => expandCase(c)}
                className="w-full p-4 text-left hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-sky-500 shrink-0" />
                      <span className="font-medium text-foreground text-sm">{c.title}</span>
                      <span className="font-mono text-xs text-muted-foreground">{c.caseRef}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Assigned: {c.assignedTo.firstName} {c.assignedTo.lastName}</span>
                      {c.alert && (
                        <span>Alert: {c.alert.type.replace(/_/g, " ")} — {c.alert.member.fullName}</span>
                      )}
                      <span>
                        {new Date(c.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityColors[c.priority] || priorityColors.MEDIUM}`}>
                      {c.priority}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColors[c.status] || statusColors.OPEN}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </button>

              {expandedCase === c.id && (
                <div className="border-t border-border p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="ESCALATED">Escalated</option>
                        <option value="CLOSED">Closed</option>
                        <option value="DISMISSED">Dismissed</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Findings</label>
                      <textarea
                        value={editFindings}
                        onChange={(e) => setEditFindings(e.target.value)}
                        placeholder="Document investigation findings..."
                        rows={2}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Resolution</label>
                    <textarea
                      value={editResolution}
                      onChange={(e) => setEditResolution(e.target.value)}
                      placeholder="Document the resolution..."
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleUpdate(c.id)}
                      disabled={updating}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition-colors disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {updating ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
