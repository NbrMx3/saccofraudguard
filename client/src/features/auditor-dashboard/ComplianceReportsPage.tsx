import { useState, useEffect, useCallback } from "react";
import { fetchComplianceReports, createComplianceReport, updateComplianceReport, type ComplianceReport } from "@/services/auditorService";
import { FileText, Plus, Loader2, ChevronDown, ChevronUp, Save, Send } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  PUBLISHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const CATEGORIES = ["General", "Financial", "Compliance", "Security", "Risk", "Operational", "KYC/AML"];

export default function ComplianceReportsPage() {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
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
  const [newCategory, setNewCategory] = useState("General");
  const [newPeriod, setNewPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [newSummary, setNewSummary] = useState("");
  const [newContent, setNewContent] = useState("");

  // Edit form
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const res = await fetchComplianceReports(params);
      setReports(res.reports);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load compliance reports");
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newSummary.trim() || !newContent.trim()) {
      toast.error("Title, summary, and content are required");
      return;
    }
    setSaving(true);
    try {
      await createComplianceReport({ title: newTitle, category: newCategory, period: newPeriod, summary: newSummary, content: newContent });
      toast.success("Compliance report created");
      setShowCreate(false);
      setNewTitle(""); setNewSummary(""); setNewContent(""); setNewCategory("General");
      load();
    } catch {
      toast.error("Failed to create report");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const body: any = {};
      if (editTitle) body.title = editTitle;
      if (editSummary) body.summary = editSummary;
      if (editContent) body.content = editContent;
      await updateComplianceReport(id, body);
      toast.success("Report updated");
      setExpandedId(null);
      load();
    } catch {
      toast.error("Failed to update report");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    setSaving(true);
    try {
      await updateComplianceReport(id, { status: "PUBLISHED" });
      toast.success("Report published");
      load();
    } catch {
      toast.error("Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const expandReport = (r: ComplianceReport) => {
    if (expandedId === r.id) { setExpandedId(null); return; }
    setExpandedId(r.id);
    setEditTitle(r.title);
    setEditSummary(r.summary);
    setEditContent(r.content);
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Compliance Reports</h2>
          <p className="text-sm text-muted-foreground">{total} reports</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors">
          <Plus className="h-4 w-4" /> New Report
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Create Compliance Report</h3>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Report title"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none" />
          <div className="grid grid-cols-2 gap-4">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-sky-500 focus:outline-none">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="month" value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-sky-500 focus:outline-none" />
          </div>
          <textarea value={newSummary} onChange={(e) => setNewSummary(e.target.value)} placeholder="Executive summary"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none min-h-[60px]" />
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Full report content"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none min-h-[120px]" />
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Draft
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
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p>No compliance reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button onClick={() => expandReport(r)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{r.reportRef}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[r.status] || statusColors.DRAFT}`}>{r.status}</span>
                    <span className="text-[10px] bg-accent px-2 py-0.5 rounded-full text-muted-foreground">{r.category}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Period: {r.period}</span>
                    <span>By {r.generatedBy.firstName} {r.generatedBy.lastName}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {expandedId === r.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expandedId === r.id && (
                <div className="border-t border-border p-4 bg-accent/20 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none"
                      disabled={r.status === "PUBLISHED"} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Summary</label>
                    <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none min-h-[60px]"
                      disabled={r.status === "PUBLISHED"} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Content</label>
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-sky-500 focus:outline-none min-h-[120px]"
                      disabled={r.status === "PUBLISHED"} />
                  </div>
                  <div className="flex gap-3">
                    {r.status === "DRAFT" && (
                      <>
                        <button onClick={() => handleUpdate(r.id)} disabled={saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                        </button>
                        <button onClick={() => handlePublish(r.id)} disabled={saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
                        </button>
                      </>
                    )}
                    {r.status === "PUBLISHED" && (
                      <p className="text-xs text-muted-foreground italic">This report has been published and cannot be edited.</p>
                    )}
                  </div>
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
