import { useState, useEffect } from "react";
import { fetchRiskPolicies, createRiskPolicy, updateRiskPolicy, deleteRiskPolicy } from "@/services/adminService";
import { ShieldCheck, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  threshold: number | null;
  severity: string;
  createdAt: string;
}

const severityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function RiskPolicies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", threshold: "", severity: "MEDIUM", enabled: true });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchRiskPolicies();
      setPolicies(data.policies);
    } catch {
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", threshold: "", severity: "MEDIUM", enabled: true });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description,
        threshold: form.threshold ? parseFloat(form.threshold) : undefined,
        severity: form.severity,
        enabled: form.enabled,
      };
      if (editId) {
        await updateRiskPolicy(editId, payload);
        toast.success("Policy updated");
      } else {
        await createRiskPolicy(payload);
        toast.success("Policy created");
      }
      resetForm();
      load();
    } catch {
      toast.error(editId ? "Failed to update policy" : "Failed to create policy");
    }
  };

  const handleEdit = (p: Policy) => {
    setForm({
      name: p.name,
      description: p.description,
      threshold: p.threshold?.toString() || "",
      severity: p.severity,
      enabled: p.enabled,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this policy?")) return;
    try {
      await deleteRiskPolicy(id);
      toast.success("Policy deleted");
      load();
    } catch {
      toast.error("Failed to delete policy");
    }
  };

  const handleToggle = async (p: Policy) => {
    try {
      await updateRiskPolicy(p.id, { enabled: !p.enabled });
      toast.success(`Policy ${!p.enabled ? "enabled" : "disabled"}`);
      load();
    } catch {
      toast.error("Failed to toggle policy");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Policy
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">{editId ? "Edit Policy" : "Create Policy"}</h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Policy name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <textarea
              placeholder="Description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Threshold (optional)"
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                {severityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="rounded"
              />
              Enabled
            </label>
            <button
              type="submit"
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
            >
              {editId ? "Update" : "Create"}
            </button>
          </form>
        </div>
      )}

      {/* Policies list */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Loading...</div>
      ) : policies.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No risk policies configured</p>
          <p className="text-xs mt-1">Create a policy to start monitoring</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${p.enabled ? "bg-emerald-500/10" : "bg-slate-500/10"}`}>
                  <ShieldCheck className={`h-4 w-4 ${p.enabled ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-foreground">{p.name}</h4>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${
                      p.severity === "CRITICAL" ? "bg-red-500/10 text-red-500 dark:text-red-400"
                      : p.severity === "HIGH" ? "bg-orange-500/10 text-orange-500 dark:text-orange-400"
                      : p.severity === "MEDIUM" ? "bg-amber-500/10 text-amber-500 dark:text-amber-400"
                      : "bg-blue-500/10 text-blue-500 dark:text-blue-400"
                    }`}>{p.severity}</span>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${p.enabled ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {p.enabled ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                  {p.threshold && <p className="text-xs text-muted-foreground mt-1">Threshold: KES {p.threshold.toLocaleString()}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggle(p)} className={`rounded-lg p-1.5 text-xs transition-colors ${p.enabled ? "text-amber-400 hover:bg-amber-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}`} title={p.enabled ? "Disable" : "Enable"}>
                    <ShieldCheck className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleEdit(p)} className="rounded-lg p-1.5 text-sky-400 hover:bg-sky-500/10 transition-colors" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
