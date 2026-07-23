import { useState, useEffect, useCallback } from "react";
import {
  fetchSaccos,
  createSacco,
  createChama,
  fetchChamas,
  updateSacco,
  toggleSaccoStatus,
  fetchOfficers,
} from "@/services/adminService";
import {
  Search,
  Plus,
  X,
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";

interface Officer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Sacco {
  id: string;
  institutionId: string;
  name: string;
  registrationNumber: string;
  location: string;
  totalMembers: number;
  status: string;
  assignedOfficerId: string | null;
  assignedOfficer: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export default function SaccoManagement() {
  const [saccos, setSaccos] = useState<Sacco[]>([]);
  const [chamas, setChamas] = useState<Sacco[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formKind, setFormKind] = useState<"SACCO" | "CHAMA">("SACCO");
  const [editingSacco, setEditingSacco] = useState<Sacco | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [form, setForm] = useState({ name: "", registrationNumber: "", location: "", assignedOfficerId: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [saccoData, chamaData] = await Promise.all([
        fetchSaccos({ page, search }),
        fetchChamas({ page, search }),
      ]);
      setSaccos(saccoData.saccos);
      setChamas(chamaData.chamas);
      setTotalPages(Math.max(saccoData.pagination.totalPages, chamaData.pagination.totalPages));
    } catch {
      toast.error("Failed to load SACCOs");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const loadOfficers = async () => {
    try {
      const data = await fetchOfficers();
      setOfficers(data.officers);
    } catch {
      // silent
    }
  };

  const openCreate = (kind: "SACCO" | "CHAMA" = "SACCO") => {
    setEditingSacco(null);
    setFormKind(kind);
    setForm({ name: "", registrationNumber: "", location: "", assignedOfficerId: "" });
    loadOfficers();
    setShowForm(true);
  };

  const openEdit = (sacco: Sacco) => {
    setEditingSacco(sacco);
    setFormKind("SACCO");
    setForm({
      name: sacco.name,
      registrationNumber: sacco.registrationNumber,
      location: sacco.location,
      assignedOfficerId: sacco.assignedOfficerId || "",
    });
    loadOfficers();
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.registrationNumber || !form.location) {
      toast.error("Name, Registration Number, and Location are required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingSacco) {
        await updateSacco(editingSacco.id, {
          name: form.name,
          registrationNumber: form.registrationNumber,
          location: form.location,
          assignedOfficerId: form.assignedOfficerId || null,
        });
        toast.success("SACCO updated");
      } else {
        const payload = {
          name: form.name,
          registrationNumber: form.registrationNumber,
          location: form.location,
          assignedOfficerId: form.assignedOfficerId || undefined,
        };
        if (formKind === "CHAMA") {
          await createChama(payload);
          toast.success("Chama registered");
        } else {
          await createSacco(payload);
          toast.success("SACCO registered");
        }
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save SACCO");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const data = await toggleSaccoStatus(id);
      toast.success(data.message);
      load();
    } catch {
      toast.error("Failed to update SACCO status");
    }
  };

  const statusColor = (status: string) => {
    if (status === "ACTIVE") return "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400";
    if (status === "SUSPENDED") return "bg-red-500/10 text-red-500 dark:text-red-400";
    return "bg-slate-500/10 text-slate-500 dark:text-slate-400";
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search SACCOs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </div>
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Register SACCO
        </button>
        <button
          onClick={() => openCreate("CHAMA")}
          className="flex items-center gap-2 rounded-xl border border-sky-500/40 px-4 py-2.5 text-sm font-medium text-sky-500 hover:bg-sky-500/10 transition-colors"
        >
          <Plus className="h-4 w-4" /> Register Chama
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["SACCO Name", "Institution ID", "Reg. Number", "Location", "Members", "Officer", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : saccos.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No SACCOs found
                </td></tr>
              ) : (
                saccos.map((sacco) => (
                  <tr key={sacco.id} className="text-sm hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{sacco.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-sky-500">{sacco.institutionId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{sacco.registrationNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {sacco.location}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{sacco.totalMembers}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {sacco.assignedOfficer
                        ? `${sacco.assignedOfficer.firstName} ${sacco.assignedOfficer.lastName}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(sacco.status)}`}>
                        {sacco.status === "ACTIVE" ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                        {sacco.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(sacco)} className="rounded-lg p-1.5 text-sky-400 hover:bg-sky-500/10 transition-colors" title="Edit">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(sacco.id)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            sacco.status === "ACTIVE" ? "text-red-400 hover:bg-red-500/10" : "text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                          title={sacco.status === "ACTIVE" ? "Suspend" : "Activate"}
                        >
                          {sacco.status === "ACTIVE" ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Chama groups</div>
        <div className="divide-y divide-border">
          {chamas.map((chama) => (
            <div key={chama.id} className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-4">
              <span className="font-medium text-foreground">{chama.name}</span>
              <span className="font-mono text-xs text-sky-500">{chama.institutionId}</span>
              <span className="text-muted-foreground">{chama.registrationNumber}</span>
              <span className="text-muted-foreground">{chama.location}</span>
            </div>
          ))}
          {!loading && chamas.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">No chamas found</p>}
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">
                {editingSacco ? "Edit SACCO" : `Register New ${formKind === "SACCO" ? "SACCO" : "Chama"}`}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{formKind === "SACCO" ? "SACCO" : "Chama"} Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Registration Number</label>
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Assigned Officer</label>
                <select
                  value={form.assignedOfficerId}
                  onChange={(e) => setForm({ ...form, assignedOfficerId: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value="">None</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Saving..." : editingSacco ? "Update" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
