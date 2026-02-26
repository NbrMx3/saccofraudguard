import { useState, useEffect, useCallback } from "react";
import { fetchAuditReviews, createAuditReview, updateAuditReview, type AuditReview } from "@/services/auditorService";
import { FileSearch, Plus, ChevronDown, ChevronUp, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED", "ARCHIVED"];
const CATEGORY_OPTIONS = ["FINANCIAL", "COMPLIANCE", "SECURITY", "RISK", "OPERATIONAL"];
const RISK_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  UNDER_REVIEW: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ARCHIVED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const riskColors: Record<string, string> = {
  LOW: "bg-green-500/10 text-green-400",
  MEDIUM: "bg-amber-500/10 text-amber-400",
  HIGH: "bg-orange-500/10 text-orange-400",
  CRITICAL: "bg-red-500/10 text-red-400",
};

export default function AuditReviewsPage() {
  const [reviews, setReviews] = useState<AuditReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("FINANCIAL");
  const [newRisk, setNewRisk] = useState("MEDIUM");

  // Edit fields
  const [editStatus, setEditStatus] = useState("");
  const [editFindings, setEditFindings] = useState("");
  const [editRecommendations, setEditRecommendations] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const res = await fetchAuditReviews(params);
      setReviews(res.reviews);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load audit reviews");
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDesc.trim()) { toast.error("Title and description required"); return; }
    setSaving(true);
    try {
      await createAuditReview({ title: newTitle, description: newDesc, category: newCategory, riskLevel: newRisk });
      toast.success("Audit review created");
      setShowCreate(false);
      setNewTitle(""); setNewDesc(""); setNewCategory("FINANCIAL"); setNewRisk("MEDIUM");
      load();
    } catch {
      toast.error("Failed to create review");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const body: any = {};
      if (editStatus) body.status = editStatus;
      if (editFindings) body.findings = editFindings;
      if (editRecommendations) body.recommendations = editRecommendations;
      await updateAuditReview(id, body);
      toast.success("Review updated");
      setExpandedId(null);
      load();
    } catch {
      toast.error("Failed to update review");
    } finally {
      setSaving(false);
    }
  };

  const expandReview = (r: AuditReview) => {
    if (expandedId === r.id) { setExpandedId(null); return; }
    setExpandedId(r.id);
    setEditStatus(r.status);
    setEditFindings(r.findings || "");
    setEditRecommendations(r.recommendations || "");
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Audit Reviews</h2>
          <p className="text-sm text-muted-foreground">{total} total reviews</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors">
          <Plus className="h-4 w-4" /> New Review
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Create Audit Review</h3>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Review title"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none" />
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none min-h-[80px]" />
          <div className="grid grid-cols-2 gap-4">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-sky-500 focus:outline-none">
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={newRisk} onChange={(e) => setNewRisk(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-sky-500 focus:outline-none">
              {RISK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
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
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileSearch className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p>No audit reviews found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button onClick={() => expandReview(r)} className="w-full text-left p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{r.reviewRef}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[r.status] || statusColors.DRAFT}`}>{r.status.replace("_", " ")}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${riskColors[r.riskLevel] || riskColors.MEDIUM}`}>{r.riskLevel}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{r.category}</span>
                    <span>By {r.reviewer.firstName} {r.reviewer.lastName}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {expandedId === r.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expandedId === r.id && (
                <div className="border-t border-border p-4 space-y-4 bg-accent/20">
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Findings</label>
                      <textarea value={editFindings} onChange={(e) => setEditFindings(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none min-h-[60px]"
                        placeholder="Enter findings..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Recommendations</label>
                    <textarea value={editRecommendations} onChange={(e) => setEditRecommendations(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none min-h-[60px]"
                      placeholder="Enter recommendations..." />
                  </div>
                  <button onClick={() => handleUpdate(r.id)} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                  </button>
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
    </div>
  );
}
