import { useState, useEffect, useCallback } from "react";
import { fetchUsers, toggleUserActive, changeUserRole } from "@/services/adminService";
import { Search, UserCog, Ban, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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
    </div>
  );
}
