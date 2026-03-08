import { useState, useEffect, useCallback } from "react";
import {
  fetchBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  searchMembers,
} from "@/services/adminService";
import {
  Search,
  Plus,
  X,
  ShieldOff,
  UserX,
  ChevronLeft,
  ChevronRight,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

interface BlacklistEntry {
  id: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
  member: { memberId: string; fullName: string; email: string; status: string };
  addedBy: { firstName: string; lastName: string };
}

interface MemberOption {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  status: string;
}

export default function BlacklistManagement() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<MemberOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBlacklist({ page, active: showAll ? "false" : "true" });
      setEntries(data.entries);
      setTotalPages(data.pagination.totalPages);
    } catch {
      toast.error("Failed to load blacklist");
    } finally {
      setLoading(false);
    }
  }, [page, showAll]);

  useEffect(() => { load(); }, [load]);

  // Debounced member search
  useEffect(() => {
    if (memberSearch.length < 2) { setMemberResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchMembers(memberSearch);
        setMemberResults(data.members);
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !reason.trim()) {
      toast.error("Select a member and provide a reason");
      return;
    }
    setSubmitting(true);
    try {
      await addToBlacklist(selectedMember.id, reason.trim());
      toast.success("Member added to blacklist");
      setShowForm(false);
      setSelectedMember(null);
      setReason("");
      setMemberSearch("");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to blacklist member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeFromBlacklist(id);
      toast.success("Member removed from blacklist");
      load();
    } catch {
      toast.error("Failed to remove from blacklist");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => { setShowAll(e.target.checked); setPage(1); }}
            className="rounded border-border"
          />
          Show removed entries
        </label>
        <div className="flex-1" />
        <button
          onClick={() => { setShowForm(true); setSelectedMember(null); setReason(""); setMemberSearch(""); }}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add to Blacklist
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Member ID", "Name", "Email", "Reason", "Blacklisted By", "Date", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  <ShieldOff className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No blacklisted members
                </td></tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="text-sm hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{entry.member.memberId}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{entry.member.fullName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{entry.member.email}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{entry.reason}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {entry.addedBy.firstName} {entry.addedBy.lastName}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        entry.isActive
                          ? "bg-red-500/10 text-red-500 dark:text-red-400"
                          : "bg-slate-500/10 text-slate-500 dark:text-slate-400"
                      }`}>
                        {entry.isActive ? <UserX className="h-3 w-3" /> : null}
                        {entry.isActive ? "Active" : "Removed"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.isActive && (
                        <button
                          onClick={() => handleRemove(entry.id)}
                          className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Remove from blacklist"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
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

      {/* Add to Blacklist Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Add Member to Blacklist</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Search Member</label>
                {selectedMember ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5">
                    <span className="text-sm text-foreground flex-1">
                      {selectedMember.fullName} ({selectedMember.memberId})
                    </span>
                    <button type="button" onClick={() => { setSelectedMember(null); setMemberSearch(""); }} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Type name, ID, or email..."
                      className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                    {(memberResults.length > 0 || searching) && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-card shadow-lg">
                        {searching ? (
                          <div className="px-4 py-3 text-xs text-muted-foreground">Searching...</div>
                        ) : (
                          memberResults.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { setSelectedMember(m); setMemberSearch(""); setMemberResults([]); }}
                              className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors"
                            >
                              <p className="text-sm text-foreground">{m.fullName}</p>
                              <p className="text-xs text-muted-foreground">{m.memberId} — {m.email}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reason for Blacklisting</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                  placeholder="Enter reason..."
                  required
                />
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
                  disabled={submitting || !selectedMember}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Adding..." : "Blacklist Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
