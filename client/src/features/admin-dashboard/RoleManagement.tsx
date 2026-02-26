import { useState, useEffect, useCallback } from "react";
import { fetchUsers, changeUserRole } from "@/services/adminService";
import { UserCog, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  nationalId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roles = ["ADMIN", "OFFICER", "AUDITOR"];

const roleDescriptions: Record<string, string> = {
  ADMIN: "Full system access — manage users, configs, view all data",
  OFFICER: "Process transactions, manage members, view member data",
  AUDITOR: "Read-only access to audit logs, reports, and analytics",
};

const roleColors: Record<string, string> = {
  ADMIN: "border-violet-500/20 bg-violet-500/5",
  OFFICER: "border-sky-500/20 bg-sky-500/5",
  AUDITOR: "border-amber-500/20 bg-amber-500/5",
};

export default function RoleManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers({ page, search });
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await changeUserRole(userId, newRole);
      toast.success("Role updated successfully");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to change role");
    }
  };

  return (
    <div className="space-y-6">
      {/* Role descriptions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {roles.map((role) => (
          <div key={role} className={`rounded-2xl border p-4 ${roleColors[role]}`}>
            <div className="flex items-center gap-2 mb-2">
              <UserCog className={`h-4 w-4 ${
                role === "ADMIN" ? "text-violet-500 dark:text-violet-400" : role === "OFFICER" ? "text-sky-500 dark:text-sky-400" : "text-amber-500 dark:text-amber-400"
              }`} />
              <h4 className="text-sm font-semibold text-foreground">{role}</h4>
            </div>
            <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["User", "Email", "Current Role", "Change Role"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="text-sm hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user.nationalId}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === "ADMIN" ? "bg-violet-500/10 text-violet-500 dark:text-violet-400"
                        : user.role === "OFFICER" ? "bg-sky-500/10 text-sky-500 dark:text-sky-400"
                        : "bg-amber-500/10 text-amber-500 dark:text-amber-400"
                      }`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
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
