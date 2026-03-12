import { useState, useEffect, useCallback } from "react";
import { fetchUsers, toggleUserActive, changeUserRole, createUser, resetUserPassword, fetchUserLoginHistory } from "@/services/adminService";
import { Search, UserCog, Ban, CheckCircle, ChevronLeft, ChevronRight, Plus, X, KeyRound, Clock } from "lucide-react";
import { toast } from "sonner";
import { getApiError } from "@/lib/utils";

interface User {
  id: string;
  nationalId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ nationalId: "", email: "", firstName: "", lastName: "", role: "OFFICER", password: "" });
  const [creating, setCreating] = useState(false);
  const [resetModal, setResetModal] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [historyModal, setHistoryModal] = useState<{ id: string; name: string } | null>(null);
  const [loginHistory, setLoginHistory] = useState<{ action: string; createdAt: string; ipAddress?: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers({ page, search, role: roleFilter || undefined });
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (id: string) => {
    try {
      const data = await toggleUserActive(id);
      toast.success(data.message);
      load();
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const handleChangeRole = async (id: string, role: string) => {
    try {
      const data = await changeUserRole(id, role);
      toast.success(data.message);
      setEditingRole(null);
      load();
    } catch {
      toast.error("Failed to change role");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nationalId || !createForm.email || !createForm.firstName || !createForm.lastName || !createForm.password) {
      toast.error("All fields are required");
      return;
    }
    setCreating(true);
    try {
      await createUser(createForm);
      toast.success("User created successfully");
      setShowCreateForm(false);
      setCreateForm({ nationalId: "", email: "", firstName: "", lastName: "", role: "OFFICER", password: "" });
      load();
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to create user"));
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModal || !newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetting(true);
    try {
      await resetUserPassword(resetModal.id, newPassword);
      toast.success("Password reset successfully");
      setResetModal(null);
      setNewPassword("");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to reset password"));
    } finally {
      setResetting(false);
    }
  };

  const openLoginHistory = async (id: string, name: string) => {
    setHistoryModal({ id, name });
    setHistoryLoading(true);
    try {
      const data = await fetchUserLoginHistory(id);
      setLoginHistory(data.loginHistory || []);
    } catch {
      toast.error("Failed to load login history");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="OFFICER">Officer</option>
          <option value="AUDITOR">Auditor</option>
        </select>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create User
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["User ID", "Name", "Email", "Role", "Status", "Last Login", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="text-sm hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.nationalId}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{user.firstName} {user.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      {editingRole === user.id ? (
                        <select
                          defaultValue={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          onBlur={() => setEditingRole(null)}
                          autoFocus
                          className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="OFFICER">Officer</option>
                          <option value="AUDITOR">Auditor</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingRole(user.id)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            user.role === "ADMIN"
                              ? "bg-violet-500/10 text-violet-500 dark:text-violet-400"
                              : user.role === "OFFICER"
                              ? "bg-sky-500/10 text-sky-500 dark:text-sky-400"
                              : "bg-amber-500/10 text-amber-500 dark:text-amber-400"
                          }`}
                        >
                          <UserCog className="h-3 w-3" />
                          {user.role}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                          : "bg-red-500/10 text-red-500 dark:text-red-400"
                      }`}>
                        {user.isActive ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          className={`rounded-lg p-1.5 text-xs transition-colors ${
                            user.isActive
                              ? "text-red-400 hover:bg-red-500/10"
                              : "text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => setResetModal({ id: user.id, name: `${user.firstName} ${user.lastName}` })}
                          className="rounded-lg p-1.5 text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openLoginHistory(user.id, `${user.firstName} ${user.lastName}`)}
                          className="rounded-lg p-1.5 text-sky-400 hover:bg-sky-500/10 transition-colors"
                          title="Login History"
                        >
                          <Clock className="h-4 w-4" />
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Create New User</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">First Name</label>
                  <input type="text" value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Last Name</label>
                  <input type="text" value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">National ID</label>
                <input type="text" value={createForm.nationalId} onChange={(e) => setCreateForm({ ...createForm, nationalId: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
                <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                  <option value="OFFICER">Officer</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Password</label>
                <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40" required minLength={6} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateForm(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 transition-colors">
                  {creating ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Reset Password</h3>
              <button onClick={() => { setResetModal(null); setNewPassword(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Reset password for <span className="font-medium text-foreground">{resetModal.name}</span></p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required minLength={6} placeholder="Min. 6 characters" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setResetModal(null); setNewPassword(""); }}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">Cancel</button>
                <button type="submit" disabled={resetting}
                  className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors">
                  {resetting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Login History — {historyModal.name}</h3>
              <button onClick={() => setHistoryModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            {historyLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : loginHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No login history found</p>
            ) : (
              <div className="max-h-80 overflow-auto space-y-2">
                {loginHistory.map((entry, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      entry.action === "LOGIN" || entry.action === "LOGIN_SUCCESS" ? "bg-emerald-400" : entry.action === "LOGOUT" ? "bg-slate-400" : "bg-red-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{entry.action}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                        {entry.ipAddress ? ` — IP: ${entry.ipAddress}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setHistoryModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
